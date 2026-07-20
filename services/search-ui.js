const { tokenizeQuery } = require('../vendor/engine.js');

function groupResultsByFolder(ranked) {
  const groups = new Map();
  const order = [];
  for (const row of ranked || []) {
    const path = row.it && row.it.sub ? String(row.it.sub) : '';
    const parts = path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (!groups.has(folder)) {
      groups.set(folder, []);
      order.push(folder);
    }
    groups.get(folder).push(row);
  }
  return order.map(function (folder) {
    return { folder: folder, rows: groups.get(folder) };
  });
}

function formatSearchStats(ranked, totalNotes, elapsedMs, diagnostics) {
  const resultCount = ranked ? ranked.length : 0;
  const ms =
    elapsedMs != null
      ? elapsedMs
      : diagnostics && diagnostics.elapsedMs != null
        ? diagnostics.elapsedMs
        : null;
  const notes =
    totalNotes != null && totalNotes > 0 ? totalNotes : resultCount;
  let text = resultCount + ' results in ' + notes + ' notes';
  if (ms != null) text += ' · ' + ms + ' ms';
  return text;
}

function offsetToPos(text, offset) {
  let line = 0;
  let ch = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charAt(i) === '\n') {
      line++;
      ch = 0;
    } else {
      ch++;
    }
  }
  return { line: line, ch: ch };
}

function findFirstMatchOffset(editor, query, settings) {
  void settings;
  if (!editor || !query) return null;
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return null;
  const text = editor.getValue();
  const lower = text.toLowerCase();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.indexOf(':') >= 0) continue;
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      return {
        from: offsetToPos(text, idx),
        to: offsetToPos(text, idx + token.length),
      };
    }
  }
  return null;
}

function extendedSnippet(row) {
  const sn = row && row.snippet;
  const bodyFn = row && row.it && row.it.body;
  const body = bodyFn ? bodyFn() : '';
  if (!body) return sn && sn.text ? sn.text : '';
  if (sn && sn.start >= 0) {
    const start = Math.max(0, sn.start - 80);
    const end = Math.min(body.length, sn.end + 120);
    let text = body.slice(start, end);
    if (start > 0) text = '…' + text;
    if (end < body.length) text = text + '…';
    return text;
  }
  return sn && sn.text ? sn.text : body.slice(0, 200);
}

module.exports = {
  groupResultsByFolder,
  formatSearchStats,
  findFirstMatchOffset,
  extendedSnippet,
};

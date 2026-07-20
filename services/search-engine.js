const {
  rankSearchItems,
  snippetForItem,
  tokenizeQuery,
  expandQueryVariants,
} = require('../vendor/engine.js');

function markToOffsets(html) {
  const raw = String(html || '');
  const i = raw.indexOf('<mark>');
  if (i < 0) return { text: raw.replace(/<[^>]+>/g, ''), match: '', start: -1, end: -1 };
  const j = raw.indexOf('</mark>', i);
  if (j < 0) return { text: raw.replace(/<[^>]+>/g, ''), match: '', start: -1, end: -1 };
  const text = raw.slice(0, i) + raw.slice(i + 6, j) + raw.slice(j + 7);
  const match = raw.slice(i + 6, j);
  return { text, match, start: i, end: i + match.length };
}

function rankGlyphResults(items, query, settings, opts = {}) {
  const profile = settings.searchProfile || 'balanced';
  const ranked = rankSearchItems(items, query, {
    limit: opts.limit || 40,
    profile,
    settings: { ...settings, profile },
    onDiagnostics: opts.onDiagnostics,
  });
  const tokens = tokenizeQuery(query);
  return ranked.map((row) => {
    const snippet = snippetForItem(row.it, tokens, (x) => x, { ...settings, profile });
    return {
      ...row,
      snippet: snippet ? markToOffsets(snippet) : null,
    };
  });
}

function queryAlternatives(query, settings) {
  return expandQueryVariants(query, settings);
}

module.exports = {
  rankGlyphResults,
  queryAlternatives,
};

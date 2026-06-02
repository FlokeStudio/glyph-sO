function tokenizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .split(/[\s#./_\-]+/)
    .filter(Boolean);
}

function parseSearchQuery(raw) {
  const parts = String(raw || '').trim().split(/\s+/);
  const filters = { type: null, page: null, app: null, tokens: [] };
  for (const p of parts) {
    const m = p.match(/^(type|page|app):(.+)$/i);
    if (m) filters[m[1].toLowerCase()] = m[2].toLowerCase();
    else filters.tokens.push(p.toLowerCase());
  }
  return filters;
}



const CAT_PRIORITY = { page: 40, app: 32, release: 30, note: 28, action: 24, news: 20 };

function bigramOverlap(a, b) {
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Set();
  for (let i = 0; i < a.length - 1; i++) grams.add(a.slice(i, i + 2));
  let hit = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (grams.has(b.slice(i, i + 2))) hit++;
  }
  return hit / Math.max(1, b.length - 1);
}

function matchesSearchFilters(it, filters) {
  if (!filters) return true;
  if (filters.type === 'release' && it.cat !== 'release') return false;
  if (filters.page) {
    const hash = (it.hash || '').toLowerCase();
    const title = typeof it.title === 'function' ? it.title().toLowerCase() : '';
    if (!hash.includes(filters.page) && !title.includes(filters.page)) return false;
  }
  if (filters.app) {
    const slug = (it.hash || '').replace('#project/', '').toLowerCase();
    const title = typeof it.title === 'function' ? it.title().toLowerCase() : '';
    const keys = (it.keys || []).join(' ').toLowerCase();
    if (it.cat === 'app' && !slug.includes(filters.app) && !title.includes(filters.app)) return false;
    if (it.cat !== 'app' && !keys.includes(filters.app)) return false;
  }
  return true;
}

function scoreSearchItem(it, tokens, filters) {
  if (filters && !matchesSearchFilters(it, filters)) return 0;
  const title = it.title().toLowerCase();
  const sub = (it.sub || '').toLowerCase();
  const keys = (it.keys || []).join(' ').toLowerCase();
  const body = (typeof it.body === 'function' ? it.body() : it.body || '').toLowerCase();
  const blob = `${title} ${sub} ${keys} ${body}`;
  const phrase = tokens.join(' ');

  if (!tokens.length) return CAT_PRIORITY[it.cat] ?? 10;

  let score = 0;
  if (phrase.length > 2 && body.includes(phrase)) score += 110;
  if (phrase.length > 2 && blob.includes(phrase)) score += 48;

  for (const tok of tokens) {
    if (title === tok || sub === tok) score += 125;
    else if (title.startsWith(tok)) score += 95;
    else if (sub.startsWith(tok)) score += 72;
    else if (keys.split(/\s+/).some((k) => k === tok)) score += 68;
    else if (body.includes(tok)) score += 60;
    else if (title.includes(tok)) score += 52;
    else if (sub.includes(tok)) score += 38;
    else if (blob.includes(tok)) score += 24;
    else {
      const fuzzy = bigramOverlap(tok, blob.replace(/\s+/g, ''));
      if (fuzzy >= 0.35) score += Math.round(18 * fuzzy);
      else {
        let i = 0;
        let matched = 0;
        for (const ch of tok) {
          i = blob.indexOf(ch, i);
          if (i === -1) break;
          matched++;
          i++;
        }
        if (matched >= Math.max(2, tok.length - 1)) score += 14;
      }
    }
  }
  return score;
}

function snippetForItem(it, tokens, esc = (s) => s) {
  if (!tokens.length) return '';
  const body = typeof it.body === 'function' ? it.body() : it.body || '';
  if (!body) return '';
  const low = body.toLowerCase();
  const tok = tokens.find((t) => low.includes(t)) || tokens[0];
  const i = low.indexOf(tok);
  if (i < 0) return '';
  const slice = body.slice(Math.max(0, i - 30), i + 80);
  let out = esc(slice);
  for (const t of tokens) {
    if (t.length < 2) continue;
    out = out.replace(
      new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
      '<mark>$1</mark>'
    );
  }
  return (i > 30 ? '…' : '') + out;
}

function rankSearchItems(items, q, opts = {}) {
  const filters = parseSearchQuery(q);
  const tokens = filters.tokens.length ? filters.tokens : tokenizeQuery(q);
  const limit = opts.limit ?? 12;
  return items
    .map((it) => ({ it, score: scoreSearchItem(it, tokens, filters) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

{ parseSearchQuery, tokenizeQuery };

module.exports = {
  tokenizeQuery,
  parseSearchQuery,
  matchesSearchFilters,
  scoreSearchItem,
  snippetForItem,
  rankSearchItems,
};

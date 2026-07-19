/**
 * Query tokenization and extended search grammar.
 * @module tokenize
 */

/**
 * Split a query into lowercase tokens on whitespace / punctuation.
 * @param {string} q
 * @returns {string[]}
 */
function tokenizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .split(/[\s#./_\-]+/)
    .filter(Boolean);
}

/**
 * Parse extended query grammar into tokens + structured filters.
 * Supports phrases, exclusions, OR groups, and type/page/app/path/tag filters.
 * @param {string} raw
 * @returns {import('./types.js').ParsedSearchQuery}
 */
function parseSearchQuery(raw) {
  const text = String(raw || '').trim();
  const filters = {
    type: null,
    page: null,
    app: null,
    path: null,
    tag: null,
    tokens: [],
    required: [],
    excluded: [],
    phrases: [],
    orGroups: [],
  };
  if (!text) return filters;

  const parts = text.match(/"[^"]+"|\([^)]*\)|\S+/g) || [];
  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower.startsWith('-')) {
      const val = lower.slice(1).trim();
      if (val) filters.excluded.push(val.replace(/^"+|"+$/g, ''));
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"') && part.length > 2) {
      const phrase = part.slice(1, -1).toLowerCase().trim();
      if (phrase) {
        filters.phrases.push(phrase);
        filters.required.push(phrase);
      }
      continue;
    }
    if (part.startsWith('(') && part.endsWith(')')) {
      const inner = part.slice(1, -1).trim();
      if (inner) {
        const vars = inner
          .split(/\s+or\s+/i)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        if (vars.length > 1) filters.orGroups.push(vars);
        else if (vars.length === 1) {
          filters.tokens.push(vars[0]);
          filters.required.push(vars[0]);
        }
      }
      continue;
    }
    const m = lower.match(/^(type|page|app|path|tag):(.+)$/i);
    if (m) {
      let val = m[2].toLowerCase();
      if (m[1].toLowerCase() === 'tag') val = val.replace(/^#/, '');
      filters[m[1].toLowerCase()] = val;
      continue;
    }
    filters.tokens.push(lower);
    filters.required.push(lower);
  }

  return filters;
}

const EN2RU = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  '[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л',
  l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
  ',': 'б', '.': 'ю',
};
const RU2EN = {};
Object.keys(EN2RU).forEach((k) => {
  RU2EN[EN2RU[k]] = k;
});

function swapKeyboardEnToRu(s) {
  let out = '';
  const low = String(s || '').toLowerCase();
  for (let i = 0; i < low.length; i++) out += EN2RU[low.charAt(i)] || low.charAt(i);
  return out;
}

function swapKeyboardRuToEn(s) {
  let out = '';
  const low = String(s || '').toLowerCase();
  for (let i = 0; i < low.length; i++) out += RU2EN[low.charAt(i)] || low.charAt(i);
  return out;
}

const LAT2CYR = {
  sh: 'ш', ch: 'ч', zh: 'ж', ya: 'я', yo: 'ё', yu: 'ю', ye: 'е',
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и',
  y: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', w: 'в', x: 'кс', j: 'дж', q: 'к',
};
const CYR2LAT = {};
Object.keys(LAT2CYR).forEach((k) => {
  const v = LAT2CYR[k];
  if (!CYR2LAT[v] || k.length > CYR2LAT[v].length) CYR2LAT[v] = k;
});

function latinToCyrillicRough(s) {
  let x = String(s || '').toLowerCase();
  let out = '';
  let i = 0;
  while (i < x.length) {
    let matched = false;
    for (let len = 2; len >= 1; len--) {
      const part = x.slice(i, i + len);
      if (LAT2CYR[part]) {
        out += LAT2CYR[part];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += x.charAt(i);
      i++;
    }
  }
  return out;
}

function cyrillicToLatinRough(s) {
  let x = String(s || '').toLowerCase();
  const keys = Object.keys(CYR2LAT).sort((a, b) => b.length - a.length);
  let out = '';
  let i = 0;
  while (i < x.length) {
    let matched = false;
    for (let ki = 0; ki < keys.length; ki++) {
      const cyr = keys[ki];
      if (x.slice(i, i + cyr.length) === cyr) {
        out += CYR2LAT[cyr];
        i += cyr.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += x.charAt(i);
      i++;
    }
  }
  return out;
}

function expandTokenVariants(tok, settings = {}) {
  const set = new Set();
  const t = String(tok || '').toLowerCase().trim();
  if (!t) return [];
  set.add(t);
  if (settings.fuzzyLayout !== false) {
    const ru = swapKeyboardEnToRu(t);
    const en = swapKeyboardRuToEn(t);
    if (ru && ru !== t) set.add(ru);
    if (en && en !== t) set.add(en);
  }
  if (settings.fuzzyTransliteration !== false) {
    const cyr = latinToCyrillicRough(t);
    const lat = cyrillicToLatinRough(t);
    if (cyr && cyr !== t) set.add(cyr);
    if (lat && lat !== t) set.add(lat);
  }
  return Array.from(set).filter((v) => v.length >= 1);
}

function expandQueryVariants(rawQ, settings = {}) {
  const q = String(rawQ || '').trim();
  if (!q) return [];
  const set = new Set([q.toLowerCase()]);
  if (settings.fuzzyLayout !== false) {
    const ru = swapKeyboardEnToRu(q);
    const en = swapKeyboardRuToEn(q);
    if (ru !== q) set.add(ru);
    if (en !== q) set.add(en);
  }
  if (settings.fuzzyTransliteration !== false) {
    const cyr = latinToCyrillicRough(q);
    const lat = cyrillicToLatinRough(q);
    if (cyr !== q) set.add(cyr);
    if (lat !== q) set.add(lat);
  }
  return Array.from(set);
}

/**
 * Search quality/speed profiles for glyph-s.
 * Data lives in profiles.json; this module re-exports for ESM and CJS bundling.
 * @module profiles
 */

/** @type {Record<string, import('./types.js').SearchProfileConfig>} */
const PROFILE_SETTINGS = {
  legacy: { fuzzyCutoff: 0.4, scoreScale: 1, maxCandidates: 8000 },
  balanced: { fuzzyCutoff: 0.48, scoreScale: 1.08, maxCandidates: 4000 },
  'max-quality': { fuzzyCutoff: 0.35, scoreScale: 1.16, maxCandidates: 9000 },
};

/**
 * Resolve a profile name to its config (falls back to `legacy`).
 * @param {string} [profile]
 * @returns {import('./types.js').SearchProfileConfig}
 */
function getProfileConfig(profile) {
  const key = String(profile || 'legacy').toLowerCase();
  return PROFILE_SETTINGS[key] || PROFILE_SETTINGS.legacy;
}

/** Stable list of known profile ids. */
const PROFILE_IDS = Object.freeze(['legacy', 'balanced', 'max-quality']);

/**
 * Glyph Search core: ranking, snippets, index + engine factory.
 * @module engine
 */





/** @type {Record<string, number>} */
const CAT_PRIORITY = { page: 40, note: 36, app: 32, release: 30, action: 24, news: 20 };
/** @type {import('./types.js').SearchSettings} */
const SEARCH_SETTINGS = { fuzzyLayout: true, fuzzyTransliteration: true };
const TOKEN_VARIANT_CACHE = new Map();
const SNIPPET_CACHE = new Map();

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

function tokenHitsText(tok, text, settings) {
  const low = String(text || '').toLowerCase();
  const t = String(tok || '').toLowerCase();
  if (t.length && low.includes(t)) return { score: 80, variant: t };
  for (const v of getTokenVariantsCached(tok, settings)) {
    if (v.length && low.includes(v)) return { score: 65, variant: v };
  }
  if (t.length >= 3) {
    const fuzzy = bigramOverlap(t, low.replace(/\s+/g, ''));
    if (fuzzy >= getProfileConfig(settings.profile).fuzzyCutoff) {
      return { score: Math.round(20 * fuzzy), variant: t };
    }
  }
  return null;
}

function getTokenVariantsCached(tok, settings) {
  const profile = String((settings && settings.profile) || 'legacy');
  const cacheKey = `${profile}|${String(tok || '').toLowerCase()}|${settings?.fuzzyLayout !== false}|${settings?.fuzzyTransliteration !== false}`;
  if (TOKEN_VARIANT_CACHE.has(cacheKey)) return TOKEN_VARIANT_CACHE.get(cacheKey);
  const variants = expandTokenVariants(tok, settings);
  TOKEN_VARIANT_CACHE.set(cacheKey, variants);
  if (TOKEN_VARIANT_CACHE.size > 2048) TOKEN_VARIANT_CACHE.delete(TOKEN_VARIANT_CACHE.keys().next().value);
  return variants;
}

/**
 * @param {import('./types.js').SearchItem} it
 * @param {import('./types.js').ParsedSearchQuery|null|undefined} filters
 * @returns {boolean}
 */
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
  if (filters.path) {
    const sub = (it.sub || '').toLowerCase();
    const hash = (it.hash || '').toLowerCase();
    if (!sub.includes(filters.path) && !hash.includes(filters.path)) return false;
  }
  if (filters.tag) {
    const keys = (it.keys || []).join(' ').toLowerCase();
    const body = (typeof it.body === 'function' ? it.body() : it.body || '').toLowerCase();
    if (!keys.includes(filters.tag) && !body.includes(`#${filters.tag}`)) return false;
  }
  return true;
}

/**
 * Score one item against query tokens / filters.
 * @param {import('./types.js').SearchItem} it
 * @param {string[]} tokens
 * @param {import('./types.js').ParsedSearchQuery|null|undefined} filters
 * @param {import('./types.js').SearchSettings} [settings]
 * @returns {number}
 */
function scoreSearchItem(it, tokens, filters, settings = SEARCH_SETTINGS) {
  if (filters && !matchesSearchFilters(it, filters)) return 0;
  const title = it.title().toLowerCase();
  const sub = (it.sub || '').toLowerCase();
  const keys = (it.keys || []).join(' ').toLowerCase();
  const body = (typeof it.body === 'function' ? it.body() : it.body || '').toLowerCase();
  const blob = `${title} ${sub} ${keys} ${body}`;

  if (!tokens.length) return Math.round((CAT_PRIORITY[it.cat] ?? 10) * getProfileConfig(settings.profile).scoreScale);

  let score = 0;
  const phrase = tokens.join(' ');
  for (const qv of expandQueryVariants(phrase, settings)) {
    if (qv.length > 2 && body.includes(qv)) score = Math.max(score, 112);
    if (qv.length > 2 && blob.includes(qv)) score = Math.max(score, 50);
  }

  for (const tok of tokens) {
    if (title === tok || sub === tok) score += 125;
    else if (title.startsWith(tok)) score += 95;
    else if (sub.startsWith(tok)) score += 72;
    else if (keys.split(/\s+/).some((k) => k === tok)) score += 68;
    else {
      const bodyHit = tokenHitsText(tok, body, settings);
      if (bodyHit) score += 58 + Math.min(20, bodyHit.score - 60);
      else {
        const titleHit = tokenHitsText(tok, title, settings);
        if (titleHit) score += 52;
        else {
          const subHit = tokenHitsText(tok, sub, settings);
          if (subHit) score += 38;
          else {
            const blobHit = tokenHitsText(tok, blob, settings);
            if (blobHit) score += 24;
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
      }
    }
  }
  if (filters && filters.phrases && filters.phrases.length) {
    for (const phraseToken of filters.phrases) {
      if (blob.includes(phraseToken)) score += 34;
      else score -= 18;
    }
  }
  if (filters && filters.excluded && filters.excluded.length) {
    for (const excluded of filters.excluded) {
      if (!excluded) continue;
      if (blob.includes(excluded)) return 0;
    }
  }
  if (filters && filters.orGroups && filters.orGroups.length) {
    for (const group of filters.orGroups) {
      let hit = false;
      for (const variant of group) {
        if (blob.includes(variant)) {
          hit = true;
          score += 12;
          break;
        }
      }
      if (!hit) return 0;
    }
  }
  return Math.round(score * getProfileConfig(settings.profile).scoreScale);
}

function findSnippetInBlob(blob, tok, settings) {
  const low = String(blob || '');
  const tryList = [String(tok || '').toLowerCase()].concat(getTokenVariantsCached(tok, settings));
  for (let i = 0; i < tryList.length; i++) {
    const v = tryList[i];
    if (!v) continue;
    const idx = low.indexOf(v);
    if (idx < 0) continue;
    const sliceStart = Math.max(0, idx - 28);
    const sliceEnd = Math.min(low.length, idx + v.length + 52);
    return {
      slice: low.slice(sliceStart, sliceEnd).replace(/\n/g, ' '),
      variant: v,
      relStart: idx - sliceStart,
    };
  }
  return null;
}

/**
 * Build a short HTML-friendly snippet for the first matching token.
 * @param {import('./types.js').SearchItem} it
 * @param {string[]} tokens
 * @param {(s: string) => string} [esc]
 * @param {import('./types.js').SearchSettings} [settings]
 * @returns {string}
 */
function snippetForItem(it, tokens, esc = (s) => s, settings = SEARCH_SETTINGS) {
  if (!tokens.length) return '';
  const body = typeof it.body === 'function' ? it.body() : it.body || '';
  if (!body) return '';
  const cacheKey = `${it.hash || it.sub || it.title?.() || 'item'}|${tokens.join('|')}|${settings.profile || 'legacy'}`;
  if (SNIPPET_CACHE.has(cacheKey)) return SNIPPET_CACHE.get(cacheKey);
  for (const tok of tokens) {
    const hit = findSnippetInBlob(body, tok, settings);
    if (!hit) continue;
    const prefix = hit.relStart > 28 ? '…' : '';
    let out = esc(hit.slice);
    const v = hit.variant;
    if (v.length >= 2) {
      out = out.replace(
        new RegExp(`(${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark>$1</mark>'
      );
    }
    const value = prefix + out + '…';
    SNIPPET_CACHE.set(cacheKey, value);
    if (SNIPPET_CACHE.size > 4096) SNIPPET_CACHE.delete(SNIPPET_CACHE.keys().next().value);
    return value;
  }
  return '';
}

function textBagForItem(it) {
  const title = String(it.title?.() || '').toLowerCase();
  const sub = String(it.sub || '').toLowerCase();
  const keys = (it.keys || []).join(' ').toLowerCase();
  return `${title} ${sub} ${keys}`;
}

function shouldCandidatePassFastPath(it, tokens, filters) {
  if (!tokens.length) return true;
  const bag = textBagForItem(it);
  for (const excluded of filters?.excluded || []) {
    if (excluded && bag.includes(excluded)) return false;
  }
  for (const required of filters?.required || []) {
    if (!required) continue;
    if (bag.includes(required)) continue;
    if (required.length >= 4 && bag.includes(required.slice(0, 4))) continue;
    return false;
  }
  for (const group of filters?.orGroups || []) {
    let ok = false;
    for (const g of group) {
      if (bag.includes(g)) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}

function collectTopK(scored, limit) {
  if (scored.length <= limit) return scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).sort((a, b) => a.score - b.score);
  for (let i = limit; i < scored.length; i++) {
    const cand = scored[i];
    if (cand.score <= top[0].score) continue;
    top[0] = cand;
    top.sort((a, b) => a.score - b.score);
  }
  return top.sort((a, b) => b.score - a.score);
}

/**
 * Rank corpus items for a query string.
 * @param {import('./types.js').SearchItem[]} items
 * @param {string} q
 * @param {import('./types.js').RankSearchOptions} [opts]
 * @returns {import('./types.js').RankedHit[]}
 */
function rankSearchItems(items, q, opts = {}) {
  const settings = { ...SEARCH_SETTINGS, ...(opts.settings || {}) };
  settings.profile = settings.profile || opts.profile || 'legacy';
  const profileCfg = getProfileConfig(settings.profile);
  const startMs = Date.now();
  const filters = parseSearchQuery(q);
  const tokens = filters.tokens.length ? filters.tokens : tokenizeQuery(q);
  const limit = opts.limit ?? 12;

  const candidates = [];
  const cap = Math.min(profileCfg.maxCandidates, items.length);
  for (let i = 0; i < cap; i++) {
    const it = items[i];
    if (!matchesSearchFilters(it, filters)) continue;
    if (!shouldCandidatePassFastPath(it, tokens, filters)) continue;
    candidates.push(it);
  }

  const scored = [];
  for (const it of candidates) {
    const score = scoreSearchItem(it, tokens, filters, settings);
    if (score > 0) scored.push({ it, score });
  }

  const out = collectTopK(scored, limit);
  if (typeof opts.onDiagnostics === 'function') {
    opts.onDiagnostics({
      profile: settings.profile,
      inputCount: items.length,
      candidateCount: candidates.length,
      scoredCount: scored.length,
      outputCount: out.length,
      elapsedMs: Date.now() - startMs,
    });
  }
  return out;
}

/**
 * Pre-compute text bags for repeated searches.
 * @param {import('./types.js').SearchItem[]} [items]
 * @param {import('./types.js').BuildIndexOptions} [opts]
 * @returns {import('./types.js').SearchIndex}
 */
function buildIndex(items = [], opts = {}) {
  const profile = opts.profile || 'legacy';
  const index = items.map((it, idx) => ({
    id: idx,
    it,
    bag: textBagForItem(it),
    cat: it.cat || 'note',
  }));
  return { items: index, profile, createdAt: Date.now() };
}

/**
 * Create a reusable search engine bound to an index / items.
 * @param {import('./types.js').CreateSearchEngineOptions} [options]
 * @returns {import('./types.js').SearchEngine}
 */
function createSearchEngine(options = {}) {
  const profile = options.profile || 'balanced';
  const settings = { ...SEARCH_SETTINGS, ...(options.settings || {}), profile };
  const index = options.index || buildIndex(options.items || [], { profile });
  return {
    profile,
    index,
    search(query, runtime = {}) {
      return rankSearchItems(
        index.items.map((x) => x.it),
        query,
        {
          limit: runtime.limit ?? options.limit ?? 12,
          profile: runtime.profile || profile,
          settings: { ...settings, ...(runtime.settings || {}) },
          onDiagnostics: runtime.onDiagnostics || options.onDiagnostics,
        }
      );
    },
  };
}


module.exports = {
  tokenizeQuery,
  parseSearchQuery,
  expandTokenVariants,
  expandQueryVariants,
  getProfileConfig,
  PROFILE_SETTINGS,
  PROFILE_IDS,
  matchesSearchFilters,
  scoreSearchItem,
  snippetForItem,
  rankSearchItems,
  buildIndex,
  createSearchEngine
};

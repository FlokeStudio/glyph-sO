const {
  rankSearchItems,
  snippetForItem,
  tokenizeQuery,
  expandQueryVariants,
} = require('../vendor/engine.js');

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
      snippet: snippet ? { text: snippet.replace(/<[^>]+>/g, ''), match: '', start: -1, end: -1 } : null,
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

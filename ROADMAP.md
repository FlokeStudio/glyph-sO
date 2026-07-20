# glyph-sO — technical roadmap

Obsidian full-text search on vendored [glyph-s](https://github.com/FlokeStudio/glyph-s).

## Shipped in 2.8.0

- **Editor highlight** — opening a result selects and scrolls to the first query token match
- **Search stats** — modal shows `N results in M notes · X ms` (count header + footer)
- **Hover preview** — extended snippet on row hover (`title` + `.glyph-so-hover` popup)
- **Folder grouping** — optional folder headers in the results list (Settings → Group results by folder)
- **`services/search-ui.js`** — `groupResultsByFolder`, `formatSearchStats`, `findFirstMatchOffset`

## Shipped in 2.7.3

- **Persistent index** — `index-cache.json` in the plugin folder; reload skips unchanged files (mtime match)
- **Incremental vault events** — create / delete / rename / modify update memory + debounced cache write
- **Theme-safe highlights** — snippet `<mark>` uses `var(--text-highlight-bg)` only

## Week 3+

- Search history already persisted in plugin settings; extend with pinned queries
- Vitest coverage for search-ui helpers (2.8.0)

## Architecture

```
main.js              UI, vault events, index orchestration
services/
  search-engine.js   rankGlyphResults + snippet offsets
  search-ui.js       stats, folder groups, editor match offset
  vault-index.js     index-cache.json load/save/hydrate
vendor/engine.js     glyph-s ranking (sync via glyph-s vendor:sync)
```

## Links

- [glyph-s ROADMAP](https://github.com/FlokeStudio/glyph-s/blob/main/ROADMAP.md)
- [Floke landing](https://flokestudio.github.io/Floke/)

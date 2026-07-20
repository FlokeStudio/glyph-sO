# glyph-sO — technical roadmap

Obsidian full-text search on vendored [glyph-s](https://github.com/FlokeStudio/glyph-s).

## Shipped in 2.7.3

- **Persistent index** — `index-cache.json` in the plugin folder; reload skips unchanged files (mtime match)
- **Incremental vault events** — create / delete / rename / modify update memory + debounced cache write
- **Theme-safe highlights** — snippet `<mark>` uses `var(--text-highlight-bg)` only

## Week 2

- Highlight matched term in the open editor after opening a result
- Search stats line: “23 results in 847 notes · 12 ms”
- Hover preview popup (VS Code–style context)

## Week 3+

- Folder grouping toggle in results list
- Search history already persisted in plugin settings; extend with pinned queries

## Architecture

```
main.js              UI, vault events, index orchestration
services/
  search-engine.js   rankGlyphResults + snippet offsets
  vault-index.js     index-cache.json load/save/hydrate
vendor/engine.js     glyph-s ranking (sync via glyph-s vendor:sync)
```

## Links

- [glyph-s ROADMAP](https://github.com/FlokeStudio/glyph-s/blob/main/ROADMAP.md)
- [Floke landing](https://flokestudio.github.io/Floke/)

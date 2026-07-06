<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.7</h1>

<p align="center">
  <a href="https://flokestudio.github.io/glyph-sO/">Site</a> ·
  <a href="README.ru.md">README.ru</a> ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a>
</p>

## User section

`glyph-sO` is a full-text Obsidian search plugin optimized for keyboard workflow.

### New in 2.7

- Search profiles: `legacy`, `balanced`, `max-quality`
- Extended query grammar:
  - phrases: `"deep work"`
  - exclude: `-draft`
  - OR group: `(task OR todo)`
  - filters: `path:`, `tag:`, `type:`, `page:`, `app:`
- Faster ranking via shared `glyph-s` v2.7 engine path
- Compact mode for minimalist Obsidian UI

### Install

Copy to `.obsidian/plugins/glyph-s-o/`:

- `manifest.json`
- `main.js`
- `styles.css`
- `services/`
- `vendor/`

Enable the plugin in **Settings → Community plugins**.

## GitHub / Dev section

### Architecture (2.7)

- UI plugin runtime: `main.js`
- Search adapter module: `services/search-engine.js`
- Shared engine bundle: `vendor/engine.js` from `glyph-s`

### Build vendor

```bash
npm run vendor
```

### Release packaging

Release workflow zips `services/` and `vendor/` to keep module-based runtime working.

## License

GPL-3.0 · Floke Studio

<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.7</h1>

<p align="center">
  <strong>Full-text vault search for Obsidian</strong><br>
  Profile-based ranking · extended query grammar · offline-first
</p>

<p align="center">
  <a href="https://flokestudio.github.io/glyph-sO/">Site</a> ·
  <a href="README.ru.md">README.ru</a> ·
  <a href="https://github.com/FlokeStudio/glyph-s">glyph-s</a> ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a>
</p>

---

## User section

### What is glyph-sO?

**glyph-sO** is an Obsidian community plugin for **full-text search** across your vault. Unlike Obsidian’s built-in quick switcher (Ctrl+O), which matches file names only, glyph-sO indexes note content and ranks results with contextual snippets — so you can find ideas buried inside paragraphs.

The plugin is part of the **Glyph 2.7** family and runs on the shared [`glyph-s`](https://github.com/FlokeStudio/glyph-s) search engine.

| | Obsidian quick switcher | glyph-sO |
|---|------------------------|----------|
| Matches | File names | Full note text |
| Snippets | No | Yes — jump to the match |
| Query filters | Limited | `path:`, `tag:`, phrases, OR, excludes |
| Offline | Yes | Yes (Ollama optional) |

### What’s new in 2.7

**Search profiles** — tune the balance between speed and depth:

| Profile | Best for |
|---------|----------|
| `legacy` | Maximum compatibility with pre-2.7 behavior |
| `balanced` | Default — good speed and relevance for daily vaults |
| `max-quality` | Deeper fuzzy matching, more candidates scanned |

**Extended query grammar** — compose precise searches:

```
"path:projects/"              → notes in a folder
tag:evergreen                 → filter by tag
"deep work" -draft            → phrase match, exclude drafts
(task OR todo) type:note      → OR group with type filter
path: journal tag:daily       → combine filters
```

**Modular architecture** — search logic moved to `services/search-engine.js`, powered by the vendored `glyph-s` 2.7 engine. Easier updates and consistent ranking with other Glyph products.

**Compact mode** — minimalist panel spacing (enabled by default). Toggle in Settings → Compact mode.

**Cached ranking path** — token-variant expansion and snippet generation use the engine’s 2.7 caches for smoother scrolling through large result sets.

### Install

1. Download the latest release from [Releases](https://github.com/FlokeStudio/glyph-sO/releases).
2. Extract into your vault:

```
.obsidian/plugins/glyph-s-o/
├── manifest.json
├── main.js
├── styles.css
├── services/
│   └── search-engine.js
└── vendor/
    └── engine.js
```

3. Enable **glyph-sO** in **Settings → Community plugins**.

### How to use

| Action | How |
|--------|-----|
| Open search | Ribbon icon 🔍 or command palette → **Glyph: search vault** |
| Navigate results | ↑ ↓ arrow keys |
| Open note at match | Enter |
| Recent queries | Shown when the input is empty |

**Tip:** Obsidian’s Ctrl+O finds files by name. Use glyph-sO when you remember *what* you wrote, not *where* you saved it.

### Settings

| Setting | Description |
|---------|-------------|
| **Search profile** | `legacy` / `balanced` / `max-quality` |
| **Compact mode** | Minimalist result panel (default: on) |
| **Match all words** | Require every token to match (AND vs OR) |
| **Fuzzy layout** | EN↔RU keyboard layout correction |
| **Fuzzy transliteration** | Rough Latin↔Cyrillic matching |
| **Ollama query enrich** | Optional local LLM query expansion |
| **Hide hotkey hint** | Remove shortcut hint from the modal |

### Pair with glyph-miO

For summaries and tag suggestions on the active note, install [**glyph-miO**](https://github.com/FlokeStudio/glyph-miO) alongside glyph-sO. Together they cover search + metadata intelligence in Obsidian.

---

## GitHub / Dev section

### Architecture (2.7)

```
main.js                    # Obsidian plugin entry, UI, vault indexing
services/search-engine.js  # Adapter: settings → glyph-s rankSearchItems
vendor/engine.js           # Bundled glyph-s 2.7 (CJS)
styles.css                 # Panel styles incl. .glyph-so-compact
```

The plugin builds a search index from vault markdown files and passes items to `rankGlyphResults()` with the user’s profile and fuzzy settings.

### Refresh vendor bundle

When `glyph-s` is updated, rebuild the Obsidian CJS bundle and copy it:

```bash
cd ../glyph-s
npm run bundle:obsidian
cp dist/glyph-search-cjs.js ../glyph-sO/vendor/engine.js
```

Or from this repo:

```bash
npm run vendor
```

### Project layout

| Path | Role |
|------|------|
| `main.js` | Plugin class, modal, settings tab, index builder |
| `services/search-engine.js` | `rankGlyphResults`, `queryAlternatives` |
| `vendor/engine.js` | `rankSearchItems`, `snippetForItem`, `parseSearchQuery` |
| `.github/workflows/release.yml` | Packages `services/` + `vendor/` into release zip |
| `.github/workflows/pages.yml` | Deploys `docs/` to GitHub Pages |

### Release packaging

The release workflow zips `manifest.json`, `main.js`, `styles.css`, `services/`, and `vendor/` so the module-based runtime works out of the box.

### Related repositories

| Repo | Role |
|------|------|
| [glyph-s](https://github.com/FlokeStudio/glyph-s) | Shared search engine core |
| [glyph-miO](https://github.com/FlokeStudio/glyph-miO) | Metadata intelligence for Obsidian |
| [glyph-mi](https://github.com/krwg/glyph-mi) | Universal MI core |

### License

GPL-3.0 · Floke Studio

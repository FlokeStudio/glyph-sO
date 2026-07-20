<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.8</h1>

<p align="center">
  <strong>Full-text vault search for Obsidian</strong><br>
  Profile-based ranking · extended query grammar · offline-first
</p>

<p align="center">
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="https://flokestudio.github.io/glyph-sO/">Site</a> ·
  <a href="README.ru.md">README.ru</a> ·
  <a href="https://github.com/FlokeStudio/glyph-s">glyph-s</a> ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a>
</p>

---

## User section

### What is glyph-sO?

**glyph-sO** is an Obsidian community plugin for **full-text search** across your vault. Unlike Obsidian’s built-in quick switcher (Ctrl+O), which matches file names only, glyph-sO indexes note content and ranks results with contextual snippets — so you can find ideas buried inside paragraphs.

The plugin is part of the **Glyph 2.8** family and runs on the shared [`glyph-s`](https://github.com/FlokeStudio/glyph-s) search engine.

| | Obsidian quick switcher | glyph-sO |
|---|------------------------|----------|
| Matches | File names | Full note text |
| Snippets | No | Yes — jump to the match |
| Query filters | Limited | `path:`, `tag:`, phrases, OR, excludes |
| Offline | Yes | Yes (Ollama optional) |

### What’s new in 2.8.0

**Editor highlight** — Enter opens the note and selects the first match for your query token, scrolled into view.

**Search stats** — results header/footer show N results in M notes · X ms (M = indexed vault size).

**Hover preview** — extended snippet context on row hover (tooltip + floating preview).

**Folder grouping** — optional folder headers in the results list (Settings → Group results by folder).

### What’s new in 2.7.3

**Persistent search index** — \index-cache.json\ in the plugin folder; vault reload reuses entries when \mtime\ matches (Settings → Persistent search index).

**Technical roadmap** — see [ROADMAP.md](ROADMAP.md) for week-by-week Obsidian + engine priorities.

### What’s new in 2.7.2

**Full-text search actually searches the body** — the vendored glyph-s fast-path now includes note body text, so words buried only in paragraphs are no longer dropped before scoring.

**Snippet match highlight** — results show the matched span again (adapter keeps offsets from engine `<mark>` instead of stripping them).

**Leaner `main.js`** — removed ~250 lines of unused pre-2.7 ranking duplicates; search goes through `services/search-engine.js` → `vendor/engine.js` only.

### What’s new in 2.7.1

**Clearer profiles** — settings show **Fast / Standard / Deep** (stored values remain `legacy` / `balanced` / `max-quality`) with tooltips.

**Search diagnostics** — optional toggle shows `candidateCount` / `scoredCount` / `elapsedMs` in the modal footer (via glyph-s `onDiagnostics`).

**Layout-fix hint** — when EN↔RU keyboard correction applies, a line under the input shows *Also showing results for: … (layout fixed)*.

**Filter autocomplete** — best-effort `tag:` / `path:` suggestions from the vault (non-blocking).

**Vendor version check** — on load, compares `vendor/VERSION.json` to `manifest.glyphEngineVersion` and warns with a Notice if they differ.

### Search profiles (2.7)

| Label (UI) | Value | Best for |
|------------|-------|----------|
| Fast | `legacy` | Maximum compatibility with pre-2.7 behavior |
| Standard | `balanced` | Default — good speed and relevance for daily vaults |
| Deep | `max-quality` | Deeper fuzzy matching, more candidates scanned |

**Extended query grammar** — compose precise searches:

```
"path:projects/"              → notes in a folder
tag:evergreen                 → filter by tag
"deep work" -draft            → phrase match, exclude drafts
(task OR todo) type:note      → OR group with type filter
path: journal tag:daily       → combine filters
```

**Modular architecture** — search logic in `services/search-engine.js`, powered by the vendored `glyph-s` engine. Easier updates and consistent ranking with other Glyph products.

**Compact mode** — minimalist panel spacing (enabled by default). Toggle in Settings → Compact mode.

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
    ├── engine.js
    └── VERSION.json
```

3. Enable **glyph-sO** in **Settings → Community plugins**.

### How to use

| Action | How |
|--------|-----|
| Open search | Ribbon icon 🔍 or command palette → **Glyph: search vault** |
| Navigate results | ↑ ↓ arrow keys |
| Open note at match | Enter |
| Recent queries | Shown when the input is empty |
| `tag:` / `path:` | Type the prefix for vault suggestions |

**Tip:** Obsidian’s Ctrl+O finds files by name. Use glyph-sO when you remember *what* you wrote, not *where* you saved it.

### Settings

| Setting | Description |
|---------|-------------|
| **Search profile** | **Fast** / **Standard** / **Deep** (`legacy` / `balanced` / `max-quality`) |
| **Compact mode** | Minimalist result panel (default: on) |
| **Group results by folder** | Folder headers in results list (default: off) |
| **Show search diagnostics** | Footer shows candidate/scored counts and elapsed ms |
| **Match all words** | Require every token to match (AND vs OR) |
| **Fuzzy layout** | EN↔RU keyboard layout correction (+ under-input hint) |
| **Fuzzy transliteration** | Rough Latin↔Cyrillic matching |
| **Ollama query enrich** | Optional local LLM query expansion |
| **Hide hotkey hint** | Remove shortcut hint from the modal |

### Pair with glyph-miO

For summaries and tag suggestions on the active note, install [**glyph-miO**](https://github.com/FlokeStudio/glyph-miO) alongside glyph-sO. Together they cover search + metadata intelligence in Obsidian.

---

## GitHub / Dev section

### Architecture (2.8)

```
main.js                    # Obsidian plugin entry, UI, vault indexing
services/search-engine.js  # Adapter: settings → glyph-s rankSearchItems
services/search-ui.js      # Stats, folder groups, editor match offset
vendor/engine.js           # Bundled glyph-s (CJS)
vendor/VERSION.json        # Stamp from glyph-s vendor:sync
styles.css                 # Panel styles incl. .glyph-so-compact
```

The plugin builds a search index from vault markdown files and passes items to `rankGlyphResults()` with the user’s profile and fuzzy settings. On load it compares `vendor/VERSION.json` to `manifest.glyphEngineVersion`.

### Refresh vendor bundle

When `glyph-s` is updated, sync the Obsidian CJS vendor (writes `engine.js`, `ollama.js`, `profiles.json`, and `VERSION.json`):

```bash
cd ../glyph-s
npm run vendor:sync
# equivalent: npm run bundle:obsidian
```

Or from this repo:

```bash
npm run vendor
```

Keep `manifest.glyphEngineVersion` aligned with the stamped `vendor/VERSION.json` `version` field after syncing.

### Project layout

| Path | Role |
|------|------|
| `main.js` | Plugin class, modal, settings tab, index builder |
| `services/search-ui.js` | `groupResultsByFolder`, `formatSearchStats`, `findFirstMatchOffset` |
| `services/search-engine.js` | `rankGlyphResults`, `queryAlternatives` |
| `vendor/engine.js` | `rankSearchItems`, `snippetForItem`, `parseSearchQuery` |
| `vendor/VERSION.json` | Engine version stamp for runtime mismatch Notice |
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

<p align="center">
  <a href="https://obsidian.md/" target="_blank" rel="noopener">
    <img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" height="72" alt="Obsidian logo" />
  </a>
</p>

<h1 align="center">glyph-sO 2.3-O / On</h1>

<p align="center">
  <a href="https://obsidian.md/"><img src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed?style=flat-square" alt="Obsidian" /></a>
  <img src="https://img.shields.io/badge/version-2.3.0-blue?style=flat-square" alt="version" />
  <img src="https://img.shields.io/badge/Glyph--S-powered-2.3-green?style=flat-square" alt="glyph-s" />
  <img src="https://img.shields.io/badge/Ollama-optional-111?style=flat-square" alt="ollama" />
  <a href="https://github.com/FlokeStudio/glyph-sO/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-orange?style=flat-square" alt="license" /></a>
</p>

<p align="center">
  <strong>Universal vault search</strong> — Glyph-S ranking (fuzzy bigram, filters) inside Obsidian.
</p>

Search core: [glyph-s](https://github.com/FlokeStudio/glyph-s) · MI sibling: [glyph-miO](https://github.com/FlokeStudio/glyph-miO)

---

## Features

- **⌘O / Ctrl+O** — open search palette (rebind in Obsidian hotkeys if it conflicts)
- **2.3-O** — full offline ranking (`type:`, `page:`, `app:`-style tokens work as plain keywords in vault search)
- **2.3-On** (optional) — Ollama expands your query before ranking

---

## Install in Obsidian

### Manual

1. Clone or download this repository.
2. Copy into:
   - `%vault%\.obsidian\plugins\glyph-s-o\`
3. Required files: `manifest.json`, `main.js`, `styles.css`, `vendor/engine.cjs`, `vendor/ollama.cjs`.
4. **Settings → Community plugins → Enable “glyph-sO 2.3”.**
5. Reload Obsidian if needed.

### BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Add beta plugin: `FlokeStudio/glyph-sO`
3. Enable under **Community plugins**.

---

## How to test

1. Create a vault with several `.md` notes (different titles and headings).
2. Enable **glyph-sO 2.3**.
3. Press **Ctrl+O** (Windows) or **Cmd+O** (macOS) — the Glyph search modal should open.
4. Type a word from a note title → matching notes appear; click to open.
5. Try filters as keywords, e.g. `meeting project` (ranked across title, path, headings, tags).
6. **Settings → glyph-sO 2.3 → Ollama query enrich** — with Ollama running, repeat search and compare broader matches.

---

## Optional: Ollama (On mode)

1. Install [Ollama](https://ollama.com/) and run `ollama pull llama3.2`
2. Plugin settings:
   - Enable **Ollama query enrich**
   - URL: `http://127.0.0.1:11434`
   - Model: `llama3.2` (or your local model)
3. Search again — the plugin may rewrite your query into extra keywords (JSON from the model).

Offline search works with this setting **off**.

---

## Development

```bash
cd ../glyph-s
npm run bundle:obsidian   # refreshes vendor/ in glyph-miO and glyph-sO
```

---

## Related

| Repo | Role |
|------|------|
| [glyph-s](https://github.com/FlokeStudio/glyph-s) | Search engine + Floke landing bundle |
| [glyph-mi](https://github.com/FlokeStudio/glyph-mi) | Senza metadata intelligence |
| [glyph-miO](https://github.com/FlokeStudio/glyph-miO) | Obsidian note MI |

---

Floke Studio · [GPL-3.0](LICENSE)

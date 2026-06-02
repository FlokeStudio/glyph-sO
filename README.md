<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.3</h1>

<p align="center">
  <a href="README.ru.md">🇷🇺 Русская документация</a>
</p>

## Why Glyph Search (for you)

Obsidian gives you two different tools:

| Shortcut | What it does |
|----------|----------------|
| **Ctrl+O** | **Quick Switcher** — file *names* only, offers “create new file” |
| **Sidebar search** | Full text in notes — but no layout/translit extras |

**glyph-sO** is a single palette that searches **inside note text**, **headings**, and **#tags**, with the same reliable matching as Obsidian’s engine — plus features the sidebar does not have:

- **Wrong keyboard layout** — `ufdthlf` finds `гаверда`
- **Latin ↔ Cyrillic** — `gaverda` finds `гаверда`
- **Highlighted snippets** — see the match before you open the note
- **Filters** — `path:Journal`, `tag:утро`
- **Recent queries** — one click to repeat a search
- **Fast index** — built in the background when Obsidian starts

Use it together with **[glyph-miO](https://github.com/FlokeStudio/glyph-miO)**: search finds the note, MI-O writes a short **summary** at the bottom.

### How to open Glyph Search

1. **Ribbon** — click the **search** icon on the left bar (always works).
2. **Command palette** — `Glyph: search vault (full text)`.
3. **Hotkey** — Obsidian does **not** always apply plugin defaults. Open **Settings → Hotkeys**, search `Glyph: search vault`, assign e.g. **Ctrl+Shift+G**, **Ctrl+Alt+G**, or **Ctrl+Shift+F**.

> **Ctrl+O will never run glyph-sO** — that shortcut belongs to Obsidian’s Quick Switcher.

---

## Install

```powershell
powershell -ExecutionPolicy Bypass -File F:\floke_dev\scripts\install-glyph-obsidian.ps1
```

Enable **glyph-sO 2.3** → **Ctrl+R**.

Files: `YOUR_VAULT/.obsidian/plugins/glyph-s-o/` — `manifest.json`, `main.js`, `styles.css` (no npm, no vendor).

---

## Tips

| Query | Meaning |
|-------|---------|
| `шаурма` | Word anywhere in a note |
| `path:Journal` | Only under folder path |
| `tag:утро` | Notes with tag |
| `note glyph` | Both words (AND) |

**Ollama query enrich** is off by default (avoids slow/500 errors). Turn on only if Ollama runs locally with a working model.

---

## Technical

- Engine: Obsidian `prepareSimpleSearch` + Glyph-S ranking (layout, translit, context).
- Index: parallel `cachedRead`, incremental update on file save.
- Repo: [glyph-s](https://github.com/FlokeStudio/glyph-s) (core) · [glyph-miO](https://github.com/FlokeStudio/glyph-miO) (summaries).

GPL-3.0 · Floke Studio

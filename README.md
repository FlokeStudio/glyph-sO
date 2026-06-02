<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.3</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed" alt="Obsidian plugin" />
  <img src="https://img.shields.io/badge/Glyph--S-2.3-green" alt="Glyph-S 2.3" />
  <img src="https://img.shields.io/badge/version-2.3.0-blue" alt="version 2.3.0" />
  <img src="https://img.shields.io/badge/offline--first-brightgreen" alt="offline first" />
  <img src="https://img.shields.io/badge/license-GPL--3.0-lightgrey" alt="GPL-3.0" />
</p>

<p align="center">
  <strong>Full-text search for your Obsidian vault</strong> — words inside notes, not just file names.<br/>
  Same reliability as Obsidian’s built-in search, plus keyboard layout, transliteration, snippets, and filters.
</p>

<p align="center">
  <a href="README.ru.md">🇷🇺 Русская документация</a>
  ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a> (summaries)
  ·
  <a href="https://github.com/FlokeStudio/glyph-s">glyph-s</a> (engine)
</p>

---

## What is glyph-sO?

If you are new here: **glyph-sO** is a free **community plugin for [Obsidian](https://obsidian.md/)**. It opens a search palette (like a spotlight) and finds **any word inside your notes** — in the body, in headings, in `#tags`, and in YAML frontmatter tags.

It is part of the **Glyph 2.3** family from Floke Studio. It works **without the internet** and **without npm**. Optional [Ollama](https://ollama.com/) can expand queries, but that is turned **off by default**.

---

## Why not just use Obsidian?

Obsidian already has search — but **different tools do different jobs**. Many people confuse them:

| Tool | How you open it | What it actually searches |
|------|-----------------|---------------------------|
| **Quick Switcher** | `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac) | Mostly **file names**. Often suggests “press Enter to create a new file”. |
| **Search in left sidebar** | Search icon in the ribbon | **Full text** in notes — very good. |
| **Glyph Search (this plugin)** | Ribbon **search** icon, command palette, or **your** hotkey | **Full text** + extras below |

**glyph-sO is not a replacement for the sidebar search** — it is a **faster, keyboard-friendly palette** with features the sidebar does not offer:

| Feature | Example |
|---------|---------|
| **Words in note body** | You remember the word `shawarma` / `шаурма` but not the file name `2026-04-26.md` — Glyph finds the note. |
| **Wrong keyboard layout** | You typed with EN keys but meant RU: `ufdthlf` → finds `гаверда`. |
| **Latin ↔ Cyrillic** | `gaverda` → finds `гаверда`. |
| **Snippet + highlight** | See the matching line **before** opening the note. |
| **Filters** | `path:Journal` — only under a folder; `tag:morning` — notes with a tag. |
| **Recent queries** | One click to repeat the last searches. |
| **Background index** | Vault is indexed when Obsidian starts; updates when you save a note. |

**Together with [glyph-miO](https://github.com/FlokeStudio/glyph-miO):** search finds the note → MI-O adds a **short summary** at the bottom of the note. That workflow is why many people install both plugins.

---

## Install (first time)

You need **Obsidian** and a **vault** (your folder of notes). Community plugins must be enabled once per vault.

### Step 1 — Allow community plugins

1. Open Obsidian and your vault.
2. **Settings** (gear) → **Community plugins**.
3. Turn off **Restricted mode** if it is on.
4. Click **Turn on community plugins**.

### Step 2 — Install glyph-sO

Pick **one** method.

#### A) Manual install (works everywhere)

1. Download this repository (green **Code** → **Download ZIP**) or clone it.
2. In your vault, open the hidden folder `.obsidian/plugins/`  
   - If it does not exist, create: `.obsidian/plugins/`
3. Create a folder named exactly: **`glyph-s-o`**
4. Copy these files from the repo into that folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
5. Path should look like:

   ```
   YourVault/
     .obsidian/
       plugins/
         glyph-s-o/
           manifest.json
           main.js
           styles.css
   ```

6. In Obsidian: **Settings → Community plugins** → **Installed plugins** → enable **glyph-sO 2.3**.
7. Press **Ctrl+R** (reload) if the plugin does not appear.

No `npm install`, no `node_modules`, no `vendor/` folder.

#### B) BRAT (beta updates from GitHub)

1. Install the **BRAT** plugin from Obsidian Community Plugins.
2. **BRAT** → **Add Beta plugin** → `FlokeStudio/glyph-s-o`
3. Enable **glyph-sO 2.3** and reload Obsidian.

#### C) Clone with Git

```bash
cd /path/to/YourVault/.obsidian/plugins
git clone https://github.com/FlokeStudio/glyph-sO.git glyph-s-o
```

Then enable the plugin in settings and reload.

---

## How to open Glyph Search

> **Important:** **Ctrl+O does not open glyph-sO.** That shortcut is reserved for Obsidian’s Quick Switcher.

| Method | Works without setup? |
|--------|----------------------|
| **Ribbon** — magnifying glass / search icon on the left | **Yes** — use this first to confirm the plugin works |
| **Command palette** — `Ctrl+P` / `Cmd+P` → type `Glyph: search vault` | **Yes** |
| **Hotkey** | **You must assign it** (see below) |

### Hotkeys (nuance)

Obsidian **does not always apply** hotkeys declared by plugins automatically. After install:

1. **Settings → Hotkeys**
2. Search: `Glyph: search vault`
3. Click **+** and assign a shortcut, for example:
   - `Ctrl+Shift+G`
   - `Ctrl+Alt+G`
   - `Ctrl+Shift+F`

Avoid conflicts with other plugins and with **Ctrl+O** (Quick Switcher).

The plugin also registers suggested combinations (`Ctrl+Shift+G`, `Ctrl+Alt+G`, `Ctrl+Shift+F`), but only **your** assignment in Hotkeys is guaranteed.

---

## How to use (examples)

1. Open Glyph Search (ribbon or command).
2. Wait until the hint shows something like **“N notes · body, headings, #tags”** (index ready).
3. Type a word you know is **inside** a note, not only in the title.

| You type | What happens |
|----------|----------------|
| `shawarma` or `шаурма` | Notes containing that word in the text |
| `path:Journal` | Only files whose path contains `Journal` |
| `tag:morning` | Notes with tag `morning` (with or without `#` in the note) |
| `glyph senza` | Notes that contain **both** words (AND) |

4. **↑ / ↓** — move in the list  
5. **Enter** — open note  
6. **Ctrl+Enter** — open in a new tab  
7. **Esc** — close  

Under each result you should see a **snippet** with the match **highlighted in yellow**. If highlight is wrong, update to the latest release.

**Empty field:** shows recently edited notes (quick entry into the vault).

---

## Settings (plugin gear icon)

| Setting | Recommendation |
|---------|----------------|
| **Match every word** | On — multi-word queries require all words |
| **Wrong keyboard layout** | On — if you type in two languages |
| **Latin ↔ Cyrillic** | On — if you mix `gaverda` / `гаверда` |
| **Ollama query enrich** | **Off** unless Ollama runs locally and works — prevents slow search and HTTP 500 errors |
| **Hotkey hint** | One-time notice about Ctrl+O vs Glyph Search |

---

## Troubleshooting

### “I press Ctrl+O and it does not find words in notes”

That is **Quick Switcher**, not glyph-sO. Use the **ribbon search icon** or assign a hotkey to **`Glyph: search vault (full text)`**.

### “Ctrl+Shift+G does nothing”

Assign the hotkey manually under **Settings → Hotkeys**. The ribbon always works.

### “Nothing found” but sidebar search finds it”

1. Reload Obsidian (**Ctrl+R**).
2. Open Glyph Search again and wait for indexing.
3. Try the same word; use `path:` if the note is in one folder.

### “Ollama / HTTP 500 in console”

Turn off **Ollama query enrich** in plugin settings. Search does not need Ollama.

### Plugin does not load

- Folder name must be **`glyph-s-o`** (matches `id` in `manifest.json`).
- Files must be directly in that folder, not in a nested copy of the whole repo.

---

## Pair with glyph-miO

| Step | Plugin |
|------|--------|
| 1 | **glyph-sO** — find the note by a word in the text |
| 2 | Open the note |
| 3 | **glyph-miO** — **Insert summary** for a short recap at the end |

Install miO the same way: [github.com/FlokeStudio/glyph-miO](https://github.com/FlokeStudio/glyph-miO) → folder `.obsidian/plugins/glyph-mi-o/`.

---

## Technical

- **Matching:** Obsidian `prepareSimpleSearch` on a prebuilt index (title, path, tags, headings, body).
- **Ranking:** Glyph-S extras (layout, transliteration, context, active note boost).
- **Index:** `cachedRead`, batched build, incremental update on file save.
- **Core repo:** [glyph-s](https://github.com/FlokeStudio/glyph-s) (shared engine, Floke site bundle).

**Requirements:** Obsidian ≥ 1.5.0 · Desktop and mobile (no native binaries).

---

## License

GPL-3.0 · [Floke Studio](https://github.com/FlokeStudio)

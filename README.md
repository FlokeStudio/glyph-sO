<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.3-O / On</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed" alt="Obsidian" />
  <img src="https://img.shields.io/badge/Glyph--S-2.3-green" alt="glyph-s" />
  <a href="README.ru.md">Russian</a>
</p>

**Vault search** powered by [Glyph-S](https://github.com/FlokeStudio/glyph-s) — every word, wrong keyboard layout, Latin↔Cyrillic, context ranking. Optional Ollama query expansion.

---

## Features

| Feature | Example |
|---------|---------|
| **Each word** | `glyph senza` → notes containing both |
| **Wrong layout** | `,ehvfklf` → **бурмалда** |
| **Transliteration** | `burmalda` → **бурмалда** |
| **Context** | Bonus when several words appear in the same paragraph |
| **Ollama (-On)** | Optional query expansion in settings |

**Hotkey:** `Ctrl+O` / `Cmd+O` (rebind if needed) · Command: **`Glyph: search vault`**

---

## Install

`YOUR_VAULT/.obsidian/plugins/glyph-s-o/` — `manifest.json`, `main.js`, `styles.css`

```powershell
powershell -ExecutionPolicy Bypass -File path\to\floke_dev\scripts\install-glyph-obsidian.ps1
```

Enable plugin → **Ctrl+R**.

---

## Settings

- **Match every word** — AND semantics for multi-word queries  
- **Wrong keyboard layout** — EN keys, Russian intent  
- **Latin ↔ Cyrillic** — gaverda / гаверда  
- **Ollama query enrich** — optional  

---

## Related

| Repo | Role |
|------|------|
| [glyph-s](https://github.com/FlokeStudio/glyph-s) | Core engine + Floke landing bundle |
| [glyph-miO](https://github.com/FlokeStudio/glyph-miO) | Note metadata |

GPL-3.0 · Floke Studio

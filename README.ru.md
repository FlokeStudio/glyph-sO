<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.3-O / On</h1>

<p align="center">
  <a href="README.md">🇬🇧 English</a>
</p>

Поиск по vault на движке **Glyph-S** — каждое слово, раскладка, транслит, контекст.

---

## Возможности

| Режим | Пример |
|-------|--------|
| **Каждое слово** | `glyph senza` — оба слова в заметке |
| **Чужая раскладка** | `ufdthlf` находит **гаверда** |
| **Транслит** | `gaverda` находит **гаверда** |
| **Контекст** | Выше в ранге, если слова в одном абзаце |
| **Ollama** | Расширение запроса (настройки) |

**Ctrl+O** — палитра поиска · команда **`Glyph: search vault`**

---

## Установка

```powershell
powershell -ExecutionPolicy Bypass -File F:\floke_dev\scripts\install-glyph-obsidian.ps1
```

Папка: `.obsidian/plugins/glyph-s-o/` → включить плагин → **Ctrl+R**.

---

## Настройки плагина

- **Match every word** — все слова запроса должны встретиться  
- **Wrong keyboard layout** — EN→RU раскладка  
- **Latin ↔ Cyrillic** — gaverda ↔ гаверда  
- **Ollama query enrich** — опционально  

---

## Тест

1. Создайте заметку со словом **гаверда**.
2. `Ctrl+O` → введите `gaverda` или `ufdthlf`.
3. Заметка должна появиться в списке.

---

## Связанные репо

- [glyph-s](https://github.com/FlokeStudio/glyph-s)  
- [glyph-miO](https://github.com/FlokeStudio/glyph-miO)  

Floke Studio · GPL-3.0

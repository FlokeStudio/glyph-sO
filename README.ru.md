<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.3</h1>

<p align="center">
  <a href="README.md">🇬🇧 English</a>
</p>

## Зачем нужен Glyph Search

В Obsidian **две разные вещи**:

| Клавиша | Что делает |
|---------|------------|
| **Ctrl+O** | **Quick Switcher** — только *имена* файлов, «создать новый» |
| **Боковой поиск** | Полный текст в заметках — без раскладки и транслита |

**glyph-sO** — одна палитра: поиск по **телу заметки**, **заголовкам**, **#тегам**, на том же движке, что Obsidian, плюс то, чего нет в боковой панели:

- **Чужая раскладка** — `ufdthlf` → `гаверда`
- **Транслит** — `gaverda` → `гаверда`
- **Сниппет с подсветкой** — видно совпадение до открытия
- **Фильтры** — `path:Journal`, `tag:утро`
- **Недавние запросы** — повтор в один клик
- **Быстрый индекс** — строится в фоне при старте

Вместе с **[glyph-miO](https://github.com/FlokeStudio/glyph-miO)**: поиск находит заметку, MI-O добавляет **краткий пересказ** в конец.

### Как открыть

1. **Лента** — иконка **🔍** (работает всегда).
2. **Палитра команд** — `Glyph: search vault (full text)`.
3. **Горячая клавиша** — **Настройки → Горячие клавиши** → найдите `Glyph: search vault` → назначьте **Ctrl+Shift+G**, **Ctrl+Alt+G** или **Ctrl+Shift+F**.

> **Ctrl+O не запускает glyph-sO** — это встроенный Quick Switcher.

---

## Установка

```powershell
powershell -ExecutionPolicy Bypass -File F:\floke_dev\scripts\install-glyph-obsidian.ps1
```

Включить **glyph-sO 2.3** → **Ctrl+R**.

---

## Примеры

| Запрос | Результат |
|--------|-----------|
| `шаурма` | Слово в тексте заметки |
| `path:Journal` | Только в папке |
| `tag:утро` | С тегом |

Ollama в поиске **выключена по умолчанию** (нет 500 при каждом символе).

---

## Техническая часть

- `prepareSimpleSearch` + ранжирование Glyph-S.
- Индекс: `cachedRead`, пакетами по 32 файла, точечное обновление при сохранении.
- [glyph-s](https://github.com/FlokeStudio/glyph-s) · [glyph-miO](https://github.com/FlokeStudio/glyph-miO)

GPL-3.0 · Floke Studio

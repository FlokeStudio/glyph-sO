<p align="center">
  <a href="https://obsidian.md/"><img src="https://obsidian.md/images/obsidian-logo-gradient.svg" width="72" alt="Obsidian" /></a>
</p>

<h1 align="center">glyph-sO 2.7</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed" alt="Плагин Obsidian" />
  <img src="https://img.shields.io/badge/Glyph--S-2.7-green" alt="Glyph-S 2.7" />
  <img src="https://img.shields.io/badge/версия-2.7.2-blue" alt="версия 2.7.2" />
  <img src="https://img.shields.io/badge/офлайн-brightgreen" alt="офлайн" />
  <img src="https://img.shields.io/badge/лицензия-GPL--3.0-lightgrey" alt="GPL-3.0" />
</p>

<p align="center">
  <strong>Полнотекстовый поиск по vault Obsidian</strong> — слова внутри заметок, а не только имена файлов.<br/>
  Профили Fast / Standard / Deep, раскладка, транслит, сниппеты и фильтры на ядре glyph-s 2.7.
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a>
  ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a> (пересказы)
  ·
  <a href="https://github.com/FlokeStudio/glyph-s">glyph-s</a> (ядро)
</p>

---

## Что такое glyph-sO?

**glyph-sO** — бесплатный **плагин для [Obsidian](https://obsidian.md/)**. Открывает палитру поиска и находит **любое слово в тексте заметок** — в теле, в заголовках, в `#тегах` и в тегах из YAML в начале файла.

Это часть линейки **Glyph 2.7** (Floke Studio). Работает **без интернета** и **без npm**. [Ollama](https://ollama.com/) для расширения запроса **по умолчанию выключена**.

### Что нового в 2.7.2

- **Полнотекстовый поиск по телу** — fast-path ядра glyph-s учитывает body, слова только в абзацах больше не отсекаются до скоринга.
- **Подсветка совпадения в сниппете** — адаптер сохраняет offsets из `<mark>`, UI снова выделяет найденное слово.
- Удалён мёртвый дубликат ранжирования в `main.js` (~250 строк) — рабочий путь только через `services/search-engine.js`.

### Что нового в 2.7.1

- Профили в настройках: **Fast / Standard / Deep** (значения `legacy` / `balanced` / `max-quality`) + подсказки.
- Опция **Show search diagnostics** — в подвале модалки `candidateCount` / `scoredCount` / `elapsedMs`.
- Подсказка раскладки под полем: *Also showing results for: … (layout fixed)*.
- Автодополнение `tag:` / `path:` из vault (best-effort, без блокировки UI).
- Проверка версии вендора при загрузке (`vendor/VERSION.json` ↔ `manifest.glyphEngineVersion`).

Если вы слышите о проекте впервые — начните с раздела **«Установка»**, затем откройте поиск через **иконку 🔍 на ленте** (это всегда работает).

---

## Зачем он, если в Obsidian уже есть поиск?

В Obsidian несколько разных инструментов — их часто путают:

| Инструмент | Как открыть | Что ищет |
|------------|-------------|----------|
| **Quick Switcher** | **Ctrl+O** | В основном **имена файлов**. Часто: «Enter — создать новый файл». |
| **Поиск в боковой панели** | Иконка лупы слева | **Полный текст** в заметках — отличный встроенный поиск. |
| **Glyph Search (этот плагин)** | 🔍 на ленте, палитра команд или **ваша** горячая клавиша | **Полный текст** + возможности ниже |

**glyph-sO не заменяет боковой поиск**, а даёт **быструю палитру с клавиатуры** и дополнения:

| Возможность | Пример |
|-------------|--------|
| **Слово в тексте** | Помните «шаурма», а файл называется `2026-04-26.md` — Glyph найдёт заметку. |
| **Чужая раскладка** | `ufdthlf` → `гаверда`. |
| **Транслит** | `gaverda` → `гаверда`. |
| **Сниппет с подсветкой** | Видно фрагмент **до** открытия заметки. |
| **Фильтры** | `path:Journal` — только в папке; `tag:утро` — с тегом. |
| **Недавние запросы** | Повтор поиска в один клик. |
| **Фоновый индекс** | Строится при старте Obsidian, обновляется при сохранении. |

**Вместе с [glyph-miO](https://github.com/FlokeStudio/glyph-miO):** нашли заметку → вставили **краткий пересказ** в конец. Поэтому часто ставят оба плагина.

---

## Установка (с нуля)

Нужны **Obsidian** и **vault** (папка с заметками). Плагины сообщества включаются один раз на vault.

### Шаг 1 — Разрешить плагины

1. Obsidian → ваш vault.
2. **Настройки** → **Сторонние плагины**.
3. Отключите **Ограниченный режим**, если включён.
4. **Включить сторонние плагины**.

### Шаг 2 — Установить glyph-sO

Выберите **один** способ.

#### A) Вручную (Windows, Mac, Linux)

1. Скачайте репозиторий (**Code** → **Download ZIP**) или клонируйте.
2. В vault откройте `.obsidian/plugins/` (создайте, если нет).
3. Создайте папку **`glyph-s-o`** (имя важно).
4. Скопируйте в неё:
   - `manifest.json`
   - `main.js`
   - `styles.css`

   ```
   ВашVault/
     .obsidian/
       plugins/
         glyph-s-o/
           manifest.json
           main.js
           styles.css
   ```

5. **Настройки → Сторонние плагины** → включить **glyph-sO 2.7**.
6. **Ctrl+R** — перезагрузка, если плагин не виден.

Нужны также `services/` и `vendor/` (см. структуру в README.md). Без `npm` для обычной установки из релиза.

#### B) BRAT (обновления с GitHub)

1. Установите плагин **BRAT** из каталога Obsidian.
2. **BRAT** → **Add Beta plugin** → `FlokeStudio/glyph-sO`
3. Включить **glyph-sO 2.7** → **Ctrl+R**.

#### C) Git

```bash
cd /путь/к/ВашVault/.obsidian/plugins
git clone https://github.com/FlokeStudio/glyph-sO.git glyph-s-o
```

Включить в настройках и перезагрузить Obsidian.

---

## Как открыть Glyph Search

> **Ctrl+O не открывает glyph-sO** — это Quick Switcher Obsidian.

| Способ | Нужна настройка? |
|--------|------------------|
| **Лента** — иконка поиска 🔍 | **Нет** — проверьте так в первую очередь |
| **Палитра команд** — `Ctrl+P` → `Glyph: search vault` | **Нет** |
| **Горячая клавиша** | **Да** — назначить вручную |

### Горячие клавиши (нюанс)

Obsidian **не всегда** применяет клавиши из манифеста плагина.

1. **Настройки → Горячие клавиши**
2. Найти: `Glyph: search vault`
3. Назначить, например: **Ctrl+Shift+G**, **Ctrl+Alt+G**, **Ctrl+Shift+F**

Не пересекайте с **Ctrl+O** и другими плагинами.

---

## Как пользоваться

1. Откройте Glyph Search (лента или команда).
2. Дождитесь строки вроде **«N заметок · тело, заголовки, #теги»**.
3. Введите слово из **текста** заметки.

| Запрос | Результат |
|--------|-----------|
| `шаурма` | Заметки, где слово есть в теле |
| `path:Journal` | Только путь содержит `Journal` |
| `tag:утро` | Заметки с тегом `утро` |
| `glyph senza` | Оба слова в заметке |

**↑↓** — выбор · **Enter** — открыть · **Ctrl+Enter** — новая вкладка · **Esc** — закрыть.

Под результатом — **сниппет** с жёлтой подсветкой совпадения.

Пустое поле — недавно изменённые заметки.

---

## Настройки (шестерёнка плагина)

| Параметр | Совет |
|----------|--------|
| **Search profile** | **Fast** / **Standard** / **Deep** (`legacy` / `balanced` / `max-quality`) |
| **Show search diagnostics** | Вкл. — в подвале модалки счётчики и `elapsedMs` |
| **Compact mode** | Компактные строки результатов (по умолчанию вкл.) |
| **Match every word** | Вкл. — все слова запроса должны встретиться |
| **Wrong keyboard layout** | Вкл. — EN/RU раскладка + подсказка под полем |
| **Latin ↔ Cyrillic** | Вкл. — транслит |
| **Ollama query enrich** | **Выкл.** без рабочей Ollama (иначе 500 и тормоза) |

При наборе `tag:` или `path:` появляются подсказки из vault (не блокируют поиск).

---

## Частые проблемы

### Ctrl+O не ищет «шаурма» в тексте

Это **Quick Switcher** (имена файлов). Нужны **🔍 Glyph Search** или боковой поиск Obsidian.

### Ctrl+Shift+G не открывает окно

**Настройки → Горячие клавиши** → назначить `Glyph: search vault`. Лента 🔍 работает без этого.

### Боковой поиск нашёл, Glyph — нет

**Ctrl+R**, снова открыть поиск, дождаться индекса.

### В консоли Ollama 500

Выключить **Ollama query enrich** — для поиска Ollama не нужна.

### Notice про vendor engine ≠ expected

Синхронизируйте вендор из glyph-s: `npm run vendor:sync` (или `bundle:obsidian`) и выровняйте `manifest.glyphEngineVersion` с `vendor/VERSION.json`.

### Плагин не грузится

Папка строго **`glyph-s-o`**, файлы `manifest.json`, `main.js`, `styles.css` плюс `services/` и `vendor/` в ней.

---

## Связка с glyph-miO

1. **glyph-sO** — найти заметку по слову в тексте.  
2. Открыть заметку.  
3. **glyph-miO** — **Insert summary** — пересказ в конце.

Установка miO: [github.com/FlokeStudio/glyph-miO](https://github.com/FlokeStudio/glyph-miO) → `.obsidian/plugins/glyph-mi-o/`.

---

## Техническая часть

- **Поиск:** индекс (имя, путь, теги, заголовки, тело) + ранжирование glyph-s.
- **Адаптер:** `services/search-engine.js` → `vendor/engine.js`.
- **Профили:** Fast/Standard/Deep ↔ `legacy`/`balanced`/`max-quality`.
- **Диагностика:** `onDiagnostics` → опциональный футер модалки.
- **Синхронизация вендора:** из [glyph-s](https://github.com/FlokeStudio/glyph-s) — `npm run vendor:sync` / `bundle:obsidian` (или `npm run vendor` в этом репо).

Obsidian ≥ 1.5.0 · десктоп и мобильные устройства.

---

## Лицензия

GPL-3.0 · [Floke Studio](https://github.com/FlokeStudio)

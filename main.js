const {
  Plugin,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
} = require('obsidian');
const { rankGlyphResults, queryAlternatives } = require('./services/search-engine');
const {
  hydrateEntry,
  loadIndexCache,
  saveIndexCache,
  entriesMapFromItems,
} = require('./services/vault-index');
const {
  groupResultsByFolder,
  formatSearchStats,
  findFirstMatchOffset,
  extendedSnippet,
} = require('./services/search-ui');

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

const EN2RU = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  '[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л',
  l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
  ',': 'б', '.': 'ю',
};
const RU2EN = {};
Object.keys(EN2RU).forEach((k) => {
  RU2EN[EN2RU[k]] = k;
});

function swapKeyboardEnToRu(s) {
  let out = '';
  const low = String(s || '').toLowerCase();
  for (let i = 0; i < low.length; i++) {
    const ch = low.charAt(i);
    out += EN2RU[ch] || ch;
  }
  return out;
}

function swapKeyboardRuToEn(s) {
  let out = '';
  const low = String(s || '').toLowerCase();
  for (let i = 0; i < low.length; i++) {
    const ch = low.charAt(i);
    out += RU2EN[ch] || ch;
  }
  return out;
}

function normalizeQuery(q) {
  if (q == null) return '';
  if (Array.isArray(q)) return q.map(String).join(' ').trim();
  if (typeof q === 'object') return String(q.q || q.query || '').trim();
  return String(q).trim();
}

function collectTags(cache, bodyText) {
  const tags = new Set();
  if (cache && cache.tags) {
    cache.tags.forEach(function (t) {
      const tag = String(t.tag || '').replace(/^#/, '');
      if (tag) tags.add(tag);
    });
  }
  const fm = cache && cache.frontmatter ? cache.frontmatter.tags : null;
  if (Array.isArray(fm)) fm.forEach(function (t) { tags.add(String(t).replace(/^#/, '')); });
  else if (fm) tags.add(String(fm).replace(/^#/, ''));
  const hashRe = /#([a-zA-Zа-яёА-ЯЁ0-9_\-/]+)/g;
  let m;
  const body = String(bodyText || '');
  while ((m = hashRe.exec(body)) !== null) tags.add(m[1]);
  return Array.from(tags).join(' ');
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function ollamaAvailable(options) {
  options = options || {};
  const baseUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  try {
    const res = await fetch(baseUrl + '/api/tags', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function ollamaJson(req, options) {
  options = options || {};
  const baseUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = options.model || DEFAULT_OLLAMA_MODEL;
  const timeout = options.timeoutMs != null ? options.timeoutMs : 8000;
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, timeout);
  try {
    const res = await fetch(baseUrl + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        stream: false,
        format: 'json',
        prompt: req.prompt,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.response != null ? data.response : null;
    return text ? parseJsonLoose(text) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const DEFAULT_SETTINGS = {
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  useOllamaEnrich: false,
  matchAllWords: true,
  fuzzyLayout: true,
  fuzzyTransliteration: true,
  searchProfile: 'balanced',
  compactMode: true,
  hideHotkeyHint: false,
  showSearchDiagnostics: false,
  persistIndex: true,
  groupByFolder: false,
  recentQueries: [],
  pinnedQueries: [],
};

const PROFILE_LABELS = {
  legacy: 'Fast',
  balanced: 'Standard',
  'max-quality': 'Deep',
};

function readVendorVersionStamp() {
  try {
    return require('./vendor/VERSION.json');
  } catch {
    return null;
  }
}

function getExpectedEngineVersion(manifest) {
  if (manifest && manifest.glyphEngineVersion) return String(manifest.glyphEngineVersion);
  try {
    const versions = require('./versions.json');
    if (versions && versions.engine) return String(versions.engine);
  } catch {
    return null;
  }
  return manifest && manifest.version ? String(manifest.version) : null;
}

function warnIfVendorEngineMismatch(manifest) {
  const expected = getExpectedEngineVersion(manifest);
  const stamp = readVendorVersionStamp();
  if (!expected || !stamp || stamp.version == null) return;
  const actual = String(stamp.version);
  if (actual === String(expected)) return;
  new Notice(
    `glyph-sO: vendor engine ${actual} ≠ expected ${expected}. Sync with glyph-s (npm run vendor:sync / bundle:obsidian).`,
    12000
  );
}

function layoutFixedAlternative(q, settings) {
  if (!settings || settings.fuzzyLayout === false) return null;
  const raw = String(q || '').trim();
  if (!raw) return null;
  const ru = swapKeyboardEnToRu(raw);
  const en = swapKeyboardRuToEn(raw);
  const hasCyr = /[а-яё]/i.test(raw);
  const hasLat = /[a-z]/i.test(raw);
  if (hasLat && !hasCyr && ru && ru !== raw) return ru;
  if (hasCyr && !hasLat && en && en !== raw) return en;
  if (ru && ru !== raw) return ru;
  if (en && en !== raw) return en;
  return null;
}

function collectVaultTagSuggestions(app) {
  const tags = new Set();
  try {
    const cached = app.metadataCache.getTags ? app.metadataCache.getTags() : null;
    if (cached) {
      Object.keys(cached).forEach(function (t) {
        tags.add(String(t).replace(/^#/, ''));
      });
    }
  } catch {
    void _;
  }
  try {
    const files = app.vault.getMarkdownFiles();
    for (let i = 0; i < Math.min(files.length, 400); i++) {
      const cache = app.metadataCache.getFileCache(files[i]);
      if (!cache) continue;
      if (cache.tags) {
        cache.tags.forEach(function (t) {
          const tag = String(t.tag || '').replace(/^#/, '');
          if (tag) tags.add(tag);
        });
      }
      const fm = cache.frontmatter && cache.frontmatter.tags;
      if (Array.isArray(fm)) {
        fm.forEach(function (t) {
          tags.add(String(t).replace(/^#/, ''));
        });
      } else if (fm) {
        tags.add(String(fm).replace(/^#/, ''));
      }
    }
  } catch {
    void _;
  }
  return Array.from(tags).filter(Boolean).sort();
}

function collectVaultPathSuggestions(app) {
  const paths = new Set();
  try {
    app.vault.getMarkdownFiles().forEach(function (f) {
      const parts = String(f.path || '').split('/');
      let acc = '';
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? acc + '/' + parts[i] : parts[i];
        if (acc) paths.add(acc);
      }
    });
  } catch {
    void _;
  }
  return Array.from(paths).sort();
}

function filterAutocomplete(query, tags, paths) {
  const m = String(query || '').match(/(?:^|\s)(tag|path):([^\s]*)$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const prefix = String(m[2] || '').toLowerCase();
  const pool = kind === 'tag' ? tags : paths;
  const hits = [];
  for (let i = 0; i < pool.length && hits.length < 8; i++) {
    const v = pool[i];
    const low = String(v).toLowerCase();
    if (!prefix || low.indexOf(prefix) === 0 || low.indexOf(prefix) >= 0) hits.push(v);
  }
  if (!hits.length) return null;
  return { kind: kind, prefix: prefix, hits: hits };
}

class GlyphSoSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Glyph Search-O 2.8' });
    new Setting(containerEl)
      .setName('Ollama query enrich (-On)')
      .setDesc('Optional: expand search query via local LLM.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.useOllamaEnrich).onChange(async (v) => {
          this.plugin.settings.useOllamaEnrich = v;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Ollama URL')
      .addText((t) =>
        t.setValue(this.plugin.settings.ollamaUrl).onChange(async (v) => {
          this.plugin.settings.ollamaUrl = v || DEFAULT_OLLAMA_URL;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Model')
      .addText((t) =>
        t.setValue(this.plugin.settings.ollamaModel).onChange(async (v) => {
          this.plugin.settings.ollamaModel = v || DEFAULT_OLLAMA_MODEL;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Match every word')
      .setDesc('Query "note glyph" finds notes containing both words.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.matchAllWords !== false).onChange(async (v) => {
          this.plugin.settings.matchAllWords = v;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Wrong keyboard layout')
      .setDesc('ufdthlf finds гаверда (EN keys, RU intent).')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.fuzzyLayout !== false).onChange(async (v) => {
          this.plugin.settings.fuzzyLayout = v;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Latin ↔ Cyrillic')
      .setDesc('gaverda finds гаверда (transliteration).')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.fuzzyTransliteration !== false).onChange(async (v) => {
          this.plugin.settings.fuzzyTransliteration = v;
          await this.plugin.saveSettings();
        })
      );
    const profileSetting = new Setting(containerEl)
      .setName('Search profile')
      .setDesc('Fast (legacy) · Standard (balanced, default) · Deep (max-quality). Values stay legacy/balanced/max-quality.')
      .addDropdown((d) =>
        d
          .addOption('legacy', PROFILE_LABELS.legacy)
          .addOption('balanced', PROFILE_LABELS.balanced)
          .addOption('max-quality', PROFILE_LABELS['max-quality'])
          .setValue(this.plugin.settings.searchProfile || 'balanced')
          .onChange(async (v) => {
            this.plugin.settings.searchProfile = v;
            await this.plugin.saveSettings();
          })
      );
    if (typeof profileSetting.setTooltip === 'function') {
      profileSetting.setTooltip(
        'Fast: max compatibility / more candidates. Standard: daily vaults. Deep: richest fuzzy ranking (slower).'
      );
    }
    new Setting(containerEl)
      .setName('Compact mode')
      .setDesc('Minimalist result rows for faster scanning.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.compactMode !== false).onChange(async (v) => {
          this.plugin.settings.compactMode = v;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName('Group results by folder')
      .setDesc('Show folder headers in the results list.')
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.groupByFolder).onChange(async (v) => {
          this.plugin.settings.groupByFolder = v;
          await this.plugin.saveSettings();
        })
      );
    const diagSetting = new Setting(containerEl)
      .setName('Show search diagnostics')
      .setDesc('When on, the search modal footer shows candidateCount / scoredCount / elapsedMs.')
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.showSearchDiagnostics).onChange(async (v) => {
          this.plugin.settings.showSearchDiagnostics = v;
          await this.plugin.saveSettings();
        })
      );
    if (typeof diagSetting.setTooltip === 'function') {
      diagSetting.setTooltip('Uses the glyph-s onDiagnostics hook from the vendored engine.');
    }
    new Setting(containerEl)
      .setName('Persistent search index')
      .setDesc('Cache indexed note text in index-cache.json (plugin folder). Reload skips unchanged files.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.persistIndex !== false).onChange(async (v) => {
          this.plugin.settings.persistIndex = v;
          await this.plugin.saveSettings();
          if (v) {
            this.plugin.indexReady = false;
            this.plugin._indexPromise = null;
            this.plugin.ensureIndex();
          }
        })
      );
    new Setting(containerEl)
      .setName('Hotkey hint')
      .setDesc('Ctrl+Shift+G opens Glyph Search. Ctrl+O in Obsidian is Quick Switcher (file names only).')
      .addToggle((t) =>
        t.setValue(!this.plugin.settings.hideHotkeyHint).onChange(async (v) => {
          this.plugin.settings.hideHotkeyHint = !v;
          await this.plugin.saveSettings();
        })
      );
  }
}

function renderHighlightedSnippet(parent, sn) {
  const wrap = parent.createEl('div', { cls: 'glyph-so-snippet' });
  if (!sn || !sn.text) return;
  const text = sn.text;
  const match = sn.match;
  if (!match || sn.start < 0) {
    wrap.setText(text);
    return;
  }
  const before = text.slice(0, sn.start);
  const hit = text.slice(sn.start, sn.end);
  const after = text.slice(sn.end);
  wrap.createSpan({ text: before });
  wrap.createEl('mark', { cls: 'glyph-so-mark', text: hit });
  wrap.createSpan({ text: after });
}

function attachHoverPreview(rowEl, row) {
  const preview = extendedSnippet(row);
  if (!preview) return;
  rowEl.setAttr('title', preview);
  let hoverEl = null;
  rowEl.addEventListener('mouseenter', function () {
    if (preview.length < 48) return;
    hoverEl = rowEl.createEl('div', { cls: 'glyph-so-hover', text: preview });
  });
  rowEl.addEventListener('mouseleave', function () {
    if (hoverEl) {
      hoverEl.remove();
      hoverEl = null;
    }
  });
}

function indexOneFile(app, f) {
  const cache = app.metadataCache.getFileCache(f);
  return app.vault.cachedRead(f).then(
    function (bodyText) {
      const headings =
        cache && cache.headings
          ? cache.headings
              .map(function (h) {
                return h.heading;
              })
              .join('\n')
          : '';
      const tagStr = collectTags(cache, bodyText);
      const searchBlob = (
        f.basename +
        '\n' +
        f.path +
        '\n' +
        tagStr +
        '\n' +
        headings +
        '\n' +
        bodyText
      ).toLowerCase();
      return {
        cat: 'note',
        title: function () {
          return f.basename;
        },
        body: function () {
          return bodyText;
        },
        sub: f.path,
        hash: f.path,
        keys: [f.basename, f.path, tagStr, headings],
        searchBlob: searchBlob,
        bodyRaw: bodyText,
        file: f,
        mtime: f.stat ? f.stat.mtime : 0,
      };
    },
    function () {
      return null;
    }
  );
}

async function buildVaultIndex(app, plugin) {
  const files = app.vault.getMarkdownFiles();
  const cached = plugin ? await loadIndexCache(plugin) : null;
  const cachedEntries = cached && cached.entries ? cached.entries : {};
  const items = [];
  const toIndex = [];
  const batch = 32;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const mtime = f.stat ? f.stat.mtime : 0;
    const row = cachedEntries[f.path];
    if (row && row.mtime === mtime) {
      const hydrated = hydrateEntry(app, row);
      if (hydrated) {
        items.push(hydrated);
        continue;
      }
    }
    toIndex.push(f);
  }

  for (let i = 0; i < toIndex.length; i += batch) {
    const slice = toIndex.slice(i, i + batch);
    const chunk = await Promise.all(
      slice.map(function (f) {
        return indexOneFile(app, f);
      })
    );
    for (let c = 0; c < chunk.length; c++) {
      if (chunk[c]) items.push(chunk[c]);
    }
  }

  if (plugin && plugin.settings.persistIndex !== false) {
    try {
      await saveIndexCache(plugin, entriesMapFromItems(items));
    } catch {
      /* ignore */
    }
  }
  return items;
}

class GlyphSearchModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.active = 0;
    this._renderGen = 0;
    this._ollamaEnrichFor = '';
    this._lastDiagnostics = null;
    this._lastQuery = '';
    this._tagSuggestions = [];
    this._pathSuggestions = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('glyph-so-modal');
    if (this.plugin.settings.compactMode !== false) contentEl.addClass('glyph-so-compact');
    const head = contentEl.createEl('div', { cls: 'glyph-so-head' });
    head.createEl('h2', { text: 'Glyph Search' });
    this.countEl = head.createEl('span', { cls: 'glyph-so-count', text: '' });
    this.inputEl = contentEl.createEl('input', {
      type: 'search',
      cls: 'glyph-so-input',
      attr: {
        placeholder: 'Слово в заметке, #тег, путь… (как боковой поиск Obsidian + раскладка)',
      },
    });
    this.layoutHintEl = contentEl.createEl('div', {
      cls: 'glyph-so-layout-hint',
      attr: { hidden: 'true' },
    });
    this.suggestEl = contentEl.createEl('div', {
      cls: 'glyph-so-suggest',
      attr: { hidden: 'true' },
    });
    this.hintEl = contentEl.createEl('div', {
      cls: 'glyph-so-hint',
      text: 'Загрузка индекса…',
    });
    this.listEl = contentEl.createEl('div', { cls: 'glyph-so-list' });
    this.tipsEl = contentEl.createEl('div', { cls: 'glyph-so-tips' });
    this.footerEl = contentEl.createEl('div', {
      cls: 'glyph-so-footer',
      text: '↑↓ · ↵ открыть · Ctrl+↵ вкладка · path:Journal · tag:утро · Esc',
    });
    this.renderTips();

    const self = this;
    this._ready = this.plugin.indexReady;
    this.items = this.plugin.indexItems || [];

    try {
      this._tagSuggestions = collectVaultTagSuggestions(this.app);
      this._pathSuggestions = collectVaultPathSuggestions(this.app);
    } catch {
      this._tagSuggestions = [];
      this._pathSuggestions = [];
    }

    const refreshHint = function () {
      if (!self.hintEl) return;
      if (!self.plugin.indexReady) {
        self.hintEl.setText('Индексируем vault… (' + (self.plugin.indexItems.length || 0) + ' заметок)');
      } else {
        self.hintEl.setText(
          self.plugin.indexItems.length +
            ' заметок · тело, заголовки, #теги · движок Obsidian + Glyph'
        );
      }
    };

    refreshHint();
    if (!this.plugin.indexReady) {
      this.plugin.ensureIndex().then(function () {
        self.items = self.plugin.indexItems;
        self._ready = true;
        refreshHint();
        self.render(self.inputEl.value || '');
      });
    } else {
      this.render('');
    }

    this.inputEl.focus();
    let debounce = null;
    this.inputEl.addEventListener('input', function () {
      self.active = 0;
      self.updateSuggest(self.inputEl.value);
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        self.render(self.inputEl.value);
      }, 45);
    });
    this.inputEl.addEventListener('keydown', function (e) {
      const rows = self.listEl.querySelectorAll('.glyph-so-row');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        self.active = Math.min(self.active + 1, rows.length - 1);
        self.highlight(rows);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        self.active = Math.max(self.active - 1, 0);
        self.highlight(rows);
      }
      if (e.key === 'Enter' && self._ranked[self.active]) {
        e.preventDefault();
        const newTab = e.ctrlKey || e.metaKey;
        self.openItem(self._ranked[self.active].it, newTab);
      }
      if (e.key === 'Escape') self.close();
    });
  }

  updateFooter() {
    if (!this.footerEl) return;
    const base = '↑↓ · ↵ открыть · Ctrl+↵ вкладка · path:Journal · tag:утро · Esc';
    const d = this._lastDiagnostics;
    const trimmed = normalizeQuery(this._lastQuery);
    if (trimmed && d) {
      const stats = formatSearchStats(
        this._ranked,
        this.items.length,
        d.elapsedMs,
        d
      );
      let text = stats + ' · ' + base;
      if (this.plugin.settings.showSearchDiagnostics) {
        text =
          stats +
          ' · candidates ' +
          d.candidateCount +
          ' · scored ' +
          d.scoredCount +
          ' · ' +
          base;
      }
      this.footerEl.setText(text);
      return;
    }
    if (this.plugin.settings.showSearchDiagnostics && d) {
      this.footerEl.setText(
        base +
          ' · candidates ' +
          d.candidateCount +
          ' · scored ' +
          d.scoredCount +
          ' · ' +
          d.elapsedMs +
          'ms'
      );
    } else {
      this.footerEl.setText(base);
    }
  }

  updateLayoutHint(query) {
    if (!this.layoutHintEl) return;
    const alt = layoutFixedAlternative(query, this.plugin.settings);
    if (alt) {
      this.layoutHintEl.removeAttribute('hidden');
      this.layoutHintEl.setText('Also showing results for: ' + alt + ' (layout fixed)');
    } else {
      this.layoutHintEl.setAttribute('hidden', 'true');
      this.layoutHintEl.setText('');
    }
  }

  updateSuggest(query) {
    if (!this.suggestEl) return;
    const ac = filterAutocomplete(query, this._tagSuggestions, this._pathSuggestions);
    this.suggestEl.empty();
    if (!ac || !ac.hits.length) {
      this.suggestEl.setAttribute('hidden', 'true');
      return;
    }
    this.suggestEl.removeAttribute('hidden');
    const self = this;
    const label = this.suggestEl.createEl('span', {
      cls: 'glyph-so-suggest-label',
      text: ac.kind + ':',
    });
    ac.hits.forEach(function (hit) {
      const btn = self.suggestEl.createEl('button', {
        cls: 'glyph-so-suggest-item',
        text: hit,
      });
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        const cur = String(self.inputEl.value || '');
        const next = cur.replace(/(tag|path):([^\s]*)$/i, ac.kind + ':' + hit);
        self.inputEl.value = next;
        self.updateSuggest(next);
        self.render(next);
        self.inputEl.focus();
      });
    });
    void label;
  }

  renderTips() {
    if (!this.tipsEl) return;
    this.tipsEl.empty();
    const pinned = this.plugin.pinnedQueries || [];
    const recent = (this.plugin.recentQueries || []).filter(function (rq) {
      return pinned.indexOf(rq) === -1;
    });
    const self = this;

    if (pinned.length) {
      this.tipsEl.createSpan({ text: 'Закреплено: ' });
      pinned.slice(0, 5).forEach(function (pq, i) {
        if (i) self.tipsEl.createSpan({ text: ' · ' });
        const b = self.tipsEl.createEl('button', { cls: 'glyph-so-recent glyph-so-pinned', text: pq });
        b.title = 'Shift+click to unpin';
        b.addEventListener('click', function (e) {
          if (e.shiftKey) {
            self.plugin.unpinQuery(pq);
            self.renderTips();
            return;
          }
          self.inputEl.value = pq;
          self.updateSuggest(pq);
          self.render(pq);
        });
      });
      if (recent.length) this.tipsEl.createSpan({ text: ' · ' });
    }

    if (!recent.length && !pinned.length) {
      this.tipsEl.setText('Glyph: раскладка + транслит · path:папка · tag:тег · Shift+click recent to pin');
      return;
    }

    if (recent.length) {
      this.tipsEl.createSpan({ text: 'Недавно: ' });
      recent.slice(0, 5).forEach(function (rq, i) {
        if (i) self.tipsEl.createSpan({ text: ' · ' });
        const b = self.tipsEl.createEl('button', { cls: 'glyph-so-recent', text: rq });
        b.title = 'Shift+click to pin';
        b.addEventListener('click', function (e) {
          if (e.shiftKey) {
            self.plugin.pinQuery(rq);
            self.renderTips();
            return;
          }
          self.inputEl.value = rq;
          self.updateSuggest(rq);
          self.render(rq);
        });
      });
    }
  }

  highlight(rows) {
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('is-active', i === this.active);
      if (i === this.active) rows[i].scrollIntoView({ block: 'nearest' });
    }
  }

  renderResultRow(row, rowIndex) {
    const self = this;
    const it = row.it;
    const el = self.listEl.createEl('div', { cls: 'glyph-so-row' });
    if (rowIndex === self.active) el.addClass('is-active');
    el.createEl('div', { cls: 'glyph-so-title', text: it.title() });
    el.createEl('div', { cls: 'glyph-so-sub', text: it.sub });
    if (row.snippet && row.snippet.text) renderHighlightedSnippet(el, row.snippet);
    attachHoverPreview(el, row);
    el.addEventListener('click', function () {
      self.openItem(it, false);
    });
    return el;
  }

  async render(q) {
    const gen = ++this._renderGen;
    if (!this._ready && !this.plugin.indexReady) {
      this.listEl.empty();
      this.listEl.createEl('div', { text: 'Индексируем заметки…', cls: 'glyph-so-empty' });
      if (this.countEl) this.countEl.setText('');
      this.updateLayoutHint('');
      this.updateFooter();
      return;
    }
    this.items = this.plugin.indexItems;
    let query = normalizeQuery(q);
    this.updateLayoutHint(query);
    if (this.plugin.settings.useOllamaEnrich && query.length > 2 && this._ollamaEnrichFor === query) {
      const ok = await ollamaAvailable({ ollamaUrl: this.plugin.settings.ollamaUrl });
      if (ok) {
        const enriched = await ollamaJson(
          {
            prompt:
              'Expand Obsidian search into keywords. JSON only: {"q":"keyword1 keyword2"}\nQuery: ' +
              query,
          },
          {
            ollamaUrl: this.plugin.settings.ollamaUrl,
            model: this.plugin.settings.ollamaModel,
            timeoutMs: 6000,
          }
        );
        if (enriched && enriched.q) query = normalizeQuery(enriched.q);
      }
    }
    if (gen !== this._renderGen) return;

    this._ranked = rankGlyphResults(this.items, query, this.plugin.settings, {
      limit: 40,
      onDiagnostics: (d) => {
        this._lastDiagnostics = d;
      },
    });
    const trimmed = normalizeQuery(query);
    this._lastQuery = trimmed;
    this.updateFooter();
    this.listEl.empty();
    const self = this;
    if (trimmed && this.plugin.rememberQuery) this.plugin.rememberQuery(trimmed);

    if (this.countEl) {
      const stats = formatSearchStats(
        this._ranked,
        this.items.length,
        this._lastDiagnostics && this._lastDiagnostics.elapsedMs,
        this._lastDiagnostics
      );
      this.countEl.setText(trimmed ? stats : '');
    }

    const grouped = this.plugin.settings.groupByFolder
      ? groupResultsByFolder(this._ranked)
      : [{ folder: '', rows: this._ranked }];
    let rowIndex = 0;
    grouped.forEach(function (group) {
      if (self.plugin.settings.groupByFolder) {
        const label = group.folder || '(root)';
        self.listEl.createEl('div', { cls: 'glyph-so-folder', text: '📁 ' + label });
      }
      group.rows.forEach(function (row) {
        self.renderResultRow(row, rowIndex);
        rowIndex++;
      });
    });

    if (!this._ranked.length && trimmed) {
      const alt = queryAlternatives(trimmed, this.plugin.settings);
      const hint =
        alt.length > 1
          ? ' Попробуйте: ' + alt.slice(1).join(' · ')
          : '';
      this.listEl.createEl('div', {
        cls: 'glyph-so-empty',
        text: 'Ничего не найдено.' + hint,
      });
    } else if (!this._ranked.length) {
      this.listEl.createEl('div', {
        cls: 'glyph-so-empty',
        text: 'Введите слово из заметки — как в боковом поиске Obsidian',
      });
    }
  }

  openItem(it, newTab) {
    const query = this._lastQuery || '';
    const settings = this.plugin.settings;
    const leaf = newTab ? this.app.workspace.getLeaf('tab') : this.app.workspace.getLeaf(false);
    leaf.openFile(it.file).then(function () {
      const view = leaf.view;
      const editor = view && view.editor;
      if (!editor) return;
      const match = findFirstMatchOffset(editor, query, settings);
      if (match) {
        editor.setSelection(match.from, match.to);
        editor.scrollIntoView(match.from, match.to);
      }
    });
    this.close();
  }
}

class GlyphSoPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.indexItems = [];
    this.indexReady = false;
    this._indexPromise = null;

    warnIfVendorEngineMismatch(this.manifest);

    this.addSettingTab(new GlyphSoSettingTab(this.app, this));
    this.addRibbonIcon('search', 'Glyph Search (полный текст)', () => this.openSearch());
    this.addCommand({
      id: 'glyph-s-o-search',
      name: 'Glyph: search vault (full text)',
      hotkeys: [
        { modifiers: ['Mod', 'Shift'], key: 'g' },
        { modifiers: ['Mod', 'Alt'], key: 'g' },
        { modifiers: ['Mod', 'Shift'], key: 'f' },
      ],
      callback: () => this.openSearch(),
    });

    this.registerEvent(
      this.app.vault.on('create', () => this.scheduleIndexRebuild())
    );
    this.registerEvent(
      this.app.vault.on('delete', () => this.scheduleIndexRebuild())
    );
    this.registerEvent(
      this.app.vault.on('rename', () => this.scheduleIndexRebuild())
    );
    this.registerEvent(
      this.app.vault.on('modify', (f) => this.scheduleIndexRebuild(f))
    );

    this.recentQueries = this.settings.recentQueries || [];
    this.pinnedQueries = this.settings.pinnedQueries || [];
    this.ensureIndex();
    if (!this.settings.hideHotkeyHint) {
      new Notice(
        'Glyph Search: назначьте горячую клавишу в Настройки → Горячие клавиши → «Glyph: search vault». Или иконка 🔍 на ленте.',
        9000
      );
    }
  }

  rememberQuery(q) {
    const list = (this.recentQueries || []).filter(function (x) {
      return x !== q;
    });
    list.unshift(q);
    this.recentQueries = list.slice(0, 8);
    this.settings.recentQueries = this.recentQueries;
    this.saveSettings();
  }

  pinQuery(q) {
    const query = String(q || '').trim();
    if (!query) return;
    const pinned = (this.pinnedQueries || []).filter(function (x) {
      return x !== query;
    });
    pinned.unshift(query);
    this.pinnedQueries = pinned.slice(0, 8);
    this.settings.pinnedQueries = this.pinnedQueries;
    this.saveSettings();
  }

  unpinQuery(q) {
    const query = String(q || '').trim();
    this.pinnedQueries = (this.pinnedQueries || []).filter(function (x) {
      return x !== query;
    });
    this.settings.pinnedQueries = this.pinnedQueries;
    this.saveSettings();
  }

  openSearch() {
    new GlyphSearchModal(this.app, this).open();
  }

  scheduleIndexRebuild(file) {
    const self = this;
    if (file && this.indexReady) {
      clearTimeout(this._fileTimer);
      this._fileTimer = setTimeout(function () {
        indexOneFile(self.app, file).then(function (item) {
          if (!item) return;
          const ix = self.indexItems.findIndex(function (x) {
            return x.sub === item.sub;
          });
          if (ix >= 0) self.indexItems[ix] = item;
          else self.indexItems.push(item);
          self.persistIndexDebounced();
        });
      }, 400);
      return;
    }
    clearTimeout(this._rebuildTimer);
    this._rebuildTimer = setTimeout(function () {
      self.indexReady = false;
      self._indexPromise = null;
      self.ensureIndex();
    }, 2500);
  }

  persistIndexDebounced() {
    const self = this;
    if (self.settings.persistIndex === false) return;
    clearTimeout(self._persistTimer);
    self._persistTimer = setTimeout(function () {
      saveIndexCache(self, entriesMapFromItems(self.indexItems)).catch(function () {});
    }, 1200);
  }

  ensureIndex() {
    if (this._indexPromise) return this._indexPromise;
    const self = this;
    this._indexPromise = buildVaultIndex(this.app, this)
      .then(function (items) {
        self.indexItems = items;
        self.indexReady = true;
        self._indexPromise = null;
        return items;
      })
      .catch(function () {
        self._indexPromise = null;
        self.indexReady = false;
      });
    return this._indexPromise;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

module.exports = GlyphSoPlugin;

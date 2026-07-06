const {
  Plugin,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  prepareSimpleSearch,
} = require('obsidian');

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

function tokenizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .split(/[\s#./_\-]+/)
    .filter((t) => t.length > 0);
}

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

const LAT2CYR = {
  sh: 'ш', ch: 'ч', zh: 'ж', ya: 'я', yo: 'ё', yu: 'ю', ye: 'е',
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и',
  y: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', w: 'в', x: 'кс', j: 'дж', q: 'к',
};
const CYR2LAT = {};
Object.keys(LAT2CYR).forEach((k) => {
  const v = LAT2CYR[k];
  if (!CYR2LAT[v] || k.length > CYR2LAT[v].length) CYR2LAT[v] = k;
});

function latinToCyrillicRough(s) {
  let x = String(s || '').toLowerCase();
  let out = '';
  let i = 0;
  while (i < x.length) {
    let matched = false;
    for (let len = 2; len >= 1; len--) {
      const part = x.slice(i, i + len);
      if (LAT2CYR[part]) {
        out += LAT2CYR[part];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += x.charAt(i);
      i++;
    }
  }
  return out;
}

function cyrillicToLatinRough(s) {
  let x = String(s || '').toLowerCase();
  const keys = Object.keys(CYR2LAT).sort((a, b) => b.length - a.length);
  let out = '';
  let i = 0;
  while (i < x.length) {
    let matched = false;
    for (let ki = 0; ki < keys.length; ki++) {
      const cyr = keys[ki];
      if (x.slice(i, i + cyr.length) === cyr) {
        out += CYR2LAT[cyr];
        i += cyr.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += x.charAt(i);
      i++;
    }
  }
  return out;
}

function expandTokenVariants(tok, settings) {
  const set = new Set();
  const t = String(tok || '').toLowerCase().trim();
  if (!t) return [];
  set.add(t);
  if (settings && settings.fuzzyLayout !== false) {
    const ru = swapKeyboardEnToRu(t);
    const en = swapKeyboardRuToEn(t);
    if (ru && ru !== t) set.add(ru);
    if (en && en !== t) set.add(en);
  }
  if (settings && settings.fuzzyTransliteration !== false) {
    const cyr = latinToCyrillicRough(t);
    const lat = cyrillicToLatinRough(t);
    if (cyr && cyr !== t) set.add(cyr);
    if (lat && lat !== t) set.add(lat);
  }
  return Array.from(set).filter((v) => v.length >= 1);
}

function tokenMatchesText(tok, text, settings) {
  const low = String(text || '').toLowerCase();
  const t = String(tok || '').toLowerCase();
  if (t.length && low.indexOf(t) >= 0) return { ok: true, variant: t, score: 80, literal: true };
  const variants = expandTokenVariants(tok, settings);
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.length && low.indexOf(v) >= 0) return { ok: true, variant: v, score: 65 };
  }
  if (t.length >= 3) {
    const fuzzy = bigramOverlap(t, low.replace(/\s+/g, ''));
    if (fuzzy >= 0.4) return { ok: true, variant: t, score: Math.round(20 * fuzzy) };
  }
  return { ok: false, score: 0 };
}

function findSnippet(blob, tok, settings) {
  const low = String(blob || '');
  const tryList = [String(tok || '').toLowerCase()].concat(expandTokenVariants(tok, settings));
  for (let i = 0; i < tryList.length; i++) {
    const v = tryList[i];
    if (!v) continue;
    const idx = low.indexOf(v);
    if (idx < 0) continue;
    const sliceStart = Math.max(0, idx - 28);
    const sliceEnd = Math.min(low.length, idx + v.length + 52);
    const slice = low.slice(sliceStart, sliceEnd).replace(/\n/g, ' ');
    const prefix = sliceStart > 0 ? '…' : '';
    const text = prefix + slice + '…';
    const hit = text.indexOf(v);
    if (hit < 0) continue;
    return {
      text: text,
      match: text.slice(hit, hit + v.length),
      start: hit,
      end: hit + v.length,
    };
  }
  return { text: '', match: '', start: -1, end: -1 };
}

function normalizeQuery(q) {
  if (q == null) return '';
  if (Array.isArray(q)) return q.map(String).join(' ').trim();
  if (typeof q === 'object') return String(q.q || q.query || '').trim();
  return String(q).trim();
}

function expandQueryVariants(rawQ, settings) {
  const q = String(rawQ || '').trim();
  if (!q) return [];
  const set = new Set([q]);
  if (settings && settings.fuzzyLayout !== false) {
    const ru = swapKeyboardEnToRu(q);
    const en = swapKeyboardRuToEn(q);
    if (ru !== q) set.add(ru);
    if (en !== q) set.add(en);
  }
  if (settings && settings.fuzzyTransliteration !== false) {
    const cyr = latinToCyrillicRough(q);
    const lat = cyrillicToLatinRough(q);
    if (cyr !== q) set.add(cyr);
    if (lat !== q) set.add(lat);
  }
  return Array.from(set);
}

function obsidianSearchScore(blob, query) {
  if (!prepareSimpleSearch || !query) return null;
  const fn = prepareSimpleSearch(query);
  if (!fn) return null;
  const res = fn(blob);
  if (!res) return null;
  return { score: 95 + (res.score || 0), result: res };
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

function contextBoost(bodyText, tokens, settings) {
  if (!bodyText || !tokens.length) return 0;
  const chunks = String(bodyText).toLowerCase().split(/\n{2,}/);
  let best = 0;
  for (let ci = 0; ci < chunks.length; ci++) {
    let hit = 0;
    for (let ti = 0; ti < tokens.length; ti++) {
      if (tokenMatchesText(tokens[ti], chunks[ci], settings).ok) hit++;
    }
    if (hit > best) best = hit;
  }
  if (best >= 2) return 35 + best * 12;
  if (best === 1 && tokens.length === 1) return 8;
  return 0;
}

function parseSearchQuery(raw) {
  const parts = String(raw || '').trim().split(/\s+/);
  const filters = { type: null, page: null, app: null, path: null, tag: null, tokens: [] };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const m = p.match(/^(type|page|app|path|tag):(.+)$/i);
    if (m) {
      let val = m[2].toLowerCase();
      if (m[1].toLowerCase() === 'tag') val = val.replace(/^#/, '');
      filters[m[1].toLowerCase()] = val;
    } else filters.tokens.push(p.toLowerCase());
  }
  return filters;
}

const CAT_PRIORITY = { page: 40, app: 32, release: 30, note: 28, action: 24, news: 20 };

function bigramOverlap(a, b) {
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Set();
  for (let i = 0; i < a.length - 1; i++) grams.add(a.slice(i, i + 2));
  let hit = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (grams.has(b.slice(i, i + 2))) hit++;
  }
  return hit / Math.max(1, b.length - 1);
}

function matchesSearchFilters(it, filters) {
  if (!filters) return true;
  const path = (it.sub || '').toLowerCase();
  const blob = it.searchBlob || '';
  if (filters.path && path.indexOf(filters.path) < 0) return false;
  if (filters.tag) {
    const t = filters.tag.replace(/^#/, '');
    if (blob.indexOf('#' + t) < 0 && blob.indexOf(' ' + t + ' ') < 0 && blob.indexOf('\n' + t) < 0) {
      if (blob.indexOf(t) < 0) return false;
    }
  }
  if (filters.type === 'release' && it.cat !== 'release') return false;
  if (filters.page) {
    const hash = (it.hash || '').toLowerCase();
    const title = typeof it.title === 'function' ? it.title().toLowerCase() : '';
    if (hash.indexOf(filters.page) < 0 && title.indexOf(filters.page) < 0) return false;
  }
  if (filters.app) {
    const slug = (it.hash || '').replace('#project/', '').toLowerCase();
    const title = typeof it.title === 'function' ? it.title().toLowerCase() : '';
    const keys = (it.keys || []).join(' ').toLowerCase();
    if (it.cat === 'app' && slug.indexOf(filters.app) < 0 && title.indexOf(filters.app) < 0)
      return false;
    if (it.cat !== 'app' && keys.indexOf(filters.app) < 0) return false;
  }
  return true;
}

function scoreSearchItem(it, tokens, filters, settings) {
  if (filters && !matchesSearchFilters(it, filters)) return 0;
  settings = settings || {};
  const blob = it.searchBlob || '';
  const title = it.title().toLowerCase();

  if (!tokens.length) return CAT_PRIORITY[it.cat] != null ? CAT_PRIORITY[it.cat] : 10;

  let matchedCount = 0;
  let score = 0;
  let bestSnippet = '';

  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];
    if (!tok || tok.length < 1) continue;
    const hit = tokenMatchesText(tok, blob, settings);
    if (hit.ok) {
      matchedCount++;
      score += hit.score;
      if (title.indexOf(tok) >= 0 || title.indexOf(hit.variant) >= 0) score += 40;
      const sn = findSnippet(blob, tok, settings);
      if (sn.text && sn.text.length > bestSnippet.length) bestSnippet = sn.text;
    }
  }

  if (settings.matchAllWords !== false && tokens.length > 1 && matchedCount < tokens.length) {
    return 0;
  }
  if (matchedCount === 0) return 0;

  score += contextBoost(blob, tokens, settings);
  const phrase = tokens.join(' ');
  if (phrase.length > 2 && blob.indexOf(phrase) >= 0) score += 90;

  it._snippet = bestSnippet;
  return score;
}

function quickMatchBlob(blob, rawQ, settings) {
  if (!rawQ) return true;
  const variants = expandQueryVariants(rawQ, settings);
  for (let i = 0; i < variants.length; i++) {
    if (blob.indexOf(variants[i].toLowerCase()) >= 0) return true;
  }
  return false;
}

function rankSearchItems(items, q, opts) {
  opts = opts || {};
  const rawQ = normalizeQuery(q);
  const filters = parseSearchQuery(rawQ);
  const tokens = filters.tokens.length ? filters.tokens : tokenizeQuery(rawQ);
  const limit = opts.limit != null ? opts.limit : 40;
  const settings = opts.settings || {};
  const queryVariants = rawQ ? expandQueryVariants(rawQ, settings) : [];
  const activePath = opts.activePath || '';

  let pool = items;
  if (rawQ) {
    pool = items.filter(function (it) {
      if (!matchesSearchFilters(it, filters)) return false;
      return quickMatchBlob(it.searchBlob, rawQ, settings);
    });
  }

  if (!rawQ) {
    return pool
      .slice()
      .sort(function (a, b) {
        return (b.mtime || 0) - (a.mtime || 0);
      })
      .slice(0, 12)
      .map(function (it) {
        return { it: it, score: 1, snippet: { text: '', match: '' } };
      });
  }

  return pool
    .map(function (it) {
      let score = 0;

      for (let qi = 0; qi < queryVariants.length; qi++) {
        const obs = obsidianSearchScore(it.searchBlob, queryVariants[qi]);
        if (obs && obs.score > score) score = obs.score + (qi > 0 ? 5 : 0);
      }

      const glyphScore = scoreSearchItem(it, tokens, filters, settings);
      if (glyphScore > score) score = glyphScore;
      if (activePath && it.sub === activePath) score += 25;

      const tok = tokens[0] || rawQ;
      const sn = score > 0 ? findSnippet(it.searchBlob, tok, settings) : { text: '', match: '' };

      return { it: it, score: score, snippet: sn };
    })
    .filter(function (x) {
      return x.score > 0;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, limit);
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

async function ollamaAvailable(options) {
  options = options || {};
  const baseUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  try {
    const res = await fetch(baseUrl + '/api/tags', { method: 'GET' });
    return res.ok;
  } catch (e) {
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
  } catch (e) {
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
  hideHotkeyHint: false,
  recentQueries: [],
};

class GlyphSoSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Glyph Search-O 2.3' });
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

async function buildVaultIndex(app) {
  const files = app.vault.getMarkdownFiles();
  const items = [];
  const batch = 32;
  for (let i = 0; i < files.length; i += batch) {
    const slice = files.slice(i, i + batch);
    const chunk = await Promise.all(
      slice.map(function (f) {
        return indexOneFile(app, f);
      })
    );
    for (let c = 0; c < chunk.length; c++) {
      if (chunk[c]) items.push(chunk[c]);
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
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('glyph-so-modal');
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

  renderTips() {
    if (!this.tipsEl) return;
    this.tipsEl.empty();
    const recent = this.plugin.recentQueries || [];
    if (!recent.length) {
      this.tipsEl.setText('Glyph: раскладка + транслит · path:папка · tag:тег · не путать с Ctrl+O');
      return;
    }
    this.tipsEl.createSpan({ text: 'Недавно: ' });
    const self = this;
    recent.slice(0, 5).forEach(function (rq, i) {
      if (i) self.tipsEl.createSpan({ text: ' · ' });
      const b = self.tipsEl.createEl('button', { cls: 'glyph-so-recent', text: rq });
      b.addEventListener('click', function () {
        self.inputEl.value = rq;
        self.render(rq);
      });
    });
  }

  highlight(rows) {
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('is-active', i === this.active);
      if (i === this.active) rows[i].scrollIntoView({ block: 'nearest' });
    }
  }

  async render(q) {
    const gen = ++this._renderGen;
    if (!this._ready && !this.plugin.indexReady) {
      this.listEl.empty();
      this.listEl.createEl('div', { text: 'Индексируем заметки…', cls: 'glyph-so-empty' });
      if (this.countEl) this.countEl.setText('');
      return;
    }
    this.items = this.plugin.indexItems;
    let query = normalizeQuery(q);
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

    const active = this.app.workspace.getActiveFile();
    this._ranked = rankSearchItems(this.items, query, {
      limit: 40,
      settings: this.plugin.settings,
      activePath: active ? active.path : '',
    });
    this.listEl.empty();
    const self = this;
    const trimmed = normalizeQuery(query);
    if (trimmed && this.plugin.rememberQuery) this.plugin.rememberQuery(trimmed);

    if (this.countEl) {
      this.countEl.setText(trimmed ? 'Найдено: ' + this._ranked.length : '');
    }

    this._ranked.forEach(function (row, i) {
      const it = row.it;
      const el = self.listEl.createEl('div', { cls: 'glyph-so-row' });
      if (i === self.active) el.addClass('is-active');
      el.createEl('div', { cls: 'glyph-so-title', text: it.title() });
      el.createEl('div', { cls: 'glyph-so-sub', text: it.sub });
      if (row.snippet && row.snippet.text) renderHighlightedSnippet(el, row.snippet);
      el.addEventListener('click', function () {
        self.openItem(it, false);
      });
    });

    if (!this._ranked.length && trimmed) {
      const alt = expandQueryVariants(trimmed, this.plugin.settings);
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
    const leaf = newTab ? this.app.workspace.getLeaf('tab') : this.app.workspace.getLeaf(false);
    leaf.openFile(it.file);
    this.close();
  }
}

class GlyphSoPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.indexItems = [];
    this.indexReady = false;
    this._indexPromise = null;

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

  ensureIndex() {
    if (this._indexPromise) return this._indexPromise;
    const self = this;
    this._indexPromise = buildVaultIndex(this.app)
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

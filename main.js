const { Plugin, Modal, Notice, PluginSettingTab, Setting } = require('obsidian');

/* --- inlined Glyph-S + Ollama (no vendor/) --- */
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

function tokenizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .split(/[\s#./_\-]+/)
    .filter((t) => t.length > 0);
}

/** EN keyboard → RU (wrong layout: ufdthlf → гаверда). */
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

/** Rough Latin ↔ Cyrillic (gaverda ↔ гаверда). */
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
  return Array.from(set).filter((v) => v.length >= 2);
}

function tokenMatchesText(tok, text, settings) {
  const low = String(text || '').toLowerCase();
  const variants = expandTokenVariants(tok, settings);
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (low.indexOf(v) >= 0) return { ok: true, variant: v, score: 60 };
  }
  const fuzzy = bigramOverlap(tok, low.replace(/\s+/g, ''));
  if (fuzzy >= 0.4) return { ok: true, variant: tok, score: Math.round(20 * fuzzy) };
  for (let i = 0; i < variants.length; i++) {
    const f2 = bigramOverlap(variants[i], low.replace(/\s+/g, ''));
    if (f2 >= 0.45) return { ok: true, variant: variants[i], score: Math.round(22 * f2) };
  }
  return { ok: false, score: 0 };
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
  const filters = { type: null, page: null, app: null, tokens: [] };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const m = p.match(/^(type|page|app):(.+)$/i);
    if (m) filters[m[1].toLowerCase()] = m[2].toLowerCase();
    else filters.tokens.push(p.toLowerCase());
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
  const title = it.title().toLowerCase();
  const sub = (it.sub || '').toLowerCase();
  const keys = (it.keys || []).join(' ').toLowerCase();
  const body = (typeof it.body === 'function' ? it.body() : it.body || '').toLowerCase();
  const blob = title + ' ' + sub + ' ' + keys + ' ' + body;

  if (!tokens.length) return CAT_PRIORITY[it.cat] != null ? CAT_PRIORITY[it.cat] : 10;

  let matchedCount = 0;
  let score = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];
    const inTitle = tokenMatchesText(tok, title, settings);
    const inSub = tokenMatchesText(tok, sub, settings);
    const inBody = tokenMatchesText(tok, body, settings);
    const inKeys = tokenMatchesText(tok, keys, settings);
    const hit = inTitle.ok || inSub.ok || inBody.ok || inKeys.ok;
    if (hit) {
      matchedCount++;
      if (inTitle.ok) score += 90 + inTitle.score;
      else if (inSub.ok) score += 70 + inSub.score;
      else if (inBody.ok) score += 55 + inBody.score;
      else score += 40 + inKeys.score;
      if (inTitle.variant && inTitle.variant !== tok) score += 15;
      if (inBody.variant && inBody.variant !== tok) score += 12;
    }
  }

  if (settings.matchAllWords !== false && tokens.length > 1 && matchedCount < tokens.length) {
    return 0;
  }
  if (matchedCount === 0) return 0;

  score += contextBoost(body, tokens, settings);

  const phrase = tokens.join(' ');
  if (phrase.length > 2 && body.indexOf(phrase) >= 0) score += 80;

  return score;
}

function rankSearchItems(items, q, opts) {
  opts = opts || {};
  const filters = parseSearchQuery(q);
  const tokens = filters.tokens.length ? filters.tokens : tokenizeQuery(q);
  const limit = opts.limit != null ? opts.limit : 20;
  const settings = opts.settings || {};
  return items
    .map(function (it) {
      return { it: it, score: scoreSearchItem(it, tokens, filters, settings) };
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
  }
}

class GlyphSearchModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.items = [];
    this.active = 0;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('glyph-so-modal');
    contentEl.createEl('h2', { text: 'Glyph Search 2.3-O' });
    this.inputEl = contentEl.createEl('input', {
      type: 'search',
      cls: 'glyph-so-input',
      attr: { placeholder: 'Search… each word · gaverda → гаверда · ufdthlf' },
    });
    this.hintEl = contentEl.createEl('div', {
      cls: 'glyph-so-hint',
      text: 'Indexing vault…',
    });
    this.listEl = contentEl.createEl('div');
    const self = this;
    this.buildIndex().then(function () {
      if (self.hintEl) self.hintEl.setText('Each word matched · layout · translit · context');
      self.inputEl.focus();
      self.render('');
    });
    this.inputEl.addEventListener('input', function () {
      self.active = 0;
      self.render(self.inputEl.value);
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
        self.openItem(self._ranked[self.active].it);
      }
    });
  }

  async buildIndex() {
    const self = this;
    const files = this.app.vault.getMarkdownFiles();
    this.items = [];
    for (let fi = 0; fi < files.length; fi++) {
      const f = files[fi];
      const cache = self.app.metadataCache.getFileCache(f);
      const headings =
        cache && cache.headings
          ? cache.headings.map(function (h) {
              return h.heading;
            }).join(' ')
          : '';
      const tags =
        cache && cache.tags
          ? cache.tags.map(function (t) {
              return t.tag;
            }).join(' ')
          : '';
      let bodyText = '';
      try {
        bodyText = await self.app.vault.cachedRead(f);
      } catch (e) {
        bodyText = '';
      }
      const preview = bodyText.slice(0, 12000);
      this.items.push({
        cat: 'note',
        title: function () {
          return f.basename;
        },
        sub: f.path,
        hash: f.path,
        keys: [f.basename, f.path, headings, tags],
        body: function () {
          return preview + ' ' + headings + ' ' + tags;
        },
        file: f,
      });
    }
  }

  highlight(rows) {
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('is-active', i === this.active);
    }
  }

  async render(q) {
    let query = q;
    if (this.plugin.settings.useOllamaEnrich && q.trim().length > 2) {
      const ok = await ollamaAvailable({ ollamaUrl: this.plugin.settings.ollamaUrl });
      if (ok) {
        const enriched = await ollamaJson(
          {
            prompt:
              'Expand Obsidian search into keywords. JSON only: {"q":"keyword1 keyword2"}\nQuery: ' + q,
          },
          {
            ollamaUrl: this.plugin.settings.ollamaUrl,
            model: this.plugin.settings.ollamaModel,
            timeoutMs: 8000,
          }
        );
        if (enriched && enriched.q) query = enriched.q;
      }
    }

    this._ranked = rankSearchItems(this.items, query, {
      limit: 20,
      settings: this.plugin.settings,
    });
    this.listEl.empty();
    const self = this;
    this._ranked.forEach(function (row, i) {
      const it = row.it;
      const el = self.listEl.createEl('div', { cls: 'glyph-so-row' });
      if (i === self.active) el.addClass('is-active');
      el.createEl('div', { text: it.title() });
      el.createEl('div', { cls: 'glyph-so-sub', text: it.sub });
      el.addEventListener('click', function () {
        self.openItem(it);
      });
    });
    if (!this._ranked.length) {
      this.listEl.createEl('div', { text: 'No results', cls: 'glyph-so-sub' });
    }
  }

  openItem(it) {
    this.app.workspace.openLinkText(it.file.path, '', false);
    this.close();
  }
}

class GlyphSoPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new GlyphSoSettingTab(this.app, this));
    this.addCommand({
      id: 'glyph-s-o-search',
      name: 'Glyph: search vault',
      hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      callback: () => new GlyphSearchModal(this.app, this).open(),
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

module.exports = GlyphSoPlugin;

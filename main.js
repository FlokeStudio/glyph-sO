const { Plugin, Modal, Notice, PluginSettingTab, Setting } = require('obsidian');
const {
  rankSearchItems,
  tokenizeQuery,
} = require('./vendor/engine.cjs');
const {
  ollamaJson,
  ollamaAvailable,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OLLAMA_MODEL,
} = require('./vendor/ollama.cjs');

const DEFAULT_SETTINGS = {
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  useOllamaEnrich: false,
};

class GlyphSoSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin.containerEl);
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
      attr: { placeholder: 'Search notes… type:note page:folder' },
    });
    this.listEl = contentEl.createEl('div');
    this.buildIndex();
    this.inputEl.focus();
    this.inputEl.addEventListener('input', () => {
      this.active = 0;
      this.render(this.inputEl.value);
    });
    this.inputEl.addEventListener('keydown', (e) => {
      const rows = this.listEl.querySelectorAll('.glyph-so-row');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.active = Math.min(this.active + 1, rows.length - 1);
        this.highlight(rows);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.active = Math.max(this.active - 1, 0);
        this.highlight(rows);
      }
      if (e.key === 'Enter' && this._ranked[this.active]) {
        this.openItem(this._ranked[this.active].it);
      }
    });
    this.render('');
  }

  buildIndex() {
    this.items = this.app.vault.getMarkdownFiles().map((f) => {
      const cache = this.app.metadataCache.getFileCache(f);
      const headings = (cache?.headings || []).map((h) => h.heading).join(' ');
      const tags = (cache?.tags || []).map((t) => t.tag).join(' ');
      return {
        cat: 'note',
        title: () => f.basename,
        sub: f.path,
        hash: f.path,
        keys: [f.basename, f.path, headings, tags],
        body: () => `${headings} ${tags}`,
        file: f,
      };
    });
  }

  highlight(rows) {
    rows.forEach((r, i) => r.classList.toggle('is-active', i === this.active));
  }

  async render(q) {
    let query = q;
    if (this.plugin.settings.useOllamaEnrich && q.trim().length > 2) {
      const ok = await ollamaAvailable({ ollamaUrl: this.plugin.settings.ollamaUrl });
      if (ok) {
        const enriched = await ollamaJson(
          {
            prompt: `Expand Obsidian search into keywords. JSON only: {"q":"keyword1 keyword2"}\nQuery: ${q}`,
          },
          {
            ollamaUrl: this.plugin.settings.ollamaUrl,
            model: this.plugin.settings.ollamaModel,
            timeoutMs: 8000,
          }
        );
        if (enriched?.q) query = enriched.q;
      }
    }

    this._ranked = rankSearchItems(this.items, query, { limit: 20 });
    this.listEl.empty();
    this._ranked.forEach(({ it }, i) => {
      const row = this.listEl.createEl('div', { cls: 'glyph-so-row' });
      if (i === this.active) row.addClass('is-active');
      row.createEl('div', { text: it.title() });
      row.createEl('div', { cls: 'glyph-so-sub', text: it.sub });
      row.addEventListener('click', () => this.openItem(it));
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

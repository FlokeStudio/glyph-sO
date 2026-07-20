/** Persistent vault index cache (plugin dir index-cache.json). */

const INDEX_CACHE_VERSION = 1;

function serializeEntry(item) {
  if (!item || !item.sub) return null;
  return {
    sub: item.sub,
    hash: item.hash || item.sub,
    cat: item.cat || 'note',
    mtime: item.mtime || 0,
    searchBlob: item.searchBlob || '',
    bodyRaw: item.bodyRaw || '',
    keys: Array.isArray(item.keys) ? item.keys : [],
    basename:
      typeof item.title === 'function'
        ? item.title()
        : String(item.title || ''),
  };
}

function hydrateEntry(app, row) {
  if (!row || !row.sub) return null;
  const f = app.vault.getAbstractFileByPath(row.sub);
  if (!f || !('extension' in f) || f.extension !== 'md') return null;
  const statMtime = f.stat ? f.stat.mtime : 0;
  if (row.mtime && statMtime && row.mtime !== statMtime) return null;
  const bodyText = row.bodyRaw || '';
  const basename = row.basename || f.basename;
  return {
    cat: row.cat || 'note',
    title: function () {
      return basename;
    },
    body: function () {
      return bodyText;
    },
    sub: row.sub,
    hash: row.hash || row.sub,
    keys: row.keys || [],
    searchBlob: row.searchBlob || '',
    bodyRaw: bodyText,
    file: f,
    mtime: statMtime || row.mtime || 0,
  };
}

function cachePath(plugin) {
  const dir = plugin && plugin.manifest ? plugin.manifest.dir : '';
  return dir ? `${dir}/index-cache.json` : null;
}

async function loadIndexCache(plugin) {
  const path = cachePath(plugin);
  if (!path) return null;
  try {
    const raw = await plugin.app.vault.adapter.read(path);
    const data = JSON.parse(raw);
    if (!data || data.version !== INDEX_CACHE_VERSION) return null;
    const engine = plugin.manifest.glyphEngineVersion || plugin.manifest.version;
    if (data.engineVersion && engine && data.engineVersion !== engine) return null;
    return data;
  } catch (e) {
    return null;
  }
}

async function saveIndexCache(plugin, entriesByPath) {
  const path = cachePath(plugin);
  if (!path) return;
  const engine = plugin.manifest.glyphEngineVersion || plugin.manifest.version || '';
  const payload = {
    version: INDEX_CACHE_VERSION,
    engineVersion: engine,
    savedAt: Date.now(),
    entries: entriesByPath,
  };
  await plugin.app.vault.adapter.write(path, JSON.stringify(payload));
}

function entriesMapFromItems(items) {
  const map = {};
  for (const it of items || []) {
    const row = serializeEntry(it);
    if (row) map[row.sub] = row;
  }
  return map;
}

module.exports = {
  INDEX_CACHE_VERSION,
  serializeEntry,
  hydrateEntry,
  cachePath,
  loadIndexCache,
  saveIndexCache,
  entriesMapFromItems,
};

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

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

async function ollamaAvailable(options = {}) {
  const baseUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function ollamaGenerate(req, options = {}) {
  const baseUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = options.model || DEFAULT_OLLAMA_MODEL;
  const timeout = options.timeoutMs ?? 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: req.format || 'json',
        prompt: req.prompt,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function ollamaJson(req, options = {}) {
  const text = await ollamaGenerate({ ...req, format: 'json' }, options);
  return text ? parseJsonLoose(text) : null;
}

module.exports = {
  DEFAULT_OLLAMA_URL,
  DEFAULT_OLLAMA_MODEL,
  parseJsonLoose,
  ollamaAvailable,
  ollamaGenerate,
  ollamaJson
};

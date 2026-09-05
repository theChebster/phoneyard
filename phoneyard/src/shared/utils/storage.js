/**
 * Storage layer.
 *
 * When this app runs inside a Claude.ai artifact, `window.storage` is provided
 * by the host and persists data server-side. When it runs as a standalone app
 * (e.g. `npm run dev`), we fall back to `localStorage` so everything still works.
 */

const hasHostStorage = typeof window !== 'undefined' && !!window.storage;

const localBackend = {
  async get(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error('not found');
    return { key, value: raw };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix = '') {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    return { keys };
  },
};

const backend = hasHostStorage ? window.storage : localBackend;

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getItem(key) {
  try {
    const r = await backend.get(key, true);
    return r ? JSON.parse(r.value) : null;
  } catch (e) {
    return null;
  }
}

export async function saveItem(key, value) {
  try {
    await backend.set(key, JSON.stringify(value), true);
  } catch (e) {
    console.error('save failed', e);
  }
}

export async function deleteItem(key) {
  try {
    await backend.delete(key, true);
  } catch (e) {
    console.error('delete failed', e);
  }
}

export async function listByPrefix(prefix) {
  try {
    const res = await backend.list(prefix, true);
    if (!res || !res.keys) return [];
    const items = [];
    for (const k of res.keys) {
      try {
        const r = await backend.get(k, true);
        if (r) items.push(JSON.parse(r.value));
      } catch (e) {
        // key vanished between list() and get() — skip it
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}

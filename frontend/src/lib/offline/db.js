// A tiny key-value store on top of IndexedDB (falls back to memory when IndexedDB is blocked,
// e.g. some private windows). Two stores: "cache" (saved copies of pages you opened) and
// "outbox" (changes made offline, waiting to be sent).
const NAME = 'learnmap-offline';
let dbp = null;
const mem = { cache: new Map(), outbox: new Map() };
let memSeq = 0;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

/** Runs `idb(store, done)` in a transaction, or `memory()` when IndexedDB isn't available. */
async function tx(storeName, mode, idb, memory) {
  const db = await open();
  if (!db) return memory();
  return new Promise((resolve) => {
    try {
      const t = db.transaction(storeName, mode);
      let out;
      idb(t.objectStore(storeName), (v) => { out = v; });
      t.oncomplete = () => resolve(out);
      t.onerror = () => resolve(undefined);
      t.onabort = () => resolve(undefined);
    } catch { resolve(memory()); }
  });
}
const req = (r, set) => { r.onsuccess = () => set(r.result); };

export const cacheGet = (key) => tx('cache', 'readonly', (os, set) => req(os.get(key), set), () => mem.cache.get(key));
/** `guard()` is checked at the moment of writing — a write that lost a race with "clear" is dropped. */
export const cachePut = (key, value, guard) => tx('cache', 'readwrite', (os) => { if (!guard || guard()) os.put(value, key); }, () => { if (!guard || guard()) mem.cache.set(key, value); });
export const cacheAll = () => tx('cache', 'readonly', (os, set) => {
  const out = [];
  const c = os.openCursor();
  c.onsuccess = () => { const cur = c.result; if (cur) { out.push({ key: cur.key, value: cur.value }); cur.continue(); } else set(out); };
}, () => [...mem.cache.entries()].map(([key, value]) => ({ key, value }))).then((v) => v || []);
export const cacheDelete = (key) => tx('cache', 'readwrite', (os) => os.delete(key), () => { mem.cache.delete(key); });
export const cacheClear = () => tx('cache', 'readwrite', (os) => os.clear(), () => { mem.cache.clear(); });

export const outboxAdd = (entry) => tx('outbox', 'readwrite', (os, set) => req(os.add(entry), set), () => { const id = ++memSeq; mem.outbox.set(id, { ...entry, id }); return id; });
export const outboxDelete = (id) => tx('outbox', 'readwrite', (os) => os.delete(id), () => { mem.outbox.delete(id); });
export const outboxAll = () => tx('outbox', 'readonly', (os, set) => req(os.getAll(), set), () => [...mem.outbox.values()]).then((v) => (v || []).sort((a, b) => a.id - b.id));
export const outboxClear = () => tx('outbox', 'readwrite', (os) => os.clear(), () => { mem.outbox.clear(); });

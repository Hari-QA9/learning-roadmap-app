// Offline mode.
//  • Every page you open saves a copy of its data on this device, so it still opens without internet.
//  • A few everyday changes work offline too — ticking tasks off, due dates, notes, review cards and
//    focus sessions. They wait in an "outbox" and are sent, in order, as soon as you're back online
//    (with the time they really happened, so streaks count on the right day).
//  • Everything is removed from the device when you log out.
import { useSyncExternalStore } from 'react';
import * as store from './db';

const MAX_ENTRY = 300 * 1024; // don't keep copies bigger than this
const MAX_ENTRIES = 400;

/* ---------- State the app can show (banner, pending count) ---------- */
let state = { offline: typeof navigator !== 'undefined' && navigator.onLine === false, pending: 0, syncing: false };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getOfflineState = () => state;
export function useOffline() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getOfflineState, getOfflineState);
}
const syncedListeners = new Set();
/** Called with { synced, failed } after queued changes were sent. */
export function onSynced(fn) { syncedListeners.add(fn); return () => syncedListeners.delete(fn); }

export const browserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const isNetworkError = (err) => !!err && !err.response && err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError';
export function markOffline() { if (!state.offline) set({ offline: true }); }
export function markOnline() {
  if (state.offline) set({ offline: false });
  if (state.pending) scheduleFlush(300);
}

/* ---------- Saved copies of GET responses ---------- */
const SKIP = /^\/(auth|admin)\b|^\/calendar\/(link|feed)|^\/account\/export/;
const pathOf = (url = '') => String(url).replace(/^https?:\/\/[^/]+/, '').replace(/^\/api(?=\/)/, '').split('?')[0];
export const cacheable = (url) => !SKIP.test(pathOf(url));
const keyFor = (uid, url, params) => `${uid}|${pathOf(url)}|${JSON.stringify(params || {})}`;

let writes = 0;
// Bumped whenever the device copy is wiped, so a request that started before logging out
// can't write its answer back afterwards.
let epoch = 0;
export const currentEpoch = () => epoch;
export async function saveCopy(uid, url, params, data, startedEpoch = epoch) {
  if (!uid || !cacheable(url) || startedEpoch !== epoch) return;
  // Adapters see the raw body (axios parses it afterwards) — keep it parsed so offline changes can be applied to it.
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
  let size = 0;
  try { size = JSON.stringify(data).length; } catch { return; }
  if (size > MAX_ENTRY || startedEpoch !== epoch) return;
  await store.cachePut(keyFor(uid, url, params), { data, at: Date.now() }, () => startedEpoch === epoch);
  if (++writes % 25 === 0) prune();
}
export async function readCopy(uid, url, params) {
  if (!uid) return null;
  return (await store.cacheGet(keyFor(uid, url, params))) || null;
}
async function prune() {
  const all = await store.cacheAll();
  if (all.length <= MAX_ENTRIES) return;
  all.sort((a, b) => (a.value?.at || 0) - (b.value?.at || 0));
  for (const e of all.slice(0, all.length - MAX_ENTRIES)) await store.cacheDelete(e.key);
}

/** Apply `fn(data, path)` to every saved copy of this member's data (used to reflect offline changes). */
async function patchCopies(uid, fn) {
  const started = epoch;
  const all = await store.cacheAll();
  for (const { key, value } of all) {
    if (!String(key).startsWith(`${uid}|`) || !value) continue;
    const path = String(key).split('|')[1];
    const next = fn(value.data, path);
    if (next !== undefined) await store.cachePut(key, { ...value, data: next }, () => started === epoch);
  }
}
/** Deep-merge `patch` into every object with this id that looks like `isIt`. Returns undefined if nothing changed. */
function patchObjects(data, isIt, patch) {
  let changed = false;
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      if (isIt(o)) { changed = true; return { ...o, ...patch }; }
      return o;
    }
    return v;
  };
  const out = walk(data);
  return changed ? out : undefined;
}

/* ---------- Changes that can wait for the connection ---------- */
const parseBody = (data) => { if (!data) return {}; if (typeof data === 'string') { try { return JSON.parse(data); } catch { return {}; } } return data; };
let tempSeq = 0;
const RULES = [
  {
    // Task status, due date, title, priority
    method: 'put', re: /^\/tasks\/(\d+)$/,
    reflect: (m, body) => {
      const id = Number(m[1]);
      const patch = {};
      for (const k of ['status', 'due_date', 'title', 'priority', 'description']) if (body[k] !== undefined) patch[k] = body[k];
      return (data) => patchObjects(data, (o) => Number(o.id) === id && 'status' in o && ('module_id' in o || 'due_date' in o), patch);
    },
    reply: () => ({ message: 'Saved on this device — it will sync when you’re back online', queued: true }),
  },
  { method: 'post', re: /^\/learning\/focus\/sessions$/, reply: (b) => ({ message: `${b.minutes} minutes saved — will sync when you’re online`, queued: true }) },
  {
    method: 'post', re: /^\/learning\/flashcards\/(\d+)\/review$/,
    reflect: (m) => { const id = Number(m[1]); return (data, path) => (path === '/learning/flashcards/due' && Array.isArray(data) ? data.filter((c) => Number(c.id) !== id) : path === '/learning/flashcards/due' && data && Array.isArray(data.cards) ? { ...data, cards: data.cards.filter((c) => Number(c.id) !== id) } : undefined); },
    reply: () => ({ message: 'Saved offline', queued: true }),
  },
  {
    method: 'post', re: /^\/notes$/,
    temp: true,
    reflect: (m, body, tempId) => (data, path) => (path === `/notes/${body.task_id}` && Array.isArray(data) ? [{ id: tempId, task_id: body.task_id, content: body.content, created_at: new Date().toISOString() }, ...data] : undefined),
    reply: (b, tempId) => ({ id: tempId, message: 'Note saved offline', queued: true }),
  },
];
export function queueRule(method, url) {
  const path = pathOf(url);
  for (const r of RULES) { if (r.method === method) { const m = path.match(r.re); if (m) return { ...r, match: m }; } }
  return null;
}

/** Saves the change in the outbox and returns a fake "accepted" reply for the page. */
export async function enqueue(uid, config, rule) {
  const body = parseBody(config.data);
  const tempId = rule.temp ? `offline-${Date.now()}-${++tempSeq}` : null;
  await store.outboxAdd({ uid, method: rule.method, url: pathOf(config.url), data: body, queuedAt: new Date().toISOString(), tempId });
  if (rule.reflect) await patchCopies(uid, rule.reflect(rule.match, body, tempId));
  await refreshPending(uid);
  markOffline();
  return {
    data: rule.reply(body, tempId), status: 202, statusText: 'Queued offline',
    headers: { 'x-offline': 'queued' }, config, request: {},
  };
}

// Notes written offline get a temporary id; once sent, remember the real one.
const realIds = new Map();
/** '/notes/offline-…' → '/notes/<real id>' once that note has been sent. */
export function resolveTempUrl(url) {
  const m = pathOf(url).match(/^\/notes\/(offline-[\w-]+)$/);
  return m && realIds.has(m[1]) ? `/notes/${realIds.get(m[1])}` : url;
}

/** Deleting a note that was written offline and never sent: just drop it from the outbox. */
export async function dropTempNote(uid, url) {
  const m = pathOf(url).match(/^\/notes\/(offline-[\w-]+)$/);
  if (!m) return false;
  const all = await store.outboxAll();
  for (const e of all) if (e.uid === uid && e.tempId === m[1]) await store.outboxDelete(e.id);
  await patchCopies(uid, (data) => (Array.isArray(data) && data.some((n) => n && n.id === m[1]) ? data.filter((n) => n.id !== m[1]) : undefined));
  await refreshPending(uid);
  return true;
}

let currentUid = null;
export async function refreshPending(uid = currentUid) {
  currentUid = uid;
  const all = await store.outboxAll();
  set({ pending: all.filter((e) => e.uid === uid).length });
}

/* ---------- Sending the outbox ---------- */
let send = null; // (config) => Promise — set by the API client
let getUid = () => null;
export function configure({ sender, uid }) { send = sender; getUid = uid; }

let flushing = null;
let timer = null;
function scheduleFlush(ms = 1000) { clearTimeout(timer); timer = setTimeout(() => { flush(); }, ms); }

export function flush() {
  if (flushing) return flushing;
  const uid = getUid();
  if (!uid || !send || browserOffline()) return Promise.resolve({ synced: 0, failed: 0 });
  flushing = (async () => {
    let synced = 0; let failed = 0;
    const entries = (await store.outboxAll()).filter((e) => e.uid === uid);
    if (!entries.length) return { synced, failed };
    set({ syncing: true });
    try {
      for (const e of entries) {
        try {
          const res = await send({ method: e.method, url: e.url, data: e.data, headers: { 'X-Queued-At': e.queuedAt }, offlineReplay: true });
          if (e.tempId && res?.data?.id) realIds.set(e.tempId, res.data.id);
          await store.outboxDelete(e.id);
          synced++;
        } catch (err) {
          const status = err.response?.status;
          if (isNetworkError(err) || status === 401 || status === 408 || status === 429 || status >= 500) { if (isNetworkError(err)) markOffline(); break; }
          await store.outboxDelete(e.id); // the server refused it (e.g. the task was deleted) — don't retry forever
          failed++;
        }
      }
    } finally {
      await refreshPending(uid);
      set({ syncing: false });
    }
    if (synced || failed) syncedListeners.forEach((fn) => fn({ synced, failed }));
    return { synced, failed };
  })().finally(() => { flushing = null; });
  return flushing;
}

/** Remove the saved copies (always on logout) and, with `outbox`, unsent changes too. */
export async function clearOffline({ outbox = false, keepUid = null } = {}) {
  epoch++;
  await store.cacheClear();
  if (outbox) await store.outboxClear();
  else if (keepUid !== null) {
    // Signing in as someone else: forget changes another account left on this device.
    for (const e of await store.outboxAll()) if (e.uid !== keepUid) await store.outboxDelete(e.id);
  }
  await refreshPending(keepUid);
}

/* ---------- Wiring ---------- */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { set({ offline: false }); scheduleFlush(500); });
  window.addEventListener('offline', () => set({ offline: true }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.pending && !browserOffline()) scheduleFlush(500); });
  setInterval(() => { if (state.pending && !browserOffline()) flush(); }, 30000);
  setTimeout(() => { const uid = getUid(); if (uid) refreshPending(uid).then(() => { if (state.pending) flush(); }); }, 1500);
}

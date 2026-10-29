import axios from 'axios';
import { getLang } from './i18n';
import * as offline from './offline';

// One API client for the whole app. Set REACT_APP_API_URL (frontend/.env locally, or the
// hosting provider's settings) to point at the deployed backend, e.g. https://learnvoy-api.onrender.com/api.
// Without it, the backend is assumed to run on port 5000 of the same computer the page came from —
// so http://localhost:3000 talks to localhost:5000, and a phone opening http://192.168.x.x:3000
// on your Wi-Fi talks to 192.168.x.x:5000 automatically.
const localApi = () => {
  if (typeof window === 'undefined' || !window.location?.hostname) return 'http://localhost:5000/api';
  return `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.hostname}:5000/api`;
};
export const API_URL = (process.env.REACT_APP_API_URL || localApi()).replace(/\/$/, '');

const api = axios.create({ baseURL: API_URL, timeout: 90000 });

// Tell the server which language the member uses, so the AI writes in it.
api.interceptors.request.use((config) => {
  try {
    const lang = getLang();
    if (lang && lang !== 'en') { config.headers = config.headers || {}; config.headers['X-Language'] = lang; }
  } catch { /* storage blocked */ }
  return config;
});

/* ---------- Instant revisits ----------
   GET responses are kept in memory for 60 seconds, so going back to a page you
   just saw shows it instantly. Any change you make (POST/PUT/DELETE) clears the
   cache, so you never see stale data after editing something. */
const CACHE_TTL = 60 * 1000;
const cache = new Map();
const baseAdapter = axios.getAdapter ? axios.getAdapter(axios.defaults.adapter) : axios.defaults.adapter;

export function clearCache() { cache.clear(); }

const userId = () => { try { return getUser()?.id || null; } catch { return null; } };
const offlineReply = (config, data, extra = {}) => ({ data, status: 200, statusText: 'OK (saved copy)', headers: { 'x-offline': 'copy', ...extra }, config, request: {}, offline: true });
const networkError = (config) => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', config, isAxiosError: true });

api.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const uid = userId();

  /* Changes */
  if (method !== 'get') {
    if (method === 'delete') {
      config = { ...config, url: offline.resolveTempUrl(config.url) };
      if (uid && (await offline.dropTempNote(uid, config.url))) { cache.clear(); return { data: { message: 'Deleted' }, status: 200, statusText: 'OK', headers: {}, config, request: {} }; }
    }
    const rule = !config.offlineReplay && uid ? offline.queueRule(method, config.url) : null;
    if (rule && offline.browserOffline()) { cache.clear(); return offline.enqueue(uid, config, rule); }
    try {
      const res = await baseAdapter(config);
      cache.clear();
      offline.markOnline();
      return res;
    } catch (err) {
      if (offline.isNetworkError(err)) {
        offline.markOffline();
        if (rule) { cache.clear(); return offline.enqueue(uid, config, rule); }
      }
      throw err;
    }
  }

  /* Reads */
  const key = `${config.url}|${JSON.stringify(config.params || {})}|${config.headers?.Authorization || ''}`;
  if (config.noCache) cache.clear();
  else {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < CACHE_TTL) return { ...hit.res, config };
  }
  const fromDevice = async (err) => {
    const copy = await offline.readCopy(uid, config.url, config.params);
    if (copy) return offlineReply(config, copy.data, { 'x-offline-at': String(copy.at) });
    throw err;
  };
  if (offline.browserOffline()) return fromDevice(networkError(config));
  const started = offline.currentEpoch();
  try {
    const res = await baseAdapter(config);
    if (res.status >= 200 && res.status < 300) {
      if (!config.noCache) cache.set(key, { time: Date.now(), res });
      offline.saveCopy(uid, config.url, config.params, res.data, started).catch(() => {});
    }
    offline.markOnline();
    return res;
  } catch (err) {
    if (!offline.isNetworkError(err)) throw err;
    offline.markOffline();
    return fromDevice(err);
  }
};

/* ---------- Session ----------
   "Remember me" keeps the session in localStorage (survives closing the browser);
   otherwise it lives in sessionStorage and ends when the browser closes. */
const store = () => {
  try { if (localStorage.getItem('token')) return localStorage; } catch {}
  try { if (sessionStorage.getItem('token')) return sessionStorage; } catch {}
  return null;
};

export function getToken() {
  const s = store();
  return s ? s.getItem('token') : null;
}

export function isLoggedIn() {
  return !!getToken();
}

export function setSession(token, user, remember = true) {
  logout();
  clearCache();
  // Changes this account made offline on this device are kept and sent; anyone else's are dropped.
  offline.clearOffline({ keepUid: user?.id ?? null }).catch(() => {});
  const s = remember ? localStorage : sessionStorage;
  s.setItem('token', token);
  s.setItem('user', JSON.stringify(user || {}));
}

export function updateUser(patch) {
  const s = store();
  if (!s) return;
  try { s.setItem('user', JSON.stringify({ ...(JSON.parse(s.getItem('user')) || {}), ...patch })); } catch {}
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    // Expired / invalid session: clear it and send the user to login.
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/change-password')) {
      logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    }
    return Promise.reject(err);
  }
);

/** Turn any axios error into a short, human message. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  if (!err.response) return offline.browserOffline() ? 'You’re offline — this needs an internet connection.' : 'Can’t reach the server. Is the backend running?';
  const d = err.response.data;
  return (d && (d.message || d.error)) || fallback;
}

export function getUser() {
  try {
    const s = store();
    return s ? JSON.parse(s.getItem('user')) || null : null;
  } catch {
    return null;
  }
}

/**
 * Ends the session and removes this device's saved copies of your data.
 * `everything: true` (pressing "Log out") also drops changes that were never sent;
 * otherwise (session expired) they wait until you log back in.
 */
export function logout({ everything = false } = {}) {
  cache.clear();
  offline.clearOffline({ outbox: everything, keepUid: everything ? null : userId() }).catch(() => {});
  for (const s of [localStorage, sessionStorage]) {
    try { s.removeItem('token'); s.removeItem('user'); } catch {}
  }
}

// Let the offline outbox send its queued changes through this same client.
offline.configure({ sender: (cfg) => api.request(cfg), uid: userId });

export default api;

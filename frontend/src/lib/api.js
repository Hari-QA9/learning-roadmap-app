import axios from 'axios';
import { getLang } from './i18n';

// One API client for the whole app. Set REACT_APP_API_URL (frontend/.env locally, or the
// hosting provider's settings) to point at the deployed backend, e.g. https://learnmap-api.onrender.com/api.
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

api.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get' || config.noCache) {
    const res = await baseAdapter(config);
    cache.clear();
    return res;
  }
  const key = `${config.url}|${JSON.stringify(config.params || {})}|${config.headers?.Authorization || ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) return { ...hit.res, config };
  const res = await baseAdapter(config);
  if (res.status >= 200 && res.status < 300) cache.set(key, { time: Date.now(), res });
  return res;
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
  if (!err.response) return 'Can’t reach the server. Is the backend running?';
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

export function logout() {
  cache.clear();
  for (const s of [localStorage, sessionStorage]) {
    try { s.removeItem('token'); s.removeItem('user'); } catch {}
  }
}

export default api;

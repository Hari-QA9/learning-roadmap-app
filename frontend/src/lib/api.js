import axios from 'axios';

// One API client for the whole app. Set REACT_APP_API_URL in frontend/.env
// to point at a deployed backend; defaults to the local dev server.
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL, timeout: 90000 });

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
  for (const s of [localStorage, sessionStorage]) {
    try { s.removeItem('token'); s.removeItem('user'); } catch {}
  }
}

export default api;

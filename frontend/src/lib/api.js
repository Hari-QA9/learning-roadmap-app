import axios from 'axios';

// One API client for the whole app. Set REACT_APP_API_URL in frontend/.env
// to point at a deployed backend; defaults to the local dev server.
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL, timeout: 90000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    // Expired / invalid session: clear it and send the user to login.
    if (status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export default api;

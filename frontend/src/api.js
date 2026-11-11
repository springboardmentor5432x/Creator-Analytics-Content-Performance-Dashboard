import axios from 'axios';

// Vite development proxies /api to FastAPI on port 8001. Docker's Nginx
// proxies the same relative path to the backend service on port 8000.
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = (configuredBaseURL || '/api').replace(/\/+$/, '');

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

// Always attach the latest stored token on every request.
// This ensures child pages work correctly even when the axios default
// header hasn't been set yet (e.g. after a page refresh before the
// useEffect in App.jsx fires).
api.interceptors.request.use((config) => {
  const token = config.headers?.Authorization
    ? null // already set explicitly — don't override
    : localStorage.getItem('creatoriq_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

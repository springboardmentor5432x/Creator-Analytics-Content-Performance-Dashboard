import axios from 'axios';

// In local development Vite proxies /api to FastAPI on port 8001.
// In Docker, Nginx also proxies /api to the backend container.
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = (configuredBaseURL || '/api').replace(/\/+$/, '');

export const api = axios.create({
  baseURL,
  timeout: 12000,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

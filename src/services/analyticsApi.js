const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const getToken = () => localStorage.getItem('ci_token') || sessionStorage.getItem('ci_token') || '';
export async function apiRequest(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers||{}) };
  const token = getToken(); if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(()=>({detail:'Unexpected server response.'}));
  if (!response.ok) throw new Error(data.detail || data.error || `Request failed (${response.status})`);
  return data;
}
export async function fetchOverview() { return apiRequest('/api/analytics/overview'); }
export async function fetchSocialAccounts() { return apiRequest('/api/social-accounts'); }
export async function startYouTubeOAuth() { const data=await apiRequest('/api/oauth/youtube/start'); window.location.href=data.authorization_url; }
export { API_BASE };

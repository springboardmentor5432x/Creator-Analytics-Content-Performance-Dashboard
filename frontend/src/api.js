const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("access_token");
  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof URLSearchParams) && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data.detail || data.message;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return data;
}

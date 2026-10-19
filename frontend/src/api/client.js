import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ciq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid token anywhere sends the user back to login.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/auth/")) {
      localStorage.removeItem("ciq_token");
      if (window.location.pathname !== "/login") window.location.href = "/login?expired=1";
    }
    return Promise.reject(err);
  }
);

// Turn any API/network error into a human message plus per-field errors.
export function parseError(err) {
  if (!err.response) return { message: "Cannot reach the server. Is the backend running on " + api.defaults.baseURL + "?", fields: {} };
  const d = err.response.data || {};
  const fields = {};
  (d.errors || []).forEach((e) => { if (e.field) fields[e.field] = e.message; });
  return { message: d.message || "Something went wrong.", fields };
}

export default api;

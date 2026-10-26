import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Attach the JWT to every request once the user is logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("creatoriq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turn FastAPI errors (string or validation list) into one readable message.
export function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => d.msg.replace(/^Value error, /, ""))
      .join(". ");
  }
  if (err?.code === "ERR_NETWORK") return "Cannot reach the server. Is the backend running?";
  return "Something went wrong. Please try again.";
}

export default api;

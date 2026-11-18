export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function request(path, options = {}, token = "") {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the server at ${API}. Make sure the backend is running (uvicorn main:app --reload).`);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event("creatoriq-unauthorized"));
    let detail = data?.detail;
    if (Array.isArray(detail)) detail = detail.map((d) => (d.loc?.slice(-1)[0] ? `${d.loc.slice(-1)[0]}: ` : "") + d.msg.replace(/^Value error, /, "")).join(" · ");
    throw new Error(typeof detail === "string" && detail ? detail : `Server error (${response.status}). Please try again.`);
  }
  return data ?? {};
}

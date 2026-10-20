const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

/** Fetches normalized analytics from our Python backend. The backend—not React—
 * stores OAuth tokens and calls each social platform's official API. */
export async function fetchOverview(email) {
  const response = await fetch(`${API_BASE}/api/analytics/overview?email=${encodeURIComponent(email)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
  return response.json();
}

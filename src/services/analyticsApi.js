const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// Retrieve the token from the correct browser storage
function getAuthToken() {
  return (
    localStorage.getItem("ci_token") ||
    sessionStorage.getItem("ci_token")
  );
}

export async function apiRequest(path, options = {}) {
  const {
    timeoutMs = 20000,
    ...fetchOptions
  } = options;

  const headers = new Headers(fetchOptions.headers || {});

  const token = getAuthToken();

  // Attach JWT authentication
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set JSON content type when sending JSON
  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();

  const timer = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The CreatorHub API did not respond within 20 seconds. Check FastAPI and the database."
      );
    }

    throw new Error(
      "Cannot reach the CreatorHub API. Check VITE_API_BASE_URL and ensure FastAPI is running."
    );

  } finally {
    window.clearTimeout(timer);
  }

  const contentType =
    response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (response.status === 401) {
    localStorage.removeItem("ci_session");
    localStorage.removeItem("ci_token");

    sessionStorage.removeItem("ci_session");
    sessionStorage.removeItem("ci_token");

    window.location.reload();

    throw new Error("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    const detail =
      typeof payload === "string"
        ? payload
        : payload?.detail || payload?.message;

    throw new Error(
      detail || `Request failed (${response.status}).`
    );
  }

  return payload;
}

// Analytics
export function fetchOverview() {
  return apiRequest("/api/analytics/overview");
}

export function fetchSocialAccounts() {
  return apiRequest("/api/social-accounts");
}

export function syncAnalytics() {
  return apiRequest("/api/analytics/sync", {
    method: "POST",
  });
}

// YouTube OAuth
export async function startYouTubeOAuth() {
  const result = await apiRequest(
    "/api/oauth/youtube/start"
  );

  if (!result.authorization_url) {
    throw new Error(
      "Backend did not return a YouTube authorization URL."
    );
  }

  window.location.assign(result.authorization_url);
}

// Spotify OAuth
export async function startSpotifyOAuth() {
  const result = await apiRequest(
    "/api/oauth/spotify/start"
  );

  if (!result.authorization_url) {
    throw new Error(
      "Backend did not return a Spotify authorization URL."
    );
  }

  window.location.assign(result.authorization_url);
}
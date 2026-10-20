const API_URL = "http://127.0.0.1:8000";

// Get the saved authentication token
function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

// Safely read an API response
async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  return {};
}

// Register a new user
export async function registerUser({
  name,
  email,
  password,
  role,
}) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      role,
    }),
  });

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(data.detail || "Registration failed.");
  }

  return data;
}

// Log in an existing user
export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail || "Login failed. Check your details."
    );
  }

  if (!data.access_token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  localStorage.setItem("access_token", data.access_token);

  return data;
}

// Load the logged-in user's profile
export async function getProfile() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in again.");
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await readResponse(response);

  if (response.status === 401) {
    throw new Error("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load your profile.");
  }

  return data;
}

// Load registered users (Administrator only)
export async function getUsers() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in again to view users.");
  }

  const response = await fetch(`${API_URL}/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await readResponse(response);

  if (response.status === 401) {
    throw new Error("Your session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Administrator access is required to view users.");
  }

  if (!response.ok) {
    throw new Error(
      data.detail || `Unable to load users (HTTP ${response.status}).`
    );
  }

  return Array.isArray(data.users) ? data.users : [];
}

// Load real database analytics (Administrator only)
export async function getAnalyticsOverview() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in again to view analytics.");
  }

  const response = await fetch(`${API_URL}/analytics/overview`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await readResponse(response);

  if (response.status === 401) {
    throw new Error("Your session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error(
      "Administrator access is required for platform analytics."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.detail || `Unable to load analytics (HTTP ${response.status}).`
    );
  }

  return data;
}
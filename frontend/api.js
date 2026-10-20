const API_URL = "http://127.0.0.1:8000";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed (${response.status})`
    );
  }

  return data;
}

export async function registerUser({ name, email, password, role }) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email: email.trim().toLowerCase(),
      password,
      role,
    }),
  });

  return handleResponse(response);
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const data = await handleResponse(response);

  if (!data.access_token) {
    throw new Error("Login succeeded, but no access token was returned.");
  }

  localStorage.setItem("access_token", data.access_token);

  return data;
}

export async function getProfile() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please log in first.");
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}
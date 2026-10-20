import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page refresh, restore the session from the stored token.
  useEffect(() => {
    const token = localStorage.getItem("creatoriq_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("creatoriq_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    // Backend uses the OAuth2 password flow, which expects form-encoded data.
    const form = new URLSearchParams({ username: email, password });
    const res = await api.post("/api/auth/login", form);
    localStorage.setItem("creatoriq_token", res.data.access_token);
    setUser(res.data.user);
  }

  async function register(payload) {
    await api.post("/api/auth/register", payload);
  }

  function logout() {
    localStorage.removeItem("creatoriq_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

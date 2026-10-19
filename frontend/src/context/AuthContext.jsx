import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("ciq_token"));

  useEffect(() => {
    if (!localStorage.getItem("ciq_token")) return;
    api.get("/api/users/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("ciq_token")).finally(() => setLoading(false));
  }, []);

  const finish = (data) => { localStorage.setItem("ciq_token", data.access_token); setUser(data.user); return data.user; };
  const login = async (email, password) => finish((await api.post("/api/auth/login", { email, password })).data);
  const register = async (payload) => finish((await api.post("/api/auth/register", payload)).data);
  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* token may already be invalid */ }
    localStorage.removeItem("ciq_token");
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

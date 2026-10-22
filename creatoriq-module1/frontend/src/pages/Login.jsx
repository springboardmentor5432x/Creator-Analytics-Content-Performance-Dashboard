import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      // FastAPI's OAuth2 login expects form data: username + password
      const body = new URLSearchParams({ username: email, password });
      const { data } = await api.post("/auth/login", body);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("full_name", data.full_name);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-side">
        <h1>CreatorIQ</h1>
        <p>See what is working across every platform you post on.</p>
        <div className="bars" aria-hidden="true">
          <span style={{ height: "35%" }} /><span style={{ height: "55%" }} />
          <span style={{ height: "45%" }} /><span style={{ height: "80%" }} />
          <span style={{ height: "65%" }} /><span style={{ height: "95%" }} />
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Log in</h2>

          {error && <div className="error" role="alert">{error}</div>}

          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} autoComplete="email"
                 onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} autoComplete="current-password"
                 onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="muted">New here? <Link to="/register">Create an account</Link></p>
        </form>
      </section>
    </main>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "creator" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.full_name.trim().length < 2) return setError("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
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
        <p>Create an account to track growth, engagement and earnings in one place.</p>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Create account</h2>
          {error && <div className="error" role="alert">{error}</div>}

          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" value={form.full_name} onChange={update} />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={update} />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password}
                 onChange={update} placeholder="At least 8 characters" />

          <label htmlFor="role">I am a</label>
          <select id="role" name="role" value={form.role} onChange={update}>
            <option value="creator">Creator</option>
            <option value="agency">Agency</option>
            <option value="marketing_team">Marketing team</option>
          </select>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
        </form>
      </section>
    </main>
  );
}

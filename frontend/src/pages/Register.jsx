import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../AuthContext.jsx";
import { errorMessage } from "../api";

const ROLES = [
  { value: "creator", title: "Creator", text: "I make content" },
  { value: "agency", title: "Agency", text: "I manage creators" },
  { value: "marketing_team", title: "Marketing Team", text: "I manage brand campaigns" },
  { value: "admin", title: "Administrator", text: "I manage the platform" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "creator" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Quick checks for fast feedback. The backend validates again.
  function validate() {
    if (form.name.trim().length < 2) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      return "Password must contain at least one letter and one number.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);

    setError("");
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      navigate("/login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Create your account</h1>
      <p className="sub">Start tracking your content in a few minutes.</p>

      <form onSubmit={onSubmit} noValidate>
        <fieldset className="roles">
          <legend>I am a</legend>
          {ROLES.map((r) => (
            <label key={r.value} className={"role" + (form.role === r.value ? " active" : "")}>
              <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set("role")} />
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </label>
          ))}
        </fieldset>

        <label>
          Full name
          <input value={form.name} onChange={set("name")} placeholder="Your full name" autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set("password")} placeholder="8+ characters, letters and numbers" autoComplete="new-password" />
        </label>
        <label>
          Confirm password
          <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat your password" autoComplete="new-password" />
        </label>

        {error && <div className="error" role="alert">{error}</div>}

        <button className="btn" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}

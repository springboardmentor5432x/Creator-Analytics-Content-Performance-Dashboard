import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../api/client";
import { Alert, Field } from "../components/ui";
import { getRoleDashboardPath } from "../utils/format";
import AuthShell from "./AuthShell";

const ROLES = [
  ["creator", "Creator"],
  ["agency", "Agency"],
  ["marketing", "Marketing Team"],
  ["administrator", "Administrator"],
];

export function validatePassword(p) {
  if (p.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Include at least one letter and one number.";
  return "";
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", role: "creator" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.full_name.trim().length < 2) errs.full_name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address.";
    const pe = validatePassword(form.password);
    if (pe) errs.password = pe;
    if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setMessage("");
    try {
      const user = await register({
        full_name: form.full_name,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      nav(getRoleDashboardPath(user.role), { replace: true });
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields); setMessage(p.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Pick the role that matches how you work."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-ink-950 underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {message && <Alert>{message}</Alert>}
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}><input id="full_name" className={`input ${errors.full_name ? "input-error" : ""}`} value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="Email" htmlFor="email" error={errors.email}><input id="email" type="email" className={`input ${errors.email ? "input-error" : ""}`} value={form.email} onChange={set("email")} /></Field>
        <Field label="Role" htmlFor="role" error={errors.role}>
          <select id="role" className={`input ${errors.role ? "input-error" : ""}`} value={form.role} onChange={set("role")}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
  <div className="relative">
    <input
      id="password"
      type={showPassword ? "text" : "password"}
      autoComplete="new-password"
      className={`input pr-16 ${errors.password ? "input-error" : ""}`}
      value={form.password}
      onChange={set("password")}
    />
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-600"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  </div>
</Field>
       <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
  <div className="relative">
    <input
      id="confirm"
      type={showConfirm ? "text" : "password"}
      autoComplete="new-password"
      className={`input pr-16 ${errors.confirm ? "input-error" : ""}`}
      value={form.confirm}
      onChange={set("confirm")}
    />
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-600"
      onClick={() => setShowConfirm(!showConfirm)}
      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
    >
      {showConfirm ? "Hide" : "Show"}
    </button>
  </div>
</Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account</button>
      </form>
    </AuthShell>
  );
}

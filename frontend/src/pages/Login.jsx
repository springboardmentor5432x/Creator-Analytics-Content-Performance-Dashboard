import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, UserCheck, Briefcase, Megaphone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../api/client";
import { Alert, Field } from "../components/ui";
import { getRoleDashboardPath } from "../utils/format";
import AuthShell from "./AuthShell";

const DEMO_ACCOUNTS = [
  { role: "Creator", email: "creator@creatoriq.demo", icon: UserCheck, desc: "Personal analytics & content", color: "text-teal-600 bg-teal-50 border-teal-200" },
  { role: "Agency", email: "agency@creatoriq.demo", icon: Briefcase, desc: "Manage creator roster & stats", color: "text-purple-600 bg-purple-50 border-purple-200" },
  { role: "Marketing", email: "marketing@creatoriq.demo", icon: Megaphone, desc: "Campaigns & brand reach", color: "text-rose-600 bg-rose-50 border-rose-200" },
  { role: "Administrator", email: "admin@creatoriq.demo", icon: ShieldCheck, desc: "System, users & governance", color: "text-amber-600 bg-amber-50 border-amber-200" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(new URLSearchParams(loc.search).get("expired") ? "Your session expired. Please sign in again." : "");
  const [busy, setBusy] = useState(false);

  const fillDemo = (email) => {
    setForm({ email, password: "Demo@12345" });
    setErrors({});
    setMessage("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setMessage("");
    try {
      const user = await login(form.email.trim(), form.password);
      const target = getRoleDashboardPath(user.role);
      nav(target, { replace: true });
    } catch (err) {
      setMessage(parseError(err).message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Enter your details to open your role dashboard."
      footer={<>New to CreatorIQ? <Link to="/register" className="font-semibold text-ink-950 underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {message && <Alert>{message}</Alert>}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? "input-error" : ""}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" className={`input ${errors.password ? "input-error" : ""}`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn-primary w-full shadow-sm" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</button>
      </form>

      <div className="mt-6 border-t border-ink-100 pt-5">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500">Quick Demo Accounts (1-Click Fill)</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.role}
                type="button"
                onClick={() => fillDemo(d.email)}
                className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition hover:shadow-sm ${d.color}`}
              >
                <div className="flex items-center gap-1.5 font-display text-xs font-bold">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {d.role}
                </div>
                <span className="mt-1 line-clamp-1 text-[11px] opacity-80">{d.email}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AuthShell>
  );
}

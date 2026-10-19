import { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Field, PageHeader } from "../components/ui";
import { ROLE_LABEL } from "../utils/format";
import { validatePassword } from "./Register";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ full_name: user.full_name, bio: user.bio || "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [errors, setErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return setErrors({ full_name: "Enter your full name." });
    setErrors({}); setBusy("profile"); setMsg(null);
    try { const r = await api.patch("/api/users/me", form); setUser(r.data); setMsg({ kind: "success", text: "Profile saved." }); }
    catch (err) { const p = parseError(err); setErrors(p.fields); setMsg({ kind: "error", text: p.message }); } finally { setBusy(""); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current_password) errs.current_password = "Enter your current password.";
    const pe = validatePassword(pw.new_password); if (pe) errs.new_password = pe;
    setPwErrors(errs); if (Object.keys(errs).length) return;
    setBusy("pw"); setMsg(null);
    try { await api.post("/api/users/me/password", pw); setPw({ current_password: "", new_password: "" }); setMsg({ kind: "success", text: "Password updated." }); }
    catch (err) { setMsg({ kind: "error", text: parseError(err).message }); } finally { setBusy(""); }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      {msg && <div className="mb-4"><Alert kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} noValidate className="card space-y-4">
          <h2 className="font-display text-base font-bold">Details</h2>
          <Field label="Email"><input className="input bg-ink-50" value={user.email} disabled /></Field>
          <Field label="Role"><input className="input bg-ink-50" value={ROLE_LABEL[user.role]} disabled /></Field>
          <Field label="Full name" htmlFor="pn" error={errors.full_name}><input id="pn" className={`input ${errors.full_name ? "input-error" : ""}`} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Bio" htmlFor="pb" error={errors.bio}><textarea id="pb" rows={3} maxLength={500} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
          <p className="text-xs text-ink-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          <button className="btn-primary" disabled={busy === "profile"}>{busy === "profile" && <Loader2 className="h-4 w-4 animate-spin" />}Save profile</button>
        </form>
        <form onSubmit={changePw} noValidate className="card space-y-4 self-start">
          <h2 className="font-display text-base font-bold">Change password</h2>
          <Field label="Current password" htmlFor="cp" error={pwErrors.current_password}><input id="cp" type="password" autoComplete="current-password" className="input" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password" htmlFor="np" error={pwErrors.new_password}><input id="np" type="password" autoComplete="new-password" className="input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
          <button className="btn-primary" disabled={busy === "pw"}>{busy === "pw" && <Loader2 className="h-4 w-4 animate-spin" />}Update password</button>
        </form>
      </div>
    </>
  );
}

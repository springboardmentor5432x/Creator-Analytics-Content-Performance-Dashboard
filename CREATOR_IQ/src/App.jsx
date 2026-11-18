import { useEffect, useState } from "react";
import { request } from "./api.js";
import TeamRoleDashboard from "./TeamDashboards.jsx";
import MarketingDashboard from "./MarketingDashboard.jsx";
import CreatorWorkspace from "./CreatorWorkspace.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

// Role -> dashboard. Unknown roles fall back to the Creator workspace.
const DASHBOARDS = { Admin: AdminDashboard, Agency: TeamRoleDashboard, "Marketing Team": MarketingDashboard, Creator: CreatorWorkspace };
const DEFAULT_ROLES = ["Creator", "Agency", "Marketing Team", "Admin"];

const initialForm = { name: "", email: "", password: "", confirmPassword: "", role: "Creator" };

export default function App() {
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("creatorIqSession") || "null"); } catch { return null; }
  });
  const [roleNames, setRoleNames] = useState(DEFAULT_ROLES);
  useEffect(() => { request("/api/meta/roles").then((d) => { const r = (d.roles || []).filter((x) => x.signup).map((x) => x.name); if (r.length) setRoleNames(r); }).catch(() => {}); }, []);
  const isSignup = mode === "signup";
  function changeMode(nextMode) { setMode(nextMode); setMessage(""); setShowPassword(false); }
  function handleChange(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setMessage(""); }
  async function handleSubmit(event) {
    event.preventDefault(); setMessage(""); setMessageType("error");
    if (form.password.length < 8) return setMessage("Password must be at least 8 characters long.");
    if (isSignup && !form.name.trim()) return setMessage("Please enter your full name.");
    if (isSignup && form.password !== form.confirmPassword) return setMessage("Passwords do not match. Please try again.");
    setBusy(true);
    try {
      if (isSignup) {
        await request("/api/auth/register", { method: "POST", body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role }) });
        setMode("signin"); setForm((f) => ({ ...f, name: "", password: "", confirmPassword: "" }));
        setMessageType("success"); setMessage("Account created successfully. Sign in with your new account.");
      } else {
        const result = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }) });
        const next = { token: result.access_token, user: result.user };
        localStorage.setItem("creatorIqSession", JSON.stringify(next)); setSession(next);
      }
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  function logout() { localStorage.removeItem("creatorIqSession"); setSession(null); setForm(initialForm); setMessage(""); setMode("signin"); }
  useEffect(() => {
    const expired = () => { localStorage.removeItem("creatorIqSession"); setSession(null); setMode("signin"); setMessageType("error"); setMessage("Your session expired. Please sign in again."); };
    window.addEventListener("creatoriq-unauthorized", expired);
    return () => window.removeEventListener("creatoriq-unauthorized", expired);
  }, []);
  if (session?.token && session?.user) {
    const Dashboard = DASHBOARDS[session.user.role] || CreatorWorkspace;
    return <Dashboard user={session.user} token={session.token} onLogout={logout} />;
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-10"><div className="grid min-h-[620px] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:grid-cols-2"><section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-900 to-[#101629] p-8 md:flex lg:p-12"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"/><div className="relative"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-3xl">✦</div><h1 className="text-2xl font-extrabold tracking-wide">CREATOR IQ</h1></div><div className="mt-24"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Creator Analytics Platform</p><h2 className="mt-5 text-5xl font-bold leading-tight">Create.<br/>Analyze.<br/>Grow.</h2><p className="mt-6 max-w-sm text-base leading-7 text-indigo-100/80">Understand your content performance, discover audience insights, and turn your creativity into measurable growth.</p></div></div><div className="relative grid grid-cols-3 gap-3">{[["01","Content"],["02","Audience"],["03","Growth"]].map(([n,l])=><div key={n} className="rounded-xl border border-slate-200 bg-slate-100 p-4"><p className="text-sm text-violet-200">{n}</p><p className="mt-2 font-medium">{l}</p></div>)}</div></section><section className="flex items-center justify-center p-5 sm:p-8 lg:p-12"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 md:hidden"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-2xl">✦</div><h1 className="text-xl font-extrabold">CREATOR IQ</h1></div><p className="text-xs font-semibold tracking-[0.18em] text-violet-400">{isSignup?"GET STARTED":"WELCOME BACK"}</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">{isSignup?"Create account":"Sign in"}</h2><p className="mb-7 mt-3 text-sm text-slate-500 sm:text-base">{isSignup?"Create your account to get started with CREATOR IQ.":"Sign in with your registered account to open your creator workspace."}</p><div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#f5f6fb] p-1"><button type="button" onClick={()=>changeMode("signin")} className={`rounded-lg py-3 font-semibold ${!isSignup?"bg-violet-600 text-slate-900":"text-slate-500 hover:text-slate-900"}`}>Sign In</button><button type="button" onClick={()=>changeMode("signup")} className={`rounded-lg py-3 font-semibold ${isSignup?"bg-violet-600 text-slate-900":"text-slate-500 hover:text-slate-900"}`}>Sign Up</button></div><form onSubmit={handleSubmit} className="space-y-4">{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Full name</span><input name="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" autoComplete="name" required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>}<label className="block"><span className="mb-2 block text-sm text-slate-500">Email address</span><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Account type</span><select name="role" value={form.role} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-violet-400">{roleNames.map(r=><option key={r}>{r}</option>)}</select>{form.role === "Admin" && <span className="mt-2 block text-xs text-amber-700">Admin signup is restricted to email addresses configured by the system administrator.</span>}</label>}<label className="block"><span className="mb-2 block text-sm text-slate-500">Password</span><div className="relative"><input name="password" type={showPassword?"text":"password"} value={form.password} onChange={handleChange} placeholder={isSignup?"At least 8 characters":"Enter your password"} autoComplete={isSignup?"new-password":"current-password"} minLength={8} required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 pr-20 outline-none focus:border-violet-400"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-violet-400">{showPassword?"Hide":"Show"}</button></div></label>{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Confirm password</span><input name="confirmPassword" type={showPassword?"text":"password"} value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" minLength={8} required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>}{message&&<p role="status" className={`rounded-xl border p-3 text-sm ${messageType==="success"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-200":"border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{message}</p>}<button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-600 py-3.5 font-semibold !text-white transition hover:bg-violet-500 disabled:opacity-60">{busy?(isSignup?"Creating account...":"Signing in..."):isSignup?"Create Account →":"Sign In →"}</button></form><p className="mt-6 text-center text-sm text-slate-500">{isSignup?"Already have an account?":"Don't have an account?"} <button type="button" onClick={()=>changeMode(isSignup?"signin":"signup")} className="font-semibold text-violet-400">{isSignup?"Sign In":"Sign Up"}</button></p><p className="mt-7 text-center text-xs text-slate-500">CREATOR IQ · Creator Analytics Platform</p></div></section></div></main>;
}

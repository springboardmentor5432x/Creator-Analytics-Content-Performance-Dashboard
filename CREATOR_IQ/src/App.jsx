import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const initialForm = { name: "", email: "", password: "", confirmPassword: "", role: "Creator" };
const blankProfile = { handle: "", display_name: "", niche: "", bio: "", country: "", website: "" };

async function request(path, options = {}, token = "") {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the server at ${API}. Make sure the backend is running (uvicorn main:app --reload).`);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event("creatoriq-unauthorized"));
    let detail = data?.detail;
    if (Array.isArray(detail)) detail = detail.map((d) => (d.loc?.slice(-1)[0] ? `${d.loc.slice(-1)[0]}: ` : "") + d.msg.replace(/^Value error, /, "")).join(" · ");
    throw new Error(typeof detail === "string" && detail ? detail : `Server error (${response.status}). Please try again.`);
  }
  return data ?? {};
}

function Icon({ children }) { return <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg text-violet-300">{children}</span>; }

function ReportsPage({ user, profile }) {
  const [period, setPeriod] = useState("Last 30 days");
  const [notice, setNotice] = useState("");
  function downloadReport() {
    const rows = [["CREATOR IQ - Creator Performance Report"],["Creator", profile.display_name || user.name],["Handle", profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Not set"],["Reporting period", period],["Generated on", new Date().toLocaleDateString()],["Note", "Social platform data is not connected; metrics are placeholders."],[],["Metric","Value","Status"],["Total followers","—","Awaiting connection"],["Engagement rate","—","Awaiting connection"],["Content published","—","Awaiting connection"],["Total reach","—","Awaiting connection"]];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "creator-iq-report.csv"; link.click(); URL.revokeObjectURL(url); setNotice("Report downloaded. Connect a social platform to populate it with real metrics.");
  }
  return <>
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-violet-300">REPORT CENTER</p><h2 className="mt-2 text-2xl font-bold">Your creator performance report</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Prepare a shareable summary of your creator profile and key performance indicators.</p></div><Icon>▤</Icon></div><div className="mt-6 flex flex-wrap items-end gap-4"><label className="block"><span className="mb-2 block text-sm text-slate-500">Reporting period</span><select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 text-sm outline-none focus:border-violet-400"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select></label><button onClick={downloadReport} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold !text-white hover:bg-violet-500">↓ Download CSV report</button></div>{notice && <p role="status" className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-200">{notice}</p>}</section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Report preview</h2><p className="mt-1 text-sm text-slate-500">{period} · Creator summary</p><div className="mt-5 space-y-3">{[{label:"Creator name",value:profile.display_name || user.name || "Not set"},{label:"Creator handle",value:profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Not set"},{label:"Content niche",value:profile.niche || "Not specified"},{label:"Followers / Reach / Engagement",value:"Awaiting social data"}].map(x=><div key={x.label} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3"><span className="text-sm text-slate-500">{x.label}</span><span className="text-sm font-medium text-slate-200">{x.value}</span></div>)}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Available report sections</h2><div className="mt-4 space-y-3">{[{title:"Executive summary",desc:"A quick overview of your creator account."},{title:"Content performance",desc:"Post reach, engagement and top-performing content."},{title:"Audience insights",desc:"Follower trends and audience demographics."},{title:"Recommendations",desc:"Actions to test for future content growth."}].map((x,i)=><div key={x.title} className="flex gap-3 rounded-2xl bg-[#f5f6fb] p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-sm text-violet-300">0{i+1}</span><div><p className="font-medium">{x.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{x.desc}</p></div></div>)}</div></div></section>
  </>;
}

function AdminDashboard({ user, token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  async function loadUsers() {
    setLoading(true); setMessage("");
    try { const data = await request("/api/admin/users", {}, token); setUsers(data.users || []); }
    catch (err) { setMessage(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadUsers(); }, [token]);

  const roles = ["Creator", "Agency", "Marketing Team", "Admin"];
  const countRole = (role) => users.filter((x) => x.role === role).length;
  const activeUsers = users.filter((x) => x.is_active).length;
  const filteredUsers = users.filter((x) => {
    const text = `${x.name || ""} ${x.email || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) &&
      (roleFilter === "All roles" || x.role === roleFilter) &&
      (statusFilter === "All statuses" || (statusFilter === "Active" ? x.is_active : !x.is_active));
  });
  const nav = [
    { label: "Overview", icon: "▦" },
    { label: "User management", icon: "♙" },
    { label: "Role analytics", icon: "◔" },
    { label: "System health", icon: "⌁" },
  ];
  const recentUsers = [...users].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0,5);
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const Metric = ({ label, value, note, icon, color }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${color}`}>{icon}</span></div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );

  return <div className="min-h-screen bg-[#f5f6fb] text-slate-900 md:flex">
    <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-lg shadow-violet-200">✦</div><div><p className="font-extrabold tracking-wide">CREATOR IQ</p><p className="text-xs text-slate-500">Admin console</p></div></div>
      <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200 font-bold text-violet-800">{(user.name || "A").slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="font-semibold">Administrator</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p></div></div><div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Signed in securely</div></div>
      <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{nav.map((item) => <button key={item.label} onClick={() => setActive(item.label)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === item.label ? "bg-violet-600 font-semibold text-white shadow-md shadow-violet-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span className="w-5 text-center text-lg">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="mt-auto hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 md:mt-8 md:block"><p className="text-sm font-semibold">Admin workspace</p><p className="mt-2 text-xs leading-5 text-slate-500">Review account access and monitor the current user directory.</p><div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">Directory status</span><span className="font-semibold text-emerald-700">Available</span></div></div>
      <button onClick={onLogout} className="mt-5 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">↪ Sign out</button>
    </aside>

    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-violet-600"><span>Administration</span><span className="text-slate-300">/</span><span className="text-slate-400">{active}</span></div><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{active === "Overview" ? "Admin overview" : active}</h1><p className="mt-2 text-sm text-slate-500">Monitor your CreatorIQ workspace, accounts and role distribution.</p></div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">Live directory data</span><button onClick={loadUsers} disabled={loading} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">{loading ? "Refreshing…" : "↻ Refresh data"}</button></div>
      </header>
      {message && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span className="font-bold">!</span><div><p className="font-semibold">Could not load account data</p><p className="mt-1">{message}</p></div></div>}

      {active === "Overview" && <>
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Registered users" value={loading ? "…" : users.length} note="All accounts in your directory" icon="♙" color="bg-violet-50 text-violet-700"/>
          <Metric label="Active accounts" value={loading ? "…" : activeUsers} note={`${users.length ? Math.round(activeUsers / users.length * 100) : 0}% of registered users`} icon="✓" color="bg-emerald-50 text-emerald-700"/>
          <Metric label="Creator accounts" value={loading ? "…" : countRole("Creator")} note="Individual creator workspaces" icon="✧" color="bg-sky-50 text-sky-700"/>
          <Metric label="Admin accounts" value={loading ? "…" : countRole("Admin")} note="Accounts with administrator role" icon="⚿" color="bg-amber-50 text-amber-700"/>
        </section>
        <section className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Account distribution</h2><p className="mt-1 text-sm text-slate-500">Registered accounts grouped by role</p></div><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{users.length} total</span></div>
            <div className="mt-6 space-y-5">{roles.map((role) => { const n = countRole(role); const pct = users.length ? Math.round(n / users.length * 100) : 0; const bar = role === "Creator" ? "bg-violet-500" : role === "Agency" ? "bg-sky-500" : role === "Marketing Team" ? "bg-amber-500" : "bg-emerald-500"; return <div key={role}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{role}</span><span className="text-slate-500">{n} <span className="text-slate-400">({pct}%)</span></span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar} transition-all`} style={{width: `${pct}%`}}/></div></div>; })}</div>
            <button onClick={() => setActive("Role analytics")} className="mt-6 text-sm font-semibold text-violet-700 hover:text-violet-900">View role analytics →</button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="font-bold">Workspace status</h2><p className="mt-1 text-sm text-slate-500">Current application services</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">API connected</span></div>
            <div className="mt-5 space-y-3">{[{name:"Authentication",desc:"Sign-in and account sessions",status:"Available"},{name:"User directory",desc:"Account list endpoint",status:message ? "Check connection" : loading ? "Checking…" : "Available"},{name:"Role permissions",desc:"Admin route protection",status:"Enforced"},{name:"Social platform sync",desc:"OAuth analytics integrations",status:"Not configured"}].map((x) => <div key={x.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-semibold">{x.name}</p><p className="mt-1 text-xs text-slate-500">{x.desc}</p></div><span className={`shrink-0 text-xs font-semibold ${x.status === "Available" || x.status === "Enforced" ? "text-emerald-700" : x.status === "Not configured" ? "text-amber-700" : "text-slate-500"}`}>{x.status}</span></div>)}</div>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Social metrics are not live until platform integrations are configured.</p>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold">Recently registered accounts</h2><p className="mt-1 text-sm text-slate-500">Latest accounts from the user directory</p></div><button onClick={() => setActive("User management")} className="text-sm font-semibold text-violet-700 hover:text-violet-900">Manage users →</button></div>
          {loading ? <p className="p-6 text-sm text-slate-500">Loading accounts…</p> : recentUsers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3.5">Account</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Created</th><th className="px-5 py-3.5">Status</th></tr></thead><tbody>{recentUsers.map(x=><tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold">{x.name}</p><p className="mt-1 text-xs text-slate-500">{x.email}</p></td><td className="px-5 py-4"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">{x.role}</span></td><td className="px-5 py-4 text-slate-500">{dateLabel(x.created_at)}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-2 text-xs font-semibold ${x.is_active ? "text-emerald-700" : "text-rose-700"}`}><span className={`h-2 w-2 rounded-full ${x.is_active ? "bg-emerald-500" : "bg-rose-500"}`}></span>{x.is_active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-slate-500">No accounts found.</p>}
        </section>
      </>}

      {active === "User management" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
        <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">All accounts</h2><p className="mt-1 text-sm text-slate-500">Search accounts and filter by role or status.</p></div><span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">{filteredUsers.length} results</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or email…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"/><select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400"><option>All roles</option>{roles.map(r=><option key={r}>{r}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400"><option>All statuses</option><option>Active</option><option>Inactive</option></select></div>
        </div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading accounts…</p> : filteredUsers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Email address</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Status</th></tr></thead><tbody>{filteredUsers.map(x=><tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold">{x.name}</td><td className="px-5 py-4 text-slate-600">{x.email}</td><td className="px-5 py-4"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">{x.role}</span></td><td className="px-5 py-4 text-slate-500">{dateLabel(x.created_at)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${x.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{x.is_active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><p className="font-semibold">No matching accounts</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p><button onClick={()=>{setQuery("");setRoleFilter("All roles");setStatusFilter("All statuses");}} className="mt-4 text-sm font-semibold text-violet-700">Clear filters</button></div>}
      </section>}

      {active === "Role analytics" && <section className="grid gap-5 md:grid-cols-2">{roles.map((role) => <div key={role} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><h2 className="font-bold">{role}</h2><span className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">{countRole(role)}</span></div><div className="mt-5 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-violet-500" style={{width:`${users.length ? countRole(role)/users.length*100 : 0}%`}}/></div><p className="mt-3 text-sm text-slate-500">{users.length ? (countRole(role)/users.length*100).toFixed(1) : "0.0"}% of all registered accounts</p><p className="mt-4 text-xs text-slate-400">{role === "Creator" ? "Individual creator profiles and content insights." : role === "Agency" ? "Agency teams managing creator portfolios." : role === "Marketing Team" ? "Campaign planning and performance views." : "Administrative access to the account directory."}</p></div>)}</section>}

      {active === "System health" && <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Service checks</h2><p className="mt-1 text-sm text-slate-500">Based on the current frontend and API response.</p><div className="mt-5 space-y-4">{[{name:"FastAPI backend",state:message ? "Needs attention" : loading ? "Checking" : "Responding",desc:"API requests and authentication"},{name:"User directory endpoint",state:message ? "Needs attention" : loading ? "Checking" : "Responding",desc:"GET /api/admin/users"},{name:"Social OAuth connections",state:"Not configured",desc:"Instagram, YouTube and other platform connections"}].map(x=><div key={x.name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0"><div><p className="text-sm font-semibold">{x.name}</p><p className="mt-1 text-xs text-slate-500">{x.desc}</p></div><span className={`text-xs font-semibold ${x.state==="Responding"?"text-emerald-700":"text-amber-700"}`}>{x.state}</span></div>)}</div><button onClick={loadUsers} className="mt-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Run check again</button></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Administrator notes</h2><p className="mt-1 text-sm text-slate-500">Current project configuration</p><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600"><li className="rounded-xl bg-slate-50 p-3">Account listing is protected by the Admin role on the backend.</li><li className="rounded-xl bg-slate-50 p-3">User management is currently read-only; status and role changes require dedicated backend endpoints.</li><li className="rounded-xl bg-amber-50 p-3 text-amber-900">Social platform analytics are placeholders until OAuth integrations and data collection are configured.</li></ul></div></section>}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400"><span>CREATOR IQ · Administration</span><span>{users.length} accounts · Updated when refreshed</span></footer>
    </main>
  </div>;
}

function MiniLineChart({ data, color = "#7555df", height = 230, showLabels = true }) {
  const width = 720;
  const pad = { top: 18, right: 18, bottom: showLabels ? 34 : 16, left: 48 };
  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.985;
  const max = Math.max(...values) * 1.015;
  const range = Math.max(max - min, 1);
  const x = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (v) => pad.top + (1 - (v - min) / range) * (height - pad.top - pad.bottom);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${pad.left},${height-pad.bottom} ${points} ${width-pad.right},${height-pad.bottom}`;
  const ticks = [0, 1, 2, 3].map((i) => min + (range * i) / 3);
  return <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Follower trend line chart">
    {ticks.map((tick, i) => <g key={i}><line x1={pad.left} x2={width-pad.right} y1={y(tick)} y2={y(tick)} stroke="#e8eaf2" strokeDasharray="4 5"/><text x={pad.left-9} y={y(tick)+4} textAnchor="end" fontSize="11" fill="#8991a5">{Math.round(tick/1000)}k</text></g>)}
    <polygon points={area} fill={color} opacity=".09"/>
    <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {data.map((d, i) => <circle key={d.label} cx={x(i)} cy={y(d.value)} r={data.length <= 10 ? 4 : 2.5} fill="white" stroke={color} strokeWidth="2"><title>{`${d.label}: ${d.value.toLocaleString()} followers`}</title></circle>)}
    {showLabels && data.map((d, i) => (data.length <= 10 || i % Math.ceil(data.length / 7) === 0 || i === data.length-1) ? <text key={d.label} x={x(i)} y={height-10} textAnchor="middle" fontSize="11" fill="#8991a5">{d.label}</text> : null)}
  </svg>;
}

function CreatorDashboard({ user, token, onLogout }) {
  const [profile, setProfile] = useState(blankProfile);
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState("Overview");
  const [period, setPeriod] = useState("7 days");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    request("/api/creator/profile", {}, token).then((data) => {
      setProfile({ ...blankProfile, ...(data || {}) });
      setEditing(!(data && data.handle));
    }).catch((err) => setMessage(err.message));
    request("/api/creator/dashboard", {}, token).then(setStats).catch(() => {});
  }, [token]);

  function change(e) { setProfile((p) => ({ ...p, [e.target.name]: e.target.value })); }
  async function saveProfile(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const saved = await request("/api/creator/profile", { method: "PUT", body: JSON.stringify(profile) }, token);
      setProfile({ ...blankProfile, ...saved }); setEditing(false); setMessage("Creator profile saved successfully.");
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  // Demonstration analytics are generated locally until a social-platform API is connected.
  const totalDays = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
  const baseFollowers = 125430;
  const followerData = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - i));
    const progress = (i + 1) / totalDays;
    const wave = Math.sin(i * 1.7) * 170 + Math.cos(i * .63) * 95;
    const value = Math.round(baseFollowers - (totalDays * 118) + progress * (totalDays * 118 + 450) + wave);
    return { label: totalDays === 7 ? date.toLocaleDateString("en-IN", { weekday: "short" }) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value };
  });
  const firstFollowers = followerData[0].value;
  const lastFollowers = followerData[followerData.length - 1].value;
  const followerGain = lastFollowers - firstFollowers;
  const growthPct = ((followerGain / Math.max(firstFollowers, 1)) * 100).toFixed(2);
  const dailyData = followerData.map((d, i) => ({ ...d, gained: i === 0 ? 0 : d.value - followerData[i-1].value, views: Math.round(1850 + ((i * 379) % 2900) + Math.abs(Math.sin(i)) * 900), engagement: (4.2 + (Math.abs(Math.sin(i * 1.31)) * 3.1)).toFixed(1) }));
  const nav = [{ label: "Overview", icon: "◫" }, { label: "My Profile", icon: "◎" }, { label: "Content Analytics", icon: "▥" }, { label: "Audience", icon: "♧" }, { label: "Reports", icon: "▤" }];
  const metricCards = [
    { label: "Total followers", value: "125,430", change: `↑ ${followerGain.toLocaleString()} in ${period}`, icon: "♧", tint: "violet" },
    { label: "Total views", value: period === "7 days" ? "1.8M" : period === "30 days" ? "6.4M" : "18.2M", change: "↑ 18.7% vs previous period", icon: "◉", tint: "blue" },
    { label: "Total likes", value: "98,240", change: "↑ 15.3% vs previous period", icon: "♡", tint: "rose" },
    { label: "Comments", value: "8,932", change: "↑ 11.4% vs previous period", icon: "▤", tint: "amber" },
    { label: "Shares", value: "6,120", change: "↑ 9.8% vs previous period", icon: "↗", tint: "purple" },
    { label: "Engagement rate", value: "6.8%", change: "↑ 1.2% vs previous period", icon: "✳", tint: "green" },
  ];
  const posts = [
    { title: "A 5 AI Tools Every Student Should Know", platform: "YouTube", views: "129K", likes: "8.4K", comments: "620", rate: "7.9%", date: "Oct 12" },
    { title: "A Day in My Life at NIT Round", platform: "Instagram", views: "98K", likes: "6.1K", comments: "340", rate: "6.8%", date: "Oct 10" },
    { title: "Healthy Meal Prep Ideas", platform: "TikTok", views: "76K", likes: "5.2K", comments: "410", rate: "7.4%", date: "Oct 8" },
    { title: "My Study Setup 2026", platform: "Instagram", views: "62K", likes: "4.3K", comments: "290", rate: "6.1%", date: "Oct 5" },
  ];

  return <div className="min-h-screen bg-[#f6f7fc] text-slate-900 md:flex">
    <aside className="border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white">✦</div><div><p className="font-extrabold tracking-wide">CREATOR IQ</p><p className="text-xs text-slate-500">Creator workspace</p></div></div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{nav.map((item) => <button key={item.label} onClick={() => { setActive(item.label); if (item.label === "My Profile") setEditing(false); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === item.label ? "bg-violet-100 font-semibold text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span className="text-lg">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="mt-8 hidden rounded-2xl border border-violet-100 bg-violet-50 p-4 md:block"><p className="font-semibold">Grow with insights</p><p className="mt-2 text-xs leading-5 text-slate-500">Review daily trends and identify which content helps your audience grow.</p></div>
      <button onClick={onLogout} className="mt-6 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">↪ Sign out</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-violet-600">Creator workspace / {active}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{active === "Overview" ? `Good evening, ${user.name || "Creator"}! 👋` : active}</h1><p className="mt-1 text-sm text-slate-500">Here’s an overview of your content performance across platforms.</p></div><div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-500">Period <select value={period} onChange={e=>setPeriod(e.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 outline-none focus:border-violet-400"><option>7 days</option><option>30 days</option><option>90 days</option></select></label><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pr-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{(user.name || "C").slice(0,1).toUpperCase()}</div><div><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.role || "Creator"}</p></div></div></div></header>
      {message && <div role="status" className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">{message}</div>}
      {active === "My Profile" || editing ? <section className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-violet-600">CREATOR IDENTITY</p><h2 className="mt-2 text-2xl font-bold">{editing ? "Set up your creator profile" : "Your creator profile"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Tell your audience and future collaborators who you are. You can update these details anytime.</p></div><Icon>◎</Icon></div>
        {!editing && <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold text-white">{(profile.display_name || user.name || "C").slice(0,1).toUpperCase()}</div><div className="min-w-0"><h3 className="font-bold">{profile.display_name || user.name}</h3><p className="text-sm text-violet-600">{profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Add a creator handle"}</p><p className="text-xs text-slate-500">{profile.niche || "Niche not specified"}{profile.country ? ` · ${profile.country}` : ""}</p></div><button onClick={() => setEditing(true)} className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Edit profile</button></div>}
        {editing && <form onSubmit={saveProfile} className="grid gap-5 sm:grid-cols-2">
          {[{name:"display_name",label:"Display name",placeholder:user.name || "Your public name",required:true},{name:"handle",label:"Creator handle",placeholder:"e.g. neha.creates",required:true},{name:"niche",label:"Content niche",placeholder:"e.g. Fashion, Tech, Fitness"},{name:"country",label:"Country",placeholder:"e.g. India"},{name:"website",label:"Website / portfolio",placeholder:"https://yourwebsite.com"}].map((f) => <label key={f.name} className="block"><span className="mb-2 block text-sm text-slate-600">{f.label}{f.required ? " *" : ""}</span><input name={f.name} required={f.required} value={profile[f.name] || ""} onChange={change} placeholder={f.placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-violet-400" /></label>)}
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm text-slate-600">Bio</span><textarea name="bio" value={profile.bio || ""} onChange={change} rows="4" maxLength="500" placeholder="Introduce yourself and the content you create..." className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none placeholder:text-slate-400 focus:border-violet-400"/><span className="mt-1 block text-right text-xs text-slate-400">{(profile.bio || "").length}/500</span></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-60">{busy ? "Saving..." : "Save creator profile →"}</button>{profile.handle && <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-slate-600 hover:bg-slate-50">Cancel</button>}</div>
        </form>}
        {!editing && <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">About</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio || "No bio added yet."}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Website</p><p className="mt-2 break-all text-sm text-violet-600">{profile.website || "No website added yet."}</p><p className="mt-5 text-xs uppercase tracking-wider text-slate-400">Account email</p><p className="mt-2 break-all text-sm text-slate-600">{user.email}</p></div></div>}
      </section> : <>
        {active === "Overview" && <>
          <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metricCards.map((m) => <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100"><div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-500">{m.label}</p><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-lg text-violet-600">{m.icon}</span></div><p className="mt-3 text-2xl font-bold tracking-tight">{m.value}</p><p className="mt-2 text-[11px] leading-4 text-emerald-600">{m.change}</p></div>)}</section>
          <section className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Follower growth</h2><p className="mt-1 text-sm text-slate-500">Daily follower count over the last {period}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">↑ {growthPct}%</span></div><div className="mt-5"><MiniLineChart data={followerData} /></div><div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-400">Starting followers</p><p className="mt-1 text-lg font-bold">{firstFollowers.toLocaleString()}</p></div><div><p className="text-xs text-slate-400">Net gained</p><p className="mt-1 text-lg font-bold text-emerald-600">+{followerGain.toLocaleString()}</p></div><div><p className="text-xs text-slate-400">Current followers</p><p className="mt-1 text-lg font-bold">{lastFollowers.toLocaleString()}</p></div></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 sm:p-6"><h2 className="text-lg font-bold">Daily content performance</h2><p className="mt-1 text-sm text-slate-500">Views by day · selected period</p><div className="mt-6 flex h-44 items-end gap-2 border-b border-slate-100 pb-1">{dailyData.filter((_,i)=>totalDays===7 || i%Math.ceil(totalDays/7)===0 || i===dailyData.length-1).slice(-8).map((d,i,arr)=><div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-400">{(d.views/1000).toFixed(1)}k</span><div title={`${d.label}: ${d.views.toLocaleString()} views`} className="w-full max-w-9 rounded-t-md bg-violet-500 hover:bg-violet-600" style={{height:`${Math.max(12,d.views/4800*100)}%`}}/><span className="text-[10px] text-slate-400">{d.label}</span></div>)}</div><div className="mt-5 rounded-xl bg-violet-50 p-4"><p className="text-sm font-semibold text-violet-800">Daily insight</p><p className="mt-1 text-xs leading-5 text-violet-700">Use your strongest-view days to spot which posting times and topics are resonating. Compare this trend with your actual platform analytics.</p></div></div>
          </section>
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Daily follower analysis</h2><p className="mt-1 text-sm text-slate-500">See follower count, daily change, views and engagement by date.</p></div><button onClick={()=>{const rows=[["Date","Followers","New followers","Views","Engagement rate"],...dailyData.map(d=>[d.label,d.value,d.gained,d.views,d.engagement+"%"])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\\r\\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="creator-iq-daily-analysis.csv";a.click();URL.revokeObjectURL(url);}} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">↓ Export daily CSV</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-lg px-4 py-3">Date</th><th className="px-4 py-3">Followers</th><th className="px-4 py-3">Daily change</th><th className="px-4 py-3">Views</th><th className="rounded-r-lg px-4 py-3">Engagement</th></tr></thead><tbody>{dailyData.slice(-7).reverse().map(d=><tr key={d.label} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-medium">{d.label}</td><td className="px-4 py-3">{d.value.toLocaleString()}</td><td className={`px-4 py-3 font-semibold ${d.gained>=0?"text-emerald-600":"text-rose-600"}`}>{d.gained>0?"+":""}{d.gained.toLocaleString()}</td><td className="px-4 py-3">{d.views.toLocaleString()}</td><td className="px-4 py-3">{d.engagement}%</td></tr>)}</tbody></table></div><p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Demo data: these figures are sample analytics to demonstrate the dashboard. Real follower counts and daily analytics will appear after Instagram, YouTube or TikTok API integration.</p></section>
          <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Top performing posts</h2><p className="mt-1 text-sm text-slate-500">Example post performance</p></div><button onClick={()=>setActive("Content Analytics")} className="text-sm font-semibold text-violet-600 hover:text-violet-800">View all →</button></div><div className="mt-4 space-y-3">{posts.map((post,i)=><div key={post.title} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-200 to-fuchsia-100 text-lg text-violet-700">{["▶","◎","♪","◎"][i]}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{post.title}</p><p className="mt-1 text-xs text-slate-500">{post.platform} · {post.date}</p></div><div className="text-right"><p className="text-sm font-bold">{post.views}</p><p className="text-xs text-emerald-600">{post.rate}</p></div></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100"><h2 className="text-lg font-bold">Audience snapshot</h2><p className="mt-1 text-sm text-slate-500">Example audience mix</p><div className="mt-5 flex items-center gap-5"><div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{background:"conic-gradient(#7657df 0 42%, #a78bfa 42% 74%, #c4b5fd 74% 88%, #e9d5ff 88% 100%)"}}><div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white"><span className="text-sm font-bold">125.4K</span><span className="text-[9px] text-slate-400">Followers</span></div></div><div className="space-y-2 text-xs text-slate-600">{[["18–24","42%","#7657df"],["25–34","32%","#a78bfa"],["35–44","14%","#c4b5fd"],["Other","12%","#e9d5ff"]].map(([label,val,color])=><p key={label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{background:color}}/>{label}<span className="ml-auto font-semibold">{val}</span></p>)}</div></div><button onClick={()=>setActive("Audience")} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Audience details →</button></div></section>
        </>}
        {active === "Content Analytics" && <section className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Content performance analytics</h2><p className="mt-1 text-sm text-slate-500">Daily views over {period}</p><div className="mt-5"><MiniLineChart data={dailyData.map(d=>({label:d.label,value:d.views}))} color="#0ea5e9"/></div></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Top performing posts</h2><div className="mt-4 space-y-3">{posts.map(p=><div key={p.title} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><div><p className="font-semibold">{p.title}</p><p className="mt-1 text-sm text-slate-500">{p.platform} · {p.date}</p></div><div className="text-right"><p className="font-bold">{p.views} views</p><p className="text-sm text-emerald-600">{p.rate} engagement</p></div></div>)}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Sample values only until social account APIs are connected.</p></div></section>}
        {active === "Audience" && <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Audience growth</h2><p className="mt-1 text-sm text-slate-500">Follower count over {period}</p><div className="mt-5"><MiniLineChart data={followerData}/></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-violet-50 p-4"><p className="text-xs text-violet-600">New followers</p><p className="mt-1 text-2xl font-bold text-violet-900">+{followerGain.toLocaleString()}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-600">Growth rate</p><p className="mt-1 text-2xl font-bold text-emerald-900">{growthPct}%</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Audience demographics</h2><p className="mt-1 text-sm text-slate-500">Illustrative age distribution</p><div className="mt-6 space-y-5">{[["18–24",42],["25–34",32],["35–44",14],["45+",8],["Under 18",4]].map(([label,val])=><div key={label}><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{val}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{width:`${val}%`}}/></div></div>)}</div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Demographics are sample values, not fetched from a social platform.</p></div></section>}
        {active === "Reports" && <ReportsPage user={user} profile={profile} />}
      </>}
      <p className="mt-8 text-center text-xs text-slate-400">CREATOR IQ · Python Content Intelligence Platform</p>
    </main>
  </div>;
}



function TeamRoleDashboard({ user, onLogout }) {
  const isAgency = user.role === "Agency";
  const [section, setSection] = useState("Overview");
  const [period, setPeriod] = useState("Last 30 days");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const title = isAgency ? "Agency Dashboard" : "Marketing Team Dashboard";
  const nav = isAgency
    ? ["Overview", "Creators", "Campaigns", "Analytics", "Reports", "Settings"]
    : ["Overview", "Campaigns", "Content Calendar", "Performance", "Reports", "Settings"];
  const metrics = isAgency
    ? [["Total Creators", "128", "+12 this month", "♙"], ["Total Followers", "2.4M", "+8.4%", "◎"], ["Total Reach", "18.7M", "+12.6%", "◉"], ["Active Campaigns", "5", "2 ending soon", "▣"], ["Total Revenue", "₹3,48,600", "+18.2%", "₹"]]
    : [["Active Campaigns", "12", "+3 this month", "▣"], ["Total Reach", "12.4M", "+14.8%", "◎"], ["Engagement", "966K", "+9.6%", "♡"], ["Ad Spend", "₹4,20,000", "Within budget", "₹"], ["ROAS", "3.2x", "+0.4x", "↗"]];
  const creators = [
    ["Aarav Sharma", "@aaravcreates", "Lifestyle", "245K", "8.4%", "Active"],
    ["Mia Kapoor", "@miakapoor", "Fashion", "182K", "7.8%", "Active"],
    ["Riya Verma", "@riyaverma", "Beauty", "126K", "6.9%", "Review"],
    ["Kabir Mehta", "@kabir.media", "Technology", "98K", "5.7%", "Active"],
    ["Anaya Rao", "@anayarao", "Travel", "76K", "9.1%", "Active"],
  ];
  const campaigns = [
    ["Summer launch", "Instagram", "₹85,000", "1.8M", "Running"],
    ["Creator spotlight", "YouTube", "₹62,000", "940K", "Running"],
    ["Festive collection", "Instagram", "₹1,20,000", "2.4M", "Planning"],
    ["Brand awareness", "Multi-platform", "₹48,000", "680K", "Completed"],
  ];
  const rows = (isAgency ? creators : campaigns).filter(r => r.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-screen bg-[#f5f7fc] text-slate-800 md:flex">
    <aside className="z-10 border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-5">
      <div className="mb-7 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">✦</div><div><p className="font-extrabold tracking-wide">CreatorIQ</p><p className="text-xs text-slate-400">{isAgency ? "Agency workspace" : "Marketing workspace"}</p></div></div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <nav className="grid grid-cols-2 gap-1 md:block">{nav.map((n,i)=><button key={n} onClick={()=>setSection(n)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section===n?"bg-violet-50 font-semibold text-violet-700":"text-slate-500 hover:bg-slate-50"}`}><span className="w-5 text-center">{["▦","♙","▣","▥","▤","⚙"][i]}</span>{n}</button>)}</nav>
      <div className="mt-8 hidden rounded-2xl bg-slate-50 p-4 md:block"><p className="text-sm font-semibold">{user.name}</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p><span className="mt-3 inline-block rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700">{user.role}</span></div>
      <button onClick={onLogout} className="mt-4 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">↪ Sign out</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-600">{isAgency?"AGENCY ANALYTICS":"CAMPAIGN INTELLIGENCE"}</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{section==="Overview"?`Good morning, ${user.name.split(" ")[0]}!`:section}</h1><p className="mt-2 text-sm text-slate-500">{section==="Overview"?"Here's what's happening across your workspace.":"Explore and manage your "+section.toLowerCase()+"."}</p></div><div className="flex items-center gap-2"><select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{user.name.slice(0,1).toUpperCase()}</div></div></header>
      {notice&&<p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {section==="Overview" ? <>
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label,value,change,ico])=><div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">{ico}</span></div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-emerald-600">{change}</p></div>)}</section>
        <section className="mb-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Overall Performance</h2><p className="mt-1 text-xs text-slate-400">{period} · illustrative dashboard data</p></div><span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-700">Reach & engagement</span></div><MiniLineChart data={[{label:"Mon",value:32},{label:"Tue",value:42},{label:"Wed",value:38},{label:"Thu",value:57},{label:"Fri",value:54},{label:"Sat",value:71},{label:"Sun",value:88}]} color="#7657e8" height={230}/><div className="mt-3 flex gap-5 text-xs text-slate-500"><span>● Reach</span><span className="text-pink-500">● Engagement</span><span className="text-emerald-600">● Conversions</span></div></div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><h2 className="font-bold">{isAgency?"Platform Distribution":"Top-performing campaigns"}</h2><p className="mt-1 text-xs text-slate-400">Performance breakdown</p><div className="mt-5 space-y-5">{(isAgency?[["Instagram",76,"#7657e8"],["YouTube",58,"#f15b78"],["TikTok",43,"#35b6a0"],["Facebook",27,"#f4b740"]]:[["Summer launch",84,"#7657e8"],["Creator spotlight",67,"#f15b78"],["Festive collection",51,"#35b6a0"],["Brand awareness",32,"#f4b740"]]).map(([name,n,c])=><div key={name}><div className="mb-2 flex justify-between text-sm"><span>{name}</span><span className="text-slate-500">{n}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{width:`${n}%`,background:c}}/></div></div>)}</div></div></section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">{isAgency?"Creator Overview":"Recent Campaigns"}</h2><p className="mt-1 text-xs text-slate-400">{isAgency?"Track creator performance and collaboration status":"Review current campaign delivery and budget"}</p></div><button onClick={()=>setSection(isAgency?"Creators":"Campaigns")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-violet-700">View all →</button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{(isAgency?["Creator","Handle","Category","Followers","Engagement","Status"]:["Campaign","Platform","Budget","Reach","Status"]).map(x=><th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody>{(isAgency?creators:campaigns).slice(0,5).map((r,i)=><tr key={r[0]} className="border-t border-slate-100"><td className="px-3 py-3 font-medium">{r[0]}</td>{r.slice(1).map((v,j)=><td key={j} className="px-3 py-3 text-slate-500">{v}</td>)}</tr>)}</tbody></table></div></section>
        <p className="mt-4 text-xs text-slate-400">Demo figures are illustrative placeholders. Connect your social and campaign data sources to display live metrics.</p>
      </> : <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">{section}</h2><p className="mt-1 text-sm text-slate-500">{isAgency?"Manage creator partnerships and review agency performance.":"Review campaign activity and marketing performance."}</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${isAgency?"creators":"campaigns"}...`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"/><button onClick={()=>setNotice(`${section} export prepared. Connect production data for a complete report.`)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Export report</button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{(isAgency?["Creator","Handle","Category","Followers","Engagement","Status"]:["Campaign","Platform","Budget","Reach","Status"]).map(x=><th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r[0]} className="border-t border-slate-100"><td className="px-3 py-3 font-medium">{r[0]}</td>{r.slice(1).map((v,j)=><td key={j} className="px-3 py-3 text-slate-500">{v}</td>)}</tr>)}</tbody></table>{rows.length===0&&<p className="p-6 text-sm text-slate-500">No matching records.</p>}</div></section>}
    </main>
  </div>;
}

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
    if (session.user.role === "Admin") return <AdminDashboard user={session.user} token={session.token} onLogout={logout} />;
    if (session.user.role === "Agency" || session.user.role === "Marketing Team") return <TeamRoleDashboard user={session.user} onLogout={logout} />;
    return <CreatorDashboard user={session.user} token={session.token} onLogout={logout} />;
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-10"><div className="grid min-h-[620px] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:grid-cols-2"><section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-900 to-[#101629] p-8 md:flex lg:p-12"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"/><div className="relative"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-3xl">✦</div><h1 className="text-2xl font-extrabold tracking-wide">CREATOR IQ</h1></div><div className="mt-24"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Creator Analytics Platform</p><h2 className="mt-5 text-5xl font-bold leading-tight">Create.<br/>Analyze.<br/>Grow.</h2><p className="mt-6 max-w-sm text-base leading-7 text-indigo-100/80">Understand your content performance, discover audience insights, and turn your creativity into measurable growth.</p></div></div><div className="relative grid grid-cols-3 gap-3">{[["01","Content"],["02","Audience"],["03","Growth"]].map(([n,l])=><div key={n} className="rounded-xl border border-slate-200 bg-slate-100 p-4"><p className="text-sm text-violet-200">{n}</p><p className="mt-2 font-medium">{l}</p></div>)}</div></section><section className="flex items-center justify-center p-5 sm:p-8 lg:p-12"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 md:hidden"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-2xl">✦</div><h1 className="text-xl font-extrabold">CREATOR IQ</h1></div><p className="text-xs font-semibold tracking-[0.18em] text-violet-400">{isSignup?"GET STARTED":"WELCOME BACK"}</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">{isSignup?"Create account":"Sign in"}</h2><p className="mb-7 mt-3 text-sm text-slate-500 sm:text-base">{isSignup?"Create your account to get started with CREATOR IQ.":"Sign in with your registered account to open your creator workspace."}</p><div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#f5f6fb] p-1"><button type="button" onClick={()=>changeMode("signin")} className={`rounded-lg py-3 font-semibold ${!isSignup?"bg-violet-600 text-slate-900":"text-slate-500 hover:text-slate-900"}`}>Sign In</button><button type="button" onClick={()=>changeMode("signup")} className={`rounded-lg py-3 font-semibold ${isSignup?"bg-violet-600 text-slate-900":"text-slate-500 hover:text-slate-900"}`}>Sign Up</button></div><form onSubmit={handleSubmit} className="space-y-4">{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Full name</span><input name="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" autoComplete="name" required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>}<label className="block"><span className="mb-2 block text-sm text-slate-500">Email address</span><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Account type</span><select name="role" value={form.role} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-violet-400">{["Creator","Agency","Marketing Team","Admin"].map(r=><option key={r}>{r}</option>)}</select>{form.role === "Admin" && <span className="mt-2 block text-xs text-amber-700">Admin signup is restricted to email addresses configured by the system administrator.</span>}</label>}<label className="block"><span className="mb-2 block text-sm text-slate-500">Password</span><div className="relative"><input name="password" type={showPassword?"text":"password"} value={form.password} onChange={handleChange} placeholder={isSignup?"At least 8 characters":"Enter your password"} autoComplete={isSignup?"new-password":"current-password"} minLength={8} required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 pr-20 outline-none focus:border-violet-400"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-violet-400">{showPassword?"Hide":"Show"}</button></div></label>{isSignup&&<label className="block"><span className="mb-2 block text-sm text-slate-500">Confirm password</span><input name="confirmPassword" type={showPassword?"text":"password"} value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" minLength={8} required className="w-full rounded-xl border border-slate-700 bg-[#f5f6fb] px-4 py-3 outline-none focus:border-violet-400"/></label>}{message&&<p role="status" className={`rounded-xl border p-3 text-sm ${messageType==="success"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-200":"border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{message}</p>}<button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-600 py-3.5 font-semibold !text-white transition hover:bg-violet-500 disabled:opacity-60">{busy?(isSignup?"Creating account...":"Signing in..."):isSignup?"Create Account →":"Sign In →"}</button></form><p className="mt-6 text-center text-sm text-slate-500">{isSignup?"Already have an account?":"Don't have an account?"} <button type="button" onClick={()=>changeMode(isSignup?"signin":"signup")} className="font-semibold text-violet-400">{isSignup?"Sign In":"Sign Up"}</button></p><p className="mt-7 text-center text-xs text-slate-500">CREATOR IQ · Creator Analytics Platform</p></div></section></div></main>;
}

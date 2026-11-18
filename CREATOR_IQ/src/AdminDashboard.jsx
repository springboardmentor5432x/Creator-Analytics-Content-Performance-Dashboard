import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "./api.js";
import { BarList, Donut, Empty, Kpi, PLATFORM, TrendChart, dayLabel, fmt, inr, timeLabel } from "./live.jsx";
import { downloadCsv } from "./TeamDashboards.jsx";

const NAV = [
  { label: "Overview", icon: "▦" }, { label: "User management", icon: "♙" }, { label: "Role analytics", icon: "◔" },
  { label: "Social network", icon: "◎" }, { label: "System health", icon: "⌁" },
];
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6";
const inputCls = "rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const FALLBACK_ROLES = ["Creator", "Agency", "Marketing Team", "Admin"].map((name) => ({ name, description: "", color: "#7657e8" }));

function Pill({ ok, children }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ok === true ? "bg-emerald-50 text-emerald-700" : ok === false ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{children}</span>;
}

export default function AdminDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState("Overview");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [social, setSocial] = useState(null);
  const [health, setHealth] = useState(null);
  const [latency, setLatency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [updated, setUpdated] = useState(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (refresh = false) => {
    const q = refresh ? "?refresh=true" : "";
    try {
      const t0 = performance.now();
      const [u, s, so, h] = await Promise.all([
        request("/api/admin/users", {}, token), request("/api/admin/stats", {}, token),
        request(`/api/admin/social${q}`, {}, token), request(`/api/admin/health${q}`, {}, token),
      ]);
      setLatency(Math.round(performance.now() - t0));
      setUsers(u.users || []); setStats(s); setSocial(so); setHealth(h); setMessage(""); setUpdated(new Date());
    } catch (e) { setMessage(e.message); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const roles = stats?.roles || FALLBACK_ROLES;
  const colorOf = (r) => roles.find((x) => x.name === r)?.color || "#7657e8";
  const by = stats?.by_role || {};
  const totals = stats?.totals || {};

  async function patch(u, body, okText) {
    setBusyId(u.id); setNotice(""); setMessage("");
    try { await request(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify(body) }, token); setNotice(okText); await load(); }
    catch (e) { setMessage(e.message); } finally { setBusyId(null); }
  }
  async function remove(u) {
    if (!window.confirm(`Delete ${u.name} (${u.email})? Their tracked accounts, campaigns and history are removed too.`)) return;
    setBusyId(u.id); setNotice(""); setMessage("");
    try { await request(`/api/admin/users/${u.id}`, { method: "DELETE" }, token); setNotice(`Deleted ${u.email}.`); await load(); }
    catch (e) { setMessage(e.message); } finally { setBusyId(null); }
  }

  const filtered = useMemo(() => users.filter((x) =>
    `${x.name} ${x.email}`.toLowerCase().includes(query.toLowerCase()) && (roleFilter === "All roles" || x.role === roleFilter) &&
    (statusFilter === "All statuses" || (statusFilter === "Active" ? x.is_active : !x.is_active))), [users, query, roleFilter, statusFilter]);

  const liveAccounts = (social?.accounts || []);
  const liveFollowers = liveAccounts.reduce((s, a) => s + (a.data?.followers || 0), 0);
  const platformRows = Object.keys(PLATFORM).map((p) => ({ label: PLATFORM[p].name, color: PLATFORM[p].color, value: liveAccounts.filter((a) => a.platform === p).reduce((s, a) => s + (a.data?.followers || 0), 0) })).filter((r) => r.value);
  const signupPoints = (stats?.signup_trend || []).map((d) => ({ label: dayLabel(d.date), value: d.count }));

  function exportUsers() {
    downloadCsv("creator-iq-users.csv", [["Name", "Email", "Role", "Status", "Joined", "Tracked accounts", "Campaigns"],
      ...filtered.map((x) => [x.name, x.email, x.role, x.is_active ? "Active" : "Inactive", x.created_at, x.tracked_accounts, x.campaigns])]);
  }

  const checks = health ? [
    { name: "FastAPI backend", ok: !message, desc: `Responded in ${latency ?? "—"} ms` },
    { name: "Database", ok: health.database.ok, desc: health.database.engine },
    { name: "YouTube Data API", ok: health.social.youtube ? true : null, desc: health.social.youtube ? "API key configured" : "YOUTUBE_API_KEY missing" },
    { name: "Instagram Graph API", ok: health.social.instagram ? (health.social.instagram_account?.error ? false : true) : null,
      desc: !health.social.instagram ? "INSTAGRAM_ACCESS_TOKEN missing" : health.social.instagram_account?.error || `Connected as @${health.social.instagram_account?.username}` },
    { name: "Admin allow-list", ok: health.config.admin_emails > 0 ? true : null, desc: `${health.config.admin_emails} email(s) in ADMIN_EMAILS` },
    { name: "Secret key", ok: health.config.secret_key_default ? null : true, desc: health.config.secret_key_default ? "Still a placeholder — set a long random SECRET_KEY" : "Custom secret set" },
  ] : [];

  return <div className="min-h-screen bg-[#f5f6fb] text-slate-900 md:flex">
    <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-lg shadow-violet-200">✦</div><div><p className="font-extrabold tracking-wide">CREATOR IQ</p><p className="text-xs text-slate-500">Admin console</p></div></div>
      <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200 font-bold text-violet-800">{(user.name || "A").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p></div></div></div>
      <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{NAV.map((n) => <button key={n.label} onClick={() => setActive(n.label)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === n.label ? "bg-violet-600 font-semibold text-white shadow-md shadow-violet-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span className="w-5 text-center text-lg">{n.icon}</span>{n.label}</button>)}</nav>
      <div className="mt-auto hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 md:mt-8 md:block"><p className="text-sm font-semibold">{totals.users ?? "…"} accounts</p><p className="mt-2 text-xs leading-5 text-slate-500">{fmt(liveFollowers)} followers tracked across {liveAccounts.length} connected account(s). Auto-refreshes every 30s.</p></div>
      <button onClick={onLogout} className="mt-5 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">↪ Sign out</button>
    </aside>

    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-violet-600"><span>Administration</span><span className="text-slate-300">/</span><span className="text-slate-400">{active}</span></div><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{active === "Overview" ? "Admin overview" : active}</h1><p className="mt-2 text-sm text-slate-500">Everything below is read live from the database and the social APIs.</p></div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline"><span className={message ? "text-rose-500" : "text-emerald-500"}>●</span> {message ? "Offline" : "Live"} · updated {timeLabel(updated)}</span><button onClick={() => { setLoading(true); load(true); }} disabled={loading} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold !text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60">{loading ? "Refreshing…" : "↻ Refresh now"}</button></div>
      </header>
      {message && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p className="font-semibold">Something went wrong</p><p className="mt-1">{message}</p></div>}
      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {active === "Overview" && <>
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Registered users" value={loading ? "…" : totals.users} note={`${totals.signups_7d ?? 0} new in the last 7 days`} icon="♙" />
          <Kpi label="Active accounts" value={loading ? "…" : totals.active} note={`${totals.users ? Math.round(totals.active / totals.users * 100) : 0}% of registered users`} icon="✓" />
          <Kpi label="Tracked social accounts" value={loading ? "…" : totals.tracked_accounts} note={`${fmt(liveFollowers)} live followers in total`} icon="◎" />
          <Kpi label="Campaign budget" value={inr(totals.budget)} note={`${totals.campaigns ?? 0} campaigns · ${inr(totals.revenue)} revenue`} icon="₹" />
        </section>
        <section className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className={card}><h2 className="font-bold">New sign-ups · last 14 days</h2><p className="mb-3 mt-1 text-sm text-slate-500">Registrations per day, from the user table</p><TrendChart points={signupPoints} empty="Sign-ups will chart here as accounts are created." height={220} /></div>
          <div className={card}><h2 className="font-bold">Accounts by role</h2><p className="mb-4 mt-1 text-sm text-slate-500">Roles come from the backend registry</p>
            <Donut rows={roles.map((r) => ({ label: r.name, color: r.color, value: by[r.name]?.total || 0 })).filter((r) => r.value)} center={totals.users} format={(n) => n} empty="No accounts yet." /></div>
        </section>
        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className={card}><h2 className="font-bold">Followers by platform</h2><p className="mb-4 mt-1 text-sm text-slate-500">Live numbers from every user's connected accounts</p>{platformRows.length ? <BarList rows={platformRows} /> : <Empty title="No live accounts yet" text="Creators and teams connect YouTube / Instagram accounts from their own dashboards." />}</div>
          <div className={card}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Service status</h2><p className="mt-1 text-sm text-slate-500">Checked on every refresh</p></div><button onClick={() => setActive("System health")} className="text-sm font-semibold text-violet-700">Details →</button></div>
            <div className="mt-4 space-y-2">{checks.slice(0, 4).map((c) => <div key={c.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="min-w-0"><p className="text-sm font-semibold">{c.name}</p><p className="truncate text-xs text-slate-500">{c.desc}</p></div><Pill ok={c.ok}>{c.ok === true ? "OK" : c.ok === false ? "Error" : "Not set"}</Pill></div>)}</div></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold">Recently registered</h2><p className="mt-1 text-sm text-slate-500">Newest five accounts</p></div><button onClick={() => setActive("User management")} className="text-sm font-semibold text-violet-700">Manage users →</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><tbody>{users.slice(0, 5).map((x) => <tr key={x.id} className="border-t border-slate-100 first:border-0"><td className="px-5 py-4"><p className="font-semibold">{x.name}</p><p className="text-xs text-slate-500">{x.email}</p></td><td className="px-5 py-4"><span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: colorOf(x.role) + "20", color: colorOf(x.role) }}>{x.role}</span></td><td className="px-5 py-4 text-slate-500">{dayLabel(x.created_at)}</td><td className="px-5 py-4"><Pill ok={x.is_active}>{x.is_active ? "Active" : "Inactive"}</Pill></td></tr>)}</tbody></table>{!users.length && !loading && <p className="p-6 text-sm text-slate-500">No accounts found.</p>}</div>
        </section>
      </>}

      {active === "User management" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">All accounts</h2><p className="mt-1 text-sm text-slate-500">Change roles, deactivate or delete accounts. Changes apply instantly.</p></div><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">{filtered.length} results</span><button onClick={exportUsers} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">⇩ CSV</button></div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className={inputCls} /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}><option>All roles</option>{roles.map((r) => <option key={r.name}>{r.name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}><option>All statuses</option><option>Active</option><option>Inactive</option></select></div></div>
        {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Usage</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
          <tbody>{filtered.map((x) => { const me = x.id === user.id; return <tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold">{x.name}{me && <span className="ml-2 text-xs text-violet-600">(you)</span>}</p><p className="mt-1 text-xs text-slate-500">{x.email}</p></td>
            <td className="px-5 py-4"><select disabled={busyId === x.id || me} value={x.role} onChange={(e) => patch(x, { role: e.target.value }, `${x.email} is now ${e.target.value}.`)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium disabled:opacity-60">{roles.map((r) => <option key={r.name}>{r.name}</option>)}</select></td>
            <td className="px-5 py-4 text-xs text-slate-500">{x.tracked_accounts} social · {x.campaigns} campaigns</td><td className="px-5 py-4 text-slate-500">{dayLabel(x.created_at)}</td><td className="px-5 py-4"><Pill ok={x.is_active}>{x.is_active ? "Active" : "Inactive"}</Pill></td>
            <td className="px-5 py-4 text-right"><button disabled={busyId === x.id || me} onClick={() => patch(x, { is_active: !x.is_active }, `${x.email} ${x.is_active ? "deactivated" : "activated"}.`)} className="mr-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">{x.is_active ? "Deactivate" : "Activate"}</button><button disabled={busyId === x.id || me} onClick={() => remove(x)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Delete</button></td></tr>; })}</tbody></table></div>
          : <div className="p-10 text-center"><p className="font-semibold">No matching accounts</p><button onClick={() => { setQuery(""); setRoleFilter("All roles"); setStatusFilter("All statuses"); }} className="mt-3 text-sm font-semibold text-violet-700">Clear filters</button></div>}
      </section>}

      {active === "Role analytics" && <section className="grid gap-5 md:grid-cols-2">{roles.map((r) => { const b = by[r.name] || {}; const team = ["Agency", "Marketing Team"].includes(r.name); return <div key={r.name} className={card}>
        <div className="flex items-center justify-between"><h2 className="font-bold">{r.name}</h2><span className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: r.color + "20", color: r.color }}>{b.total || 0}</span></div>
        <p className="mt-1 text-xs text-slate-400">{r.description}</p>
        <div className="mt-4 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${totals.users ? (b.total || 0) / totals.users * 100 : 0}%`, background: r.color }} /></div>
        <p className="mt-2 text-sm text-slate-500">{totals.users ? ((b.total || 0) / totals.users * 100).toFixed(1) : "0.0"}% of all accounts · {b.active || 0} active</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Tracked social accounts</p><p className="mt-1 font-bold">{b.tracked_accounts || 0}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Latest sign-up</p><p className="mt-1 font-bold">{b.last_signup ? dayLabel(b.last_signup) : "—"}</p></div>
          {team && <><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Campaigns</p><p className="mt-1 font-bold">{b.campaigns || 0}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Spent / budget</p><p className="mt-1 font-bold">{inr(b.spent)} / {inr(b.budget)}</p></div></>}</div></div>; })}</section>}

      {active === "Social network" && <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">All connected social accounts</h2><p className="mt-1 text-sm text-slate-500">Every account any user is tracking, with live stats · {fmt(liveFollowers)} followers in total</p></div><button onClick={() => load(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">↻ Pull fresh data</button></div>
        {liveAccounts.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Followers</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Posts</th><th className="px-4 py-3">Eng.</th></tr></thead>
          <tbody>{liveAccounts.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-semibold">{a.label || a.data?.name || a.identifier}</p><p className="text-xs" style={{ color: PLATFORM[a.platform]?.color }}>● {PLATFORM[a.platform]?.name} · {a.data?.handle || a.identifier}</p></td><td className="px-4 py-3 text-xs text-slate-500">{a.owner.name}<br />{a.owner.role}</td>
            {a.data ? <><td className="px-4 py-3 font-semibold">{fmt(a.data.followers)}</td><td className="px-4 py-3">{fmt(a.data.views)}</td><td className="px-4 py-3">{fmt(a.data.posts)}</td><td className="px-4 py-3">{a.data.engagement == null ? "—" : a.data.engagement + "%"}</td></> : <td colSpan="4" className="px-4 py-3 text-xs text-rose-600">{a.error}</td>}</tr>)}</tbody></table></div>
          : <div className="mt-4"><Empty title="Nothing connected yet" text="When creators, agencies or marketing teams connect YouTube / Instagram accounts they appear here automatically." /></div>}
      </section>}

      {active === "System health" && <section className="grid gap-5 lg:grid-cols-2">
        <div className={card}><h2 className="font-bold">Service checks</h2><p className="mt-1 text-sm text-slate-500">Real results from the backend, not placeholders.</p><div className="mt-5 space-y-4">{checks.map((c) => <div key={c.name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0"><div className="min-w-0"><p className="text-sm font-semibold">{c.name}</p><p className="mt-1 text-xs text-slate-500">{c.desc}</p></div><Pill ok={c.ok}>{c.ok === true ? "OK" : c.ok === false ? "Needs attention" : "Not configured"}</Pill></div>)}</div><button onClick={() => load(true)} className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Run checks again</button></div>
        <div className={card}><h2 className="font-bold">Configuration</h2><p className="mt-1 text-sm text-slate-500">Values currently used by the server</p>{health && <ul className="mt-5 space-y-3 text-sm text-slate-600">
          <li className="rounded-xl bg-slate-50 p-3">Platform data is cached for {health.social.cache_seconds}s to protect API quota.</li>
          <li className="rounded-xl bg-slate-50 p-3">Follower snapshots are recorded every {health.config.snapshot_minutes} min ({fmt(totals.snapshots)} stored).</li>
          <li className="rounded-xl bg-slate-50 p-3">Sessions last {health.config.token_minutes} minutes.</li>
          {health.social.instagram_account?.error && <li className="rounded-xl bg-rose-50 p-3 text-rose-800">Instagram: {health.social.instagram_account.error}</li>}
          {health.config.secret_key_default && <li className="rounded-xl bg-amber-50 p-3 text-amber-900">Set a strong SECRET_KEY in backend/.env before deploying.</li>}</ul>}</div>
      </section>}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400"><span>CREATOR IQ · Administration</span><span>{users.length} accounts · auto-refresh 30s</span></footer>
    </main>
  </div>;
}

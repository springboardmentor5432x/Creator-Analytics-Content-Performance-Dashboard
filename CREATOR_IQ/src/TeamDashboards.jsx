import { useCallback, useEffect, useState } from "react";
import { request } from "./api.js";
import { ApiStatus, BarList, Donut, Empty, GroupBars, KeyBanner, Kpi, LivePanel, PLATFORM, TrendChart, dayLabel, fmt, inr, recentPosts, summarize, timeLabel, trendPoints, useLive } from "./live.jsx";

const NAV = {
  Agency: ["Overview", "Creators", "Campaigns", "Analytics", "Reports", "Settings"],
  "Marketing Team": ["Overview", "Campaigns", "Content Calendar", "Performance", "Reports", "Settings"],
};
const ICON = { Overview: "▦", Creators: "♙", Campaigns: "▣", Analytics: "▥", "Content Calendar": "◫", Performance: "↗", Reports: "▤", Settings: "⚙" };
const SUB = {
  Overview: "Live snapshot of your tracked accounts and campaigns.",
  Creators: "Connect creator channels and watch their real-time numbers.",
  Campaigns: "Plan, budget and track your campaigns.",
  Analytics: "Compare creators and platforms using live platform data.",
  "Content Calendar": "Published posts and campaign dates on one timeline.",
  Performance: "Which accounts and posts are delivering engagement.",
  Reports: "Export live data and campaigns as CSV.",
  Settings: "API connections and workspace details.",
};
export const STATUS_STYLE = { Running: "bg-emerald-50 text-emerald-700", Planning: "bg-amber-50 text-amber-700", Completed: "bg-slate-100 text-slate-600" };
export const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm";
export const input = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400";

export function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function useCampaigns(token) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setItems((await request("/api/campaigns", {}, token)).campaigns); setError(""); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  // optimistic updates: every view re-renders immediately, then the server value replaces the local one
  const add = async (body) => { const c = await request("/api/campaigns", { method: "POST", body: JSON.stringify(body) }, token); setItems((p) => [c, ...p]); };
  const update = async (c, patch) => {
    const next = { ...c, ...patch }; setItems((p) => p.map((x) => x.id === c.id ? next : x));
    try { const saved = await request(`/api/campaigns/${c.id}`, { method: "PUT", body: JSON.stringify(next) }, token); setItems((p) => p.map((x) => x.id === c.id ? saved : x)); }
    catch (e) { setError(e.message); load(); }
  };
  const remove = async (c) => { setItems((p) => p.filter((x) => x.id !== c.id)); try { await request(`/api/campaigns/${c.id}`, { method: "DELETE" }, token); } catch (e) { setError(e.message); load(); } };
  return { items, error, reload: load, add, update, remove };
}

const rankRows = (accounts, key) => accounts.filter((a) => a.data && a.data[key] != null)
  .map((a) => ({ label: a.label || a.data.name, value: a.data[key], color: PLATFORM[a.platform]?.color })).sort((x, y) => y.value - x.value);

function NoAccounts({ go, text }) {
  return <Empty title="No live accounts connected yet" text={text} action={<button onClick={go} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white">Connect an account →</button>} />;
}

export function PostsTable({ posts, limit = 8 }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Post", "Account", "Published", "Views", "Likes", "Comments"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
    <tbody>{posts.slice(0, limit).map((p, i) => <tr key={i} className="border-t border-slate-100"><td className="max-w-[260px] truncate px-3 py-3 font-medium">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-violet-700">{p.title}</a> : p.title}</td><td className="px-3 py-3 text-slate-500"><span style={{ color: PLATFORM[p.platform]?.color }}>●</span> {p.account}</td><td className="px-3 py-3 text-slate-500">{dayLabel(p.published)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.views)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.likes)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.comments)}</td></tr>)}</tbody></table></div>;
}

export const roi = (spent, revenue) => spent ? Math.round((revenue - spent) / spent * 100) : null;
export const campStats = (items) => { const sum = (k) => items.reduce((s, c) => s + (c[k] || 0), 0); return { total: items.length, running: items.filter((c) => c.status === "Running").length, planning: items.filter((c) => c.status === "Planning").length, budget: sum("budget"), spent: sum("spent"), revenue: sum("revenue") }; };

function CampaignsView({ camps }) {
  const blank = { name: "", platform: "Instagram", budget: "", status: "Running", start_date: "", end_date: "" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function create(e) { e.preventDefault(); setErr(""); try { await camps.add({ ...form, budget: Number(form.budget) || 0 }); setForm(blank); } catch (x) { setErr(x.message); } }
  const st = campStats(camps.items);
  const num = (c, k) => <input type="number" min="0" defaultValue={c[k]} key={c[k]} onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== c[k]) camps.update(c, { [k]: v }); }} className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Campaigns" value={st.total} note={`${st.running} running · ${st.planning} planning`} icon="▣" /><Kpi label="Total budget" value={inr(st.budget)} note="Planned spend" icon="₹" /><Kpi label="Spent so far" value={inr(st.spent)} note={st.budget ? Math.round(st.spent / st.budget * 100) + "% of budget" : "—"} icon="↗" /><Kpi label="Revenue" value={inr(st.revenue)} note={roi(st.spent, st.revenue) == null ? "ROI —" : `ROI ${roi(st.spent, st.revenue)}%`} icon="◎" /></div>
    <form onSubmit={create} className={card}><h2 className="font-bold">New campaign</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <input required value={form.name} onChange={set("name")} placeholder="Campaign name" className={`${input} xl:col-span-2`} />
        <select value={form.platform} onChange={set("platform")} className={input}>{["Instagram", "YouTube", "TikTok", "Facebook", "Multi-platform"].map((p) => <option key={p}>{p}</option>)}</select>
        <input type="number" min="0" value={form.budget} onChange={set("budget")} placeholder="Budget (₹)" className={input} />
        <select value={form.status} onChange={set("status")} className={input}><option>Planning</option><option>Running</option><option>Completed</option></select>
        <button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500">+ Add</button>
        <label className="text-xs text-slate-500">Start<input type="date" value={form.start_date} onChange={set("start_date")} className={`${input} mt-1 w-full`} /></label>
        <label className="text-xs text-slate-500">End<input type="date" value={form.end_date} onChange={set("end_date")} className={`${input} mt-1 w-full`} /></label>
      </div>{(err || camps.error) && <p role="alert" className="mt-3 text-sm text-rose-600">{err || camps.error}</p>}</form>
    <section className={card}><h2 className="mb-1 font-bold">All campaigns</h2><p className="mb-4 text-xs text-slate-400">Edit spent / revenue and status directly in the table — every dashboard updates instantly.</p>
      {camps.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Campaign", "Platform", "Budget", "Spent (₹)", "Revenue (₹)", "ROI", "Dates", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{camps.items.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="px-3 py-3 font-medium">{c.name}</td><td className="px-3 py-3 text-slate-500">{c.platform}</td><td className="px-3 py-3 text-slate-500">{inr(c.budget)}</td><td className="px-3 py-3">{num(c, "spent")}</td><td className="px-3 py-3">{num(c, "revenue")}</td><td className="px-3 py-3 text-slate-500">{roi(c.spent, c.revenue) == null ? "—" : roi(c.spent, c.revenue) + "%"}</td><td className="px-3 py-3 text-xs text-slate-500">{c.start_date || "—"} → {c.end_date || "—"}</td>
          <td className="px-3 py-3"><select value={c.status} onChange={(e) => camps.update(c, { status: e.target.value })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[c.status]}`}><option>Planning</option><option>Running</option><option>Completed</option></select></td>
          <td className="px-3 py-3 text-right"><button onClick={() => camps.remove(c)} className="text-xs text-slate-400 hover:text-rose-600">Delete</button></td></tr>)}</tbody></table></div>
        : <p className="py-6 text-center text-sm text-slate-500">No campaigns yet. Create your first one above.</p>}</section>
  </div>;
}

export const Avatar = ({ a }) => a.data?.avatar ? <img src={a.data.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{(a.label || a.identifier).slice(0, 1).toUpperCase()}</div>;

function Perf({ live, posts, tabs }) {
  const [metric, setMetric] = useState(tabs[0]);
  return <div className={card}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Overall performance</h2><p className="mt-1 text-xs text-slate-400">Real data · {metric === "Followers" ? "recorded follower snapshots" : "latest posts across connected accounts"}</p></div>
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{tabs.map((m) => <button key={m} onClick={() => setMetric(m)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${metric === m ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{m}</button>)}</div></div>
    <div className="mt-4"><TrendChart points={trendPoints(metric, live, posts)} empty={metric === "Followers" ? "Growth is recorded while the dashboard is connected. The line appears after two snapshots (about 10 minutes apart)." : "Connect an account with published posts to chart performance."} /></div></div>;
}

function AgencyOverview({ live, tot, posts, camps, setSection, needAccounts }) {
  const st = campStats(camps.items);
  const byPlatform = Object.keys(PLATFORM).map((p) => ({ label: PLATFORM[p].name, color: PLATFORM[p].color, value: live.accounts.filter((a) => a.platform === p && a.data).reduce((s, a) => s + (a.data.followers || 0), 0) })).filter((r) => r.value);
  const top = [...live.accounts].filter((a) => a.data).sort((x, y) => (y.data.followers || 0) - (x.data.followers || 0)).slice(0, 5);
  return <>
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Kpi label="Total creators" value={tot.count} note={`${tot.live} reporting live`} icon="♙" /><Kpi label="Total followers" value={fmt(tot.followers)} note="Across all creators" icon="◎" /><Kpi label="Total views" value={fmt(tot.views)} note="Lifetime channel views" icon="◉" /><Kpi label="Campaigns" value={st.total} note={`${st.running} running · ${st.planning} planning`} icon="▣" /><Kpi label="Total revenue" value={inr(st.revenue)} note={roi(st.spent, st.revenue) == null ? "Add spend to see ROI" : `ROI ${roi(st.spent, st.revenue)}%`} icon="₹" /></section>
    <section className="mb-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]"><Perf live={live} posts={posts} tabs={["Followers", "Views", "Interactions"]} />
      <div className={card}><h2 className="font-bold">Platform distribution</h2><p className="mb-5 mt-1 text-xs text-slate-400">Followers by platform</p><Donut rows={byPlatform} center={fmt(tot.followers)} empty="Connect creators to see the platform split." /></div></section>
    <section className={card}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Creators overview</h2><p className="mt-1 text-xs text-slate-400">Top creators by followers · live</p></div><button onClick={() => setSection("Creators")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-violet-700">View all →</button></div>
      {top.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Creator", "Platform", "Followers", "Views", "Engagement", "Status"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{top.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-3"><div className="flex items-center gap-3"><Avatar a={a} /><div><p className="font-medium">{a.label || a.data.name}</p><p className="text-xs text-slate-400">{a.data.handle}</p></div></div></td><td className="px-3 py-3 text-slate-500"><span style={{ color: PLATFORM[a.platform].color }}>●</span> {PLATFORM[a.platform].name}</td><td className="px-3 py-3">{fmt(a.data.followers)}</td><td className="px-3 py-3">{fmt(a.data.views)}</td><td className="px-3 py-3">{a.data.engagement == null ? "—" : a.data.engagement + "%"}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live</span></td></tr>)}</tbody></table></div> : needAccounts}</section></>;
}

export default function TeamRoleDashboard({ user, token, onLogout }) {
  const isAgency = user.role === "Agency";
  const [section, setSection] = useState("Overview");
  const [query, setQuery] = useState("");
  const live = useLive(token);
  const camps = useCampaigns(token);
  const tot = summarize(live.accounts);
  const posts = recentPosts(live.accounts);
  const budget = camps.items.reduce((s, c) => s + c.budget, 0);
  const who = isAgency ? "creators" : "brand accounts";
  const goAccounts = () => setSection(isAgency ? "Creators" : "Settings");
  const needAccounts = <NoAccounts go={goAccounts} text={`Connect ${who} (YouTube or Instagram) to see real-time analytics here.`} />;

  function exportReport() {
    downloadCsv(`creator-iq-${user.role.toLowerCase().replace(" ", "-")}-report.csv`, [
      ["CREATOR IQ report", `Generated ${new Date().toLocaleString()}`], [],
      ["Platform", "Account", "Followers", "Views", "Posts", "Engagement %", "Status"],
      ...live.accounts.map((a) => [PLATFORM[a.platform]?.name, a.label || a.data?.name || a.identifier, a.data?.followers, a.data?.views, a.data?.posts, a.data?.engagement, a.data ? "Live" : a.error]), [],
      ["Campaign", "Platform", "Budget (INR)", "Spent (INR)", "Revenue (INR)", "Start", "End", "Status"],
      ...camps.items.map((c) => [c.name, c.platform, c.budget, c.spent, c.revenue, c.start_date, c.end_date, c.status]),
    ]);
  }

  const byPlatform = Object.keys(PLATFORM).map((p) => ({ label: PLATFORM[p].name, color: PLATFORM[p].color, value: live.accounts.filter((a) => a.platform === p && a.data).reduce((s, a) => s + (a.data.followers || 0), 0) })).filter((r) => r.value);
  const budgetByPlatform = [...new Set(camps.items.map((c) => c.platform))].map((p) => ({ label: p, value: camps.items.filter((c) => c.platform === p).reduce((s, c) => s + c.budget, 0) }));
  const events = [
    ...posts.map((p) => ({ date: p.published, kind: "Post", title: p.title, meta: `${p.account} · ${PLATFORM[p.platform]?.name}` })),
    ...camps.items.filter((c) => c.start_date).map((c) => ({ date: c.start_date, kind: "Campaign start", title: c.name, meta: `${c.platform} · ${inr(c.budget)}` })),
    ...camps.items.filter((c) => c.end_date).map((c) => ({ date: c.end_date, kind: "Campaign end", title: c.name, meta: c.platform })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const q = query.toLowerCase();
  const rosterRows = live.accounts.filter((a) => `${a.label} ${a.identifier} ${a.data?.name || ""}`.toLowerCase().includes(q));

  return <div className="min-h-screen bg-[#f5f7fc] text-slate-800 md:flex">
    <aside className="z-10 border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-5">
      <div className="mb-7 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">✦</div><div><p className="font-extrabold tracking-wide">CreatorIQ</p><p className="text-xs text-slate-400">{isAgency ? "Agency workspace" : "Marketing workspace"}</p></div></div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <nav className="grid grid-cols-2 gap-1 md:block">{NAV[user.role].map((n) => <button key={n} onClick={() => setSection(n)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section === n ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><span className="w-5 text-center">{ICON[n]}</span>{n}</button>)}</nav>
      <div className="mt-8 hidden rounded-2xl bg-slate-50 p-4 md:block"><p className="text-sm font-semibold">{user.name}</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p><span className="mt-3 inline-block rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700">{user.role}</span></div>
      <button onClick={onLogout} className="mt-4 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">↪ Sign out</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-600">{isAgency ? "AGENCY ANALYTICS" : "CAMPAIGN INTELLIGENCE"}</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{section === "Overview" ? `Good day, ${(user.name || "").split(" ")[0]}!` : section}</h1><p className="mt-2 text-sm text-slate-500">{SUB[section]}</p></div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline"><span className={live.status?.youtube || live.status?.instagram ? "text-emerald-500" : "text-amber-500"}>●</span> {live.status?.youtube || live.status?.instagram ? "Live" : "No API keys"} · updated {timeLabel(live.updated)}</span><button onClick={() => { live.reload(); camps.reload(); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">↻ Refresh</button></div></header>
      <KeyBanner status={live.status} go={goAccounts} />
      {(live.error || camps.error) && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{live.error || camps.error}</p>}

      {section === "Overview" && <AgencyOverview {...{ live, tot, posts, camps, setSection, needAccounts }} />}

      {section === "Creators" && <>
        <LivePanel live={live} token={token} title="Creator roster" subject="creator" />
        <section className={card}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Roster performance</h2><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators…" className={input} /></div>
          {rosterRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Creator", "Platform", "Followers", "Views", "Posts", "Engagement"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rosterRows.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-3 font-medium">{a.label || a.data?.name || a.identifier}</td><td className="px-3 py-3 text-slate-500">{PLATFORM[a.platform]?.name}</td><td className="px-3 py-3 text-slate-500">{fmt(a.data?.followers)}</td><td className="px-3 py-3 text-slate-500">{fmt(a.data?.views)}</td><td className="px-3 py-3 text-slate-500">{fmt(a.data?.posts)}</td><td className="px-3 py-3 text-slate-500">{a.data?.engagement == null ? "—" : a.data.engagement + "%"}</td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-slate-500">No matching creators.</p>}</section>
      </>}

      {section === "Campaigns" && <CampaignsView camps={camps} />}

      {section === "Analytics" && (tot.live ? <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}><h2 className="mb-5 font-bold">Followers by platform</h2><BarList rows={byPlatform} /></div>
        <div className={card}><h2 className="mb-5 font-bold">Total views by creator</h2><BarList rows={rankRows(live.accounts, "views")} /></div>
        <div className={card}><h2 className="mb-5 font-bold">Engagement ranking</h2><BarList rows={rankRows(live.accounts, "engagement")} format={(v) => v + "%"} /></div>
        <div className={card}><h2 className="mb-5 font-bold">Content output</h2><BarList rows={rankRows(live.accounts, "posts")} /></div></div> : needAccounts)}

      {section === "Content Calendar" && <section className={card}><h2 className="mb-4 font-bold">Timeline</h2>{events.length ? <ol className="space-y-3">{events.slice(0, 30).map((e, i) => <li key={i} className="flex gap-4 rounded-xl bg-slate-50 p-3"><span className="w-24 shrink-0 text-xs font-semibold text-slate-500">{dayLabel(e.date)}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{e.title}</p><p className="text-xs text-slate-500">{e.kind} · {e.meta}</p></div></li>)}</ol> : <Empty title="Nothing scheduled yet" text="Recent posts from connected accounts and your campaign start/end dates will appear here." action={<button onClick={goAccounts} className="mt-4 text-sm font-semibold text-violet-700">Connect accounts →</button>} />}</section>}

      {section === "Performance" && (tot.live ? <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><div className={card}><h2 className="mb-5 font-bold">Engagement by account</h2><BarList rows={rankRows(live.accounts, "engagement")} format={(v) => v + "%"} /></div><div className={card}><h2 className="mb-5 font-bold">Budget by platform</h2>{budgetByPlatform.length ? <BarList rows={budgetByPlatform} format={inr} /> : <p className="text-sm text-slate-500">Add campaigns with budgets to see spend per platform.</p>}</div></div>
        <div className={card}><h2 className="mb-4 font-bold">Top posts by interactions</h2><PostsTable posts={[...posts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))} limit={10} /></div></div> : needAccounts)}

      {section === "Reports" && <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div className={card}><h2 className="font-bold">Export</h2><p className="mt-2 text-sm leading-6 text-slate-500">Downloads a CSV with the current live numbers for {tot.count} connected account(s) and {camps.items.length} campaign(s).</p><button onClick={exportReport} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold !text-white hover:bg-violet-500">↓ Download CSV report</button></div>
        <div className={card}><h2 className="mb-4 font-bold">Report preview</h2>{[["Accounts tracked", tot.count], ["Total followers", fmt(tot.followers)], ["Total views", fmt(tot.views)], ["Campaigns", camps.items.length], ["Total budget", inr(budget)]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>)}</div></div>}

      {section === "Settings" && <>
        <section className={`${card} mb-5`}><h2 className="font-bold">Social API connections</h2><p className="mb-4 mt-1 text-sm text-slate-500">Keys are stored server-side in <code>backend/.env</code> and never exposed to the browser. Responses are cached for {live.status?.cache_seconds ?? 300}s to protect API quota.</p><ApiStatus status={live.status} /><ul className="mt-4 space-y-1 text-xs text-slate-500"><li><code>YOUTUBE_API_KEY</code> — YouTube Data API v3 key</li><li><code>INSTAGRAM_ACCESS_TOKEN</code> + <code>INSTAGRAM_USER_ID</code> — Instagram Graph API (Business/Creator account)</li></ul></section>
        {!isAgency && <LivePanel live={live} token={token} title="Tracked brand accounts" subject="brand" />}
        <section className={card}><h2 className="mb-3 font-bold">Account</h2>{[["Name", user.name], ["Email", user.email], ["Role", user.role]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>)}</section>
      </>}
    </main>
  </div>;
}

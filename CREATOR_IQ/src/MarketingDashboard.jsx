import { useMemo, useState } from "react";
import { ApiStatus, BarList, Donut, Empty, GroupBars, KeyBanner, Kpi, LivePanel, PLATFORM, dayLabel, fmt, inr, recentPosts, summarize, timeLabel, useLive } from "./live.jsx";
import { PostsTable, STATUS_STYLE, campStats, card, downloadCsv, input, roi, useCampaigns } from "./TeamDashboards.jsx";

const NAV = ["Overview", "Campaigns", "Content Calendar", "Performance", "Reports", "Settings"];
const ICON = { Overview: "▦", Campaigns: "▣", "Content Calendar": "◫", Performance: "↗", Reports: "▤", Settings: "⚙" };
const SUB = {
  Overview: "Your campaign pipeline, budget pacing and brand reach — updated live.",
  Campaigns: "Create, filter, edit and track every campaign.",
  "Content Calendar": "Campaign dates and published posts on one calendar.",
  Performance: "ROI, spend efficiency and what content is working.",
  Reports: "Choose what to include and export it as CSV.",
  Settings: "Brand accounts, API connections and workspace details.",
};
const PLATS = ["Instagram", "YouTube", "TikTok", "Facebook", "Multi-platform"];
const CHANNEL = { Instagram: "#d946ef", YouTube: "#ef4444", TikTok: "#0f172a", Facebook: "#2563eb", "Multi-platform": "#7657e8" };
const STATUSES = ["Planning", "Running", "Completed"];
const FLAG = {
  over: ["Over budget", "bg-rose-50 text-rose-700"],
  fast: ["Spending fast", "bg-amber-50 text-amber-700"],
  slow: ["Under-spending", "bg-sky-50 text-sky-700"],
  ok: ["On track", "bg-emerald-50 text-emerald-700"],
};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const plusDays = (n) => { const d = startOfToday(); d.setDate(d.getDate() + n); return ymd(d); };
const daysFromToday = (s) => (parse(s) ? Math.round((parse(s) - startOfToday()) / 864e5) : null);
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const pct = (n) => (n == null ? "—" : `${Math.round(n)}%`);

function pacing(c) {
  const s = parse(c.start_date), e = parse(c.end_date), today = startOfToday();
  const spendPct = c.budget ? (c.spent / c.budget) * 100 : null;
  const timePct = s && e && e > s ? Math.min(100, Math.max(0, ((today - s) / (e - s)) * 100)) : null;
  let flag = "ok";
  if (spendPct != null && spendPct > 100) flag = "over";
  else if (c.status === "Running" && spendPct != null && timePct != null && spendPct - timePct > 20) flag = "fast";
  else if (c.status === "Running" && spendPct != null && timePct != null && timePct - spendPct > 30) flag = "slow";
  return { spendPct, timePct, flag };
}

const SAMPLES = () => [
  { name: "[Sample] Festive Launch", platform: "Instagram", budget: 250000, spent: 148000, revenue: 412000, status: "Running", start_date: plusDays(-12), end_date: plusDays(9) },
  { name: "[Sample] YouTube Creator Series", platform: "YouTube", budget: 400000, spent: 210000, revenue: 150000, status: "Running", start_date: plusDays(-20), end_date: plusDays(25) },
  { name: "[Sample] Reels Teaser", platform: "Instagram", budget: 120000, spent: 0, revenue: 0, status: "Planning", start_date: plusDays(5), end_date: plusDays(20) },
  { name: "[Sample] Back-to-School", platform: "Multi-platform", budget: 300000, spent: 310000, revenue: 520000, status: "Completed", start_date: plusDays(-60), end_date: plusDays(-30) },
];

function CampaignForm({ camps, compact, onDone }) {
  const blank = { name: "", platform: "Instagram", budget: "", status: "Planning", start_date: "", end_date: "" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function create(e) {
    e.preventDefault(); setErr("");
    if (form.start_date && form.end_date && form.end_date < form.start_date) return setErr("End date must be after the start date.");
    setBusy(true);
    try { await camps.add({ ...form, budget: Number(form.budget) || 0 }); setForm(blank); onDone && onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return <form onSubmit={create} className={card}>
    <h2 className="font-bold">{compact ? "Quick launch" : "New campaign"}</h2>
    <p className="mb-4 mt-1 text-xs text-slate-400">{compact ? "Add a campaign without leaving the overview." : "Budget and dates drive the pacing alerts on the overview."}</p>
    <div className={`grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-3 xl:grid-cols-6"}`}>
      <input required value={form.name} onChange={set("name")} placeholder="Campaign name" className={`${input} ${compact ? "md:col-span-2" : "xl:col-span-2"}`} />
      <select value={form.platform} onChange={set("platform")} className={input}>{PLATS.map((p) => <option key={p}>{p}</option>)}</select>
      <input type="number" min="0" value={form.budget} onChange={set("budget")} placeholder="Budget (₹)" className={input} />
      <select value={form.status} onChange={set("status")} className={input}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <label className="text-xs text-slate-500">Start<input type="date" value={form.start_date} onChange={set("start_date")} className={`${input} mt-1 w-full`} /></label>
      <label className="text-xs text-slate-500">End<input type="date" value={form.end_date} onChange={set("end_date")} className={`${input} mt-1 w-full`} /></label>
      <button disabled={busy} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500 disabled:opacity-60 md:self-end">{busy ? "Adding…" : "+ Add campaign"}</button>
    </div>
    {(err || camps.error) && <p role="alert" className="mt-3 text-sm text-rose-600">{err || camps.error}</p>}
  </form>;
}

function Progress({ value, color = "#7657e8" }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value || 0))}%`, background: color }} /></div>;
}

function Pipeline({ camps }) {
  const NEXT = { Planning: ["Running", "Start →"], Running: ["Completed", "Complete ✓"], Completed: ["Running", "↩ Reopen"] };
  return <div className={card}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Campaign pipeline</h2><p className="mt-1 text-xs text-slate-400">Move a campaign forward with one click — every number on the page updates instantly.</p></div></div>
    <div className="grid gap-3 md:grid-cols-3">{STATUSES.map((st) => {
      const list = camps.items.filter((c) => c.status === st);
      return <div key={st} className="rounded-xl bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[st]}`}>{st}</span><span className="text-xs text-slate-400">{list.length}</span></div>
        <div className="space-y-2">{list.slice(0, 4).map((c) => <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="truncate text-sm font-semibold">{c.name}</p>
          <p className="mt-0.5 text-xs text-slate-500"><span style={{ color: CHANNEL[c.platform] }}>●</span> {c.platform} · {inr(c.budget)}</p>
          <div className="mt-2 flex items-center justify-between"><span className="text-[11px] leading-tight text-slate-400">{c.end_date ? `Ends ${dayLabel(c.end_date)}` : "No end date"}</span>
            <button onClick={() => camps.update(c, { status: NEXT[st][0] })} className="whitespace-nowrap text-violet-700 hover:text-violet-900"><span className="text-xs font-semibold">{NEXT[st][1]}</span></button></div>
        </div>)}
          {!list.length && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Nothing {st.toLowerCase()}</p>}
          {list.length > 4 && <p className="text-center text-xs text-slate-400">+{list.length - 4} more in Campaigns</p>}</div>
      </div>;
    })}</div>
  </div>;
}

function Pacing({ items }) {
  const running = items.filter((c) => c.status === "Running");
  return <div className={card}><h2 className="font-bold">Budget pacing</h2><p className="mb-4 mt-1 text-xs text-slate-400">Spend vs time elapsed for running campaigns</p>
    {running.length ? <div className="space-y-5">{running.slice(0, 5).map((c) => { const p = pacing(c); const [label, cls] = FLAG[p.flag];
      return <div key={c.id}><div className="mb-1.5 flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{c.name}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span></div>
        <Progress value={p.spendPct} color={p.flag === "over" ? "#f43f5e" : "#7657e8"} />
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-400"><span>Spent {pct(p.spendPct)} · {inr(c.spent)}</span><span>{p.timePct == null ? "Add dates to track time" : `Time elapsed ${pct(p.timePct)}`}</span></div></div>; })}</div>
      : <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No running campaigns. Start one from the pipeline.</p>}</div>;
}

function Attention({ items, go }) {
  const alerts = [];
  items.forEach((c) => {
    const p = pacing(c), end = daysFromToday(c.end_date), start = daysFromToday(c.start_date);
    if (p.flag === "over") alerts.push({ tone: "rose", c, text: `Over budget by ${inr(c.spent - c.budget)}` });
    else if (p.flag === "fast") alerts.push({ tone: "amber", c, text: "Spending faster than time elapsed" });
    if (c.status === "Running" && end != null && end >= 0 && end <= 7) alerts.push({ tone: "amber", c, text: end === 0 ? "Ends today" : `Ends in ${end} day${end > 1 ? "s" : ""}` });
    if (c.status === "Running" && end != null && end < 0) alerts.push({ tone: "rose", c, text: `Past its end date (${dayLabel(c.end_date)}) — mark complete?` });
    if (c.status === "Planning" && start != null && start >= 0 && start <= 7) alerts.push({ tone: "sky", c, text: start === 0 ? "Scheduled to start today" : `Starts in ${start} day${start > 1 ? "s" : ""}` });
    if (c.status === "Completed" && c.spent > 0 && !c.revenue) alerts.push({ tone: "sky", c, text: "Completed — add revenue to measure ROI" });
  });
  const TONE = { rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-800", sky: "bg-sky-50 text-sky-800" };
  return <div className={card}><h2 className="font-bold">Needs attention</h2><p className="mb-4 mt-1 text-xs text-slate-400">Generated from your budgets, dates and status</p>
    {alerts.length ? <ul className="space-y-2">{alerts.slice(0, 6).map((a, i) => <li key={i} className={`rounded-xl px-3 py-2.5 text-sm ${TONE[a.tone]}`}><span className="font-semibold">{a.c.name}</span><span className="block text-xs opacity-90">{a.text}</span></li>)}</ul>
      : <div className="rounded-xl bg-emerald-50 p-5 text-center text-sm text-emerald-800">✓ All clear — nothing needs your attention.</div>}
    {alerts.length > 6 && <button onClick={go} className="mt-3 text-xs font-semibold text-violet-700">View all campaigns →</button>}</div>;
}

function Overview({ live, tot, posts, camps, setSection, loadSamples, sampling }) {
  const st = campStats(camps.items), r = roi(st.spent, st.revenue);
  const inter = posts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0), 0);
  const channelMix = [...new Set(camps.items.map((c) => c.platform))].map((p) => ({ label: p, color: CHANNEL[p], value: camps.items.filter((c) => c.platform === p).reduce((s, c) => s + c.budget, 0) })).filter((x) => x.value);
  const rows = camps.items.slice(0, 6).map((c) => ({ ...c, label: c.name }));
  const ranked = camps.items.filter((c) => c.spent > 0).map((c) => ({ c, r: roi(c.spent, c.revenue) })).sort((a, b) => b.r - a.r).slice(0, 5);

  if (!camps.items.length) return <>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className={`${card} flex flex-col justify-center`}><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-600">Get started</p><h2 className="mt-2 text-xl font-bold">Launch your first campaign</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Add a campaign with a budget and dates and this dashboard fills in: pipeline, budget pacing, ROI, calendar and alerts. Prefer to look around first? Load four clearly-labelled sample campaigns you can delete any time.</p>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={loadSamples} disabled={sampling} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60">{sampling ? "Loading…" : "Load sample campaigns"}</button>
          <button onClick={() => setSection("Settings")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Connect brand accounts</button></div></div>
      <CampaignForm camps={camps} compact />
    </div></>;

  return <>
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Active campaigns" value={st.running} note={`${st.planning} planning · ${st.total - st.running - st.planning} completed`} icon="▣" />
      <Kpi label="Budget used" value={st.budget ? pct((st.spent / st.budget) * 100) : "—"} note={`${inr(st.spent)} of ${inr(st.budget)}`} icon="₹" />
      <Kpi label="Revenue" value={inr(st.revenue)} note={r == null ? "Add spend to see ROI" : `ROI ${r}%`} icon="↗" />
      <Kpi label="Brand reach" value={tot.count ? fmt(tot.views) : "—"} note={tot.count ? `Lifetime views · ${tot.live} account(s) live` : "Connect brand accounts in Settings"} icon="◎" />
      <Kpi label="Engagement" value={tot.count ? fmt(inter) : "—"} note="Likes + comments, latest posts" icon="♡" />
    </section>
    <section className="mb-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]"><Pipeline camps={camps} />
      <div className={card}><h2 className="font-bold">Channel mix</h2><p className="mb-5 mt-1 text-xs text-slate-400">Budget by platform</p><Donut rows={channelMix} center={inr(st.budget)} format={inr} empty="Add budgets to see the channel split." /></div></section>
    <section className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]"><Pacing items={camps.items} /><Attention items={camps.items} go={() => setSection("Campaigns")} /></section>
    <section className="mb-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className={card}><h2 className="font-bold">Campaign performance</h2><p className="mb-4 mt-1 text-xs text-slate-400">Budget vs spent vs revenue (₹)</p><GroupBars rows={rows} series={[{ key: "budget", name: "Budget", color: "#c4b5fd" }, { key: "spent", name: "Spent", color: "#7657e8" }, { key: "revenue", name: "Revenue", color: "#35b6a0" }]} /></div>
      <div className={card}><h2 className="font-bold">Best ROI</h2><p className="mb-5 mt-1 text-xs text-slate-400">Campaigns with spend, ranked by return</p>{ranked.length ? <BarList rows={ranked.map(({ c, r: x }) => ({ label: `${c.name} (${x}%)`, value: Math.abs(x), color: x >= 0 ? "#35b6a0" : "#f43f5e" }))} format={() => ""} /> : <p className="text-sm text-slate-500">Enter spend and revenue on a campaign to rank it.</p>}</div></section>
    <section className={card}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Latest brand posts</h2><p className="mt-1 text-xs text-slate-400">From connected YouTube / Instagram accounts</p></div><button onClick={() => setSection("Settings")} className="text-sm font-semibold text-violet-700">Manage accounts →</button></div>
      {posts.length ? <PostsTable posts={posts} limit={5} /> : <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Connect brand accounts to see published posts here.</p>}</section>
  </>;
}

function CampaignsView({ camps, loadSamples, sampling, clearSamples }) {
  const [status, setStatus] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Newest");
  const st = campStats(camps.items);
  const list = useMemo(() => {
    const f = camps.items.filter((c) => (status === "All" || c.status === status) && (platform === "All" || c.platform === platform) && c.name.toLowerCase().includes(q.toLowerCase()));
    const by = { Newest: (a, b) => b.id - a.id, Budget: (a, b) => b.budget - a.budget, Revenue: (a, b) => b.revenue - a.revenue, ROI: (a, b) => (roi(b.spent, b.revenue) ?? -1e9) - (roi(a.spent, a.revenue) ?? -1e9), "End date": (a, b) => (a.end_date || "9999").localeCompare(b.end_date || "9999") };
    return [...f].sort(by[sort]);
  }, [camps.items, status, platform, q, sort]);
  const num = (c, k) => <input type="number" min="0" defaultValue={c[k]} key={`${c.id}-${k}-${c[k]}`} onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== c[k]) camps.update(c, { [k]: v }); }} className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />;
  const hasSamples = camps.items.some((c) => c.name.startsWith("[Sample]"));
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Campaigns" value={st.total} note={`${st.running} running · ${st.planning} planning`} icon="▣" /><Kpi label="Total budget" value={inr(st.budget)} note="Planned spend" icon="₹" /><Kpi label="Spent so far" value={inr(st.spent)} note={st.budget ? `${Math.round((st.spent / st.budget) * 100)}% of budget` : "—"} icon="↗" /><Kpi label="Revenue" value={inr(st.revenue)} note={roi(st.spent, st.revenue) == null ? "ROI —" : `ROI ${roi(st.spent, st.revenue)}%`} icon="◎" /></div>
    <CampaignForm camps={camps} />
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{["All", ...STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${status === s ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{s}{s !== "All" && <span className="ml-1 text-slate-400">{camps.items.filter((c) => c.status === s).length}</span>}</button>)}</div>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={input}><option>All</option>{PLATS.map((p) => <option key={p}>{p}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={input}>{["Newest", "Budget", "Revenue", "ROI", "End date"].map((s) => <option key={s} value={s}>Sort: {s}</option>)}</select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" className={`${input} ml-auto min-w-[180px]`} />
      </div>
      {list.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Campaign", "Platform", "Budget (₹)", "Spent (₹)", "Revenue (₹)", "ROI", "Pacing", "Dates", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{list.map((c) => { const p = pacing(c); const r = roi(c.spent, c.revenue); return <tr key={c.id} className="border-t border-slate-100">
          <td className="px-3 py-3 font-medium">{c.name}</td><td className="px-3 py-3 text-slate-500"><span style={{ color: CHANNEL[c.platform] }}>●</span> {c.platform}</td>
          <td className="px-3 py-3">{num(c, "budget")}</td><td className="px-3 py-3">{num(c, "spent")}</td><td className="px-3 py-3">{num(c, "revenue")}</td>
          <td className={`px-3 py-3 font-medium ${r == null ? "text-slate-400" : r >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{r == null ? "—" : `${r}%`}</td>
          <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${FLAG[p.flag][1]}`}>{FLAG[p.flag][0]}</span></td>
          <td className="px-3 py-3 text-xs text-slate-500">{c.start_date || "—"} → {c.end_date || "—"}</td>
          <td className="px-3 py-3"><select value={c.status} onChange={(e) => camps.update(c, { status: e.target.value })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
          <td className="px-3 py-3 text-right"><button onClick={() => window.confirm(`Delete "${c.name}"?`) && camps.remove(c)} className="text-xs text-slate-400 hover:text-rose-600">Delete</button></td></tr>; })}</tbody></table></div>
        : <p className="py-8 text-center text-sm text-slate-500">{camps.items.length ? "No campaigns match these filters." : "No campaigns yet. Create your first one above."}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400"><span>Showing {list.length} of {camps.items.length} · edit budget, spent, revenue and status inline.</span>
        {hasSamples ? <button onClick={clearSamples} className="font-semibold text-rose-600">Remove sample campaigns</button> : !camps.items.length && <button onClick={loadSamples} disabled={sampling} className="font-semibold text-violet-700">Load sample campaigns</button>}</div>
    </section></div>;
}

function CalendarView({ camps, posts }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(ymd(now));
  const events = useMemo(() => {
    const map = {}; const add = (d, e) => { if (d) (map[d.slice(0, 10)] ||= []).push(e); };
    camps.items.forEach((c) => { add(c.start_date, { kind: "start", title: c.name, meta: `${c.platform} · starts` }); add(c.end_date, { kind: "end", title: c.name, meta: `${c.platform} · ends` }); });
    posts.forEach((p) => add(ymd(new Date(p.published)), { kind: "post", title: p.title, meta: `${p.account} · ${PLATFORM[p.platform]?.name}`, url: p.url }));
    return map;
  }, [camps.items, posts]);
  const activeOn = (d) => camps.items.filter((c) => c.status !== "Completed" && c.start_date && c.end_date && c.start_date <= d && d <= c.end_date).length;
  const first = new Date(ym.y, ym.m, 1), offset = (first.getDay() + 6) % 7, dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => ymd(new Date(ym.y, ym.m, i + 1)))];
  const shift = (n) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }); };
  const KIND = { start: ["bg-emerald-100 text-emerald-800", "▶"], end: ["bg-rose-100 text-rose-800", "■"], post: ["bg-violet-100 text-violet-800", "●"] };
  const today = ymd(now);
  return <div className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
    <section className={card}>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <div className="flex gap-2"><button onClick={() => shift(-1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">←</button><button onClick={() => { setYm({ y: now.getFullYear(), m: now.getMonth() }); setSel(today); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Today</button><button onClick={() => shift(1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">→</button></div></div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{cells.map((d, i) => { if (!d) return <div key={i} />; const ev = events[d] || [], act = activeOn(d);
        return <button key={d} onClick={() => setSel(d)} className={`min-h-[78px] rounded-lg border p-1.5 text-left align-top transition ${sel === d ? "border-violet-400 bg-violet-50" : "border-slate-100 hover:bg-slate-50"} ${d === today ? "ring-1 ring-violet-300" : ""}`}>
          <span className={`text-xs ${d === today ? "font-bold text-violet-700" : "text-slate-500"}`}>{Number(d.slice(8))}</span>
          <div className="mt-1 space-y-0.5">{ev.slice(0, 2).map((e, j) => <p key={j} className={`truncate rounded px-1 text-[10px] ${KIND[e.kind][0]}`}>{KIND[e.kind][1]} {e.title}</p>)}{ev.length > 2 && <p className="text-[10px] text-slate-400">+{ev.length - 2} more</p>}</div>
          {act > 0 && !ev.length && <p className="mt-1 text-[10px] text-slate-400">{act} active</p>}</button>; })}</div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="text-emerald-700">▶ Campaign start</span><span className="text-rose-700">■ Campaign end</span><span className="text-violet-700">● Published post</span></div>
    </section>
    <section className={card}><h2 className="font-bold">{dayLabel(sel)}</h2><p className="mb-4 mt-1 text-xs text-slate-400">{(events[sel] || []).length} event(s) · {activeOn(sel)} campaign(s) active</p>
      {(events[sel] || []).length ? <ul className="space-y-2">{events[sel].map((e, i) => <li key={i} className="rounded-xl bg-slate-50 p-3"><p className="truncate text-sm font-medium">{e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:text-violet-700">{e.title}</a> : e.title}</p><p className="mt-0.5 text-xs text-slate-500"><span className={`mr-1 rounded px-1 ${KIND[e.kind][0]}`}>{KIND[e.kind][1]}</span>{e.meta}</p></li>)}</ul>
        : <Empty title="Nothing on this day" text="Campaign start/end dates and posts from connected accounts appear here." />}</section></div>;
}

function PerformanceView({ camps, live, posts, tot, setSection }) {
  const items = camps.items;
  const byPlatform = [...new Set(items.map((c) => c.platform))].map((p) => { const l = items.filter((c) => c.platform === p); const sum = (k) => l.reduce((s, c) => s + c[k], 0); return { p, n: l.length, budget: sum("budget"), spent: sum("spent"), revenue: sum("revenue"), r: roi(sum("spent"), sum("revenue")) }; });
  const roiRows = items.filter((c) => c.spent > 0).map((c) => ({ c, r: roi(c.spent, c.revenue) })).sort((a, b) => b.r - a.r);
  const eng = live.accounts.filter((a) => a.data?.engagement != null).map((a) => ({ label: a.label || a.data.name, value: a.data.engagement, color: PLATFORM[a.platform]?.color })).sort((a, b) => b.value - a.value);
  if (!items.length && !tot.live) return <Empty title="Nothing to analyse yet" text="Create campaigns with spend and revenue, or connect brand accounts, to unlock performance analytics." action={<button onClick={() => setSection("Campaigns")} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white">Go to campaigns →</button>} />;
  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}><h2 className="font-bold">ROI by campaign</h2><p className="mb-5 mt-1 text-xs text-slate-400">(Revenue − spend) ÷ spend</p>{roiRows.length ? <BarList rows={roiRows.map(({ c, r }) => ({ label: `${c.name} (${r}%)`, value: Math.abs(r), color: r >= 0 ? "#35b6a0" : "#f43f5e" }))} format={() => ""} /> : <p className="text-sm text-slate-500">Add spend and revenue to your campaigns.</p>}</div>
      <div className={card}><h2 className="font-bold">Brand engagement</h2><p className="mb-5 mt-1 text-xs text-slate-400">Average (likes + comments) ÷ views on latest posts</p>{eng.length ? <BarList rows={eng} format={(v) => `${v}%`} /> : <p className="text-sm text-slate-500">Connect brand accounts in <button onClick={() => setSection("Settings")} className="font-semibold text-violet-700">Settings</button>.</p>}</div></div>
    {!!items.length && <div className={card}><h2 className="font-bold">Platform efficiency</h2><p className="mb-4 mt-1 text-xs text-slate-400">Where your money earns the most</p><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Platform", "Campaigns", "Budget", "Spent", "Revenue", "ROI"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{byPlatform.map((r) => <tr key={r.p} className="border-t border-slate-100"><td className="px-3 py-3 font-medium"><span style={{ color: CHANNEL[r.p] }}>●</span> {r.p}</td><td className="px-3 py-3 text-slate-500">{r.n}</td><td className="px-3 py-3 text-slate-500">{inr(r.budget)}</td><td className="px-3 py-3 text-slate-500">{inr(r.spent)}</td><td className="px-3 py-3 text-slate-500">{inr(r.revenue)}</td><td className={`px-3 py-3 font-medium ${r.r == null ? "text-slate-400" : r.r >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{r.r == null ? "—" : `${r.r}%`}</td></tr>)}</tbody></table></div></div>}
    {!!posts.length && <div className={card}><h2 className="mb-4 font-bold">Top posts by interactions</h2><PostsTable posts={[...posts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))} limit={10} /></div>}
  </div>;
}

function ReportsView({ user, camps, live, tot }) {
  const [scope, setScope] = useState("All");
  const [withAccounts, setWithAccounts] = useState(true);
  const list = camps.items.filter((c) => scope === "All" || c.status === scope);
  const st = campStats(list);
  function exportReport() {
    downloadCsv(`creator-iq-marketing-${scope.toLowerCase()}-report.csv`, [
      ["CREATOR IQ marketing report", `Generated ${new Date().toLocaleString()}`, `Scope: ${scope}`], [],
      ["Campaign", "Platform", "Status", "Budget (INR)", "Spent (INR)", "Revenue (INR)", "ROI %", "Start", "End"],
      ...list.map((c) => [c.name, c.platform, c.status, c.budget, c.spent, c.revenue, roi(c.spent, c.revenue) ?? "", c.start_date, c.end_date]),
      ...(withAccounts ? [[], ["Platform", "Account", "Followers", "Views", "Posts", "Engagement %", "Status"], ...live.accounts.map((a) => [PLATFORM[a.platform]?.name, a.label || a.data?.name || a.identifier, a.data?.followers, a.data?.views, a.data?.posts, a.data?.engagement, a.data ? "Live" : a.error])] : []),
    ]);
  }
  return <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
    <div className={card}><h2 className="font-bold">Export</h2><p className="mt-2 text-sm leading-6 text-slate-500">Prepared by {user.name}. Choose what the CSV contains.</p>
      <label className="mt-5 block text-xs text-slate-500">Campaigns to include<select value={scope} onChange={(e) => setScope(e.target.value)} className={`${input} mt-1 w-full`}>{["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={withAccounts} onChange={(e) => setWithAccounts(e.target.checked)} /> Include connected brand accounts</label>
      <button onClick={exportReport} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold !text-white hover:bg-violet-500">↓ Download CSV report</button></div>
    <div className={card}><h2 className="mb-4 font-bold">Report preview</h2>{[["Campaigns included", list.length], ["Total budget", inr(st.budget)], ["Total spent", inr(st.spent)], ["Total revenue", inr(st.revenue)], ["ROI", roi(st.spent, st.revenue) == null ? "—" : `${roi(st.spent, st.revenue)}%`], ["Brand accounts", withAccounts ? tot.count : "Excluded"], ["Brand followers", withAccounts ? fmt(tot.followers) : "Excluded"]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>)}</div></div>;
}

export default function MarketingDashboard({ user, token, onLogout }) {
  const [section, setSection] = useState("Overview");
  const [sampling, setSampling] = useState(false);
  const live = useLive(token);
  const camps = useCampaigns(token);
  const tot = summarize(live.accounts);
  const posts = recentPosts(live.accounts);
  const keys = live.status?.youtube || live.status?.instagram;

  async function loadSamples() { setSampling(true); try { for (const c of SAMPLES()) await camps.add(c); } catch { /* error surfaces through camps.error on next load */ } finally { setSampling(false); camps.reload(); } }
  async function clearSamples() { for (const c of camps.items.filter((x) => x.name.startsWith("[Sample]"))) await camps.remove(c); }

  return <div className="min-h-screen bg-[#f5f7fc] text-slate-800 md:flex">
    <aside className="z-10 border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-5">
      <div className="mb-7 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">✦</div><div><p className="font-extrabold tracking-wide">CreatorIQ</p><p className="text-xs text-slate-400">Marketing workspace</p></div></div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <nav className="grid grid-cols-2 gap-1 md:block">{NAV.map((n) => <button key={n} onClick={() => setSection(n)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section === n ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><span className="w-5 text-center">{ICON[n]}</span>{n}{n === "Campaigns" && camps.items.length > 0 && <span className="ml-auto rounded-full bg-slate-100 px-2 text-[11px] text-slate-500">{camps.items.length}</span>}</button>)}</nav>
      <div className="mt-8 hidden rounded-2xl bg-slate-50 p-4 md:block"><p className="text-sm font-semibold">{user.name}</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p><span className="mt-3 inline-block rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700">{user.role}</span></div>
      <button onClick={onLogout} className="mt-4 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">↪ Sign out</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-600">CAMPAIGN INTELLIGENCE</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{section === "Overview" ? `${greeting()}, ${(user.name || "").split(" ")[0]}!` : section}</h1><p className="mt-2 text-sm text-slate-500">{SUB[section]}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline"><span className={keys ? "text-emerald-500" : "text-amber-500"}>●</span> {keys ? "Live" : "No API keys"} · updated {timeLabel(live.updated)}</span>
          <button onClick={() => { live.reload(); camps.reload(); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">↻ Refresh</button>
          {section !== "Campaigns" && <button onClick={() => setSection("Campaigns")} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500">+ New campaign</button>}</div></header>
      {section === "Settings" || section === "Overview" ? <KeyBanner status={live.status} go={() => setSection("Settings")} /> : null}
      {(live.error || camps.error) && section !== "Campaigns" && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{live.error || camps.error}</p>}

      {section === "Overview" && <Overview {...{ live, tot, posts, camps, setSection, loadSamples, sampling }} />}
      {section === "Campaigns" && <CampaignsView {...{ camps, loadSamples, sampling, clearSamples }} />}
      {section === "Content Calendar" && <CalendarView camps={camps} posts={posts} />}
      {section === "Performance" && <PerformanceView {...{ camps, live, posts, tot, setSection }} />}
      {section === "Reports" && <ReportsView {...{ user, camps, live, tot }} />}
      {section === "Settings" && <>
        <section className={`${card} mb-5`}><h2 className="font-bold">Social API connections</h2><p className="mb-4 mt-1 text-sm text-slate-500">Keys are stored server-side in <code>backend/.env</code> and never exposed to the browser. Responses are cached for {live.status?.cache_seconds ?? 300}s to protect API quota.</p><ApiStatus status={live.status} /></section>
        <LivePanel live={live} token={token} title="Tracked brand accounts" subject="brand" />
        <section className={card}><h2 className="mb-3 font-bold">Account</h2>{[["Name", user.name], ["Email", user.email], ["Role", user.role]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>)}</section>
      </>}
    </main>
  </div>;
}

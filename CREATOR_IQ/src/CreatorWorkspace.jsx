import { useEffect, useMemo, useState } from "react";
import { request } from "./api.js";
import { ApiStatus, BarList, Donut, Empty, KeyBanner, Kpi, LivePanel, PLATFORM, TrendChart, dayLabel, fmt, recentPosts, summarize, timeLabel, useLive } from "./live.jsx";
import { downloadCsv } from "./TeamDashboards.jsx";

const blankProfile = { handle: "", display_name: "", niche: "", bio: "", country: "", website: "" };
const NAV = [{ label: "Overview", icon: "◫" }, { label: "Content Analytics", icon: "▥" }, { label: "Audience", icon: "♧" }, { label: "Accounts", icon: "⚭" }, { label: "My Profile", icon: "◎" }, { label: "Reports", icon: "▤" }];
const SUB = {
  Overview: "Your real numbers across every connected platform.",
  "Content Analytics": "Which posts are performing, and why.",
  Audience: "Follower base and growth, recorded live.",
  Accounts: "Connect or remove your YouTube and Instagram accounts.",
  "My Profile": "How you appear to brands and collaborators.",
  Reports: "Export your performance as CSV.",
};
const PERIODS = { "7 days": 7, "30 days": 30, "90 days": 90 };
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 sm:p-6";
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const inter = (p) => (p.likes || 0) + (p.comments || 0);
const engOf = (p) => (p.views ? (inter(p) / p.views) * 100 : null);
const METRICS = {
  Views: (p) => p.views, Likes: (p) => p.likes, Comments: (p) => p.comments,
  "Engagement %": (p) => { const e = engOf(p); return e == null ? null : Math.round(e * 100) / 100; },
};

function PostBars({ posts, metric }) {
  const get = METRICS[metric];
  const rows = posts.filter((p) => get(p) != null).slice(0, 12).reverse();
  if (!rows.length) return <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No posts with {metric.toLowerCase()} data in this period.</p>;
  const max = Math.max(...rows.map(get), 1);
  return <div className="flex h-52 items-end gap-2 border-b border-slate-100 pb-1">{rows.map((p, i) => <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
    <span className="text-[10px] text-slate-400">{metric === "Engagement %" ? `${get(p)}%` : fmt(get(p))}</span>
    <div title={`${p.title} — ${get(p)}`} className="w-full max-w-10 rounded-t-md transition hover:opacity-80" style={{ height: `${Math.max(4, (get(p) / max) * 100)}%`, background: PLATFORM[p.platform]?.color || "#7657e8" }} />
    <span className="w-full truncate text-center text-[10px] text-slate-400">{new Date(p.published).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>)}</div>;
}

function Insights({ posts, days, tot }) {
  if (!posts.length) return <p className="text-sm text-slate-500">Insights appear once you have posts in this period.</p>;
  const best = [...posts].sort((a, b) => inter(b) - inter(a))[0];
  const avg = Math.round(posts.reduce((s, p) => s + inter(p), 0) / posts.length);
  const perWeek = (posts.length / days) * 7;
  const byPlat = Object.keys(PLATFORM).map((k) => { const l = posts.filter((p) => p.platform === k); return { k, avg: l.length ? l.reduce((s, p) => s + inter(p), 0) / l.length : 0, n: l.length }; }).filter((x) => x.n).sort((a, b) => b.avg - a.avg);
  const items = [
    ["★", `Best post: “${best.title.slice(0, 60)}${best.title.length > 60 ? "…" : ""}” with ${fmt(inter(best))} interactions.`],
    ["∅", `Average ${fmt(avg)} interactions per post across ${posts.length} post${posts.length > 1 ? "s" : ""}.`],
    ["◷", `You post about ${perWeek.toFixed(1)} time${perWeek >= 1.05 || perWeek < 0.95 ? "s" : ""} per week in this period.`],
    ...(byPlat.length > 1 ? [["↗", `${PLATFORM[byPlat[0].k].name} posts earn the most interactions per post (${fmt(Math.round(byPlat[0].avg))}).`]] : []),
    ...(tot.engagement != null ? [["✳", `Overall engagement rate is ${tot.engagement.toFixed(2)}% on your latest posts.`]] : []),
  ];
  return <ul className="space-y-3">{items.map(([i, t], k) => <li key={k} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="text-violet-600">{i}</span><span className="text-slate-600">{t}</span></li>)}</ul>;
}

function PostList({ posts, limit }) {
  if (!posts.length) return <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No posts in this period.</p>;
  return <div className="space-y-3">{posts.slice(0, limit).map((p, i) => <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-white" style={{ background: PLATFORM[p.platform]?.color }}>{p.platform === "youtube" ? "▶" : "◎"}</div>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-violet-700">{p.title}</a> : p.title}</p><p className="text-xs text-slate-500">{PLATFORM[p.platform]?.name} · {dayLabel(p.published)}</p></div>
    <div className="grid shrink-0 grid-cols-3 gap-4 text-right text-xs"><div><p className="font-bold">{fmt(p.views)}</p><p className="text-slate-400">views</p></div><div><p className="font-bold">{fmt(p.likes)}</p><p className="text-slate-400">likes</p></div><div><p className="font-bold">{fmt(p.comments)}</p><p className="text-slate-400">comments</p></div></div></div>)}</div>;
}

function ProfileView({ user, token, profile, setProfile, editing, setEditing }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fields = ["handle", "display_name", "niche", "bio", "country", "website"];
  const done = fields.filter((f) => (profile[f] || "").trim()).length;
  const change = (e) => setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const saved = await request("/api/creator/profile", { method: "PUT", body: JSON.stringify(profile) }, token); setProfile({ ...blankProfile, ...saved }); setEditing(false); setMessage("Creator profile saved successfully."); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  return <section className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
    <div className="mb-6"><p className="text-sm font-semibold text-violet-600">CREATOR IDENTITY</p><h2 className="mt-2 text-2xl font-bold">{editing ? "Set up your creator profile" : "Your creator profile"}</h2>
      <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(done / fields.length) * 100}%` }} /></div><span className="text-xs text-slate-500">{done}/{fields.length} complete</span></div></div>
    {message && <div role="status" className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">{message}</div>}
    {!editing && <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold text-white">{(profile.display_name || user.name || "C").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h3 className="font-bold">{profile.display_name || user.name}</h3><p className="text-sm text-violet-600">{profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Add a creator handle"}</p><p className="text-xs text-slate-500">{profile.niche || "Niche not specified"}{profile.country ? ` · ${profile.country}` : ""}</p></div><button onClick={() => setEditing(true)} className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Edit profile</button></div>}
    {editing ? <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
      {[{ name: "display_name", label: "Display name", placeholder: user.name || "Your public name", required: true }, { name: "handle", label: "Creator handle", placeholder: "e.g. neha.creates", required: true }, { name: "niche", label: "Content niche", placeholder: "e.g. Fashion, Tech, Fitness" }, { name: "country", label: "Country", placeholder: "e.g. India" }, { name: "website", label: "Website / portfolio", placeholder: "https://yourwebsite.com" }].map((f) => <label key={f.name} className="block"><span className="mb-2 block text-sm text-slate-600">{f.label}{f.required ? " *" : ""}</span><input name={f.name} required={f.required} value={profile[f.name] || ""} onChange={change} placeholder={f.placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none placeholder:text-slate-400 focus:border-violet-400" /></label>)}
      <label className="block sm:col-span-2"><span className="mb-2 block text-sm text-slate-600">Bio</span><textarea name="bio" value={profile.bio || ""} onChange={change} rows="4" maxLength="500" placeholder="Introduce yourself and the content you create..." className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none placeholder:text-slate-400 focus:border-violet-400" /><span className="mt-1 block text-right text-xs text-slate-400">{(profile.bio || "").length}/500</span></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-60">{busy ? "Saving..." : "Save creator profile →"}</button>{profile.handle && <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-slate-600 hover:bg-slate-50">Cancel</button>}</div></form>
      : <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">About</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio || "No bio added yet."}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Website</p><p className="mt-2 break-all text-sm text-violet-600">{profile.website || "No website added yet."}</p><p className="mt-5 text-xs uppercase tracking-wider text-slate-400">Account email</p><p className="mt-2 break-all text-sm text-slate-600">{user.email}</p></div></div>}
  </section>;
}

export default function CreatorWorkspace({ user, token, onLogout }) {
  const [profile, setProfile] = useState(blankProfile);
  const [editing, setEditing] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [active, setActive] = useState("Overview");
  const [period, setPeriod] = useState("30 days");
  const [metric, setMetric] = useState("Views");
  const [sortKey, setSortKey] = useState("Views");
  const live = useLive(token);

  useEffect(() => {
    request("/api/creator/profile", {}, token).then((d) => { setProfile({ ...blankProfile, ...(d || {}) }); if (!(d && d.handle)) { setEditing(true); setActive("My Profile"); } }).catch((e) => setProfileMsg(e.message));
  }, [token]);

  const days = PERIODS[period];
  const tot = summarize(live.accounts);
  const all = recentPosts(live.accounts);
  const keys = live.status?.youtube || live.status?.instagram;
  const cutoff = Date.now() - days * 864e5;
  const posts = useMemo(() => all.filter((p) => p.published && new Date(p.published).getTime() >= cutoff), [all, cutoff]);
  const snaps = useMemo(() => (live.history || []).filter((h) => new Date(h.ts).getTime() >= cutoff), [live.history, cutoff]);
  const growth = snaps.length >= 2 ? snaps[snaps.length - 1].followers - snaps[0].followers : null;
  const growthPct = growth != null && snaps[0].followers ? (growth / snaps[0].followers) * 100 : null;
  const sum = (k) => posts.reduce((s, p) => s + (p[k] || 0), 0);
  const points = snaps.map((h) => ({ label: new Date(h.ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), value: h.followers }));
  const byPlatform = Object.keys(PLATFORM).map((p) => ({ label: PLATFORM[p].name, color: PLATFORM[p].color, value: live.accounts.filter((a) => a.platform === p && a.data).reduce((s, a) => s + (a.data.followers || 0), 0) })).filter((r) => r.value);
  const accountsRank = live.accounts.filter((a) => a.data && a.data.followers != null).map((a) => ({ label: a.label || a.data.name, value: a.data.followers, color: PLATFORM[a.platform]?.color })).sort((a, b) => b.value - a.value);
  const sorted = useMemo(() => [...posts].sort((a, b) => (METRICS[sortKey](b) ?? -1) - (METRICS[sortKey](a) ?? -1)), [posts, sortKey]);
  const connectBtn = <button onClick={() => setActive("Accounts")} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500">Connect an account →</button>;

  function exportReport() {
    downloadCsv("creator-iq-creator-report.csv", [
      ["CREATOR IQ - Creator performance report"], ["Creator", profile.display_name || user.name], ["Handle", profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Not set"], ["Period", period], ["Generated", new Date().toLocaleString()], [],
      ["Platform", "Account", "Followers", "Views", "Posts", "Engagement %", "Status"],
      ...live.accounts.map((a) => [PLATFORM[a.platform]?.name, a.label || a.data?.name || a.identifier, a.data?.followers, a.data?.views, a.data?.posts, a.data?.engagement, a.data ? "Live" : a.error]), [],
      ["Post", "Platform", "Account", "Published", "Views", "Likes", "Comments", "Engagement %", "URL"],
      ...posts.map((p) => [p.title, PLATFORM[p.platform]?.name, p.account, p.published, p.views, p.likes, p.comments, METRICS["Engagement %"](p), p.url]), [],
      ["Follower snapshot time", "Followers", "Views"], ...snaps.map((h) => [h.ts, h.followers, h.views]),
    ]);
  }

  return <div className="min-h-screen bg-[#f6f7fc] text-slate-900 md:flex">
    <aside className="border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white">✦</div><div><p className="font-extrabold tracking-wide">CREATOR IQ</p><p className="text-xs text-slate-500">Creator workspace</p></div></div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{NAV.map((n) => <button key={n.label} onClick={() => { setActive(n.label); if (n.label === "My Profile") setEditing(!profile.handle); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === n.label ? "bg-violet-100 font-semibold text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span className="text-lg">{n.icon}</span>{n.label}</button>)}</nav>
      <div className="mt-8 hidden rounded-2xl border border-violet-100 bg-violet-50 p-4 md:block"><p className="font-semibold">{tot.count ? `${tot.live}/${tot.count} accounts live` : "No accounts yet"}</p><p className="mt-2 text-xs leading-5 text-slate-500">{tot.count ? `${fmt(tot.followers)} followers tracked in real time.` : "Connect YouTube or Instagram to unlock your analytics."}</p></div>
      <button onClick={onLogout} className="mt-6 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">↪ Sign out</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-violet-600">Creator workspace / {active}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{active === "Overview" ? `${greeting()}, ${(profile.display_name || user.name || "Creator").split(" ")[0]}! 👋` : active}</h1><p className="mt-1 text-sm text-slate-500">{SUB[active]}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {["Overview", "Content Analytics", "Audience", "Reports"].includes(active) && <label className="text-sm text-slate-500">Period <select value={period} onChange={(e) => setPeriod(e.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 outline-none focus:border-violet-400">{Object.keys(PERIODS).map((p) => <option key={p}>{p}</option>)}</select></label>}
          <span className="hidden text-xs text-slate-500 sm:inline"><span className={keys ? "text-emerald-500" : "text-amber-500"}>●</span> {keys ? "Live" : "No API keys"} · updated {timeLabel(live.updated)}</span>
          <button onClick={live.reload} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">↻ Refresh</button></div></header>
      {profileMsg && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{profileMsg}</p>}
      {live.error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{live.error}</p>}
      {["Overview", "Accounts"].includes(active) && <KeyBanner status={live.status} go={active === "Overview" ? () => setActive("Accounts") : undefined} />}

      {active === "Overview" && (!tot.count && !live.loading ? <Empty title="Connect your first account" text="Your dashboard is built entirely from real YouTube / Instagram data. Connect a channel and every card, chart and insight below fills in automatically." action={connectBtn} /> : <>
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Kpi label="Total followers" value={fmt(tot.followers)} note={growth == null ? "Growth shows after 2 snapshots" : `${growth >= 0 ? "↑" : "↓"} ${fmt(Math.abs(growth))} in ${period}`} icon="♧" />
          <Kpi label="Lifetime views" value={fmt(tot.views)} note={`${fmt(sum("views"))} views on posts in ${period}`} icon="◉" />
          <Kpi label="Likes" value={fmt(sum("likes"))} note={`On ${posts.length} post(s) in ${period}`} icon="♡" />
          <Kpi label="Comments" value={fmt(sum("comments"))} note={`On ${posts.length} post(s) in ${period}`} icon="▤" />
          <Kpi label="Posts published" value={fmt(posts.length)} note={`${fmt(tot.posts)} total across accounts`} icon="↗" />
          <Kpi label="Engagement rate" value={tot.engagement == null ? "—" : `${tot.engagement.toFixed(2)}%`} note="Likes + comments ÷ views, latest posts" icon="✳" />
        </section>
        <section className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className={card}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Follower growth</h2><p className="mt-1 text-sm text-slate-500">Recorded follower snapshots · {period}</p></div>{growthPct != null && <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${growth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{growth >= 0 ? "↑" : "↓"} {Math.abs(growthPct).toFixed(2)}%</span>}</div>
            <div className="mt-5"><TrendChart points={points} empty="Growth is recorded while the dashboard is open. The line appears after two snapshots (a few minutes apart)." /></div></div>
          <div className={card}><h2 className="text-lg font-bold">Platform split</h2><p className="mb-5 mt-1 text-sm text-slate-500">Followers by platform</p><Donut rows={byPlatform} center={fmt(tot.followers)} empty="No follower data yet." /></div>
        </section>
        <section className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className={card}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Post performance</h2><p className="mt-1 text-sm text-slate-500">Latest posts · {period}</p></div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{Object.keys(METRICS).map((m) => <button key={m} onClick={() => setMetric(m)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${metric === m ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{m}</button>)}</div></div><div className="mt-5"><PostBars posts={posts} metric={metric} /></div></div>
          <div className={card}><h2 className="text-lg font-bold">Insights</h2><p className="mb-4 mt-1 text-sm text-slate-500">Generated from your data</p><Insights posts={posts} days={days} tot={tot} /></div>
        </section>
        <section className={card}><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Top performing posts</h2><p className="mt-1 text-sm text-slate-500">Ranked by likes + comments · {period}</p></div><button onClick={() => setActive("Content Analytics")} className="text-sm font-semibold text-violet-600 hover:text-violet-800">View all →</button></div>
          <div className="mt-4"><PostList posts={[...posts].sort((a, b) => inter(b) - inter(a))} limit={4} /></div></section></>)}

      {active === "Content Analytics" && (!tot.count ? <Empty title="No content data yet" text="Connect an account to analyse your posts." action={connectBtn} /> : <div className="space-y-5">
        <div className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Performance by post</h2><div className="flex gap-1 rounded-xl bg-slate-100 p-1">{Object.keys(METRICS).map((m) => <button key={m} onClick={() => setMetric(m)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${metric === m ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{m}</button>)}</div></div><div className="mt-5"><PostBars posts={posts} metric={metric} /></div></div>
        <div className={card}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">All posts</h2><p className="mt-1 text-sm text-slate-500">{posts.length} post(s) in {period} · up to 8 latest per account from the platform API</p></div><label className="text-sm text-slate-500">Sort by <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{Object.keys(METRICS).map((m) => <option key={m}>{m}</option>)}</select></label></div>
          {sorted.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Post", "Platform", "Published", "Views", "Likes", "Comments", "Eng."].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{sorted.map((p, i) => <tr key={i} className="border-t border-slate-100"><td className="max-w-[280px] truncate px-3 py-3 font-medium">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-violet-700">{p.title}</a> : p.title}</td><td className="px-3 py-3 text-slate-500"><span style={{ color: PLATFORM[p.platform]?.color }}>●</span> {PLATFORM[p.platform]?.name}</td><td className="px-3 py-3 text-slate-500">{dayLabel(p.published)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.views)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.likes)}</td><td className="px-3 py-3 text-slate-500">{fmt(p.comments)}</td><td className="px-3 py-3 text-slate-500">{METRICS["Engagement %"](p) == null ? "—" : `${METRICS["Engagement %"](p)}%`}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No posts in this period. Try a longer period.</p>}</div></div>)}

      {active === "Audience" && (!tot.count ? <Empty title="No audience data yet" text="Connect an account to see your follower base." action={connectBtn} /> : <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}><h2 className="text-lg font-bold">Audience growth</h2><p className="mt-1 text-sm text-slate-500">Recorded follower snapshots · {period}</p><div className="mt-5"><TrendChart points={points} empty="Growth is recorded while the dashboard is open. The line appears after two snapshots (a few minutes apart)." /></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-violet-50 p-4"><p className="text-xs text-violet-600">Net followers</p><p className="mt-1 text-2xl font-bold text-violet-900">{growth == null ? "—" : `${growth >= 0 ? "+" : "−"}${Math.abs(growth).toLocaleString()}`}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-600">Growth rate</p><p className="mt-1 text-2xl font-bold text-emerald-900">{growthPct == null ? "—" : `${growthPct.toFixed(2)}%`}</p></div></div></div>
        <div className={card}><h2 className="text-lg font-bold">Followers by account</h2><p className="mb-5 mt-1 text-sm text-slate-500">Where your audience lives</p><BarList rows={accountsRank} /><div className="mt-6 border-t border-slate-100 pt-5"><Donut rows={byPlatform} center={fmt(tot.followers)} /></div></div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 lg:col-span-2"><p className="font-semibold text-slate-700">About demographics</p><p className="mt-1">Age, gender and country breakdowns are private to each platform and need you to sign in with YouTube/Instagram OAuth, which isn’t set up yet — so nothing is shown rather than made-up numbers.</p></div></div>)}

      {active === "Accounts" && <><LivePanel live={live} token={token} title="Connected accounts" subject="channel" /><section className={card}><h2 className="font-bold">API status</h2><p className="mb-3 mt-1 text-sm text-slate-500">Keys live in <code>backend/.env</code> on the server.</p><ApiStatus status={live.status} /></section></>}
      {active === "My Profile" && <ProfileView {...{ user, token, profile, setProfile, editing, setEditing }} />}

      {active === "Reports" && <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className={card}><p className="text-sm font-semibold text-violet-600">REPORT CENTER</p><h2 className="mt-2 text-xl font-bold">Your performance report</h2><p className="mt-2 text-sm leading-6 text-slate-500">Downloads live account totals, your posts for the selected period ({period}) and every recorded follower snapshot.</p><button onClick={exportReport} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold !text-white hover:bg-violet-500">↓ Download CSV report</button></div>
        <div className={card}><h2 className="mb-4 text-lg font-bold">Report preview</h2>{[["Creator", profile.display_name || user.name], ["Handle", profile.handle ? `@${profile.handle.replace(/^@/, "")}` : "Not set"], ["Period", period], ["Accounts connected", tot.count], ["Total followers", fmt(tot.followers)], ["Posts in period", posts.length], ["Interactions in period", fmt(sum("likes") + sum("comments"))], ["Follower snapshots", snaps.length]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>)}</div></div>}
      <p className="mt-8 text-center text-xs text-slate-400">CREATOR IQ · Content Intelligence Platform</p>
    </main>
  </div>;
}

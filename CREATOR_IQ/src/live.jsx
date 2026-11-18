import { useCallback, useEffect, useState } from "react";
import { request } from "./api.js";

export const fmt = (n) => n == null ? "—" : n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? (n / 1e3).toFixed(1) + "K" : Number(n).toLocaleString();
export const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const PLATFORM = { youtube: { name: "YouTube", color: "#ef4444" }, instagram: { name: "Instagram", color: "#d946ef" } };
export const timeLabel = (d) => d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
export const dayLabel = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Polls the backend, which fetches real data from YouTube / Instagram (cached server-side). */
export function useLive(token, intervalMs = 60000) {
  const [state, setState] = useState({ loading: true, accounts: [], history: [], status: null, defaults: {}, error: "", updated: null });
  const load = useCallback(async (refresh = false) => {
    try {
      const d = await request(`/api/social/live${refresh ? "?refresh=true" : ""}`, {}, token);
      setState({ loading: false, accounts: d.accounts, history: d.history || [], status: d.status, defaults: d.defaults || {}, error: "", updated: new Date() });
    } catch (e) { setState((s) => ({ ...s, loading: false, error: e.message })); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, intervalMs); return () => clearInterval(t); }, [load, intervalMs]);
  return { ...state, reload: () => load(true) };
}

export function summarize(accounts) {
  const ok = accounts.filter((a) => a.data);
  const sum = (k) => ok.reduce((s, a) => s + (a.data[k] || 0), 0);
  const eng = ok.filter((a) => a.data.engagement != null);
  return { count: accounts.length, live: ok.length, followers: sum("followers"), views: sum("views"), posts: sum("posts"),
    engagement: eng.length ? eng.reduce((s, a) => s + a.data.engagement, 0) / eng.length : null };
}
export const recentPosts = (accounts) => accounts.filter((a) => a.data).flatMap((a) =>
  a.data.recent.map((p) => ({ ...p, account: a.label || a.data.name, platform: a.platform }))).sort((x, y) => new Date(y.published) - new Date(x.published));

export function Kpi({ label, value, note, icon }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">{icon}</span></div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></div>;
}
export function Empty({ title, text, action }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold">{title}</p><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>{action}</div>;
}
export function BarList({ rows, format = fmt }) {
  const max = Math.max(...rows.map((r) => r.value || 0), 1);
  return <div className="space-y-4">{rows.map((r) => <div key={r.label}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate">{r.label}</span><span className="shrink-0 text-slate-500">{format(r.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value || 0) / max * 100)}%`, background: r.color || "#7657e8" }} /></div></div>)}</div>;
}
export function ApiStatus({ status }) {
  return <div className="flex flex-wrap gap-2">{["youtube", "instagram"].map((p) => <span key={p} className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.[p] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{PLATFORM[p].name} API · {status?.[p] ? "key configured" : "key missing"}</span>)}</div>;
}

/** Connect / remove tracked social accounts and see their live stats. */
export function LivePanel({ live, token, title = "Connected social accounts", subject = "account" }) {
  const [form, setForm] = useState({ platform: "youtube", identifier: "", label: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function add(e, override) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await request("/api/social/accounts", { method: "POST", body: JSON.stringify(override || form) }, token); setForm({ ...form, identifier: "", label: "" }); await live.reload(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function remove(id) { try { await request(`/api/social/accounts/${id}`, { method: "DELETE" }, token); live.reload(); } catch (x) { setErr(x.message); } }
  return <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-slate-500">Real data from the platform APIs · refreshes every minute · last update {timeLabel(live.updated)}</p></div><ApiStatus status={live.status} /></div>
    {(() => { const ig = live.defaults?.instagram; const has = live.accounts.some((a) => a.platform === "instagram" && a.identifier.replace("@", "").toLowerCase() === (ig?.username || "").toLowerCase());
      return ig?.username && !has ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-sm"><span>Your server is linked to Instagram <b>@{ig.username}</b>.</span><button disabled={busy} onClick={() => add({ preventDefault() {} }, { platform: "instagram", identifier: ig.username, label: "" })} className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-fuchsia-500 disabled:opacity-60">+ Connect @{ig.username}</button></div> : ig?.error ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Instagram: {ig.error}</p> : null; })()}
    <form onSubmit={add} className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_1fr_auto]">
      <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="youtube">YouTube</option><option value="instagram">Instagram</option></select>
      <input required value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder={form.platform === "youtube" ? "@channelhandle or channel ID (UC…)" : "Business/Creator username"} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
      <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`Label (optional) e.g. ${subject} name`} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
      <button disabled={busy} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500 disabled:opacity-60">{busy ? "Verifying…" : "+ Connect"}</button>
    </form>
    {err && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
    {live.error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{live.error}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{live.accounts.map((a) => { const d = a.data; return <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3">{d?.avatar ? <img src={d.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{(a.label || a.identifier).slice(0, 1).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.label || d?.name || a.identifier}</p><p className="text-xs" style={{ color: PLATFORM[a.platform]?.color }}>● {PLATFORM[a.platform]?.name} · {d?.handle || a.identifier}</p></div>
        <button onClick={() => remove(a.id)} title="Stop tracking" className="text-xs text-slate-400 hover:text-rose-600">✕</button></div>
      {d ? <div className="mt-3 grid grid-cols-4 gap-2 text-center">{[["Followers", fmt(d.followers)], ["Views", fmt(d.views)], ["Posts", fmt(d.posts)], ["Eng.", d.engagement == null ? "—" : d.engagement + "%"]].map(([l, v]) => <div key={l}><p className="text-sm font-bold">{v}</p><p className="text-[10px] text-slate-400">{l}</p></div>)}</div> : <p className="mt-3 text-xs text-rose-600">{a.error}</p>}
    </div>; })}</div>
    {!live.accounts.length && !live.loading && <p className="mt-4 text-sm text-slate-500">No accounts connected yet. Add a YouTube channel or Instagram profile above to load real-time numbers.</p>}
  </section>;
}

/** Block shown at the top of the Creator overview. */
export function LiveCreatorSection({ live, token }) {
  const t = summarize(live.accounts);
  return <>
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Live followers" value={fmt(t.followers)} note={`${t.live} of ${t.count} accounts reporting`} icon="♧" />
      <Kpi label="Live channel views" value={fmt(t.views)} note="Lifetime views (YouTube)" icon="◉" />
      <Kpi label="Published posts" value={fmt(t.posts)} note="Across connected accounts" icon="▤" />
      <Kpi label="Recent engagement" value={t.engagement == null ? "—" : t.engagement.toFixed(2) + "%"} note="Likes + comments on latest posts" icon="✳" />
    </section>
    <LivePanel live={live} token={token} title="Live social data" subject="channel" />
  </>;
}

export const shortDay = (v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
/** Chart points built from real data: recorded follower snapshots, or the latest posts. */
export function trendPoints(metric, live, posts) {
  if (metric === "Followers") return (live.history || []).map((h) => ({ label: new Date(h.ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), value: h.followers }));
  const list = posts.filter((p) => p.published && (metric === "Interactions" || p.views != null)).slice(0, 14).reverse();
  return list.map((p) => ({ label: shortDay(p.published), value: metric === "Views" ? p.views : (p.likes || 0) + (p.comments || 0) }));
}

export function TrendChart({ points, color = "#7657e8", height = 230, empty = "Not enough data yet." }) {
  if (points.length < 2) return <div className="flex items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-500" style={{ height }}><p className="max-w-xs px-4">{empty}</p></div>;
  const W = 720, pad = { t: 16, r: 16, b: 30, l: 52 };
  const vals = points.map((p) => p.value), lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(hi - lo, 1);
  const min = lo - span * 0.1, rng = span * 1.2;
  const x = (i) => pad.l + i / (points.length - 1) * (W - pad.l - pad.r), y = (v) => pad.t + (1 - (v - min) / rng) * (height - pad.t - pad.b);
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Trend chart">
    {[0, 1, 2, 3].map((i) => { const v = min + rng * i / 3; return <g key={i}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e8eaf2" strokeDasharray="4 5" /><text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8991a5">{fmt(Math.round(v))}</text></g>; })}
    <polygon points={`${pad.l},${height - pad.b} ${line} ${W - pad.r},${height - pad.b}`} fill={color} opacity=".09" />
    <polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    {points.map((p, i) => <g key={i}><circle cx={x(i)} cy={y(p.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2"><title>{`${p.label}: ${p.value.toLocaleString()}`}</title></circle>{(points.length <= 8 || i % Math.ceil(points.length / 7) === 0) && <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#8991a5">{p.label.split(",")[0]}</text>}</g>)}
  </svg>;
}

const PALETTE = ["#7657e8", "#f15b78", "#35b6a0", "#f4b740", "#0ea5e9", "#a78bfa"];
export function Donut({ rows, center, format = fmt, empty = "No data yet." }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{empty}</p>;
  const R = 40, C = 2 * Math.PI * R; let acc = 0;
  return <div className="flex flex-wrap items-center gap-5"><div className="relative h-36 w-36 shrink-0">
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r={R} fill="none" stroke="#f1f2f8" strokeWidth="14" />{rows.map((r, i) => { const len = r.value / total * C; const el = <circle key={r.label} cx="50" cy="50" r={R} fill="none" stroke={r.color || PALETTE[i % 6]} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />; acc += len; return el; })}</svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold">{center ?? format(total)}</span><span className="text-[10px] text-slate-400">Total</span></div></div>
    <div className="min-w-[130px] flex-1 space-y-2 text-sm">{rows.map((r, i) => <p key={r.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color || PALETTE[i % 6] }} />{r.label}<span className="ml-auto font-semibold">{Math.round(r.value / total * 100)}%</span></p>)}</div></div>;
}

export function GroupBars({ rows, series }) {
  const max = Math.max(...rows.flatMap((r) => series.map((s) => r[s.key] || 0)), 1);
  return <div><div className="flex h-48 items-end gap-4 overflow-x-auto border-b border-slate-100 pb-1">{rows.map((r) => <div key={r.label} className="flex h-full min-w-[64px] flex-1 flex-col justify-end"><div className="flex h-full items-end justify-center gap-1">{series.map((s) => <div key={s.key} title={`${r.label} · ${s.name}: ${inr(r[s.key])}`} className="w-3 rounded-t sm:w-4" style={{ height: `${Math.max(2, (r[s.key] || 0) / max * 100)}%`, background: s.color }} />)}</div></div>)}</div>
    <div className="mt-2 flex gap-4 overflow-x-auto">{rows.map((r) => <p key={r.label} className="min-w-[64px] flex-1 truncate text-center text-[11px] text-slate-500">{r.label}</p>)}</div>
    <div className="mt-3 flex gap-4 text-xs text-slate-500">{series.map((s) => <span key={s.key}><span style={{ color: s.color }}>●</span> {s.name}</span>)}</div></div>;
}

export function KeyBanner({ status, go }) {
  if (!status || status.youtube || status.instagram) return null;
  return <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Live data is not connected yet</p><p className="mt-1 text-xs leading-5">The server has no social API keys. Add <code>YOUTUBE_API_KEY</code> (and/or the Instagram token) to <code>backend/.env</code>, restart the backend, then connect accounts.{go && <button onClick={go} className="ml-2 font-semibold underline">Connect accounts</button>}</p></div>;
}

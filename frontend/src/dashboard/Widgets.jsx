import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import { AUDIENCE, AUDIENCE_SHADES, GROWTH, KPIS, PERFORMANCE, PLATFORM_COLORS, POSTS, REVENUE_BARS } from "./data";
import { Icon, PlatformBadge } from "./Icons";

const k = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n);
const AXIS = { fontSize: 12, fill: "var(--muted)" };

const money = (usd) => `₹${Math.round(usd * 83).toLocaleString("en-IN")}`;

export function KpiRow({ overview, platform, days }) {
  if (!overview) {
    return <section className="kpis" aria-label="Key metrics">
      {[0, 1, 2, 3].map((i) => <article className="card kpi" key={i}><p className="kpi-sub">Loading…</p></article>)}
    </section>;
  }
  if (!overview.connected) {
    return <section className="kpis" aria-label="Key metrics">
      <article className="card kpi">
        <div className="kpi-top"><span className="kpi-label">{platform === "All Platforms" ? "No platform connected" : `${platform} not connected`}</span></div>
        <p className="kpi-sub">
          {platform === "LinkedIn"
            ? "LinkedIn integration requires OAuth token."
            : `Use “Sync ${platform === "All Platforms" ? "YouTube or Instagram" : platform}” above to connect.`}
        </p>
      </article>
    </section>;
  }

  const o = overview;
  const isIg = platform === "Instagram";
  const sub = `${o.period_posts} ${isIg ? "posts/reels" : "videos"} in last ${days}d`;
  const items = [
    { key: "subs", icon: "users", tone: "violet", label: isIg ? "Followers" : "Subscribers", value: k(o.subscribers), sub: isIg ? "Lifetime • from Instagram" : "Lifetime • from YouTube" },
    { key: "tv", icon: "eye", tone: "indigo", label: "Total Views", value: k(o.total_views), sub: isIg ? "Lifetime Reel / Post views" : "Lifetime channel views" },
    { key: "vids", icon: "video", tone: "teal", label: isIg ? "Total Posts" : "Total Videos", value: Number(o.total_videos).toLocaleString("en-IN"), sub: isIg ? "Published on Instagram" : "Published on channel" },
    { key: "pv", icon: "eye", tone: "blue", label: `Views (${days}d)`, value: k(o.period_views), sub },
    { key: "eng", icon: "heart", tone: "amber", label: `Avg Engagement (${days}d)`, value: `${o.avg_engagement_rate}%`, sub: "(likes + comments) / views" },
    { key: "rev", icon: "rupee", tone: "green", label: `Est. Value (${days}d)`, value: money(o.est_revenue), sub: isIg ? "Est. Brand / Post Value" : "Estimate, not real AdSense" },
  ];

  return (
    <section className="kpis" aria-label="Key metrics">
      {items.map((x) => (
        <article className="card kpi" key={x.key}>
          <div className="kpi-top">
            <span className={"kpi-ico tone-" + x.tone}><Icon name={x.icon} size={20} /></span>
            <span className="kpi-label">{x.label}</span>
          </div>
          <div className="kpi-main"><strong>{x.value}</strong></div>
          <p className="kpi-sub">{x.sub}</p>
        </article>
      ))}
    </section>
  );
}

export function FollowerGrowth({ platform, days }) {
  const [state, setState] = useState({ loading: true, history: [], connected: true, live: false });
  const plat = platform === "All Platforms" ? "all" : platform.toLowerCase();

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    api.get(`/api/analytics/audience?platform=${plat}&days=${days}`)
      .then((res) => setState({
        loading: false,
        connected: res.data.connected,
        live: !!res.data.is_live,
        history: (res.data.growth_history || []).map((g) => ({ d: g.date, Subscribers: g.followers })),
      }))
      .catch(() => setState({ loading: false, history: [], connected: false, live: false }));
  }, [plat, days]);

  const { history, connected, live, loading } = state;
  const few = history.length < 3;

  return (
    <article className="card">
      <div className="card-head">
        <h2>Follower Growth <Icon name="info" size={14} /></h2>
        <ul className="legend"><li><i style={{ background: platform === "Instagram" ? (PLATFORM_COLORS.Instagram || "#d946a8") : PLATFORM_COLORS.YouTube }} />{platform === "Instagram" ? "Instagram followers" : "YouTube subscribers"}</li></ul>
      </div>
      {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p>
        : !connected || history.length === 0 ? <p className="muted" style={{ padding: 16 }}>No follower history for this platform / range yet.</p>
        : (
          <>
            {live && few && <p className="muted" style={{ padding: "0 4px 8px", fontSize: "0.8rem" }}>Real history builds up one point per day (auto-sync). Check back after a few days.</p>}
            <div className="chart" style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={history} margin={{ top: 12, right: 16, left: -6, bottom: 4 }}>
                  <defs>
                    <linearGradient id="fg-sub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PLATFORM_COLORS.YouTube} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={PLATFORM_COLORS.YouTube} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" opacity={0.6} />
                  <XAxis dataKey="d" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={32} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={k} width={52} domain={["dataMin - 100", "dataMax + 100"]} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: PLATFORM_COLORS.YouTube, strokeWidth: 1.5, strokeDasharray: "4 4" }}
                    formatter={(v) => [Number(v).toLocaleString() + " subscribers", "YouTube"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", padding: "10px 14px", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}
                  />
                  <Area type="monotone" dataKey="Subscribers" stroke={PLATFORM_COLORS.YouTube} strokeWidth={2.5}
                    fill="url(#fg-sub)" dot={false} activeDot={{ r: 5, stroke: PLATFORM_COLORS.YouTube, strokeWidth: 2, fill: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
    </article>
  );
}

export function ContentPerformance({ platform, days }) {
  const [perfData, setPerfData] = useState(null);
  const [tab, setTab] = useState("Views");
  const plat = platform === "All Platforms" ? "all" : (platform || "all").toLowerCase();

  useEffect(() => {
    api.get(`/api/analytics/content-performance?platform=${plat}&days=${days}`)
      .then((res) => setPerfData(res.data))
      .catch((err) => { console.error("Error loading content performance:", err); setPerfData({}); });
  }, [plat, days]);

  const dataMap = perfData && Object.keys(perfData).length ? perfData : { Views: [], Likes: [], Comments: [], Shares: [] };
  const tabs = Object.keys(dataMap);
  const currentChartData = dataMap[tab] || [];
  const bestDay = currentChartData.length > 0
    ? currentChartData.reduce((a, b) => (b.value > a.value ? b : a), currentChartData[0])?.day
    : null;

  return (
    <article className="card">
      <div className="card-head">
        <h2>Content Performance <Icon name="info" size={14} /></h2>
        <span className="muted" style={{ fontSize: "0.75rem" }}>Videos from last {days} days</span>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {currentChartData.length === 0 ? <p className="muted" style={{ padding: 16 }}>No videos published in this date range.</p> : (
        <div className="chart" style={{ height: 210 }}>
          <ResponsiveContainer>
            <BarChart data={currentChartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={k} width={44} />
              <Tooltip
                cursor={{ fill: "rgba(109, 74, 232, 0.08)" }}
                labelFormatter={(l, p) => {
                  const itm = p?.[0]?.payload;
                  return itm?.title ? `${l} • ${itm.title}` : l;
                }}
                formatter={(v) => [v === 0 ? "0 (No uploads on this day)" : v.toLocaleString(), tab]}
                contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {currentChartData.map((d, i) => <Cell key={i} fill={d.value > 0 ? (d.day === bestDay ? "#6d4ae8" : "#8b7bf2") : "var(--line)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

export function TopPosts({ posts: parentPosts }) {
  const [posts, setPosts] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [compData, setCompData] = useState(null);

  useEffect(() => {
    if (parentPosts !== undefined) {
      setPosts(parentPosts);
      if (parentPosts && parentPosts.length >= 2) {
        setSelectedA(parentPosts[0].post_id);
        setSelectedB(parentPosts[1].post_id);
      }
      return;
    }
    api.get("/api/analytics/posts?sort_by=views&order=desc")
      .then((res) => {
        setPosts(res.data);
        if (res.data.length >= 2) {
          setSelectedA(res.data[0].post_id);
          setSelectedB(res.data[1].post_id);
        }
      })
      .catch((err) => console.error(err));
  }, [parentPosts]);

  useEffect(() => {
    if (showCompare && selectedA && selectedB && selectedA !== selectedB) {
      api.get(`/api/analytics/posts/compare?post_ids=${selectedA},${selectedB}`)
        .then((res) => setCompData(res.data))
        .catch((e) => console.error(e));
    }
  }, [showCompare, selectedA, selectedB]);

  const displayPosts = parentPosts !== undefined ? posts : (posts.length > 0 ? posts : POSTS);
  const pA = compData?.compared_posts?.find((p) => p.post_id === Number(selectedA)) || posts.find((p) => p.post_id === Number(selectedA));
  const pB = compData?.compared_posts?.find((p) => p.post_id === Number(selectedB)) || posts.find((p) => p.post_id === Number(selectedB));

  return (
    <article className="card">
      <div className="card-head">
        <h2>Top Performing Posts <Icon name="info" size={14} /></h2>
        <button
          className="view-all"
          onClick={() => setShowCompare(!showCompare)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {showCompare ? "Hide Comparison" : "Compare Posts"} <Icon name="right" size={14} />
        </button>
      </div>

      {showCompare && pA && pB && (
        <div className="comp-wrap">
          <div className="comp-head">
            <div className="comp-selectors">
              <select className="sel" value={selectedA} onChange={(e) => setSelectedA(e.target.value)}>
                {posts.map((p) => (
                  <option key={p.post_id} value={p.post_id} disabled={p.post_id === Number(selectedB)}>
                    Video A: {p.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
              <span className="muted" style={{ fontWeight: 700, fontSize: "0.8rem" }}>vs</span>
              <select className="sel" value={selectedB} onChange={(e) => setSelectedB(e.target.value)}>
                {posts.map((p) => (
                  <option key={p.post_id} value={p.post_id} disabled={p.post_id === Number(selectedA)}>
                    Video B: {p.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>
            {compData?.summary && (
              <span className="delta">
                Leader: {compData.summary.views_leader.slice(0, 24)}... (+{compData.summary.views_difference.toLocaleString()} views)
              </span>
            )}
          </div>

          <div className="comp-grid">
            <div className="comp-col">
              <div className="comp-video-info">
                {pA.thumbnail_url && <img src={pA.thumbnail_url} alt="" className="comp-thumb" />}
                <strong className="comp-video-title">{pA.title}</strong>
              </div>
              <div className="comp-metrics">
                <div className="comp-metric"><small>Views</small><strong>{pA.views.toLocaleString()}</strong></div>
                <div className="comp-metric"><small>Engagement</small><strong style={{ color: "var(--violet)" }}>{pA.engagement_rate}%</strong></div>
                <div className="comp-metric"><small>Likes</small><strong>{pA.likes.toLocaleString()}</strong></div>
                <div className="comp-metric"><small>Comments</small><strong>{pA.comments.toLocaleString()}</strong></div>
              </div>
            </div>

            <div className="comp-col">
              <div className="comp-video-info">
                {pB.thumbnail_url && <img src={pB.thumbnail_url} alt="" className="comp-thumb" />}
                <strong className="comp-video-title">{pB.title}</strong>
              </div>
              <div className="comp-metrics">
                <div className="comp-metric"><small>Views</small><strong>{pB.views.toLocaleString()}</strong></div>
                <div className="comp-metric"><small>Engagement</small><strong style={{ color: "var(--violet)" }}>{pB.engagement_rate}%</strong></div>
                <div className="comp-metric"><small>Likes</small><strong>{pB.likes.toLocaleString()}</strong></div>
                <div className="comp-metric"><small>Comments</small><strong>{pB.comments.toLocaleString()}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: showCompare ? 14 : 0 }}>
        <table>
          <thead>
            <tr><th>Content</th><th>Platform</th><th>Views</th><th>Likes</th><th>Comments</th><th>Engagement</th><th>Published</th></tr>
          </thead>
          <tbody>
            {displayPosts.map((p) => (
              <tr key={p.post_id || p.title}>
                <td>
                  <div className="post">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="thumb" style={{ objectFit: "cover", borderRadius: 8, width: 50, height: 38 }} />
                    ) : (
                      <span className="thumb" style={{ background: `linear-gradient(135deg, ${p.grad ? p.grad[0] : '#6d4ae8'}, ${p.grad ? p.grad[1] : '#a79af2'})` }} />
                    )}
                    <span>
                      <strong title={p.title}>{p.title}</strong>
                      <small>{p.content_type || p.type || "Video"}</small>
                    </span>
                  </div>
                </td>
                <td><PlatformBadge name={p.platform || "YouTube"} /></td>
                <td><strong>{typeof p.views === "number" ? p.views.toLocaleString() : p.views}</strong></td>
                <td>{typeof p.likes === "number" ? p.likes.toLocaleString() : p.likes}</td>
                <td>{typeof p.comments === "number" ? p.comments.toLocaleString() : p.comments}</td>
                <td><span className="eng">{p.engagement_rate ? `${p.engagement_rate}%` : p.eng}</span></td>
                <td className="muted">{p.published_at ? new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayPosts.length === 0 && <p className="muted" style={{ padding: 16 }}>No posts in this date range.</p>}
      </div>
    </article>
  );
}

export function Audience({ followers, platform }) {
  const tabs = Object.keys(AUDIENCE);
  const [tab, setTab] = useState("Age");
  const data = AUDIENCE[tab].map(([name, value]) => ({ name, value }));
  return (
    <article className="card">
      <div className="card-head">
        <h2>Audience Demographics <Icon name="info" size={14} /></h2>
        <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>View All <Icon name="right" size={14} /></a>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="aud">
        <div className="donut">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius="66%" outerRadius="100%" paddingAngle={1} stroke="none">
                {data.map((d, i) => <Cell key={d.name} fill={AUDIENCE_SHADES[i % AUDIENCE_SHADES.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-mid"><strong>{followers != null ? k(followers) : "—"}</strong><small>{platform === "Instagram" ? "Followers" : "Subscribers"}</small></div>
        </div>
        <ul className="aud-list">
          {data.map((d, i) => (
            <li key={d.name}><i style={{ background: AUDIENCE_SHADES[i % AUDIENCE_SHADES.length] }} /><span>{d.name}</span><b>{d.value}%</b></li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function Revenue({ overview, days }) {
  const max = Math.max(...REVENUE_BARS);
  const has = overview?.connected;
  return (
    <article className="card">
      <div className="card-head">
        <h2>Revenue Analytics <Icon name="info" size={14} /></h2>
      </div>
      <div className="rev">
        <div>
          <small className="muted">Est. earnings, last {days} days (views × ₹0.23)</small>
          <div className="kpi-main"><strong className="rev-n">{has ? money(overview.est_revenue) : "—"}</strong></div>
          <p className="kpi-sub">Real AdSense data needs YouTube Analytics API + OAuth.</p>
        </div>
        <div className="rev-bars" aria-hidden="true">
          {REVENUE_BARS.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} />)}
        </div>
      </div>
    </article>
  );
}

import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import { AUDIENCE, AUDIENCE_SHADES, GROWTH, KPIS, PERFORMANCE, PLATFORM_COLORS, POSTS, REVENUE_BARS } from "./data";
import { Icon, PlatformBadge } from "./Icons";

const k = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n);
const AXIS = { fontSize: 12, fill: "var(--muted)" };

export function KpiRow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/analytics/overview")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Error loading overview analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  const items = data ? [
    { key: "followers", icon: "user", tone: "violet", label: "Total Followers", value: k(data.subscribers), delta: "+8.4%", sub: "Across connected channels" },
    { key: "views", icon: "video", tone: "teal", label: "Total Views", value: k(data.total_views), delta: "+18.2%", sub: `${data.total_posts} published videos` },
    { key: "eng", icon: "heart", tone: "amber", label: "Avg Engagement", value: `${data.avg_engagement_rate}%`, delta: "+2.1%", sub: "Industry average is 3.5%" },
    { key: "rev", icon: "rupee", tone: "green", label: "Est. Earnings", value: `₹${(data.est_revenue * 83).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, delta: "+24.5%", sub: "AdSense & brand estimates" },
  ] : KPIS;

  return (
    <section className="kpis" aria-label="Key metrics">
      {items.map((x) => (
        <article className="card kpi" key={x.key}>
          <div className="kpi-top">
            <span className={"kpi-ico tone-" + x.tone}><Icon name={x.icon} size={20} /></span>
            <span className="kpi-label">{x.label}</span>
          </div>
          <div className="kpi-main">
            <strong>{x.value}</strong>
            <span className="delta"><Icon name="up" size={12} />{x.delta}</span>
          </div>
          <p className="kpi-sub">{x.sub}</p>
        </article>
      ))}
    </section>
  );
}

export function FollowerGrowth({ platform }) {
  const [audienceData, setAudienceData] = useState([]);

  useEffect(() => {
    api.get("/api/analytics/audience")
      .then((res) => {
        if (res.data?.growth_history?.length) {
          const chartData = res.data.growth_history.map((g) => ({
            d: g.date,
            YouTube: g.followers,
            Instagram: Math.round(g.followers * 0.72),
            TikTok: Math.round(g.followers * 0.45),
          }));
          setAudienceData(chartData);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const chartSource = audienceData.length > 0 ? audienceData : GROWTH;
  const names = platform === "All Platforms" ? Object.keys(PLATFORM_COLORS) : [platform].filter((p) => PLATFORM_COLORS[p]);

  return (
    <article className="card">
      <div className="card-head">
        <h2>Follower Growth <Icon name="info" size={14} /></h2>
        <ul className="legend">
          {Object.entries(PLATFORM_COLORS).map(([n, c]) => (
            <li key={n}><i style={{ background: c }} />{n}</li>
          ))}
        </ul>
      </div>
      <div className="chart" style={{ height: 250 }}>
        <ResponsiveContainer>
          <AreaChart data={chartSource} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              {names.map((n) => (
                <linearGradient key={n} id={"fg-" + n} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={PLATFORM_COLORS[n]} stopOpacity={0.14} />
                  <stop offset="1" stopColor={PLATFORM_COLORS[n]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="d" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={k} width={48} />
            <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }} />
            {names.map((n) => (
              <Area key={n} type="monotone" dataKey={n} stroke={PLATFORM_COLORS[n]} strokeWidth={2.4} fill={`url(#fg-${n})`} dot={{ r: 3 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function ContentPerformance() {
  const tabs = Object.keys(PERFORMANCE);
  const [tab, setTab] = useState("Views");
  const best = PERFORMANCE[tab].reduce((a, b) => (b.value > a.value ? b : a)).day;
  return (
    <article className="card">
      <div className="card-head">
        <h2>Content Performance <Icon name="info" size={14} /></h2>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="chart" style={{ height: 210 }}>
        <ResponsiveContainer>
          <BarChart data={PERFORMANCE[tab]} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={k} width={44} />
            <Tooltip cursor={{ fill: "var(--soft)" }} formatter={(v) => [v.toLocaleString(), tab]} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {PERFORMANCE[tab].map((d) => (
                <Cell key={d.day} fill={d.day === best ? "#6d4ae8" : "#a79af2"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
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
    if (parentPosts && parentPosts.length > 0) {
      setPosts(parentPosts);
      if (parentPosts.length >= 2) {
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

  const displayPosts = posts.length > 0 ? posts : POSTS;
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
      </div>
    </article>
  );
}

export function Audience() {
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
          <div className="donut-mid"><strong>142.5K</strong><small>Subscribers</small></div>
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

export function Revenue() {
  const max = Math.max(...REVENUE_BARS);
  return (
    <article className="card">
      <div className="card-head">
        <h2>Revenue Analytics <Icon name="info" size={14} /></h2>
        <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>View All <Icon name="right" size={14} /></a>
      </div>
      <div className="rev">
        <div>
          <small className="muted">Est. YouTube AdSense Revenue</small>
          <div className="kpi-main"><strong className="rev-n">₹68,450</strong><span className="delta"><Icon name="up" size={12} />24.5%</span></div>
          <p className="kpi-sub">+ ₹14,200 vs last month</p>
        </div>
        <div className="rev-bars" aria-hidden="true">
          {REVENUE_BARS.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} />)}
        </div>
      </div>
    </article>
  );
}

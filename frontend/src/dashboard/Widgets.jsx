import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AUDIENCE, AUDIENCE_SHADES, GROWTH, KPIS, PERFORMANCE, PLATFORM_COLORS, POSTS, REVENUE_BARS } from "./data";
import { Icon, PlatformBadge } from "./Icons";

const k = (n) => (n >= 1000 ? `${n / 1000}K` : n);
const AXIS = { fontSize: 12, fill: "var(--muted)" };

export function KpiRow() {
  return (
    <section className="kpis" aria-label="Key metrics">
      {KPIS.map((x) => (
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
          <AreaChart data={GROWTH} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
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

export function TopPosts() {
  return (
    <article className="card">
      <div className="card-head">
        <h2>Top Performing Posts</h2>
        <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>View All <Icon name="right" size={14} /></a>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Content</th><th>Platform</th><th>Views</th><th>Likes</th><th>Comments</th><th>Engagement</th><th>Published</th></tr>
          </thead>
          <tbody>
            {POSTS.map((p) => (
              <tr key={p.title}>
                <td>
                  <div className="post">
                    <span className="thumb" style={{ background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})` }} />
                    <span><strong>{p.title}</strong><small>{p.type}</small></span>
                  </div>
                </td>
                <td><PlatformBadge name={p.platform} /></td>
                <td>{p.views}</td>
                <td>{p.likes}</td>
                <td>{p.comments}</td>
                <td><span className="eng">{p.eng}</span></td>
                <td className="muted">{p.date}</td>
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
          <div className="donut-mid"><strong>125.4K</strong><small>Followers</small></div>
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
        <h2>Revenue Overview <Icon name="info" size={14} /></h2>
        <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>View All <Icon name="right" size={14} /></a>
      </div>
      <div className="rev">
        <div>
          <small className="muted">Total Revenue</small>
          <div className="kpi-main"><strong className="rev-n">₹48,250</strong><span className="delta"><Icon name="up" size={12} />20.6%</span></div>
          <p className="kpi-sub">+ ₹8,240 from last month</p>
        </div>
        <div className="rev-bars" aria-hidden="true">
          {REVENUE_BARS.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} />)}
        </div>
      </div>
    </article>
  );
}

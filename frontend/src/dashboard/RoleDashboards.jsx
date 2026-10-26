import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api, { errorMessage } from "../api";
import * as D from "./data";
import { Icon, PlatformBadge } from "./Icons";

const AXIS = { fontSize: 12, fill: "var(--muted)" };
const TIP = { borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" };
const K = (n) => (n >= 1000 ? `${n / 1000}M` : `${n}K`);

function SampleNote({ children }) {
  return (
    <p className="sample-note">
      <span className="sample-pill">Sample data</span>
      {children || "Numbers here are demo values until accounts and campaigns are connected in later modules."}
    </p>
  );
}

function KpiCard({ icon, tone, label, value, delta, sub }) {
  return (
    <article className="card kpi">
      <div className="kpi-top">
        <span className={"kpi-ico tone-" + tone}><Icon name={icon} size={20} /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-main">
        <strong>{value}</strong>
        {delta && <span className="delta"><Icon name="up" size={12} />{delta}</span>}
      </div>
      <p className="kpi-sub">{sub}</p>
    </article>
  );
}

function Card({ title, link, sample, children }) {
  return (
    <article className="card">
      <div className="card-head">
        <h2>{title} <Icon name="info" size={14} />{sample && <span className="sample-pill sm">Sample</span>}</h2>
        {link && (link.to
          ? <Link to={link.to} className="view-all">{link.label || "View All"} <Icon name="right" size={14} /></Link>
          : <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>View All <Icon name="right" size={14} /></a>)}
      </div>
      {children}
    </article>
  );
}

function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map(([n, c]) => <li key={n}><i style={{ background: c }} />{n}</li>)}
    </ul>
  );
}

function Donut({ data, center, small }) {
  return (
    <div className="aud">
      <div className="donut">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="66%" outerRadius="100%" paddingAngle={1} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-mid"><strong>{center}</strong><small>{small}</small></div>
      </div>
      <ul className="aud-list">
        {data.map((d) => (
          <li key={d.name}><i style={{ background: d.color }} /><span>{d.name}</span><b>{d.value}%</b></li>
        ))}
      </ul>
    </div>
  );
}

function Progress({ rows }) {
  return (
    <ul className="plist">
      {rows.map(([n, v]) => (
        <li key={n}>
          <span>{n}</span>
          <div className="bar"><i style={{ width: `${v}%` }} /></div>
          <b>{v}%</b>
        </li>
      ))}
    </ul>
  );
}

function TwoLineChart({ data, keys, colors, height = 250 }) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="d" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={K} width={48} />
          <Tooltip contentStyle={TIP} formatter={(v, n) => [`${v}K`, n]} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2.4} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ Agency */
export function AgencyDashboard() {
  return (
    <>
      <SampleNote />
      <section className="kpis kpis-5" aria-label="Key metrics">
        {D.AGENCY_KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
      </section>

      <div className="row row-a">
        <Card title="Overall Performance" sample>
          <Legend items={[["Views", "#6d4ae8"], ["Engagement", "#22c55e"]]} />
          <TwoLineChart data={D.AGENCY_PERF} keys={["Views", "Engagement"]} colors={["#6d4ae8", "#22c55e"]} />
        </Card>
        <Card title="Platform Distribution" sample>
          <Donut data={D.PLATFORM_DIST} center="2.4M" small="Followers" />
        </Card>
      </div>

      <Card title="Creators Overview" link sample>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Creator</th><th>Platform</th><th>Followers</th><th>Views</th><th>Engagement</th><th>Growth</th></tr></thead>
            <tbody>
              {D.AGENCY_CREATORS.map((c) => (
                <tr key={c.name}>
                  <td>
                    <div className="post">
                      <span className="avatar sm">{c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td><PlatformBadge name={c.platform} /></td>
                  <td>{c.followers}</td><td>{c.views}</td>
                  <td><span className="eng">{c.eng}</span></td>
                  <td><span className="delta"><Icon name="up" size={12} />{c.growth}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* --------------------------------------------------------------- Marketing */
const STATUS_CLASS = { Active: "st-on", Completed: "st-done", Scheduled: "st-soon" };

export function MarketingDashboard() {
  return (
    <>
      <SampleNote />
      <section className="kpis kpis-5" aria-label="Key metrics">
        {D.MKT_KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
      </section>

      <div className="row row-a">
        <Card title="Campaign Performance" sample>
          <Legend items={[["Reach", "#6d4ae8"], ["Engagement", "#22c55e"]]} />
          <TwoLineChart data={D.CAMPAIGN_PERF} keys={["Reach", "Engagement"]} colors={["#6d4ae8", "#22c55e"]} />
        </Card>
        <Card title="Top Performing Campaigns" sample>
          <div className="chart" style={{ height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={D.TOP_CAMPAIGNS} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--line)" />
                <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}K`} />
                <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={112} />
                <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={TIP} formatter={(v) => [`${v}K reach`, "Reach"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {D.TOP_CAMPAIGNS.map((c, i) => <Cell key={c.name} fill={i === 0 ? "#6d4ae8" : "#a79af2"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="row row-b">
        <Card title="Recent Campaigns" link sample>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Reach</th><th>Engagement</th><th>Ends</th></tr></thead>
              <tbody>
                {D.RECENT_CAMPAIGNS.map((c) => (
                  <tr key={c.name}>
                    <td><strong>{c.name}</strong></td>
                    <td><PlatformBadge name={c.platform} /></td>
                    <td><span className={"st " + STATUS_CLASS[c.status]}>{c.status}</span></td>
                    <td>{c.reach}</td><td>{c.eng}</td><td className="muted">{c.ends}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="stack">
          <Card title="Content Distribution" sample>
            <Donut data={D.CONTENT_DIST} center="1,248" small="Posts" />
          </Card>
          <Card title="Audience Insights" link sample>
            <p className="mini-h">Age</p>
            <Progress rows={D.AUDIENCE_INSIGHTS.age} />
            <p className="mini-h">Top locations</p>
            <Progress rows={D.AUDIENCE_INSIGHTS.places} />
          </Card>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- Admin */
const ROLE_CARDS = [
  { role: "creator", label: "Creators", icon: "user", tone: "rose" },
  { role: "agency", label: "Agencies", icon: "briefcase", tone: "blue" },
  { role: "marketing_team", label: "Marketing Team", icon: "campaign", tone: "amber" },
  { role: "admin", label: "Administrators", icon: "shield", tone: "indigo" },
];

export function AdminDashboard() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/users").then((r) => setUsers(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!users) return <p className="muted">Loading platform stats...</p>;

  const count = (role) => users.filter((u) => u.role === role).length;
  const recent = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <>
      <p className="sample-note">
        <span className="sample-pill live">Live</span> User counts and recent users come from the database.
        <span className="sample-pill">Sample</span> Growth, usage and activity are demo values.
      </p>

      <section className="kpis kpis-5" aria-label="Platform stats">
        <KpiCard icon="users" tone="violet" label="Total Users" value={users.length} sub={`${users.filter((u) => u.is_active).length} active accounts`} />
        {ROLE_CARDS.map((c) => (
          <KpiCard key={c.role} icon={c.icon} tone={c.tone} label={c.label} value={count(c.role)} sub="registered accounts" />
        ))}
      </section>

      <div className="row row-a">
        <Card title="User Growth" sample>
          <div className="chart" style={{ height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={D.USER_GROWTH} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="d" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="Users" stroke="#6d4ae8" strokeWidth={2.6} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Platform Usage" sample>
          <div className="chart" style={{ height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={D.PLATFORM_USAGE} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
                <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={TIP} formatter={(v) => [v, "Connected accounts"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b7bf2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="row row-b">
        <Card title="Recent Users" link={{ to: "/admin/users", label: "Manage users" }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {recent.map((u) => (
                  <tr key={u.user_id}>
                    <td><strong>{u.name}</strong></td>
                    <td className="muted">{u.email}</td>
                    <td><span className="role-tag">{u.role_label}</span></td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="System Activity" sample>
          <ul className="activity">
            {D.SYSTEM_ACTIVITY.map((a) => (
              <li key={a.text}>
                <i style={{ background: a.tone }} />
                <span>{a.text}<small>{a.time}</small></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

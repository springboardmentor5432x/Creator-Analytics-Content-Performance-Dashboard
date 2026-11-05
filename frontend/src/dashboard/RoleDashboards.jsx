import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api, { errorMessage } from "../api";
import { Icon, PlatformBadge } from "./Icons";

const AXIS = { fontSize: 12, fill: "var(--muted)" };
const TIP = { borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" };
const K = (n) => (n >= 1000 ? `${n / 1000}M` : `${n}K`);

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

function Card({ title, link, children }) {
  return (
    <article className="card">
      <div className="card-head">
        <h2>{title} <Icon name="info" size={14} /></h2>
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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/agencies/me/overview")
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!data) return <p className="muted">Loading agency overview...</p>;

  return (
    <>
      <section className="kpis kpis-5" aria-label="Key metrics">
        {data.kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </section>

      {!data.has_creators ? (
        <article className="card" style={{ padding: "32px 24px", textAlign: "center", marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <span className="kpi-ico tone-violet" style={{ display: "inline-flex", width: 44, height: 44, borderRadius: "50%", alignItems: "center", justifyContent: "center" }}>
              <Icon name="audience" size={24} />
            </span>
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 8px" }}>No Creators Linked Yet</h2>
          <p className="muted" style={{ maxWidth: 520, margin: "0 auto 16px" }}>
            Link creators to your agency roster to see aggregated performance, cross-platform growth, and campaign analytics.
          </p>
          <Link to="/profile" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
            Manage Roster <Icon name="right" size={14} />
          </Link>
        </article>
      ) : (
        <>
          <div className="row row-a">
            <Card title="Overall Performance">
              <Legend items={[["Views", "#6d4ae8"], ["Engagement", "#22c55e"]]} />
              {data.performance.length > 0 ? (
                <TwoLineChart data={data.performance} keys={["Views", "Engagement"]} colors={["#6d4ae8", "#22c55e"]} />
              ) : (
                <p className="muted" style={{ padding: 16 }}>Performance trend will populate once posts are published.</p>
              )}
            </Card>
            <Card title="Platform Distribution">
              {data.platform_dist.length > 0 ? (
                <Donut data={data.platform_dist} center={data.total_followers >= 1000000 ? `${(data.total_followers / 1000000).toFixed(1)}M` : `${data.total_followers}`} small="Followers" />
              ) : (
                <p className="muted" style={{ padding: 16 }}>No platform distribution data available.</p>
              )}
            </Card>
          </div>

          <Card title="Creators Overview" link={{ to: "/profile", label: "Manage Roster" }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Creator</th><th>Platform</th><th>Followers</th><th>Views</th><th>Engagement</th><th>Growth</th></tr></thead>
                <tbody>
                  {data.creators.map((c) => (
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
      )}
    </>
  );
}

/* --------------------------------------------------------------- Marketing */
const STATUS_CLASS = { Active: "st-on", Completed: "st-done", Scheduled: "st-soon" };

export function MarketingDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/analytics/marketing/overview")
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!data) return <p className="muted">Loading marketing overview...</p>;

  return (
    <>
      <section className="kpis kpis-5" aria-label="Key metrics">
        {data.kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </section>

      <div className="row row-a">
        <Card title="Campaign Performance">
          <Legend items={[["Reach", "#6d4ae8"], ["Engagement", "#22c55e"]]} />
          {data.campaign_perf.length > 0 ? (
            <TwoLineChart data={data.campaign_perf} keys={["Reach", "Engagement"]} colors={["#6d4ae8", "#22c55e"]} />
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p className="muted">No campaign performance data available yet.</p>
            </div>
          )}
        </Card>
        <Card title="Top Performing Campaigns">
          {data.top_campaigns.length > 0 ? (
            <div className="chart" style={{ height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={data.top_campaigns} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={112} />
                  <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={TIP} formatter={(v) => [`${v}K reach`, "Reach"]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.top_campaigns.map((c, i) => <Cell key={c.name} fill={i === 0 ? "#6d4ae8" : "#a79af2"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p className="muted">No campaigns created yet. Set up campaigns in the Campaigns module to track performance.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="row row-b">
        <Card title="Recent Campaigns">
          {data.recent_campaigns.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Reach</th><th>Engagement</th><th>Ends</th></tr></thead>
                <tbody>
                  {data.recent_campaigns.map((c) => (
                    <tr key={c.name}>
                      <td><strong>{c.name}</strong></td>
                      <td><PlatformBadge name={c.platform} /></td>
                      <td><span className={"st " + (STATUS_CLASS[c.status] || "st-on")}>{c.status}</span></td>
                      <td>{c.reach}</td><td>{c.eng}</td><td className="muted">{c.ends}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p className="muted">No recent campaigns to display.</p>
            </div>
          )}
        </Card>
        <div className="stack">
          <Card title="Content Distribution">
            {data.content_dist.length > 0 ? (
              <Donut data={data.content_dist} center={data.total_posts || "0"} small="Posts" />
            ) : (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p className="muted">No published content tracked yet.</p>
              </div>
            )}
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
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/admin/users"),
      api.get("/api/admin/overview"),
    ])
      .then(([uRes, oRes]) => {
        setUsers(uRes.data);
        setOverview(oRes.data);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!users || !overview) return <p className="muted">Loading platform stats...</p>;

  const count = (role) => users.filter((u) => u.role === role).length;
  const recent = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <>
      <section className="kpis kpis-5" aria-label="Platform stats">
        <KpiCard icon="users" tone="violet" label="Total Users" value={users.length} sub={`${users.filter((u) => u.is_active).length} active accounts`} />
        {ROLE_CARDS.map((c) => (
          <KpiCard key={c.role} icon={c.icon} tone={c.tone} label={c.label} value={count(c.role)} sub="registered accounts" />
        ))}
      </section>

      <div className="row row-a">
        <Card title="User Growth">
          {overview.user_growth.length > 0 ? (
            <div className="chart" style={{ height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={overview.user_growth} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="d" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={TIP} />
                  <Line type="monotone" dataKey="Users" stroke="#6d4ae8" strokeWidth={2.6} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ padding: 16 }}>No user growth history recorded yet.</p>
          )}
        </Card>
        <Card title="Platform Usage">
          {overview.platform_usage.length > 0 ? (
            <div className="chart" style={{ height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={overview.platform_usage} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
                  <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={TIP} formatter={(v) => [v, "Connected accounts"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b7bf2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ padding: 16 }}>No platform accounts connected yet.</p>
          )}
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
        <Card title="System Activity">
          {overview.system_activity.length > 0 ? (
            <ul className="activity">
              {overview.system_activity.map((a, i) => (
                <li key={i}>
                  <i style={{ background: a.tone }} />
                  <span>{a.text}<small>{a.time}</small></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ padding: 16 }}>No recent system activity.</p>
          )}
        </Card>
      </div>
    </>
  );
}

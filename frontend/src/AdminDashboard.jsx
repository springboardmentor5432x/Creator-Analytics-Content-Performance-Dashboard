
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, getUsers, getAnalyticsOverview } from "./api";
import "./Dashboard.css";

const sampleUsers = [
  { id: 1, name: "Riya Sharma", email: "riya@example.com", role: "Creator", is_active: true, created_at: "2026-09-15" },
  { id: 2, name: "Growth Agency", email: "agency@example.com", role: "Agency", is_active: true, created_at: "2026-09-14" },
  { id: 3, name: "Brand Studio", email: "marketing@example.com", role: "Marketing Team", is_active: true, created_at: "2026-09-13" },
  { id: 4, name: "Arjun Mehta", email: "arjun@example.com", role: "Creator", is_active: false, created_at: "2026-09-12" },
  { id: 5, name: "Content Co.", email: "content@example.com", role: "Agency", is_active: true, created_at: "2026-09-11" },
];

const roleColors = {
  Creator: "#7c5cf0",
  Agency: "#f3a33c",
  "Marketing Team": "#ed5bb5",
  Admin: "#4285f4",
  Administrator: "#4285f4",
  User: "#19b889",
};

function initials(value = "") {
  return String(value).trim().split(/[\s@._-]+/).filter(Boolean)
    .slice(0, 2).map(x => x[0].toUpperCase()).join("") || "A";
}

function dateText(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value :
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value, note, color }) {
  return (
    <article className="ciq-stat-card">
      <div className={`ciq-stat-icon ${color}`}>{icon}</div>
      <div className="ciq-stat-label">{label}</div>
      <div className="ciq-stat-value">{value}</div>
      <div className="ciq-stat-note">{note}</div>
    </article>
  );
}


function GrowthChart() {
  return (
    <div className="creator-growth">
      <div className="creator-chart-legend">
        <span><i className="legend-red" /> Creators</span>
        <span><i className="legend-purple" /> Agencies</span>
        <span><i className="legend-blue" /> Marketing Teams</span>
      </div>

      <div className="creator-chart-area">
        <div className="creator-y-labels">
          <span>200</span>
          <span>150</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        <div className="creator-svg-wrapper">
          <svg
            viewBox="0 0 520 160"
            preserveAspectRatio="none"
            role="img"
            aria-label="User growth chart"
          >
            {[8, 44, 80, 116, 152].map((y) => (
              <line
                key={y}
                x1="8"
                y1={y}
                x2="512"
                y2={y}
                stroke="#e9eaf3"
                strokeDasharray="4 4"
              />
            ))}

            <polyline
              points="8,132 134,112 260,82 386,55 512,30"
              fill="none"
              stroke="#ed42bc"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <polyline
              points="8,143 134,135 260,121 386,110 512,96"
              fill="none"
              stroke="#ff535d"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <polyline
              points="8,151 134,148 260,143 386,139 512,132"
              fill="none"
              stroke="#4088f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {[
              [8, 132], [134, 112], [260, 82], [386, 55], [512, 30],
            ].map(([x, y], i) => (
              <circle key={`agency-${i}`} cx={x} cy={y} r="3" fill="#ed42bc" />
            ))}

            {[
              [8, 143], [134, 135], [260, 121], [386, 110], [512, 96],
            ].map(([x, y], i) => (
              <circle key={`creator-${i}`} cx={x} cy={y} r="3" fill="#ff535d" />
            ))}

            {[
              [8, 151], [134, 148], [260, 143], [386, 139], [512, 132],
            ].map(([x, y], i) => (
              <circle key={`marketing-${i}`} cx={x} cy={y} r="3" fill="#4088f7" />
            ))}
          </svg>
        </div>
      </div>

      <div className="creator-x-labels">
        <span>Aug 17</span>
        <span>Aug 24</span>
        <span>Aug 31</span>
        <span>Sep 7</span>
        <span>Sep 14</span>
      </div>
    </div>
  );
}


function UsageChart() {
  const items = [
    ["YouTube", 92], ["Instagram", 70], ["TikTok", 57],
    ["LinkedIn", 40], ["Others", 28]
  ];
  return (
    <div className="creator-usage">
      <div className="creator-usage-y"><span>150K</span><span>100K</span><span>50K</span><span>0</span></div>
      <div className="creator-bars">
        {items.map(([label, height]) => (
          <div className="creator-bar-item" key={label}>
            <div className="creator-bar-track"><div style={{ height: `${height}%` }} /></div>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        getProfile(), getUsers(), getAnalyticsOverview()
      ]);
      if (results[0].status === "fulfilled") setProfile(results[0].value);
      if (results[1].status === "fulfilled") {
        const d = results[1].value;
        setUsers(Array.isArray(d) ? d : d?.users || []);
      }
      if (results[2].status === "fulfilled") setAnalytics(results[2].value || {});
      if (results.every(r => r.status === "rejected")) {
        setError("Unable to connect to the backend. Showing demonstration data.");
      }
    } catch {
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const name = profile?.name || profile?.email?.split("@")[0] || "Administrator";
  const email = profile?.email || "admin@creatoriq.com";
  const displayUsers = users.length ? users : sampleUsers;
  const query = search.toLowerCase().trim();
  const visibleUsers = displayUsers.filter(u =>
    [u.name, u.email, u.role].filter(Boolean).join(" ").toLowerCase().includes(query)
  );

  const roleCounts = {};
  displayUsers.forEach(u => {
    const role = u.role || "User";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const total = Number(analytics.total_users ?? analytics.totalUsers ?? displayUsers.length);
  const active = Number(analytics.active_users ?? analytics.activeUsers ??
    displayUsers.filter(u => u.is_active).length);
  const inactive = Number(analytics.inactive_users ?? analytics.inactiveUsers ??
    displayUsers.filter(u => u.is_active === false).length);

  function go(item) {
    setPage(item);
    setSearch("");
    setError("");
    if (item === "Login") navigate("/login");
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  const nav = [
    ["Dashboard", "⌂"], ["User Management", "♙"],
    ["Content Monitoring", "◉"], ["Platform Integrations", "▤"],
    ["Analytics Overview", "▥"], ["Reports", "▧"],
    ["System Settings", "⚙"], ["Activity Logs", "◷"]
  ];

  return (
    <div className="ciq-layout creator-layout">
      <aside className="ciq-sidebar creator-sidebar">
        <button className="ciq-brand" onClick={() => go("Dashboard")}>
          <span className="ciq-brand-icon">C</span>
          <span className="ciq-brand-copy"><strong>CreatorIQ</strong><small>CREATOR INTELLIGENCE</small></span>
        </button>

        <div className="ciq-menu-label">WORKSPACE</div>
        <nav className="ciq-navigation">
          {nav.map(([item, icon]) => (
            <button key={item} onClick={() => go(item)}
              className={`ciq-nav-item ${page === item ? "active" : ""}`}>
              <span className="ciq-nav-icon">{icon}</span><span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="ciq-sidebar-bottom">
          <div className="ciq-sidebar-tip"><span className="ciq-tip-icon">✦</span>
            <strong>CreatorIQ insights</strong>
            <p>Keep track of your growing creator community.</p>
          </div>
          <button className="ciq-sidebar-profile" onClick={() => go("My Profile")}>
            <span className="ciq-avatar">{initials(name)}</span>
            <span className="ciq-user-info"><strong>{name}</strong><small>Administrator</small></span>
          </button>
          <button className="ciq-logout-button" onClick={logout}>↪ &nbsp; Log out</button>
        </div>
      </aside>

      <main className="ciq-main creator-main">
        <header className="ciq-topbar creator-topbar">
          <div className="ciq-breadcrumb"><span>Workspace</span><span>/</span><strong>{page}</strong></div>
          <label className="ciq-search-bar">
            <span className="ciq-search-icon">⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search dashboard, users, content..." />
            {search && <button onClick={() => setSearch("")} type="button">×</button>}
          </label>
          <button className="ciq-topbar-user" onClick={() => go("My Profile")}>
            <span className="ciq-live-dot" />
            <span className="ciq-topbar-profile-info"><strong>{name}</strong><span>Administrator</span></span>
            <span className="ciq-avatar">{initials(name)}</span>
          </button>
        </header>

        <div className="ciq-content creator-content">
          {error && <div className="ciq-alert">{error}</div>}

          {page === "Dashboard" && <>
            <section className="ciq-page-intro">
              <div><div className="ciq-eyebrow"><i /> ADMIN OVERVIEW</div>
                <h1>Good to see you, {name.split(/[ @]/)[0]} <span className="ciq-wave">✦</span></h1>
                <p>Here’s what’s happening across your CreatorIQ platform today.</p>
              </div>
              <button className="ciq-button ciq-button-secondary" onClick={loadData} disabled={loading}>
                {loading ? "Refreshing…" : "↻ Refresh data"}
              </button>
            </section>

            <section className="ciq-stat-grid">
              <StatCard icon="♙" label="Total Users" value={total} note="Registered platform accounts" color="violet" />
              <StatCard icon="✦" label="Creators" value={roleCounts.Creator || 0} note="Creator accounts" color="mint" />
              <StatCard icon="▣" label="Agencies" value={roleCounts.Agency || 0} note="Agency accounts" color="amber" />
              <StatCard icon="▤" label="Marketing Teams" value={roleCounts["Marketing Team"] || roleCounts["Marketing Teams"] || 0} note="Marketing accounts" color="blue" />
              <StatCard icon="✓" label="Active Users" value={active} note={`${total ? Math.round(active / total * 100) : 0}% active accounts`} color="mint" />
            </section>

            <section className="creator-charts-grid">
              <article className="ciq-panel">
                <div className="ciq-panel-heading"><div><h2>User Growth</h2><p>Creator, agency and marketing team growth.</p></div></div>
                <GrowthChart />
              </article>
              <article className="ciq-panel">
                <div className="ciq-panel-heading"><div><h2>Platform Usage</h2><p>Usage by social platform.</p></div></div>
                <UsageChart />
              </article>
            </section>

            <section className="creator-bottom-grid">
              <article className="ciq-panel">
                <div className="ciq-panel-heading"><div><h2>Recent Users</h2><p>Latest registered accounts.</p></div>
                  <button className="ciq-button ciq-button-primary" onClick={() => go("User Management")}>View All →</button>
                </div>
                <div className="ciq-table-scroll"><table className="ciq-users-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
                  <tbody>{visibleUsers.slice(0, 5).map((u, i) => <tr key={u.id ?? u.email ?? i}>
                    <td><strong>{u.name || "Unnamed"}</strong></td><td>{u.email || "—"}</td>
                    <td><span className="creator-role-pill" style={{ color: roleColors[u.role] || "#6d5ce8" }}>{u.role || "User"}</span></td>
                    <td>{dateText(u.created_at)}</td><td><span className={`ciq-user-status ${u.is_active ? "is-active" : "is-inactive"}`}><i />{u.is_active ? "Active" : "Inactive"}</span></td>
                  </tr>)}</tbody>
                </table></div>
                {!users.length && <p className="ciq-info-note">Demonstration rows shown. Connect your backend to display live users.</p>}
              </article>

              <article className="ciq-panel">
                <div className="ciq-panel-heading"><div><h2>System Activity</h2><p>Recent platform events.</p></div></div>
                <div className="creator-activity-list">
                  {[
                    ["✓", "New creator registered", "10 mins ago", "mint"],
                    ["▤", "Campaign created", "25 mins ago", "blue"],
                    ["♙", "User role updated", "1 hour ago", "amber"],
                    ["⚙", "Platform integration added", "2 hours ago", "violet"],
                    ["▣", "Report generated", "3 hours ago", "mint"]
                  ].map(([icon, title, time, color]) => <div className="creator-activity" key={title}>
                    <span className={`ciq-stat-icon ${color}`}>{icon}</span><div><strong>{title}</strong><small>{time}</small></div>
                  </div>)}
                </div>
                <p className="ciq-info-note">Sample activity until an activity-log API is connected.</p>
              </article>
            </section>
          </>}

          {page === "User Management" && <section className="ciq-panel">
            <div className="ciq-page-intro"><div><div className="ciq-eyebrow"><i /> USER DIRECTORY</div><h1>User Management</h1><p>Search and review registered accounts.</p></div><button className="ciq-button ciq-button-secondary" onClick={loadData}>↻ Refresh</button></div>
            <div className="ciq-result-count">{visibleUsers.length} matching users</div>
            <div className="ciq-table-scroll"><table className="ciq-users-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead><tbody>
              {visibleUsers.map((u, i) => <tr key={u.id ?? u.email ?? i}><td>{u.name || "Unnamed"}</td><td>{u.email || "—"}</td><td>{u.role || "User"}</td><td>{dateText(u.created_at)}</td><td>{u.is_active ? "Active" : "Inactive"}</td></tr>)}
            </tbody></table></div>
          </section>}

          {page === "Analytics Overview" && <><section className="ciq-page-intro"><div><div className="ciq-eyebrow"><i /> INSIGHTS</div><h1>Analytics Overview</h1><p>Platform accounts and role distribution.</p></div></section><section className="ciq-stat-grid"><StatCard icon="♙" label="Total Users" value={total} note="Registered accounts" color="violet" /><StatCard icon="✓" label="Active Users" value={active} note="Active accounts" color="mint" /><StatCard icon="◷" label="Inactive Users" value={inactive} note="Inactive accounts" color="amber" /><StatCard icon="▤" label="Roles Tracked" value={Object.keys(roleCounts).length} note="Account categories" color="blue" /></section><section className="ciq-panel"><h2>Users by Role</h2>{Object.entries(roleCounts).map(([r, n]) => <div className="ciq-role-chart-row" key={r}><div className="ciq-role-chart-label"><span>{r}</span><strong>{n}</strong></div><div className="ciq-progress-track"><div className="ciq-progress-fill" style={{ width: `${total ? n / total * 100 : 0}%` }} /></div></div>)}</section></>}

          {page === "My Profile" && <section className="ciq-panel"><div className="ciq-eyebrow"><i /> ACCOUNT</div><h1>My Profile</h1><div className="ciq-profile-hero"><span className="ciq-avatar ciq-profile-avatar">{initials(name)}</span><div><h2>{name}</h2><p>{email}</p><span className="ciq-role-badge">Administrator</span></div></div><div className="ciq-profile-details"><div><span>Name</span><strong>{name}</strong></div><div><span>Email</span><strong>{email}</strong></div><div><span>Role</span><strong>Administrator</strong></div></div><button className="ciq-button ciq-button-secondary" onClick={loadData}>Refresh profile</button></section>}

          {["Content Monitoring", "Platform Integrations", "Reports", "System Settings", "Activity Logs"].includes(page) && <section className="ciq-panel"><div className="ciq-eyebrow"><i /> WORKSPACE</div><h1>{page}</h1><p>This section is ready for integration with your backend services.</p><p className="ciq-info-note">The dashboard currently uses demonstration data for this section. No backend functionality has been added or changed here.</p></section>}

          <footer className="ciq-footer"><span>© {new Date().getFullYear()} CreatorIQ</span><span>Creator Intelligence ✦</span></footer>
        </div>
      </main>
    </div>
  );
}

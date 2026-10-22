
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, getUsers } from "./api";
import "./Dashboard.css";
import DashboardHeader from "./DashboardHeader";

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

const usageDataByRange = {
  "Last 7 Days": [
    ["YouTube", 42],
    ["Instagram", 34],
    ["TikTok", 28],
    ["LinkedIn", 21],
    ["Others", 15],
  ],
  "Last 30 Days": [
    ["YouTube", 92],
    ["Instagram", 70],
    ["TikTok", 57],
    ["LinkedIn", 40],
    ["Others", 28],
  ],
  "Last 90 Days": [
    ["YouTube", 100],
    ["Instagram", 86],
    ["TikTok", 74],
    ["LinkedIn", 55],
    ["Others", 39],
  ],
  "This Month": [
    ["YouTube", 72],
    ["Instagram", 61],
    ["TikTok", 48],
    ["LinkedIn", 36],
    ["Others", 24],
  ],
  "This Year": [
    ["YouTube", 100],
    ["Instagram", 84],
    ["TikTok", 69],
    ["LinkedIn", 53],
    ["Others", 37],
  ],
  "All Time": [
    ["YouTube", 100],
    ["Instagram", 92],
    ["TikTok", 81],
    ["LinkedIn", 68],
    ["Others", 51],
  ],
};

function initials(value = "") {
  return (
    String(value)
      .trim()
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0].toUpperCase())
      .join("") || "A"
  );
}

function dateText(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function getCreatedDate(user) {
  const value = user.created_at ?? user.createdAt ?? user.created_on;

  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getNormalizedRole(role) {
  const value = String(role || "User").trim().toLowerCase();

  if (value === "creator" || value === "creators") return "Creator";
  if (value === "agency" || value === "agencies") return "Agency";

  if (
    value === "marketing team" ||
    value === "marketing teams" ||
    value === "marketing"
  ) {
    return "Marketing Team";
  }

  if (value === "admin" || value === "administrator") return "Admin";

  return role || "User";
}

function isUserActive(user) {
  const value = user.is_active ?? user.isActive ?? user.active;

  return (
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true" ||
    String(value).toLowerCase() === "active"
  );
}

function getRangeStart(range, now = new Date(), users = []) {
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "Last 7 Days":
      start.setDate(start.getDate() - 6);
      return start;

    case "Last 30 Days":
      start.setDate(start.getDate() - 29);
      return start;

    case "Last 90 Days":
      start.setDate(start.getDate() - 89);
      return start;

    case "This Month":
      start.setDate(1);
      return start;

    case "This Year":
      start.setMonth(0, 1);
      return start;

    case "All Time": {
      const dates = users.map(getCreatedDate).filter(Boolean);

      if (dates.length === 0) {
        start.setDate(start.getDate() - 29);
        return start;
      }

      const earliest = new Date(Math.min(...dates.map((date) => date.getTime())));
      earliest.setHours(0, 0, 0, 0);
      return earliest;
    }

    default:
      start.setDate(start.getDate() - 29);
      return start;
  }
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

function GrowthChart({ users, dateRange }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(dateRange, now, users);
    const duration = Math.max(now.getTime() - start.getTime(), 1);

    const buckets = Array.from({ length: 5 }, (_, index) => {
      const date = new Date(
        start.getTime() + (duration * index) / 4
      );

      const counts = {
        Creator: 0,
        Agency: 0,
        "Marketing Team": 0,
      };

      users.forEach((user) => {
        const created = getCreatedDate(user);
        const role = getNormalizedRole(user.role);

        if (created && created <= date && counts[role] !== undefined) {
          counts[role] += 1;
        }
      });

      return {
        date,
        label: date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        ...counts,
      };
    });

    const maxCount = Math.max(
      1,
      ...buckets.flatMap((bucket) => [
        bucket.Creator,
        bucket.Agency,
        bucket["Marketing Team"],
      ])
    );

    const maxAxis = Math.max(4, Math.ceil(maxCount / 4) * 4);

    const xPositions = [8, 134, 260, 386, 512];

    const makePoints = (role) =>
      buckets
        .map((bucket, index) => {
          const x = xPositions[index];
          const y = 152 - (bucket[role] / maxAxis) * 144;
          return `${x},${y}`;
        })
        .join(" ");

    const makeCircles = (role) =>
      buckets.map((bucket, index) => ({
        x: xPositions[index],
        y: 152 - (bucket[role] / maxAxis) * 144,
        key: `${role}-${index}`,
      }));

    return {
      buckets,
      maxAxis,
      makePoints,
      makeCircles,
    };
  }, [users, dateRange]);

  const series = [
    { role: "Creator", color: "#ff535d", legend: "Creators" },
    { role: "Agency", color: "#ed42bc", legend: "Agencies" },
    { role: "Marketing Team", color: "#4088f7", legend: "Marketing Teams" },
  ];

  return (
    <div className="creator-growth">
      <div className="creator-chart-legend">
        {series.map((item) => (
          <span key={item.role}>
            <i style={{ background: item.color }} />
            {item.legend}
          </span>
        ))}
      </div>

      <div className="creator-chart-area">
        <div className="creator-y-labels">
          {[4, 3, 2, 1, 0].map((part) => (
            <span key={part}>
              {Math.round((chartData.maxAxis * part) / 4)}
            </span>
          ))}
        </div>

        <div className="creator-svg-wrapper">
          <svg
            viewBox="0 0 520 160"
            preserveAspectRatio="none"
            role="img"
            aria-label={`User growth for ${dateRange}`}
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

            {series.map((item) => (
              <g key={item.role}>
                <polyline
                  points={chartData.makePoints(item.role)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartData.makeCircles(item.role).map((point) => (
                  <circle
                    key={point.key}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={item.color}
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="creator-x-labels">
        {chartData.buckets.map((bucket, index) => (
          <span key={`${bucket.label}-${index}`}>{bucket.label}</span>
        ))}
      </div>

      <p className="ciq-info-note">
        User growth based on registration dates in the selected period.
      </p>
    </div>
  );
}

function UsageChart({ dateRange }) {
  const items = usageDataByRange[dateRange] || usageDataByRange["Last 30 Days"];

  return (
    <div className="creator-usage">
      <div className="creator-usage-y">
        <span>150K</span>
        <span>100K</span>
        <span>50K</span>
        <span>0</span>
      </div>

      <div className="creator-bars">
        {items.map(([label, height]) => (
          <div className="creator-bar-item" key={label}>
            <div className="creator-bar-track">
              <div
                style={{
                  height: `${height}%`,
                  transition: "height 0.3s ease",
                }}
                title={`${label}: demonstration usage for ${dateRange}`}
              />
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="ciq-info-note">
        Demonstration platform-usage values for {dateRange}. Connect a social
        platform analytics API to display real  metrics.
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      getProfile(),
      getUsers(),
    ]);

    if (results[0].status === "fulfilled") {
      setProfile(results[0].value);
    }

    if (results[1].status === "fulfilled") {
      const data = results[1].value;
      const fetchedUsers = Array.isArray(data)
        ? data
        : data?.users || [];

      setUsers(fetchedUsers);
    }

    if (results.every((result) => result.status === "rejected")) {
      setError(
        "Unable to connect to the backend. Showing demonstration data."
      );
    } else if (results[1].status === "rejected") {
      setError("Unable to load users. Please check your backend connection.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const name =
    profile?.name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Administrator";

  const email = profile?.email || "admin@creatoriq.com";

  const allUsers = users.length > 0 ? users : sampleUsers;

  const filteredByDateUsers = useMemo(() => {
    const now = new Date();
    const startDate = getRangeStart(dateRange, now, allUsers);

    return allUsers.filter((user) => {
      const createdAt = getCreatedDate(user);

      if (dateRange === "All Time") {
        return true;
      }

      if (!createdAt) {
        return false;
      }

      return createdAt >= startDate && createdAt <= now;
    });
  }, [allUsers, dateRange]);

  const displayUsers = filteredByDateUsers;

  const query = search.trim().toLowerCase();

  const visibleUsers = displayUsers.filter((user) =>
    [user.name, user.email, user.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)
  );

  const roleCounts = {};

  displayUsers.forEach((user) => {
    const role = getNormalizedRole(user.role);
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const total = displayUsers.length;

  const active = displayUsers.filter(isUserActive).length;
  const inactive = total - active;
  const activePercentage = total ? Math.round((active / total) * 100) : 0;

  function go(item) {
    if (item === "GPS Navigation") {
      setSearch("");
      setError("");
      navigate("/gps-navigator");
      return;
    }

    setPage(item);
    setSearch("");
    setError("");

    if (item === "Login") {
      navigate("/login");
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  const nav = [
    ["Dashboard", "⌂"],
    ["User Management", "♙"],
    ["Content Monitoring", "◉"],
    ["Platform Integrations", "▤"],
    ["Analytics Overview", "▥"],
    ["Reports", "▧"],
    ["GPS Navigation", "📍"],
    ["System Settings", "⚙"],
    ["Activity Logs", "◷"],
  ];

  return (
  <>
    <DashboardHeader
      title="Administrator Dashboard"
      subtitle="Manage users, monitor platform activity, and track analytics."
    />

    <div className="ciq-layout creator-layout">
      <aside className="ciq-sidebar creator-sidebar">
        <button
          type="button"
          className="ciq-brand"
          onClick={() => go("Dashboard")}
        >
          <span className="ciq-brand-icon">C</span>
          <span className="ciq-brand-copy">
            <strong>CreatorIQ</strong>
            <small>CREATOR INTELLIGENCE</small>
          </span>
        </button>

        <div className="ciq-menu-label">WORKSPACE</div>

        <nav className="ciq-navigation">
          {nav.map(([item, icon]) => (
            <button
              type="button"
              key={item}
              onClick={() => go(item)}
              className={`ciq-nav-item ${page === item ? "active" : ""}`}
            >
              <span className="ciq-nav-icon">{icon}</span>
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="ciq-sidebar-bottom">
          <div className="ciq-sidebar-tip">
            <span className="ciq-tip-icon">✦</span>
            <strong>CreatorIQ insights</strong>
            <p>Keep track of your growing creator community.</p>
          </div>

          <button
            type="button"
            className="ciq-sidebar-profile"
            onClick={() => go("My Profile")}
          >
            <span className="ciq-avatar">{initials(name)}</span>
            <span className="ciq-user-info">
              <strong>{name}</strong>
              <small>Administrator</small>
            </span>
          </button>

          <button
            type="button"
            className="ciq-logout-button"
            onClick={logout}
          >
            ↪ &nbsp; Log out
          </button>
        </div>
      </aside>

      <main className="ciq-main creator-main">
        <header className="ciq-topbar creator-topbar">
          <div className="ciq-breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{page}</strong>
          </div>

          <label className="ciq-search-bar">
            <span className="ciq-search-icon">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dashboard, users, content..."
              aria-label="Search users"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <div className="admin-topbar-right">
            <label className="admin-date-select">
              <span>▦</span>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                aria-label="Filter dashboard by date range"
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>This Month</option>
                <option>This Year</option>
                <option>All Time</option>
              </select>
            </label>

            <button
              type="button"
              className="ciq-topbar-user"
              onClick={() => go("My Profile")}
            >
              <span className="ciq-live-dot" />
              <span className="ciq-topbar-profile-info">
                <strong>{name}</strong>
                <span>Administrator</span>
              </span>
              <span className="ciq-avatar">{initials(name)}</span>
            </button>
          </div>
        </header>

        <div className="ciq-content creator-content">
          {error && <div className="ciq-alert">{error}</div>}

          {page === "Dashboard" && (
            <>
              <section className="ciq-page-intro">
                <div>
                  <div className="ciq-eyebrow">
                    <i /> ADMIN OVERVIEW
                  </div>
                  <h1>
                    Good to see you, {name.split(/[ @]/)[0]}{" "}
                    <span className="ciq-wave">✦</span>
                  </h1>
                  <p>
                    Here’s what’s happening across your CreatorIQ platform
                    today.
                  </p>
                  <p className="ciq-info-note">
                    Showing users for: <strong>{dateRange}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  className="ciq-button ciq-button-secondary"
                  onClick={loadData}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "↻ Refresh data"}
                </button>
              </section>

              <section className="ciq-stat-grid">
                <StatCard
                  icon="♙"
                  label="Total Users"
                  value={total}
                  note={`${dateRange} registrations`}
                  color="violet"
                />

                <StatCard
                  icon="✦"
                  label="Creators"
                  value={roleCounts.Creator || 0}
                  note="Creator accounts in period"
                  color="mint"
                />

                <StatCard
                  icon="▣"
                  label="Agencies"
                  value={roleCounts.Agency || 0}
                  note="Agency accounts in period"
                  color="amber"
                />

                <StatCard
                  icon="▤"
                  label="Marketing Teams"
                  value={roleCounts["Marketing Team"] || 0}
                  note="Marketing accounts in period"
                  color="blue"
                />

                <StatCard
                  icon="✓"
                  label="Active Users"
                  value={active}
                  note={`${activePercentage}% active accounts`}
                  color="mint"
                />
              </section>

              <section className="creator-charts-grid">
                <article className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h2>User Growth</h2>
                      <p>Registration growth for {dateRange}.</p>
                    </div>
                  </div>

                  <GrowthChart
                    users={displayUsers}
                    dateRange={dateRange}
                  />
                </article>

                <article className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h2>Platform Usage</h2>
                      <p>Platform usage for {dateRange}.</p>
                    </div>
                  </div>

                  <UsageChart dateRange={dateRange} />
                </article>
              </section>

              <section className="creator-bottom-grid">
                <article className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h2>Recent Users</h2>
                      <p>Users registered during {dateRange}.</p>
                    </div>

                    <button
                      type="button"
                      className="ciq-button ciq-button-primary"
                      onClick={() => go("User Management")}
                    >
                      View All →
                    </button>
                  </div>

                  <div className="ciq-table-scroll">
                    <table className="ciq-users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Joined</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleUsers.slice(0, 5).map((user, index) => {
                          const userActive = isUserActive(user);

                          return (
                            <tr key={user.id ?? user.email ?? index}>
                              <td>
                                <strong>{user.name || "Unnamed"}</strong>
                              </td>
                              <td>{user.email || "—"}</td>
                              <td>
                                <span
                                  className="creator-role-pill"
                                  style={{
                                    color:
                                      roleColors[getNormalizedRole(user.role)] ||
                                      "#6d5ce8",
                                  }}
                                >
                                  {getNormalizedRole(user.role)}
                                </span>
                              </td>
                              <td>
                                {dateText(user.created_at ?? user.createdAt)}
                              </td>
                              <td>
                                <span
                                  className={`ciq-user-status ${
                                    userActive ? "is-active" : "is-inactive"
                                  }`}
                                >
                                  <i />
                                  {userActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {visibleUsers.length === 0 && (
                    <p className="ciq-info-note">
                      No users match this date range and search. Try another
                      date range or clear the search.
                    </p>
                  )}

                  {users.length === 0 && (
                    <p className="ciq-info-note">
                      Demonstration rows shown. Connect your backend to display
                      live users.
                    </p>
                  )}
                </article>

                <article className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h2>System Activity</h2>
                      <p>Recent platform events.</p>
                    </div>
                  </div>

                  <div className="creator-activity-list">
                    {[
                      ["✓", "New creator registered", "10 mins ago", "mint"],
                      ["▤", "Campaign created", "25 mins ago", "blue"],
                      ["♙", "User role updated", "1 hour ago", "amber"],
                      ["⚙", "Platform integration added", "2 hours ago", "violet"],
                      ["▣", "Report generated", "3 hours ago", "mint"],
                    ].map(([icon, title, time, color]) => (
                      <div className="creator-activity" key={title}>
                        <span className={`ciq-stat-icon ${color}`}>{icon}</span>
                        <div>
                          <strong>{title}</strong>
                          <small>{time}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="ciq-info-note">
                    Sample activity until an activity-log API is connected.
                  </p>
                </article>
              </section>
            </>
          )}

          {page === "User Management" && (
            <section className="ciq-panel">
              <div className="ciq-page-intro">
                <div>
                  <div className="ciq-eyebrow">
                    <i /> USER DIRECTORY
                  </div>
                  <h1>User Management</h1>
                  <p>Search and review registered accounts.</p>
                </div>

                <button
                  type="button"
                  className="ciq-button ciq-button-secondary"
                  onClick={loadData}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>

              <div className="ciq-result-count">
                {visibleUsers.length} matching users · {dateRange}
              </div>

              <div className="ciq-table-scroll">
                <table className="ciq-users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleUsers.map((user, index) => (
                      <tr key={user.id ?? user.email ?? index}>
                        <td>{user.name || "Unnamed"}</td>
                        <td>{user.email || "—"}</td>
                        <td>{getNormalizedRole(user.role)}</td>
                        <td>
                          {dateText(user.created_at ?? user.createdAt)}
                        </td>
                        <td>
                          {isUserActive(user) ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {visibleUsers.length === 0 && (
                <p className="ciq-info-note">
                  No users found for this date range. Try a longer period.
                </p>
              )}
            </section>
          )}

          {page === "Analytics Overview" && (
            <>
              <section className="ciq-page-intro">
                <div>
                  <div className="ciq-eyebrow">
                    <i /> INSIGHTS
                  </div>
                  <h1>Analytics Overview</h1>
                  <p>Platform accounts and role distribution.</p>
                  <p className="ciq-info-note">
                    Selected period: <strong>{dateRange}</strong>
                  </p>
                </div>
              </section>

              <section className="ciq-stat-grid">
                <StatCard
                  icon="♙"
                  label="Total Users"
                  value={total}
                  note={`${dateRange} registrations`}
                  color="violet"
                />

                <StatCard
                  icon="✓"
                  label="Active Users"
                  value={active}
                  note={`${activePercentage}% active accounts`}
                  color="mint"
                />

                <StatCard
                  icon="◷"
                  label="Inactive Users"
                  value={inactive}
                  note="Inactive accounts in period"
                  color="amber"
                />

                <StatCard
                  icon="▤"
                  label="Roles Tracked"
                  value={Object.keys(roleCounts).length}
                  note="Account categories"
                  color="blue"
                />
              </section>

              <section className="ciq-panel">
                <h2>Users by Role</h2>

                {Object.entries(roleCounts).map(([role, count]) => (
                  <div className="ciq-role-chart-row" key={role}>
                    <div className="ciq-role-chart-label">
                      <span>{role}</span>
                      <strong>{count}</strong>
                    </div>

                    <div className="ciq-progress-track">
                      <div
                        className="ciq-progress-fill"
                        style={{
                          width: `${total ? (count / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

          {page === "My Profile" && (
            <section className="ciq-panel">
              <div className="ciq-eyebrow">
                <i /> ACCOUNT
              </div>
              <h1>My Profile</h1>

              <div className="ciq-profile-hero">
                <span className="ciq-avatar ciq-profile-avatar">
                  {initials(name)}
                </span>
                <div>
                  <h2>{name}</h2>
                  <p>{email}</p>
                  <span className="ciq-role-badge">Administrator</span>
                </div>
              </div>

              <div className="ciq-profile-details">
                <div>
                  <span>Name</span>
                  <strong>{name}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{email}</strong>
                </div>
                <div>
                  <span>Role</span>
                  <strong>Administrator</strong>
                </div>
              </div>

              <button
                type="button"
                className="ciq-button ciq-button-secondary"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh profile"}
              </button>
            </section>
          )}

          {[
            "Content Monitoring",
            "Platform Integrations",
            "Reports",
            "System Settings",
            "Activity Logs",
          ].includes(page) && (
            <section className="ciq-panel">
              <div className="ciq-eyebrow">
                <i /> WORKSPACE
              </div>
              <h1>{page}</h1>
              <p>
                This section is ready for integration with your backend
                services.
              </p>
              <p className="ciq-info-note">
                This section currently uses demonstration content. Its backend
                functionality has not been implemented here.
              </p>
            </section>
          )}

          <footer className="ciq-footer">
            <span>© {new Date().getFullYear()} CreatorIQ</span>
            <span>Creator Intelligence ✦</span>
          </footer>
        </div>
      </main>
        </div>
  </>
  );
}
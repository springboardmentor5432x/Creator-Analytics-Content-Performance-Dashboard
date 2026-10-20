
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./Dashboard.css";

const API_URL = "http://127.0.0.1:8000";

const weeklyData = [
  { day: "Mon", reach: 4200, engagement: 320 },
  { day: "Tue", reach: 6100, engagement: 460 },
  { day: "Wed", reach: 5100, engagement: 390 },
  { day: "Thu", reach: 7600, engagement: 580 },
  { day: "Fri", reach: 5800, engagement: 440 },
  { day: "Sat", reach: 8900, engagement: 710 },
  { day: "Sun", reach: 7100, engagement: 620 },
];

const platformData = [
  { name: "Instagram", value: 45 },
  { name: "YouTube", value: 30 },
  { name: "TikTok", value: 25 },
];

const platformColors = ["#963cff", "#4d8dff", "#24c8b5"];

const samplePosts = [
  {
    title: "Your latest post",
    platform: "Instagram",
    reach: "—",
    engagement: "—",
    status: "Awaiting data",
  },
  {
    title: "Recent video",
    platform: "YouTube",
    reach: "—",
    engagement: "—",
    status: "Awaiting data",
  },
  {
    title: "Community update",
    platform: "TikTok",
    reach: "—",
    engagement: "—",
    status: "Awaiting data",
  },
];

const menuItems = [
  { label: "Overview", icon: "◫" },
  { label: "My Profile", icon: "◎" },
  { label: "Content Analytics", icon: "▥" },
  { label: "Audience", icon: "♧" },
  { label: "Reports", icon: "▤" },
  { label: "Settings", icon: "⚙" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [page, setPage] = useState("Overview");
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("ciq_notifications") !== "false"
  );

  const [weeklySummary, setWeeklySummary] = useState(
    () => localStorage.getItem("ciq_weekly_summary") !== "false"
  );

  const [appearance, setAppearance] = useState(
    () => localStorage.getItem("ciq_appearance") || "Dark"
  );

  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load your profile.");
        }

        const data = await response.json();

        if (!cancelled) {
          setProfile(data);
          setProfileError("");
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(
            error.message || "Unable to connect to the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  function saveSettings() {
    localStorage.setItem("ciq_notifications", String(notifications));
    localStorage.setItem("ciq_weekly_summary", String(weeklySummary));
    localStorage.setItem("ciq_appearance", appearance);

    setSettingsMessage("Your preferences have been saved successfully.");
  }

  function renderOverview() {
    return (
      <>
        <div className="welcome-banner">
          <div>
            <span className="eyebrow">
              YOUR PERFORMANCE, AT A GLANCE
            </span>
            <h2>Welcome to CreatorIQ!</h2>
            <p>
              Explore your content performance and manage your creator
              workspace from one place.
            </p>
          </div>

          <div className="banner-sparkle">✦</div>
        </div>

        <div className="metrics-grid">
          <MetricCard
            icon="◉"
            label="Total Reach"
            value="24,850"
            note="Demo data"
            color="purple"
          />
          <MetricCard
            icon="♡"
            label="Engagement Rate"
            value="6.8%"
            note="Demo data"
            color="blue"
          />
          <MetricCard
            icon="▤"
            label="Published Content"
            value="128"
            note="Demo data"
            color="orange"
          />
          <MetricCard
            icon="↗"
            label="Audience Growth"
            value="12.4%"
            note="Demo data"
            color="green"
          />
        </div>

        <section className="dark-panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Performance Summary</h2>
              <p className="panel-description">
                Sample weekly performance. Connect analytics sources to
                replace demo values.
              </p>
            </div>
            <span className="demo-badge">Demo data</span>
          </div>

          <div className="chart-container overview-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid
                  stroke="#252b40"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="#8791aa"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8791aa"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151a2c",
                    border: "1px solid #343951",
                    borderRadius: 10,
                    color: "#ffffff",
                  }}
                />
                <Bar
                  dataKey="reach"
                  name="Reach"
                  fill="#8b5cf6"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dark-panel">
          <div className="panel-heading">
            <div>
              <h2>Quick access</h2>
              <p className="panel-description">
                Continue managing your creator workspace.
              </p>
            </div>
          </div>

          <div className="quick-links">
            <QuickLink
              icon="▥"
              title="Content Analytics"
              description="Review content performance"
              onClick={() => setPage("Content Analytics")}
            />
            <QuickLink
              icon="♧"
              title="Audience"
              description="Explore audience insights"
              onClick={() => setPage("Audience")}
            />
            <QuickLink
              icon="⚙"
              title="Settings"
              description="Customize your workspace"
              onClick={() => setPage("Settings")}
            />
          </div>
        </section>
      </>
    );
  }

  function renderProfile() {
    return (
      <section className="dark-panel profile-panel">
        <div className="profile-cover">
          <div className="profile-avatar">
            {(profile?.name || profile?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>
        </div>

        <div className="profile-details">
          <span className="eyebrow">ACCOUNT INFORMATION</span>

          <h2>
            {loadingProfile
              ? "Loading profile..."
              : profile?.name || "Creator"}
          </h2>

          <p className="panel-description">
            Your CreatorIQ account details.
          </p>

          {profileError && (
            <div className="error-message">{profileError}</div>
          )}

          <div className="profile-info-grid">
            <InfoItem
              label="Full name"
              value={profile?.name || "—"}
            />
            <InfoItem
              label="Email address"
              value={profile?.email || "—"}
            />
            <InfoItem
              label="Account role"
              value={profile?.role || "—"}
            />
            <InfoItem
              label="Account status"
              value={profile ? "Active" : "—"}
            />
          </div>

          <button
            type="button"
            className="outline-button"
            onClick={logout}
          >
            Sign out of CreatorIQ
          </button>
        </div>
      </section>
    );
  }

  function renderContentAnalytics() {
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">
            CREATOR WORKSPACE / CONTENT ANALYTICS
          </span>
          <h2>Content Analytics</h2>
          <p>
            Your content, audience, and growth — all in one place.
          </p>
        </div>

        <div className="metrics-grid analytics-metrics">
          <MetricCard
            label="Posts published"
            value="—"
            note="Across connected channels"
            color="purple"
          />
          <MetricCard
            label="Average engagement"
            value="—"
            note="Likes, comments and shares"
            color="blue"
          />
          <MetricCard
            label="Top content format"
            value="Reels / Short video"
            note="Sample insight — connect data"
            color="orange"
          />
        </div>

        <section className="dark-panel">
          <div className="panel-heading">
            <div>
              <h2>Content performance</h2>
              <p className="panel-description">
                Compare content across your channels.
              </p>
            </div>
            <span className="demo-badge">Sample layout</span>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Content item</th>
                  <th>Platform</th>
                  <th>Reach</th>
                  <th>Engagement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {samplePosts.map((post) => (
                  <tr key={post.title}>
                    <td>{post.title}</td>
                    <td>{post.platform}</td>
                    <td>{post.reach}</td>
                    <td>{post.engagement}</td>
                    <td>
                      <span className="status-badge">
                        {post.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="table-note">
            Post-level values are unavailable because no social analytics
            source is connected.
          </p>
        </section>

        <div className="two-column-grid">
          <section className="dark-panel">
            <h3>What you can analyze</h3>
            <ul className="feature-list">
              <li>Reach and impressions per post</li>
              <li>Likes, comments, and shares</li>
              <li>Performance by platform</li>
              <li>Content growth over time</li>
            </ul>
          </section>

          <section className="dark-panel">
            <h3>Next step</h3>
            <p className="panel-description">
              Connect a social account and import post metrics to replace
              these sample values with real analytics.
            </p>
            <button
              type="button"
              className="purple-button"
              onClick={() => setPage("Settings")}
            >
              Open Settings <span>→</span>
            </button>
          </section>
        </div>
      </>
    );
  }

  function renderAudience() {
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">
            CREATOR WORKSPACE / AUDIENCE
          </span>
          <h2>Audience Insights</h2>
          <p>
            Understand your audience and discover growth opportunities.
          </p>
        </div>

        <div className="metrics-grid">
          <MetricCard
            label="Total audience"
            value="24,850"
            note="Illustrative demo value"
            color="purple"
          />
          <MetricCard
            label="Weekly growth"
            value="12.4%"
            note="Illustrative demo value"
            color="green"
          />
          <MetricCard
            label="Top platform"
            value="Instagram"
            note="Sample insight"
            color="blue"
          />
        </div>

        <div className="two-column-grid">
          <section className="dark-panel">
            <div className="panel-heading">
              <div>
                <h2>Audience by platform</h2>
                <p className="panel-description">
                  Illustrative distribution
                </p>
              </div>
            </div>

            <div className="chart-container pie-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {platformData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={platformColors[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#151a2c",
                      border: "1px solid #343951",
                      borderRadius: 10,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dark-panel">
            <h2>Audience growth</h2>
            <p className="panel-description">
              Sample weekly growth trend.
            </p>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid
                    stroke="#252b40"
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="day" stroke="#8791aa" />
                  <YAxis stroke="#8791aa" />
                  <Tooltip
                    contentStyle={{
                      background: "#151a2c",
                      border: "1px solid #343951",
                      borderRadius: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reach"
                    name="Audience reach"
                    stroke="#a879ff"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <p className="table-note">
          These figures are sample data, not live social media audience
          information.
        </p>
      </>
    );
  }

  function renderReports() {
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">
            CREATOR WORKSPACE / REPORTS
          </span>
          <h2>Performance Reports</h2>
          <p>
            Review key metrics and your weekly performance summary.
          </p>
        </div>

        <section className="dark-panel">
          <div className="panel-heading">
            <div>
              <h2>Weekly reach report</h2>
              <p className="panel-description">
                Sample data for the last seven days.
              </p>
            </div>
            <span className="demo-badge">Demo data</span>
          </div>

          <div className="chart-container report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid
                  stroke="#252b40"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="day" stroke="#8791aa" />
                <YAxis stroke="#8791aa" />
                <Tooltip
                  contentStyle={{
                    background: "#151a2c",
                    border: "1px solid #343951",
                    borderRadius: 10,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reach"
                  stroke="#9b6cff"
                  strokeWidth={3}
                  name="Reach"
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#45c7d5"
                  strokeWidth={3}
                  name="Engagement"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dark-panel">
          <h2>Weekly data table</h2>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Reach</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((item) => (
                  <tr key={item.day}>
                    <td>{item.day}</td>
                    <td>{item.reach.toLocaleString()}</td>
                    <td>{item.engagement.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="table-note">
            Report figures are examples. Live reporting requires connected
            analytics data.
          </p>
        </section>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">
            CREATOR WORKSPACE / SETTINGS
          </span>
          <h2>Settings</h2>
          <p>
            Manage your preferences and account information.
          </p>
        </div>

        <section className="dark-panel settings-panel">
          <div className="settings-intro">
            <div className="settings-icon">⚙</div>
            <div>
              <h2>Workspace preferences</h2>
              <p className="panel-description">
                Personalize your CreatorIQ experience.
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h3>Appearance</h3>
            <p className="panel-description">
              Select the color theme for your workspace.
            </p>

            <label className="settings-field">
              <span>
                <strong>Dashboard theme</strong>
                <small>
                  Choose your preferred appearance.
                </small>
              </span>

              <select
                className="dark-select"
                value={appearance}
                onChange={(event) => {
                  setAppearance(event.target.value);
                  setSettingsMessage("");
                }}
              >
                <option value="Dark">Dark</option>
                <option value="Midnight Purple">
                  Midnight Purple
                </option>
              </select>
            </label>
          </div>

          <div className="settings-section">
            <h3>Notifications</h3>
            <p className="panel-description">
              Configure your notification preferences.
            </p>

            <label className="settings-toggle">
              <span>
                <strong>Enable notifications</strong>
                <small>
                  Save your general notification preference.
                </small>
              </span>

              <input
                type="checkbox"
                checked={notifications}
                onChange={(event) => {
                  setNotifications(event.target.checked);
                  setSettingsMessage("");
                }}
              />

              <span className="toggle-track" />
            </label>

            <label className="settings-toggle">
              <span>
                <strong>Weekly performance summary</strong>
                <small>
                  Save your weekly summary preference.
                </small>
              </span>

              <input
                type="checkbox"
                checked={weeklySummary}
                onChange={(event) => {
                  setWeeklySummary(event.target.checked);
                  setSettingsMessage("");
                }}
              />

              <span className="toggle-track" />
            </label>
          </div>

          {/* Updated Account Information section */}
          <div className="settings-section">
            <h3>Account information</h3>

            <p className="panel-description">
              Details retrieved from your CreatorIQ profile.
            </p>

            {loadingProfile ? (
              <p className="panel-description">
                Loading account...
              </p>
            ) : profile ? (
              <div className="settings-account">
                <div className="settings-account-avatar">
                  {(profile.name || profile.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="settings-account-info">
                  <strong>{profile.name || "—"}</strong>

                  <p>{profile.email || "—"}</p>

                  <small>
                    Role: {profile.role || "—"}
                  </small>
                </div>

                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setPage("My Profile")}
                >
                  View Profile
                </button>
              </div>
            ) : (
              <p className="error-message">
                {profileError ||
                  "Account information is unavailable."}
              </p>
            )}
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="purple-button"
              onClick={saveSettings}
            >
              Save Preferences <span>→</span>
            </button>

            {settingsMessage && (
              <p className="settings-success" role="status">
                ✓ {settingsMessage}
              </p>
            )}
          </div>
        </section>
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case "Overview":
        return renderOverview();
      case "My Profile":
        return renderProfile();
      case "Content Analytics":
        return renderContentAnalytics();
      case "Audience":
        return renderAudience();
      case "Reports":
        return renderReports();
      case "Settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  }

  const pageDescriptions = {
    Overview: "Your creator workspace at a glance.",
    "My Profile": "Manage your account details.",
    "Content Analytics": "Analyze content performance.",
    Audience: "Explore your audience insights.",
    Reports: "Review performance reports.",
    Settings: "Customize your workspace.",
  };

  return (
    <div
      className={`creator-app ${
        appearance === "Midnight Purple"
          ? "theme-midnight-purple"
          : ""
      }`}
    >
      <aside className="creator-sidebar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <h1>CREATOR IQ</h1>
            <p>Creator workspace</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="creator-nav">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`creator-nav-item ${
                page === item.label ? "selected" : ""
              }`}
              onClick={() => {
                setPage(item.label);
                setSettingsMessage("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-promo">
          <strong>Grow with insights</strong>
          <p>
            Complete your profile, then connect social platforms to unlock
            real analytics.
          </p>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
        >
          <span>↪</span> Sign out
        </button>
      </aside>

      <main className="creator-main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Creator workspace / {page}
            </p>
            <span className="topbar-subtitle">
              {pageDescriptions[page]}
            </span>
          </div>

          <button
            type="button"
            className="topbar-avatar"
            title="Open My Profile"
            onClick={() => setPage("My Profile")}
          >
            {(profile?.name || profile?.email || "C")
              .charAt(0)
              .toUpperCase()}
          </button>
        </header>

        <div className="page-content">{renderPage()}</div>

        <footer className="creator-footer">
          CreatorIQ · Social Media Performance & Creator Growth Analytics
        </footer>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  color = "purple",
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${color}`}>{icon}</div>
      <p className="metric-label">{label}</p>
      <h3 className="metric-value">{value}</h3>
      <p className="metric-note">{note}</p>
    </article>
  );
}

function QuickLink({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      className="quick-link"
      onClick={onClick}
    >
      <span className="quick-link-icon">{icon}</span>
      <span className="quick-link-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="quick-link-arrow">→</span>
    </button>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="profile-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}



import CreatorCharts from "./CreatorCharts";
import AgencyDashboard from "./AgencyDashboard";
import MarketingDashboard from "./MarketingDashboard";
import AdminDashboard from "./AdminDashboard";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  getUsers,
  getAnalyticsOverview,
} from "./api";
import "./Dashboard.css";

const CREATOR_PAGES = [
  ["Dashboard", "▦"],
  ["My Profile", "♙"],
  ["Content Performance", "▥"],
  ["Audience", "♧"],
  ["Analytics", "↗"],
  ["Reports", "▤"],
];

const ACCOUNT_PAGES = [
  ["Notifications", "♧"],
  ["Settings", "⚙"],
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";

    return "Good Evening";
  };

  const displayName =
    profile?.name || profile?.email || "CreatorIQ User";
  const email = profile?.email || "";
  const role = profile?.role || "User";

  const avatarLetter =
    String(displayName).trim().charAt(0).toUpperCase() || "U";

  const normalizedRole = String(role).trim().toLowerCase();
  const isAdministrator = normalizedRole === "administrator";
  const isCreator = normalizedRole === "creator";
  const isAgency = normalizedRole === "agency";
  const isMarketingTeam =
  normalizedRole === "marketing team" ||
  normalizedRole === "marketing agent";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await getProfile();

        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isAdministrator) {
      setError("Administrator access is required to view all users.");
      return;
    }

    setUsersLoading(true);
    setError("");

    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setUsersLoaded(true);
    } catch (err) {
      setError(err.message || "Unable to load registered users.");
    } finally {
      setUsersLoading(false);
    }
  }, [isAdministrator]);

  const loadAnalytics = useCallback(async () => {
    if (!isAdministrator) {
      setError("Administrator access is required for platform analytics.");
      return;
    }

    setAnalyticsLoading(true);
    setError("");

    try {
      const data = await getAnalyticsOverview();
      setAnalytics(data);
      setAnalyticsLoaded(true);
    } catch (err) {
      setError(err.message || "Unable to load platform analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAdministrator]);

  function handleNavigation(page) {
    setActivePage(page);
    setError("");
    setSearchQuery("");

    if (page === "Users" && isAdministrator) {
      loadUsers();
    }

    if (page === "Analytics" && isAdministrator) {
      loadAnalytics();
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  const roleDashboard = isCreator
    ? {
        title: "Creator Dashboard",
        description: "Understand your content and grow your audience.",
      }
    : isAgency
    ? {
        title: "Agency Dashboard",
        description: "Manage creators and monitor campaign performance.",
      }
    : isMarketingTeam
    ? {
        title: "Marketing Dashboard",
        description: "Track campaigns, reach, engagement, and ROI.",
      }
    : {
        title: "Administrator Dashboard",
        description: "Monitor accounts and manage CreatorIQ.",
      };

  const analyticsItems = isCreator
    ? [
        ["Content performance", "Review views, likes, comments and shares."],
        ["Audience growth", "Explore follower growth over time."],
        ["Engagement", "Understand interactions with your content."],
      ]
    : isAgency
    ? [
        ["Creator management", "Organize managed creators."],
        ["Campaign comparison", "Compare creator results."],
        ["Performance reports", "Review campaign outcomes."],
      ]
    : isMarketingTeam
    ? [
        ["Campaign tracking", "Monitor campaign progress."],
        ["Reach and engagement", "Review audience interactions."],
        ["Spending and ROI", "Track budgets and returns."],
      ]
    : [
        ["User management", "Review registered accounts."],
        ["Access control", "Review assigned roles."],
        ["Platform overview", "Review account activity."],
      ];

  const usersByRole = analytics?.users_by_role || {};
  const query = searchQuery.trim().toLowerCase();

  function matchesSearch(...values) {
    if (!query) return true;

    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function renderPageTitle(title, description) {
    return (
      <>
        <h3>{title}</h3>
        <p className="ciq-muted">{description}</p>
      </>
    );
  }

  function renderProfileDetails() {
    return (
      <div className="ciq-profile-details">
        <div>
          <span>Full name</span>
          <strong>{profile?.name || "Not provided"}</strong>
        </div>
        <div>
          <span>Email address</span>
          <strong>{email || "Not provided"}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>{role}</strong>
        </div>
      </div>
    );
  }

  function renderNavigationItem([page, symbol]) {
    return (
      <button
        key={page}
        type="button"
        className={`ciq-nav-item ${
          activePage === page ? "active" : ""
        }`}
        onClick={() => handleNavigation(page)}
      >
        <span aria-hidden="true">{symbol}</span>
        <span>{page}</span>
      </button>
    );
  }


  // IMPORTANT: Render the correct dashboard for each role.
  // Keep this before the main dashboard return statement.

  if (isAdministrator) {
    return <AdminDashboard />;
  }

  if (isAgency) {
    return <AgencyDashboard profile={profile} />;
  }

  if (isMarketingTeam) {
    return <MarketingDashboard profile={profile} />;
  }

  return (
    <div className="ciq-layout">

      <aside className="ciq-sidebar">
        <div className="ciq-brand">
          <div className="ciq-brand-icon">C</div>
          <div>
            <strong>CreatorIQ</strong>
            <span>CREATOR ANALYTICS</span>
          </div>
        </div>

        <nav className="ciq-navigation" aria-label="Main navigation">
          <div className="ciq-menu-label">WORKSPACE</div>

          {CREATOR_PAGES.map(renderNavigationItem)}

          {isAdministrator &&
            renderNavigationItem(["Users", "♙"])}

          {ACCOUNT_PAGES.map(renderNavigationItem)}
        </nav>

        <div className="ciq-sidebar-bottom">
          <button
            type="button"
            className="ciq-sidebar-profile"
            onClick={() => handleNavigation("My Profile")}
            title="View my profile"
          >
            <div className="ciq-avatar">{avatarLetter}</div>
            <div className="ciq-user-info">
              <strong>{displayName}</strong>
              <span>{role}</span>
            </div>
          </button>

          <button
            type="button"
            className="ciq-nav-item ciq-logout-button"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="ciq-main">
        <header className="ciq-topbar">
          <div className="ciq-search-bar">
            <span className="ciq-search-icon" aria-hidden="true">
              ⌕
            </span>

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search dashboard..."
              aria-label="Search dashboard content"
            />

            {searchQuery && (
              <button
                type="button"
                className="ciq-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="ciq-topbar-user">
            <div className="ciq-status-dot" />

            <div className="ciq-topbar-profile-info">
              <strong>
                {profileLoading ? "Loading..." : displayName}
              </strong>
              <span>{role}</span>
            </div>

            <button
              type="button"
              className="ciq-avatar ciq-topbar-profile-button"
              onClick={() => handleNavigation("My Profile")}
              title="View my profile"
              aria-label="Open my profile"
            >
              {avatarLetter}
            </button>
          </div>
        </header>

        <div className="ciq-content">
          {error && (
            <div className="ciq-alert" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Dashboard */}
          {activePage === "Dashboard" && (
            <>
              {matchesSearch(
                getGreeting(),
                displayName,
                roleDashboard.title,
                roleDashboard.description
              ) && (
                <section className="ciq-welcome">
                  <div>
                    <span className="ciq-eyebrow">YOUR WORKSPACE</span>
                    <h2>
                      {getGreeting()}, {displayName}!
                    </h2>
                    <p>Welcome to your CreatorIQ dashboard.</p>
                    <p>{roleDashboard.description}</p>
                    <p className="ciq-muted">
                      Workspace: {roleDashboard.title}
                    </p>
                  </div>
                  <div className="ciq-welcome-mark">C</div>
                </section>
              )}

              {(!query ||
                matchesSearch(
                  "Creator Analytics",
                  "Follower Growth",
                  "Content Performance",
                  "Audience by Platform",
                  "Engagement Breakdown",
                  "Recent Content Performance",
                  "followers views audience engagement likes comments shares"
                )) && <CreatorCharts />}

              {/* Administrator users by role */}
              {isAdministrator &&
                matchesSearch("Users by role") && (
                  <section className="ciq-panel">
                    <div className="ciq-panel-heading">
                      <div>
                        <h3>Users by role</h3>
                        <p>Live counts returned by the analytics API.</p>
                      </div>

                      <button
                        type="button"
                        className="ciq-primary-button"
                        onClick={loadAnalytics}
                        disabled={analyticsLoading}
                      >
                        {analyticsLoading ? "Loading…" : "↻ Refresh"}
                      </button>
                    </div>

                    {!analyticsLoaded && !analyticsLoading && (
                      <div className="ciq-empty">
                        <p>Load your current database statistics.</p>
                        <button
                          type="button"
                          className="ciq-primary-button"
                          onClick={loadAnalytics}
                        >
                          Load analytics
                        </button>
                      </div>
                    )}

                    {analyticsLoading && (
                      <div className="ciq-empty">
                        Loading analytics from the backend…
                      </div>
                    )}

                    {analyticsLoaded && (
                      <section className="ciq-stat-grid">
                        {[
                          "Creator",
                          "Agency",
                          "Marketing Team",
                          "Administrator",
                        ]
                          .filter((roleName) =>
                            matchesSearch(roleName, "Registered accounts")
                          )
                          .map((roleName, index) => (
                            <article
                              className="ciq-stat-card"
                              key={roleName}
                            >
                              <div className="ciq-stat-top">
                                <span>{roleName}</span>
                                <span
                                  className={`ciq-stat-icon ${
                                    ["purple", "blue", "green"][index % 3]
                                  }`}
                                >
                                  ♙
                                </span>
                              </div>
                              <strong className="ciq-role-value">
                                {usersByRole[roleName] ?? 0}
                              </strong>
                              <small>Registered accounts</small>
                            </article>
                          ))}
                      </section>
                    )}
                  </section>
                )}

              {/* Quick access */}
              {matchesSearch(
                "Quick access",
                "User management",
                "Analytics",
                "My Profile"
              ) && (
                <section className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h3>Quick access</h3>
                      <p>Open the tools available in your workspace.</p>
                    </div>
                  </div>

                  <div className="ciq-quick-grid">
                    {isAdministrator &&
                      matchesSearch("User management", "registered accounts") && (
                        <button
                          type="button"
                          className="ciq-quick-card"
                          onClick={() => handleNavigation("Users")}
                        >
                          <span className="ciq-quick-icon purple">♙</span>
                          <strong>User management</strong>
                          <small>View registered accounts</small>
                          <span className="ciq-quick-arrow">→</span>
                        </button>
                      )}

                    {matchesSearch("Analytics", roleDashboard.description) && (
                      <button
                        type="button"
                        className="ciq-quick-card"
                        onClick={() => handleNavigation("Analytics")}
                      >
                        <span className="ciq-quick-icon blue">▥</span>
                        <strong>Analytics</strong>
                        <small>{roleDashboard.description}</small>
                        <span className="ciq-quick-arrow">→</span>
                      </button>
                    )}

                    {matchesSearch("My Profile", "account information") && (
                      <button
                        type="button"
                        className="ciq-quick-card"
                        onClick={() => handleNavigation("My Profile")}
                      >
                        <span className="ciq-quick-icon green">♙</span>
                        <strong>My Profile</strong>
                        <small>View your account information</small>
                        <span className="ciq-quick-arrow">→</span>
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Profile preview */}
              {matchesSearch("Your profile", displayName, email, role) && (
                <section className="ciq-panel ciq-profile-panel">
                  <h3>Your profile</h3>
                  <p className="ciq-muted">
                    Your information returned by the backend API.
                  </p>

                  {profileLoading ? (
                    <p className="ciq-muted">Loading your profile…</p>
                  ) : profile ? (
                    renderProfileDetails()
                  ) : (
                    <p className="ciq-muted">
                      Profile information is unavailable.
                    </p>
                  )}
                </section>
              )}
            </>
          )}

          {/* My Profile */}
          {activePage === "My Profile" &&
            matchesSearch("My Profile", displayName, email, role) && (
              <section className="ciq-panel">
                {renderPageTitle(
                  "My Profile",
                  "Your account information from CreatorIQ."
                )}

                {profileLoading ? (
                  <p className="ciq-muted">Loading profile…</p>
                ) : (
                  renderProfileDetails()
                )}
              </section>
            )}

          {/* Administrator user management */}
          {activePage === "Users" && isAdministrator && (
            <section className="ciq-panel">
              <div className="ciq-panel-heading">
                <div>
                  <h3>Registered users</h3>
                  <p>Live records loaded from your FastAPI backend.</p>
                </div>

                <button
                  type="button"
                  className="ciq-primary-button"
                  onClick={loadUsers}
                  disabled={usersLoading}
                >
                  {usersLoading ? "Loading…" : "↻ Refresh users"}
                </button>
              </div>

              {usersLoading && (
                <div className="ciq-empty">Loading users from server…</div>
              )}

              {!usersLoading && usersLoaded && users.length === 0 && (
                <div className="ciq-empty">
                  No registered users were returned.
                </div>
              )}

              {!usersLoading && usersLoaded && users.length > 0 && (
                <div className="ciq-table-wrap">
                  <table className="ciq-users-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users
                        .filter((user) =>
                          matchesSearch(
                            user.name,
                            user.email,
                            user.role,
                            user.is_active ? "Active" : "Inactive",
                            user.created_at
                          )
                        )
                        .map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="ciq-table-user">
                                <div className="ciq-avatar ciq-table-avatar">
                                  {String(user.name || user.email || "U")
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <strong>{user.name || "Unnamed user"}</strong>
                              </div>
                            </td>
                            <td>{user.email || "—"}</td>
                            <td>
                              <span className="ciq-role-badge">
                                {user.role || "Unknown"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`ciq-user-status ${
                                  user.is_active ? "is-active" : "is-inactive"
                                }`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!usersLoaded && !usersLoading && (
                <div className="ciq-empty">
                  <p>Load the registered users from your backend.</p>
                  <button
                    type="button"
                    className="ciq-primary-button"
                    onClick={loadUsers}
                  >
                    Load users
                  </button>
                </div>
              )}
            </section>
          )}

          {activePage === "Users" && !isAdministrator && (
            <section className="ciq-panel">
              <h3>User management</h3>
              <p className="ciq-muted">
                Viewing all registered users is restricted to Administrator
                accounts.
              </p>
            </section>
          )}

          {/* Analytics */}
          {activePage === "Analytics" && (
            <>
              {isCreator ? (
                <CreatorCharts />
              ) : (
                <section className="ciq-panel">
                  <div className="ciq-panel-heading">
                    <div>
                      <h3>
                        {isAgency
                          ? "Creator and campaign performance"
                          : isMarketingTeam
                          ? "Campaign analytics"
                          : "Platform analytics"}
                      </h3>
                      <p>{roleDashboard.description}</p>
                    </div>

                    {isAdministrator && (
                      <button
                        type="button"
                        className="ciq-primary-button"
                        onClick={loadAnalytics}
                        disabled={analyticsLoading}
                      >
                        {analyticsLoading ? "Loading…" : "↻ Refresh"}
                      </button>
                    )}
                  </div>

                  {isAdministrator ? (
                    <>
                      {analyticsLoading && (
                        <div className="ciq-empty">
                          Loading platform analytics…
                        </div>
                      )}

                      {!analyticsLoaded && !analyticsLoading && (
                        <div className="ciq-empty">
                          <p>Load the latest statistics from your database.</p>
                          <button
                            type="button"
                            className="ciq-primary-button"
                            onClick={loadAnalytics}
                          >
                            Load platform analytics
                          </button>
                        </div>
                      )}

                      {analyticsLoaded && (
                        <div className="ciq-stat-grid">
                          {[
                            ["Total users", analytics?.total_users],
                            ["Active users", analytics?.active_users],
                            ["Inactive users", analytics?.inactive_users],
                          ]
                            .filter(([label]) => matchesSearch(label))
                            .map(([label, value]) => (
                              <article className="ciq-stat-card" key={label}>
                                <div className="ciq-stat-top">
                                  <span>{label}</span>
                                </div>
                                <strong className="ciq-role-value">
                                  {value ?? 0}
                                </strong>
                                <small>Live database data</small>
                              </article>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ciq-quick-grid">
                      {analyticsItems
                        .filter(([heading, description]) =>
                          matchesSearch(heading, description)
                        )
                        .map(([heading, description]) => (
                          <article className="ciq-quick-card" key={heading}>
                            <span className="ciq-quick-icon purple">▥</span>
                            <strong>{heading}</strong>
                            <small>{description}</small>
                            <small>
                              Ready for creator/campaign data integration
                            </small>
                          </article>
                        ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* Content Performance */}
          {activePage === "Content Performance" && <CreatorCharts />}

          {/* Audience */}
          {activePage === "Audience" && <CreatorCharts />}

          {/* Reports */}
          {activePage === "Reports" && (
            <section className="ciq-panel">
              <h3>Reports</h3>
              <p className="ciq-muted">
                Review creator performance and prepare reports.
              </p>
              <CreatorCharts />
            </section>
          )}

          {/* Notifications */}
          {activePage === "Notifications" && (
            <section className="ciq-panel">
              <h3>Notifications</h3>
              <p className="ciq-muted">
                Updates about your CreatorIQ account will appear here.
              </p>
              <div className="ciq-empty">
                You have no notifications to display yet.
              </div>
            </section>
          )}

          {/* Settings */}
          {activePage === "Settings" && (
            <section className="ciq-panel">
              <h3>Account Settings</h3>
              <p className="ciq-muted">
                Review the details of your signed-in account.
              </p>

              {renderProfileDetails()}

              <div className="ciq-empty">
                Profile editing, password changes, and notification preferences
                can be added here next.
              </div>
            </section>
          )}

          <footer className="ciq-footer">
            <span>© {new Date().getFullYear()} CreatorIQ</span>
            <span>Creator Analytics &amp; Content Performance</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

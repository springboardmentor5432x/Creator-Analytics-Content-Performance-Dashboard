
import CreatorCharts from "./CreatorCharts";
import AgencyDashboard from "./AgencyDashboard";
import MarketingDashboard from "./MarketingDashboard";
import AdminDashboard from "./AdminDashboard";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "./api";
import "./Dashboard.css";
import GPSNavigator from "./GPSNavigator";

const CREATOR_PAGES = [
  ["Dashboard", "⌂"],
  ["My Profile", "◉"],
  ["Content Performance", "▥"],
  ["Audience", "♙"],
  ["Analytics", "↗"],
  ["Reports", "▤"],
  ["GPS Navigation", "⌖"],
];

const ACCOUNT_PAGES = [
  ["Notifications", "♧"],
  ["Settings", "⚙"],
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [creatorDateRange, setCreatorDateRange] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await getProfile();
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleNavigation = useCallback((page) => {
    setActivePage(page);
    setSearchQuery("");
    setError("");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  if (isAdministrator) {
    return <AdminDashboard />;
  }

  if (isAgency) {
    return <AgencyDashboard profile={profile} />;
  }

  if (isMarketingTeam) {
    return <MarketingDashboard profile={profile} />;
  }

  const query = searchQuery.trim().toLowerCase();

  function matchesSearch(...values) {
    if (!query) return true;

    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
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
        <span className="ciq-nav-icon" aria-hidden="true">
          {symbol}
        </span>
        <span>{page}</span>
      </button>
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

  const creatorCharts = (
    <CreatorCharts range={creatorDateRange} />
  );

  return (
    <div className="ciq-layout">
      {/* LEFT SIDEBAR */}
      <aside className="ciq-sidebar">
        <div className="ciq-brand">
          <div className="ciq-brand-icon">C</div>

          <div className="ciq-brand-text">
            <strong>CreatorIQ</strong>
            <span>CREATOR ANALYTICS</span>
          </div>
        </div>

        <nav
          className="ciq-navigation"
          aria-label="Main navigation"
        >
          <div className="ciq-menu-label">WORKSPACE</div>

          {CREATOR_PAGES.map(renderNavigationItem)}
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
              <span>Creator</span>
            </div>
          </button>

          <button
            type="button"
            className="ciq-nav-item ciq-logout-button"
            onClick={handleLogout}
          >
            <span className="ciq-nav-icon" aria-hidden="true">
              ↪
            </span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ciq-main">
        {/* CREATOR HEADING */}
        {isCreator && (
          <section className="ciq-creator-heading">
            <h1>Creator Analytics</h1>
            <p>
              Understand your audience and content performance.
            </p>
          </section>
        )}

        {/* TOP BAR */}
        <header className="ciq-topbar">
          <div className="ciq-search-bar">
            <span
              className="ciq-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search content, analytics..."
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
            {isCreator && (
              <select
                className="ciq-creator-date-filter"
                aria-label="Select creator analytics date range"
                value={creatorDateRange}
                onChange={(event) =>
                  setCreatorDateRange(event.target.value)
                }
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="year">This Year</option>
              </select>
            )}

            <button
              type="button"
              className="ciq-avatar ciq-topbar-profile-button"
              aria-label="Open profile"
              onClick={() => handleNavigation("My Profile")}
            >
              {avatarLetter}
            </button>

            <div className="ciq-topbar-profile-info">
              <strong>
                {profileLoading ? "Loading..." : displayName}
              </strong>
              <span>{role}</span>
            </div>
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

          {/* CREATOR DASHBOARD */}
          {activePage === "Dashboard" && (
            <>
              {matchesSearch(
                "Creator Analytics",
                "Follower Growth",
                "Content Performance",
                "Audience by Platform",
                "Engagement Breakdown",
                "Recent Content Performance",
                "followers views audience engagement likes comments shares"
              ) && creatorCharts}
            </>
          )}

          {/* MY PROFILE */}
          {activePage === "My Profile" &&
            matchesSearch("My Profile", displayName, email, role) && (
              <section className="ciq-panel">
                <h2>My Profile</h2>
                <p className="ciq-muted">
                  Your CreatorIQ account information.
                </p>

                {profileLoading ? (
                  <p className="ciq-muted">Loading profile...</p>
                ) : (
                  renderProfileDetails()
                )}
              </section>
            )}

          {/* CONTENT PERFORMANCE */}
          {activePage === "Content Performance" &&
            matchesSearch(
              "Content Performance",
              "views likes comments shares"
            ) &&
            creatorCharts}

          {/* AUDIENCE */}
          {activePage === "Audience" &&
            matchesSearch(
              "Audience",
              "Audience by Platform",
              "Follower Growth"
            ) &&
            creatorCharts}

          {/* ANALYTICS */}
          {activePage === "Analytics" &&
            matchesSearch(
              "Analytics",
              "Creator Analytics",
              "engagement"
            ) &&
            creatorCharts}

          {/* REPORTS */}
          {activePage === "Reports" &&
            matchesSearch("Reports", "Creator Analytics") && (
              <section className="ciq-panel">
                <h2>Reports</h2>
                <p className="ciq-muted">
                  Review your creator performance reports.
                </p>
                {creatorCharts}
              </section>
            )}
            {/* GPS NAVIGATION */}
{activePage === "GPS Navigation" && (
  <section className="ciq-panel">
    <h2>GPS Navigation</h2>
    <p className="ciq-muted">
      Explore locations using the map.
    </p>
    <GPSNavigator />
  </section>
)}

          {/* NOTIFICATIONS */}
          {activePage === "Notifications" &&
            matchesSearch("Notifications", "account updates") && (
              <section className="ciq-panel">
                <h2>Notifications</h2>
                <p className="ciq-muted">
                  Updates about your CreatorIQ account will appear here.
                </p>

                <div className="ciq-empty">
                  You have no notifications to display yet.
                </div>
              </section>
            )}

          {/* SETTINGS */}
          {activePage === "Settings" &&
            matchesSearch("Settings", "account information") && (
              <section className="ciq-panel">
                <h2>Account Settings</h2>
                <p className="ciq-muted">
                  Review your signed-in account details.
                </p>

                {renderProfileDetails()}

                <div className="ciq-empty">
                  Profile editing, password changes, and notification
                  preferences can be added here next.
                </div>
              </section>
            )}

          <footer className="ciq-footer">
            <span>
              © {new Date().getFullYear()} CreatorIQ
            </span>
            <span>
              Creator Analytics &amp; Content Performance
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

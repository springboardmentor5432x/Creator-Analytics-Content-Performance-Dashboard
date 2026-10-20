
import React, { useMemo, useState } from "react";
import "./AgencyDashboard.css";

const initialCreators = [
  { name: "Tech With Riya", initials: "TR", platform: "YouTube", followers: "450K", views: "5.2M", engagement: "7.8%", revenue: "₹85,000", status: "Active" },
  { name: "Foodie Diaries", initials: "FD", platform: "Instagram", followers: "320K", views: "3.1M", engagement: "6.4%", revenue: "₹62,000", status: "Active" },
  { name: "Travel With Arjun", initials: "TA", platform: "TikTok", followers: "280K", views: "4.8M", engagement: "8.1%", revenue: "₹70,000", status: "Active" },
  { name: "Fitness Hub", initials: "FH", platform: "Instagram", followers: "210K", views: "2.4M", engagement: "5.9%", revenue: "₹45,000", status: "Inactive" },
  { name: "Study Capsule", initials: "SC", platform: "YouTube", followers: "190K", views: "2.1M", engagement: "6.7%", revenue: "₹38,000", status: "Active" },
];

const initialCampaigns = [
  { name: "Summer Glow Campaign", brand: "Glow Beauty", creators: 8, budget: "₹1,50,000", status: "Active" },
  { name: "Tech Launch 2026", brand: "TechNova", creators: 5, budget: "₹2,00,000", status: "Active" },
  { name: "Healthy Living", brand: "FitLife", creators: 4, budget: "₹90,000", status: "Completed" },
];

const navigation = [
  { label: "Dashboard", icon: "⌂" },
  { label: "Creators", icon: "♙" },
  { label: "Campaigns", icon: "▣" },
  { label: "Analytics", icon: "▥" },
  { label: "Content Library", icon: "▤" },
  { label: "Reports", icon: "▧" },
  { label: "Team Members", icon: "♧" },
  { label: "Settings", icon: "⚙" },
];

const performanceOptions = [
  { name: "Followers", color: "#ff4d55" },
  { name: "Views", color: "#e84bb8" },
  { name: "Engagement", color: "#2563eb" },
];

function Avatar({ name = "Agency", large = false }) {
  const initials = String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`agency-avatar ${large ? "agency-avatar-large" : ""}`}>
      {initials || "A"}
    </div>
  );
}

function MiniPlatform({ platform }) {
  const icons = {
    Instagram: { text: "◎", className: "instagram" },
    YouTube: { text: "▶", className: "youtube" },
    TikTok: { text: "♪", className: "tiktok" },
    LinkedIn: { text: "in", className: "linkedin" },
  };

  const item = icons[platform] || { text: "●", className: "other" };

  return (
    <span className={`agency-platform-icon ${item.className}`} title={platform}>
      {item.text}
    </span>
  );
}

function StatCard({ icon, label, value, change, color }) {
  return (
    <div className="agency-stat-card">
      <div className="agency-stat-top">
        <span className={`agency-stat-icon ${color}`}>{icon}</span>
        <span className="agency-stat-label">{label}</span>
      </div>
      <div className="agency-stat-bottom">
        <strong>{value}</strong>
        <span className="agency-stat-change">{change}</span>
      </div>
    </div>
  );
}

/* Overall Performance heading and legend share the same selected state. */
function PerformanceHeading({ selectedLine, onSelectLine }) {
  return (
    <div className="agency-performance-heading">
      <h3>Overall Performance</h3>

      <div className="agency-chart-legend">
        {performanceOptions.map((option) => (
          <button
            key={option.name}
            type="button"
            className={`agency-legend-button ${
              selectedLine === option.name ? "selected" : ""
            }`}
            onClick={() => onSelectLine(option.name)}
            aria-pressed={selectedLine === option.name}
          >
            <i
              className="legend-dot"
              style={{ backgroundColor: option.color }}
            />
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* All three chart lines stay visible when one is selected. */
function PerformanceChart({ selectedLine, onSelectLine }) {
  const lines = [
    {
      name: "Followers",
      color: "#ff4d55",
      points: [
        [0, 139], [65, 124], [130, 103], [195, 83],
        [260, 72], [325, 51], [390, 32], [455, 20], [520, 13],
      ],
    },
    {
      name: "Views",
      color: "#e84bb8",
      points: [
        [0, 149], [65, 137], [130, 123], [195, 108],
        [260, 98], [325, 86], [390, 74], [455, 65], [520, 56],
      ],
    },
    {
      name: "Engagement",
      color: "#2563eb",
      points: [
        [0, 158], [65, 154], [130, 148], [195, 143],
        [260, 137], [325, 130], [390, 124], [455, 117], [520, 110],
      ],
    },
  ];

  return (
    <div className="agency-chart">
      <div className="agency-chart-area">
        <div className="agency-y-labels">
          <span>6M</span>
          <span>4M</span>
          <span>2M</span>
          <span>0</span>
        </div>

        <svg
          className="agency-line-chart"
          viewBox="0 0 520 175"
          preserveAspectRatio="none"
          role="img"
          aria-label="Interactive performance chart for followers, views and engagement"
        >
          {[15, 58, 101, 144].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="520"
              y2={y}
              stroke="#e9edf5"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}

          {lines.map((line) => {
            const selected = selectedLine === line.name;
            const dimmed = selectedLine !== null && !selected;

            return (
              <g
                key={line.name}
                opacity={dimmed ? 0.65 : 1}
                onClick={() => onSelectLine(line.name)}
                style={{ cursor: "pointer" }}
              >
                <polyline
                  points={line.points
                    .map(([x, y]) => `${x},${y}`)
                    .join(" ")}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={selected ? 4.5 : 2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={selected ? "agency-line-blink" : ""}
                />

                {line.points.map(([x, y], index) => (
                  <circle
                    key={`${line.name}-${index}`}
                    cx={x}
                    cy={y}
                    r={selected ? 4.5 : 3}
                    fill={line.color}
                    stroke="#fff"
                    strokeWidth="1.3"
                    className={
                      selected ? "agency-chart-dot-active" : ""
                    }
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="agency-x-labels">
        <span>Aug 17</span>
        <span>Aug 24</span>
        <span>Aug 31</span>
        <span>Sep 7</span>
        <span>Sep 14</span>
      </div>

      {selectedLine && (
        <div className="agency-chart-hint" aria-live="polite">
          Highlighting <strong>{selectedLine}</strong>. Click it again to
          show all lines.
        </div>
      )}
    </div>
  );
}

/* Interactive platform donut chart. */
function PlatformChart() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const platforms = [
    { name: "Instagram", percent: 42, color: "#a855f7" },
    { name: "YouTube", percent: 28, color: "#ff4d55" },
    { name: "TikTok", percent: 18, color: "#2563eb" },
    { name: "LinkedIn", percent: 8, color: "#38bdf8" },
    { name: "Others", percent: 4, color: "#93c5fd" },
  ];

  const gradient = platforms
    .reduce(
      (result, platform) => {
        const start = result.total;
        const end = start + platform.percent;

        result.stops.push(`${platform.color} ${start}% ${end}%`);
        result.total = end;

        return result;
      },
      { total: 0, stops: [] }
    )
    .stops.join(", ");

  return (
    <div className="agency-platform-chart">
      <div
        className={`agency-donut ${
          selectedPlatform ? "agency-donut-selected" : ""
        }`}
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label="Platform distribution chart"
      >
        <div className="agency-donut-center">
          <strong>2.4M</strong>
          <span>Total Followers</span>
          {selectedPlatform && <small>{selectedPlatform}</small>}
        </div>
      </div>

      <div className="agency-platform-legend">
        {platforms.map((platform) => (
          <button
            type="button"
            className={[
              "agency-platform-row",
              selectedPlatform === platform.name ? "selected" : "",
              selectedPlatform && selectedPlatform !== platform.name
                ? "dimmed"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={platform.name}
            onClick={() =>
              setSelectedPlatform((current) =>
                current === platform.name ? null : platform.name
              )
            }
            aria-pressed={selectedPlatform === platform.name}
          >
            <span className="agency-platform-name">
              <i style={{ background: platform.color }} />
              {platform.name}
            </span>
            <strong>{platform.percent}%</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AgencyDashboard({ profile }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [creators, setCreators] = useState(initialCreators);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [campaignName, setCampaignName] = useState("");
  const [campaignBrand, setCampaignBrand] = useState("");
  const [campaignBudget, setCampaignBudget] = useState("");
  const [notice, setNotice] = useState("");

  // Shared state keeps the heading buttons and chart lines in sync.
  const [selectedPerformanceLine, setSelectedPerformanceLine] =
    useState(null);

  function togglePerformanceLine(name) {
    setSelectedPerformanceLine((current) =>
      current === name ? null : name
    );
  }

  const agencyName =
    profile?.agencyName ||
    profile?.companyName ||
    profile?.name ||
    profile?.fullName ||
    "Growth Agency";

  const agencyEmail = profile?.email || "agency@example.com";

  const filteredCreators = useMemo(() => {
    const query = search.toLowerCase().trim();

    return creators.filter((creator) => {
      const matchesSearch =
        creator.name.toLowerCase().includes(query) ||
        creator.platform.toLowerCase().includes(query);

      const matchesStatus =
        creatorFilter === "All" || creator.status === creatorFilter;

      return matchesSearch && matchesStatus;
    });
  }, [creators, search, creatorFilter]);

  const filteredCampaigns = useMemo(() => {
    const query = search.toLowerCase().trim();

    return campaigns.filter(
      (campaign) =>
        campaign.name.toLowerCase().includes(query) ||
        campaign.brand.toLowerCase().includes(query)
    );
  }, [campaigns, search]);

  function openPage(page) {
    setActivePage(page);
    setSearch("");
    setNotice("");
  }

  function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    sessionStorage.clear();

    window.location.href = "/login";
  }

  function createCampaign(event) {
    event.preventDefault();

    if (!campaignName.trim() || !campaignBrand.trim()) {
      setNotice("Please enter the campaign name and brand.");
      return;
    }

    const newCampaign = {
      name: campaignName.trim(),
      brand: campaignBrand.trim(),
      creators: 0,
      budget: campaignBudget.trim() || "Not set",
      status: "Active",
    };

    setCampaigns((previous) => [newCampaign, ...previous]);
    setCampaignName("");
    setCampaignBrand("");
    setCampaignBudget("");
    setShowCampaignForm(false);
    setActivePage("Campaigns");
    setNotice("Campaign created successfully.");
  }

  function toggleCreatorStatus(name) {
    setCreators((previous) =>
      previous.map((creator) =>
        creator.name === name
          ? {
              ...creator,
              status: creator.status === "Active" ? "Inactive" : "Active",
            }
          : creator
      )
    );
  }

  function renderCreatorsTable() {
    return (
      <div className="agency-table-wrap">
        <table className="agency-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platforms</th>
              <th>Followers</th>
              <th>Views</th>
              <th>Engagement</th>
              <th>Revenue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCreators.map((creator) => (
              <tr key={creator.name}>
                <td>
                  <div className="agency-creator-cell">
                    <Avatar name={creator.initials} />
                    <span>{creator.name}</span>
                  </div>
                </td>
                <td>
                  <MiniPlatform platform={creator.platform} />
                </td>
                <td>{creator.followers}</td>
                <td>{creator.views}</td>
                <td>
                  <span className="agency-engagement">
                    {creator.engagement}
                  </span>
                </td>
                <td>{creator.revenue}</td>
                <td>
                  <button
                    type="button"
                    className={`agency-status ${creator.status.toLowerCase()}`}
                    onClick={() => toggleCreatorStatus(creator.name)}
                    title="Click to change creator status"
                  >
                    {creator.status}
                  </button>
                </td>
              </tr>
            ))}
            {filteredCreators.length === 0 && (
              <tr>
                <td colSpan="7" className="agency-empty">
                  No creators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCampaigns() {
    return (
      <section className="agency-panel agency-full-panel">
        <div className="agency-panel-heading">
          <div>
            <h3>Campaign Management</h3>
            <p>Manage and track your influencer campaigns.</p>
          </div>
          <button
            type="button"
            className="agency-primary-button"
            onClick={() => setShowCampaignForm(!showCampaignForm)}
          >
            + Create Campaign
          </button>
        </div>

        {showCampaignForm && (
          <form className="agency-campaign-form" onSubmit={createCampaign}>
            <label>
              Campaign Name
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Enter campaign name"
                required
              />
            </label>
            <label>
              Brand
              <input
                value={campaignBrand}
                onChange={(event) => setCampaignBrand(event.target.value)}
                placeholder="Enter brand name"
                required
              />
            </label>
            <label>
              Budget
              <input
                value={campaignBudget}
                onChange={(event) => setCampaignBudget(event.target.value)}
                placeholder="Example: ₹50,000"
              />
            </label>
            <button className="agency-primary-button" type="submit">
              Save Campaign
            </button>
          </form>
        )}

        <div className="agency-campaign-grid">
          {filteredCampaigns.map((campaign, index) => (
            <article
              className="agency-campaign-card"
              key={`${campaign.name}-${index}`}
            >
              <div className="agency-campaign-symbol">▣</div>
              <span
                className={`agency-status ${campaign.status.toLowerCase()}`}
              >
                {campaign.status}
              </span>
              <h4>{campaign.name}</h4>
              <p>{campaign.brand}</p>
              <div className="agency-campaign-details">
                <span>
                  Creators <strong>{campaign.creators}</strong>
                </span>
                <span>
                  Budget <strong>{campaign.budget}</strong>
                </span>
              </div>
            </article>
          ))}
          {filteredCampaigns.length === 0 && (
            <p className="agency-empty">No campaigns match your search.</p>
          )}
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="agency-panel agency-profile-page">
        <div className="agency-profile-cover" />
        <div className="agency-profile-main">
          <Avatar name={agencyName} large />
          <h2>{agencyName}</h2>
          <p>Agency Account</p>
          <div className="agency-profile-info">
            <div>
              <span>Agency Name</span>
              <strong>{agencyName}</strong>
            </div>
            <div>
              <span>Email Address</span>
              <strong>{agencyEmail}</strong>
            </div>
            <div>
              <span>Account Type</span>
              <strong>Agency</strong>
            </div>
            <div>
              <span>Creators Managed</span>
              <strong>{creators.length}</strong>
            </div>
          </div>
          <button
            type="button"
            className="agency-primary-button"
            onClick={() => openPage("Settings")}
          >
            Go to Settings
          </button>
        </div>
      </section>
    );
  }

  function renderContent() {
    switch (activePage) {
      case "Creators":
        return (
          <section className="agency-panel agency-full-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Creators Overview</h3>
                <p>Discover and manage your creators.</p>
              </div>
              <select
                className="agency-filter"
                value={creatorFilter}
                onChange={(event) => setCreatorFilter(event.target.value)}
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            {renderCreatorsTable()}
          </section>
        );

      case "Campaigns":
        return renderCampaigns();

      case "Analytics":
        return (
          <div className="agency-analytics-page">
            <section className="agency-panel">
              <div className="agency-panel-heading agency-performance-panel-heading">
                <PerformanceHeading
                  selectedLine={selectedPerformanceLine}
                  onSelectLine={togglePerformanceLine}
                />
                <span className="agency-subtle">
                  Creator performance trends
                </span>
              </div>
              <PerformanceChart
                selectedLine={selectedPerformanceLine}
                onSelectLine={togglePerformanceLine}
              />
            </section>

            <section className="agency-panel">
              <h3>Platform Distribution</h3>
              <PlatformChart />
            </section>

            <section className="agency-panel agency-full-panel">
              <h3>Performance Summary</h3>
              <div className="agency-stat-grid">
                <StatCard
                  icon="◎"
                  label="Total Followers"
                  value="2.4M"
                  change="+18.5%"
                  color="purple"
                />
                <StatCard
                  icon="◉"
                  label="Total Views"
                  value="18.7M"
                  change="+22.1%"
                  color="blue"
                />
                <StatCard
                  icon="↗"
                  label="Engagement"
                  value="7.2%"
                  change="+8.4%"
                  color="green"
                />
              </div>
            </section>
          </div>
        );

      case "Reports":
        return (
          <section className="agency-panel agency-full-panel">
            <h3>Reports</h3>
            <p className="agency-description">
              Your agency performance at a glance.
            </p>
            <div className="agency-report-grid">
              <div>
                <span>Total Creators</span>
                <strong>{creators.length}</strong>
              </div>
              <div>
                <span>Total Campaigns</span>
                <strong>{campaigns.length}</strong>
              </div>
              <div>
                <span>Active Creators</span>
                <strong>
                  {creators.filter((c) => c.status === "Active").length}
                </strong>
              </div>
              <div>
                <span>Active Campaigns</span>
                <strong>
                  {campaigns.filter((c) => c.status === "Active").length}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="agency-primary-button"
              onClick={() => window.print()}
            >
              Print / Save Report
            </button>
          </section>
        );

      case "Content Library":
        return (
          <section className="agency-panel agency-full-panel">
            <h3>Content Library</h3>
            <p className="agency-description">
              Explore content across your managed platforms.
            </p>
            <div className="agency-content-grid">
              {creators.map((creator) => (
                <article className="agency-content-card" key={creator.name}>
                  <div className="agency-content-placeholder">▶</div>
                  <MiniPlatform platform={creator.platform} />
                  <h4>{creator.name}</h4>
                  <p>{creator.views} views</p>
                </article>
              ))}
            </div>
          </section>
        );

      case "Team Members":
        return (
          <section className="agency-panel agency-full-panel">
            <h3>Team Members</h3>
            <p className="agency-description">Agency account overview.</p>
            <div className="agency-team-member">
              <Avatar name={agencyName} />
              <div>
                <strong>{agencyName}</strong>
                <span>{agencyEmail}</span>
              </div>
              <span className="agency-status active">Admin</span>
            </div>
          </section>
        );

      case "Settings":
        return (
          <section className="agency-panel agency-full-panel">
            <h3>Settings</h3>
            <p className="agency-description">
              Your current agency account details.
            </p>
            <div className="agency-settings-row">
              <span>Agency Name</span>
              <strong>{agencyName}</strong>
            </div>
            <div className="agency-settings-row">
              <span>Email Address</span>
              <strong>{agencyEmail}</strong>
            </div>
            <div className="agency-settings-row">
              <span>Account Type</span>
              <strong>Agency</strong>
            </div>
            <button
              type="button"
              className="agency-secondary-button"
              onClick={() => openPage("My Profile")}
            >
              View My Profile
            </button>
          </section>
        );

      case "My Profile":
        return renderProfile();

      default:
        return (
          <>
            <div className="agency-stat-grid">
              <StatCard
                icon="♙"
                label="Total Creators"
                value="12"
                change="+3 this month"
                color="purple"
              />
              <StatCard
                icon="♧"
                label="Total Followers"
                value="2.4M"
                change="+18.5%"
                color="blue"
              />
              <StatCard
                icon="◉"
                label="Total Views"
                value="18.7M"
                change="+22.1%"
                color="indigo"
              />
              <StatCard
                icon="▣"
                label="Active Campaigns"
                value={String(
                  campaigns.filter((c) => c.status === "Active").length + 2
                )}
                change="Running"
                color="cyan"
              />
              <StatCard
                icon="₹"
                label="Total Revenue"
                value="₹3,48,600"
                change="+27.3%"
                color="orange"
              />
            </div>

            <div className="agency-chart-grid">
              <section className="agency-panel">
                <div className="agency-panel-heading agency-performance-panel-heading">
                  <PerformanceHeading
                    selectedLine={selectedPerformanceLine}
                    onSelectLine={togglePerformanceLine}
                  />
                </div>
                <PerformanceChart
                  selectedLine={selectedPerformanceLine}
                  onSelectLine={togglePerformanceLine}
                />
              </section>

              <section className="agency-panel">
                <div className="agency-panel-heading">
                  <h3>Platform Distribution</h3>
                </div>
                <PlatformChart />
              </section>
            </div>

            <section className="agency-panel agency-full-panel">
              <div className="agency-panel-heading">
                <div>
                  <h3>Creators Overview</h3>
                  <p>Track your creators' performance.</p>
                </div>
                <button
                  type="button"
                  className="agency-text-button"
                  onClick={() => openPage("Creators")}
                >
                  View All →
                </button>
              </div>
              {renderCreatorsTable()}
            </section>
          </>
        );
    }
  }

  return (
    <div className="agency-dashboard">
      <header className="agency-header">
        <div>
          <h1>Agency Dashboard</h1>
          <p>
            For agencies to manage multiple creators and compare their
            performance.
          </p>
        </div>
      </header>

      <aside className="agency-sidebar">
        <button
          type="button"
          className="agency-brand"
          onClick={() => openPage("Dashboard")}
        >
          <span className="agency-brand-mark">C</span>
          <span>CreatorHub</span>
        </button>

        <nav className="agency-navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`agency-nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => openPage(item.label)}
            >
              <span className="agency-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="agency-sidebar-account">
          <button
            type="button"
            className="agency-sidebar-profile"
            onClick={() => openPage("My Profile")}
            title="Open agency profile"
          >
            <Avatar name={agencyName} />
            <span className="agency-sidebar-profile-text">
              <strong>{agencyName}</strong>
              <small>Agency Account</small>
            </span>
            <span className="agency-profile-chevron">›</span>
          </button>

          <button
            type="button"
            className="agency-logout-button"
            onClick={handleLogout}
          >
            <span>⇥</span> Logout
          </button>
        </div>
      </aside>

      <main className="agency-main">
        <div className="agency-toolbar">
          <label className="agency-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search creators, campaigns..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

          <div className="agency-toolbar-actions">
            <label className="agency-date-select">
              <span>▦</span>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>This Year</option>
              </select>
            </label>

            <div className="agency-notification-wrap">
              <button
                type="button"
                className="agency-notification-button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                ♧<i />
              </button>
              {showNotifications && (
                <div className="agency-notification-popover">
                  <strong>Notifications</strong>
                  <p>Your dashboard is up to date.</p>
                  <p>
                    You have{" "}
                    {campaigns.filter((c) => c.status === "Active").length}{" "}
                    active campaigns.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              className="agency-top-profile-button"
              onClick={() => openPage("My Profile")}
              title="Open agency profile"
            >
              <Avatar name={agencyName} />
              <span>
                <strong>{agencyName}</strong>
                <small>Growth Agency</small>
              </span>
              <span className="agency-profile-chevron">⌄</span>
            </button>
          </div>
        </div>

        <div className="agency-page-heading">
          <div>
            <h2>{activePage === "Dashboard" ? "" : activePage}</h2>
            {activePage !== "Dashboard" && (
              <p>Manage your agency's creators and campaigns.</p>
            )}
          </div>
          {activePage === "Campaigns" && (
            <button
              type="button"
              className="agency-primary-button"
              onClick={() => setShowCampaignForm(!showCampaignForm)}
            >
              + New Campaign
            </button>
          )}
        </div>

        {notice && <div className="agency-notice">{notice}</div>}

        <div className="agency-content">{renderContent()}</div>

        <footer className="agency-footer">
          © 2026 CreatorHub · Agency Management Dashboard
        </footer>
      </main>
    </div>
  );
}

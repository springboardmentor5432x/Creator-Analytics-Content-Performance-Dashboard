
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MarketingDashboard.css";

const campaignData = [
  { name: "Summer Sale 2026", creator: "AM", platform: "Instagram", reach: "4.2M", engagement: "320K", spend: "₹1,20,000", status: "Active" },
  { name: "Back to College", creator: "RJ", platform: "YouTube", reach: "3.1M", engagement: "240K", spend: "₹1,00,000", status: "Active" },
  { name: "New Product Launch", creator: "SK", platform: "Instagram", reach: "2.8M", engagement: "180K", spend: "₹80,000", status: "Completed" },
  { name: "Festive Offer", creator: "PK", platform: "YouTube", reach: "1.9M", engagement: "120K", spend: "₹60,000", status: "Active" },
  { name: "Brand Awareness", creator: "AM", platform: "Instagram", reach: "1.5M", engagement: "100K", spend: "₹70,000", status: "Planning" },
];

const rangeData = {
  "Last 7 Days": {
    campaigns: "3",
    reach: "2.8M",
    engagement: "218K",
    spend: "₹95,000",
    roi: "2.6x",
    reachChange: "+8.4%",
    engagementChange: "+6.2%",
    roiChange: "+4.1%",
    performance: [
      { day: "Mon", reach: 35, engagement: 24, conversions: 12 },
      { day: "Tue", reach: 48, engagement: 32, conversions: 18 },
      { day: "Wed", reach: 65, engagement: 42, conversions: 25 },
      { day: "Thu", reach: 82, engagement: 55, conversions: 32 },
      { day: "Fri", reach: 95, engagement: 65, conversions: 40 },
    ],
    topCampaigns: [
      ["Summer Sale", 100],
      ["Back to College", 72],
      ["New Product", 55],
      ["Festive Offer", 40],
      ["Brand Awareness", 28],
    ],
    contentTypes: [
      { name: "Video", percent: 45, color: "#8a70f5" },
      { name: "Image", percent: 30, color: "#b2a1fa" },
      { name: "Reels/Shorts", percent: 20, color: "#d0c5ff" },
      { name: "Carousel", percent: 5, color: "#e6e0ff" },
    ],
    locations: [["India", 52], ["USA", 20], ["UK", 13], ["Canada", 9], ["Others", 6]],
    posts: 68,
  },
  "Last 30 Days": {
    campaigns: "8",
    reach: "12.4M",
    engagement: "986K",
    spend: "₹4,20,000",
    roi: "3.2x",
    reachChange: "+25.3%",
    engagementChange: "+18.7%",
    roiChange: "+12.5%",
    performance: [
      { day: "Aug 17", reach: 50, engagement: 35, conversions: 15 },
      { day: "Aug 24", reach: 75, engagement: 48, conversions: 25 },
      { day: "Aug 31", reach: 100, engagement: 65, conversions: 36 },
      { day: "Sep 7", reach: 125, engagement: 82, conversions: 48 },
      { day: "Sep 14", reach: 150, engagement: 100, conversions: 60 },
    ],
    topCampaigns: [
      ["Summer Sale", 100],
      ["Back to College", 76],
      ["New Product", 65],
      ["Festive Offer", 52],
      ["Brand Awareness", 42],
    ],
    contentTypes: [
      { name: "Video", percent: 52, color: "#8a70f5" },
      { name: "Image", percent: 28, color: "#b2a1fa" },
      { name: "Reels/Shorts", percent: 15, color: "#d0c5ff" },
      { name: "Carousel", percent: 5, color: "#e6e0ff" },
    ],
    locations: [["India", 48], ["USA", 22], ["UK", 12], ["Canada", 10], ["Others", 8]],
    posts: 276,
  },
  "Last 90 Days": {
    campaigns: "15",
    reach: "28.6M",
    engagement: "2.1M",
    spend: "₹9,80,000",
    roi: "3.8x",
    reachChange: "+32.6%",
    engagementChange: "+24.8%",
    roiChange: "+16.2%",
    performance: [
      { day: "Week 1", reach: 65, engagement: 42, conversions: 20 },
      { day: "Week 3", reach: 88, engagement: 60, conversions: 30 },
      { day: "Week 5", reach: 110, engagement: 78, conversions: 42 },
      { day: "Week 8", reach: 132, engagement: 95, conversions: 55 },
      { day: "Week 12", reach: 155, engagement: 118, conversions: 72 },
    ],
    topCampaigns: [
      ["Summer Sale", 100],
      ["Back to College", 85],
      ["New Product", 73],
      ["Festive Offer", 61],
      ["Brand Awareness", 48],
    ],
    contentTypes: [
      { name: "Video", percent: 48, color: "#8a70f5" },
      { name: "Image", percent: 25, color: "#b2a1fa" },
      { name: "Reels/Shorts", percent: 21, color: "#d0c5ff" },
      { name: "Carousel", percent: 6, color: "#e6e0ff" },
    ],
    locations: [["India", 46], ["USA", 24], ["UK", 13], ["Canada", 9], ["Others", 8]],
    posts: 740,
  },
  "This Year": {
    campaigns: "42",
    reach: "86.2M",
    engagement: "6.8M",
    spend: "₹28,50,000",
    roi: "4.1x",
    reachChange: "+41.5%",
    engagementChange: "+29.6%",
    roiChange: "+21.4%",
    performance: [
      { day: "Jan", reach: 60, engagement: 40, conversions: 22 },
      { day: "Mar", reach: 85, engagement: 58, conversions: 34 },
      { day: "May", reach: 108, engagement: 75, conversions: 45 },
      { day: "Jul", reach: 132, engagement: 96, conversions: 60 },
      { day: "Oct", reach: 158, engagement: 120, conversions: 78 },
    ],
    topCampaigns: [
      ["Summer Sale", 100],
      ["Back to College", 90],
      ["New Product", 82],
      ["Festive Offer", 72],
      ["Brand Awareness", 58],
    ],
    contentTypes: [
      { name: "Video", percent: 50, color: "#8a70f5" },
      { name: "Image", percent: 26, color: "#b2a1fa" },
      { name: "Reels/Shorts", percent: 18, color: "#d0c5ff" },
      { name: "Carousel", percent: 6, color: "#e6e0ff" },
    ],
    locations: [["India", 50], ["USA", 21], ["UK", 12], ["Canada", 9], ["Others", 8]],
    posts: 2180,
  },
};

const pages = [
  ["Dashboard", "▦"],
  ["Campaigns", "♧"],
  ["Influencers", "♙"],
  ["Content", "▤"],
  ["Analytics", "↗"],
  ["Reports", "▥"],
  ["Brand Deals", "◇"],
  ["Settings", "⚙"],
];

function Icon({ children }) {
  return <span className="ma-icon" aria-hidden="true">{children}</span>;
}

function MetricCard({ icon, title, value, change, tone }) {
  return (
    <article className="ma-metric-card">
      <div className="ma-metric-top">
        <span>{title}</span>
        <span className={`ma-metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="ma-metric-value">{value}</strong>
      <div className="ma-metric-bottom">
        <span className="ma-metric-indicator">↗</span>
        <span className="ma-growth">{change}</span>
      </div>
    </article>
  );
}

function PerformanceChart({ performance }) {
  const width = 560;
  const height = 210;
  const left = 42;
  const right = 14;
  const top = 12;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = 160;

  const x = (index) =>
    left + (plotWidth * index) / Math.max(performance.length - 1, 1);

  const y = (value) =>
    top + plotHeight - (value / maxValue) * plotHeight;

  const line = (key) =>
    performance
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${x(index)} ${y(point[key])}`
      )
      .join(" ");

  return (
    <svg
      className="ma-performance-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Campaign performance chart"
    >
      {[0, 40, 80, 120, 160].map((value) => (
        <g key={value}>
          <line
            x1={left}
            y1={y(value)}
            x2={width - right}
            y2={y(value)}
            stroke="#edf0f7"
            strokeDasharray="3 4"
          />
          <text
            x={left - 9}
            y={y(value) + 4}
            textAnchor="end"
            fill="#969bb0"
            fontSize="10"
          >
            {value}
          </text>
        </g>
      ))}

      {[
        ["reach", "#7058f5"],
        ["engagement", "#a78bfa"],
        ["conversions", "#25bd91"],
      ].map(([key, color]) => (
        <g key={key}>
          <path
            d={line(key)}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {performance.map((point, index) => (
            <circle
              key={`${key}-${point.day}`}
              cx={x(index)}
              cy={y(point[key])}
              r="3"
              fill={color}
            />
          ))}
        </g>
      ))}

      {performance.map((point, index) => (
        <text
          key={point.day}
          x={x(index)}
          y={height - 9}
          textAnchor="middle"
          fill="#858ba1"
          fontSize="10"
        >
          {point.day}
        </text>
      ))}
    </svg>
  );
}

function Avatar({ name, className = "" }) {
  const initial =
    String(name || "C").trim().charAt(0).toUpperCase() || "C";

  return (
    <span className={`ma-avatar ${className}`} aria-label={name || "User"}>
      {initial}
    </span>
  );
}

export default function MarketingDashboard({ profile }) {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("Dashboard");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const selectedData = rangeData[dateRange];

  const displayName = profile?.name || profile?.email || "CreatorIQ User";
  const email = profile?.email || "Email not available";
  const role = profile?.role || "Creator";
  const initial = displayName.trim().charAt(0).toUpperCase() || "C";

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return campaignData;

    return campaignData.filter((campaign) =>
      Object.values(campaign).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [search]);

  const openPage = (page) => {
    setActivePage(page);
    setShowProfile(false);
    setShowNotifications(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const handleExport = () => {
    const rows = [
      ["Campaign", "Creator", "Platform", "Reach", "Engagement", "Spend", "Status"],
      ...filteredCampaigns.map((campaign) => [
        campaign.name,
        campaign.creator,
        campaign.platform,
        campaign.reach,
        campaign.engagement,
        campaign.spend,
        campaign.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "creatoriq-campaigns.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ma-layout">
      <aside className="ma-sidebar">
        <div className="ma-brand">
          <div className="ma-brand-mark">C</div>
          <div>
            <strong>CreatorIQ</strong>
            <span>CREATOR ANALYTICS</span>
          </div>
        </div>

        <div className="ma-side-label">WORKSPACE</div>

        <nav className="ma-navigation" aria-label="Main navigation">
          {pages.map(([page, symbol]) => (
            <button
              type="button"
              key={page}
              className={`ma-nav-item ${activePage === page ? "active" : ""}`}
              onClick={() => openPage(page)}
            >
              <Icon>{symbol}</Icon>
              <span>{page}</span>
            </button>
          ))}
        </nav>

        <div className="ma-sidebar-account">
          <div className="ma-side-label">SIGNED IN AS</div>
          <button
            type="button"
            className="ma-sidebar-profile ma-sidebar-profile-button"
            onClick={() => openPage("Profile")}
          >
            <Avatar name={displayName} />
            <span className="ma-profile-text">
              <strong>{displayName}</strong>
              <span>{role}</span>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="ma-logout-button"
            onClick={handleLogout}
          >
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="ma-main">
        <header className="ma-header">
          <div className="ma-header-title">
            <span className="ma-eyebrow">CREATORIQ WORKSPACE</span>
            <h1>
              {activePage === "Profile"
                ? "My Profile"
                : activePage === "Dashboard"
                  ? "Marketing Dashboard"
                  : activePage}
            </h1>
            <p>
              {activePage === "Profile"
                ? "Manage and review your account information."
                : "Manage campaigns, track performance, and analyze creator content."}
            </p>
          </div>

          <div className="ma-header-actions">
            {activePage !== "Profile" && (
              <>
                <label className="ma-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder="Search campaigns..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Search campaigns"
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

                <select
                  className="ma-date-select"
                  value={dateRange}
                  onChange={(event) => setDateRange(event.target.value)}
                  aria-label="Select reporting period"
                >
                  {Object.keys(rangeData).map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </>
            )}

            <div className="ma-popover-wrap">
              <button
                type="button"
                className="ma-notification"
                onClick={() => {
                  setShowNotifications((value) => !value);
                  setShowProfile(false);
                }}
                aria-label="Notifications"
                title="Notifications"
              >
                ♧
                <span className="ma-notification-dot" />
              </button>

              {showNotifications && (
                <div className="ma-popover">
                  <strong>Notifications</strong>
                  <p>Your campaign updates will appear here.</p>
                  <small>No new notifications.</small>
                </div>
              )}
            </div>

            <div className="ma-popover-wrap">
              <button
                type="button"
                className="ma-header-profile"
                onClick={() => {
                  setShowProfile((value) => !value);
                  setShowNotifications(false);
                }}
                aria-label="Open account menu"
              >
                <Avatar name={displayName} />
                <span className="ma-header-profile-text">
                  <strong>{displayName}</strong>
                  <small>{role}</small>
                </span>
                <span aria-hidden="true">⌄</span>
              </button>

              {showProfile && (
                <div className="ma-popover ma-account-popover">
                  <strong>{displayName}</strong>
                  <small>{email}</small>
                  <button type="button" onClick={() => openPage("Profile")}>
                    View Profile
                  </button>
                  <button type="button" onClick={handleLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="ma-content">
          {activePage === "Profile" && (
            <section className="ma-panel ma-page-panel ma-profile-page">
              <div className="ma-profile-cover" />

              <div className="ma-profile-details">
                <div className="ma-profile-large-avatar">{initial}</div>
                <h2>{displayName}</h2>
                <p>{role}</p>

                <div className="ma-account-details">
                  <div>
                    <span>Full Name</span>
                    <strong>{profile?.name || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Email Address</span>
                    <strong>{email}</strong>
                  </div>
                  <div>
                    <span>Account Role</span>
                    <strong>{role}</strong>
                  </div>
                  <div>
                    <span>Account Status</span>
                    <strong>Signed in</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="ma-link-button"
                  onClick={() => openPage("Dashboard")}
                >
                  ← Back to Dashboard
                </button>
              </div>
            </section>
          )}

          {activePage === "Dashboard" && (
            <>
              <section className="ma-metrics-grid">
                <MetricCard
                  icon="▤"
                  title="Total Campaigns"
                  value={selectedData.campaigns}
                  change={dateRange}
                  tone="purple"
                />
                <MetricCard
                  icon="♧"
                  title="Total Reach"
                  value={selectedData.reach}
                  change={selectedData.reachChange}
                  tone="blue"
                />
                <MetricCard
                  icon="♡"
                  title="Total Engagement"
                  value={selectedData.engagement}
                  change={selectedData.engagementChange}
                  tone="violet"
                />
                <MetricCard
                  icon="▣"
                  title="Total Spend"
                  value={selectedData.spend}
                  change="Selected period"
                  tone="purple"
                />
                <MetricCard
                  icon="♔"
                  title="ROI"
                  value={selectedData.roi}
                  change={selectedData.roiChange}
                  tone="orange"
                />
              </section>

              <section className="ma-chart-grid">
                <article className="ma-panel ma-performance-panel">
                  <div className="ma-panel-heading">
                    <div>
                      <h2>Campaign Performance</h2>
                      <p>Reach, engagement and conversions · {dateRange}</p>
                    </div>
                    <button
                      type="button"
                      className="ma-link-button"
                      onClick={handleExport}
                    >
                      Export CSV ↓
                    </button>
                  </div>

                  <div className="ma-legend">
                    <span><i className="reach" /> Reach</span>
                    <span><i className="engagement" /> Engagement</span>
                    <span><i className="conversions" /> Conversions</span>
                  </div>

                  <PerformanceChart performance={selectedData.performance} />
                </article>

                <article className="ma-panel ma-top-campaigns">
                  <div className="ma-panel-heading">
                    <div>
                      <h2>Top Performing Campaigns</h2>
                      <p>Ranked by campaign reach · {dateRange}</p>
                    </div>
                  </div>

                  {selectedData.topCampaigns.map(([name, value]) => (
                    <div className="ma-bar-row" key={name}>
                      <span>{name}</span>
                      <div className="ma-bar-track">
                        <div
                          className="ma-bar-fill"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="ma-bar-axis">
                    <span>0</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </article>
              </section>

              <section className="ma-bottom-grid">
                <article className="ma-panel ma-recent-panel">
                  <div className="ma-panel-heading">
                    <div>
                      <h2>Recent Campaigns</h2>
                      <p>Monitor campaign progress and results</p>
                    </div>
                    <button
                      type="button"
                      className="ma-link-button"
                      onClick={() => openPage("Campaigns")}
                    >
                      View All →
                    </button>
                  </div>

                  <div className="ma-table-wrap">
                    <table className="ma-table">
                      <thead>
                        <tr>
                          <th>Campaign</th>
                          <th>Creator</th>
                          <th>Platform</th>
                          <th>Reach</th>
                          <th>Engagement</th>
                          <th>Spend</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCampaigns.map((campaign) => (
                          <tr key={campaign.name}>
                            <td className="ma-campaign-name">{campaign.name}</td>
                            <td>
                              <span className="ma-creator-avatar">
                                {campaign.creator}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`ma-platform ${
                                  campaign.platform === "YouTube" ? "youtube" : ""
                                }`}
                              >
                                {campaign.platform === "YouTube" ? "▶" : "◎"}
                                {" "}{campaign.platform}
                              </span>
                            </td>
                            <td>{campaign.reach}</td>
                            <td>{campaign.engagement}</td>
                            <td>{campaign.spend}</td>
                            <td>
                              <span className={`ma-status ${campaign.status.toLowerCase()}`}>
                                {campaign.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {!filteredCampaigns.length && (
                          <tr>
                            <td colSpan="7" className="ma-no-results">
                              No campaigns match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>

                <div className="ma-side-panels">
                  <article className="ma-panel ma-content-panel">
                    <div className="ma-panel-heading">
                      <div>
                        <h2>Content Distribution</h2>
                        <p>Published content by type · {dateRange}</p>
                      </div>
                    </div>

                    <div className="ma-distribution">
                      <div
                        className="ma-donut"
                        role="img"
                        aria-label="Content distribution chart"
                        style={{
                          background: `conic-gradient(${selectedData.contentTypes
                            .map((item, index, array) => {
                              const start = array
                                .slice(0, index)
                                .reduce((sum, entry) => sum + entry.percent, 0);
                              return `${item.color} ${start}% ${start + item.percent}%`;
                            })
                            .join(", ")})`,
                        }}
                      >
                        <div>
                          <strong>
                            {selectedData.posts.toLocaleString("en-IN")}
                          </strong>
                          <span>Total Posts</span>
                        </div>
                      </div>

                      <div className="ma-content-legend">
                        {selectedData.contentTypes.map((item) => (
                          <div key={item.name}>
                            <span>
                              <i style={{ background: item.color }} />
                              {item.name}
                            </span>
                            <strong>{item.percent}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>

                  <article className="ma-panel ma-audience-panel">
                    <div className="ma-panel-heading">
                      <div>
                        <h2>Audience by Location</h2>
                        <p>Audience distribution · {dateRange}</p>
                      </div>
                    </div>

                    {selectedData.locations.map(([name, value]) => (
                      <div className="ma-location-row" key={name}>
                        <span>{name}</span>
                        <div className="ma-location-track">
                          <div style={{ width: `${value}%` }} />
                        </div>
                        <strong>{value}%</strong>
                      </div>
                    ))}
                  </article>
                </div>
              </section>
            </>
          )}

          {activePage === "Campaigns" && (
            <section className="ma-panel ma-page-panel">
              <div className="ma-panel-heading">
                <div>
                  <h2>All Campaigns</h2>
                  <p>
                    {filteredCampaigns.length} campaign(s) found · {dateRange}
                  </p>
                </div>
                <button
                  type="button"
                  className="ma-link-button"
                  onClick={handleExport}
                >
                  Export CSV ↓
                </button>
              </div>

              <div className="ma-table-wrap">
                <table className="ma-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Creator</th>
                      <th>Platform</th>
                      <th>Reach</th>
                      <th>Engagement</th>
                      <th>Spend</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((campaign) => (
                      <tr key={campaign.name}>
                        <td className="ma-campaign-name">{campaign.name}</td>
                        <td>{campaign.creator}</td>
                        <td>{campaign.platform}</td>
                        <td>{campaign.reach}</td>
                        <td>{campaign.engagement}</td>
                        <td>{campaign.spend}</td>
                        <td>
                          <span className={`ma-status ${campaign.status.toLowerCase()}`}>
                            {campaign.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!filteredCampaigns.length && (
                      <tr>
                        <td colSpan="7" className="ma-no-results">
                          No campaigns found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activePage !== "Dashboard" &&
            activePage !== "Campaigns" &&
            activePage !== "Profile" && (
              <section className="ma-panel ma-page-panel">
                <span className="ma-eyebrow">CREATORIQ WORKSPACE</span>
                <h2>{activePage}</h2>

                <p>
                  {activePage === "Influencers" &&
                    "Manage creator partnerships and influencer campaign assignments."}
                  {activePage === "Content" &&
                    "Review content distribution across your marketing campaigns."}
                  {activePage === "Analytics" &&
                    "Analyze campaign reach, engagement, conversions, and return on investment."}
                  {activePage === "Reports" &&
                    "Review campaign summaries and export campaign data."}
                  {activePage === "Brand Deals" &&
                    "Track brand partnerships and sponsored campaign opportunities."}
                  {activePage === "Settings" &&
                    "Review your signed-in account information."}
                </p>

                {activePage === "Settings" && (
                  <div className="ma-account-details">
                    <div>
                      <span>Name</span>
                      <strong>{displayName}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{email}</strong>
                    </div>
                    <div>
                      <span>Role</span>
                      <strong>{role}</strong>
                    </div>
                  </div>
                )}

                {activePage === "Analytics" && (
                  <div className="ma-analytics-summary">
                    <MetricCard
                      icon="▤"
                      title="Total Campaigns"
                      value={selectedData.campaigns}
                      change={dateRange}
                      tone="purple"
                    />
                    <MetricCard
                      icon="♧"
                      title="Total Reach"
                      value={selectedData.reach}
                      change={selectedData.reachChange}
                      tone="blue"
                    />
                    <MetricCard
                      icon="♡"
                      title="Total Engagement"
                      value={selectedData.engagement}
                      change={selectedData.engagementChange}
                      tone="violet"
                    />
                    <MetricCard
                      icon="♔"
                      title="ROI"
                      value={selectedData.roi}
                      change={selectedData.roiChange}
                      tone="orange"
                    />
                  </div>
                )}

                {activePage === "Content" && (
                  <div className="ma-content-legend ma-content-page-legend">
                    {selectedData.contentTypes.map((item) => (
                      <div key={item.name}>
                        <span>
                          <i style={{ background: item.color }} />
                          {item.name}
                        </span>
                        <strong>{item.percent}%</strong>
                      </div>
                    ))}
                  </div>
                )}

                {activePage === "Reports" && (
                  <button
                    type="button"
                    className="ma-link-button"
                    onClick={handleExport}
                  >
                    Export Campaign Report (CSV) ↓
                  </button>
                )}
              </section>
            )}

          <footer className="ma-footer">
            <span>© {new Date().getFullYear()} CreatorIQ</span>
            <span>Creator Analytics &amp; Content Performance · {dateRange}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

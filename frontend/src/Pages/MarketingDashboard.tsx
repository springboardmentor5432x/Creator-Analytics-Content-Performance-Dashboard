import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Download,
  Eye,
  FileText,
  Filter,
  Heart,
  LayoutDashboard,
  Megaphone,
  MousePointerClick,
  Search,
  Settings,
  Share2,
  Target,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import "./MarketingDashboard.css";

const campaigns = [
  {
    name: "Summer Essentials",
    brand: "Urban Threads",
    platform: "Instagram",
    status: "Active",
    reach: "248.6K",
    engagement: "8.4%",
    clicks: "12.8K",
    spend: "₹42,000",
    progress: 78,
  },
  {
    name: "Glow Naturally",
    brand: "Pure Bloom",
    platform: "YouTube",
    status: "Active",
    reach: "186.2K",
    engagement: "7.2%",
    clicks: "9.4K",
    spend: "₹36,500",
    progress: 64,
  },
  {
    name: "Everyday Comfort",
    brand: "Mode Studio",
    platform: "Instagram",
    status: "Completed",
    reach: "312.4K",
    engagement: "9.1%",
    clicks: "16.2K",
    spend: "₹48,000",
    progress: 100,
  },
  {
    name: "Tech That Moves",
    brand: "Nova Tech",
    platform: "YouTube",
    status: "Planning",
    reach: "—",
    engagement: "—",
    clicks: "—",
    spend: "₹25,000",
    progress: 18,
  },
];

const creators = [
  {
    name: "Ananya Menon",
    handle: "@ananyacreates",
    category: "Lifestyle",
    platform: "Instagram",
    reach: "86.4K",
    engagement: "9.8%",
    change: "+18.4%",
    initials: "AM",
  },
  {
    name: "Riya Sharma",
    handle: "@riyastories",
    category: "Beauty",
    platform: "YouTube",
    reach: "124.8K",
    engagement: "8.6%",
    change: "+14.2%",
    initials: "RS",
  },
  {
    name: "Arjun Nair",
    handle: "@arjunframes",
    category: "Technology",
    platform: "Instagram",
    reach: "62.1K",
    engagement: "7.9%",
    change: "+11.7%",
    initials: "AN",
  },
];

const activities = [
  {
    title: "Campaign reached its target",
    detail: "Everyday Comfort · Mode Studio",
    time: "12 minutes ago",
    type: "success",
  },
  {
    title: "New creator joined",
    detail: "Ananya Menon joined Summer Essentials",
    time: "48 minutes ago",
    type: "creator",
  },
  {
    title: "Performance report generated",
    detail: "Glow Naturally · Weekly report",
    time: "2 hours ago",
    type: "report",
  },
  {
    title: "Budget approval required",
    detail: "Tech That Moves · Nova Tech",
    time: "4 hours ago",
    type: "budget",
  },
];

const performanceData = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 48 },
  { day: "Thu", value: 76 },
  { day: "Fri", value: 63 },
  { day: "Sat", value: 88 },
  { day: "Sun", value: 72 },
];

function MarketingDashboard() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All platforms");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform =
      platformFilter === "All platforms" ||
      campaign.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  const handleExport = () => {
    const headers = [
      "Campaign",
      "Brand",
      "Platform",
      "Status",
      "Reach",
      "Engagement",
      "Clicks",
      "Spend",
    ];

    const rows = campaigns.map((campaign) => [
      campaign.name,
      campaign.brand,
      campaign.platform,
      campaign.status,
      campaign.reach,
      campaign.engagement,
      campaign.clicks,
      campaign.spend,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "creatoriq-marketing-campaigns.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="marketing-dashboard">
      <aside className="marketing-sidebar">
        <div className="marketing-brand">
          <div className="marketing-brand-mark">C</div>
          <div>
            <h2>CreatorIQ</h2>
            <span>CREATOR INTELLIGENCE</span>
          </div>
        </div>

        <div className="marketing-workspace">
          <div className="marketing-workspace-icon">
            <BarChart3 size={19} />
          </div>

          <div className="marketing-workspace-text">
            <strong>Marketing Team</strong>
            <span>Workspace</span>
          </div>

          <ChevronDown size={16} />
        </div>

        <p className="marketing-nav-label">WORKSPACE</p>

        <nav className="marketing-nav">
          <button
            className={`marketing-nav-item ${
              activeNav === "Overview" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Overview")}
          >
            <LayoutDashboard size={19} />
            <span>Overview</span>
          </button>

          <button
            className={`marketing-nav-item ${
              activeNav === "Campaigns" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Campaigns")}
          >
            <Megaphone size={19} />
            <span>Campaigns</span>
            <span className="marketing-nav-count">4</span>
          </button>

          <button
            className={`marketing-nav-item ${
              activeNav === "Analytics" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Analytics")}
          >
            <BarChart3 size={19} />
            <span>Analytics</span>
          </button>

          <button
            className={`marketing-nav-item ${
              activeNav === "Creators" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Creators")}
          >
            <Users size={19} />
            <span>Creators</span>
          </button>

          <button
            className={`marketing-nav-item ${
              activeNav === "Reports" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Reports")}
          >
            <FileText size={19} />
            <span>Reports</span>
          </button>
        </nav>

        <div className="marketing-sidebar-bottom">
          <div className="marketing-help-card">
            <div className="marketing-help-icon">
              <CircleHelp size={20} />
            </div>
            <strong>Need a hand?</strong>
            <p>Explore your campaign tools and insights.</p>
            <button onClick={() => setShowReport(true)}>
              Explore tools <span>↗</span>
            </button>
          </div>

          <button
            className={`marketing-nav-item ${
              activeNav === "Settings" ? "active" : ""
            }`}
            onClick={() => setActiveNav("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="marketing-profile">
            <div className="marketing-avatar marketing-avatar-dark">MT</div>
            <div className="marketing-profile-info">
              <strong>Marketing Team</strong>
              <span>marketing@creatoriq.demo</span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <main className="marketing-main">
        <header className="marketing-topbar">
          <div className="marketing-breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>{activeNav}</strong>
          </div>

          <div className="marketing-topbar-actions">
            <div className="marketing-live-status">
              <span className="marketing-live-dot"></span>
              Demo workspace
            </div>

            <button
              className="marketing-icon-button"
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={19} />
              <span className="marketing-notification-dot"></span>
            </button>

            <div className="marketing-avatar marketing-avatar-lime">
              MT
            </div>
          </div>

          {showNotifications && (
            <div className="marketing-notification-panel">
              <div className="marketing-panel-heading">
                <strong>Notifications</strong>
                <span>4 updates</span>
              </div>

              {activities.slice(0, 3).map((activity) => (
                <div
                  className="marketing-notification-item"
                  key={activity.title}
                >
                  <span className="marketing-notification-bullet"></span>
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="marketing-content">
          <section className="marketing-welcome">
            <div>
              <div className="marketing-eyebrow">
                <span></span> MARKETING INTELLIGENCE
              </div>

              <h1>
                Good work starts
                <br />
                with <span>good insights.</span>
              </h1>

              <p>
                Your campaign performance, creator impact, and marketing
                spend — all in one place.
              </p>
            </div>

            <div className="marketing-welcome-actions">
              <button
                className="marketing-button-secondary"
                onClick={handleExport}
              >
                <Download size={17} />
                Export data
              </button>

              <button
                className="marketing-button-primary"
                onClick={() => setShowReport(true)}
              >
                <FileText size={17} />
                Generate report
              </button>
            </div>
          </section>

          {activeNav !== "Overview" && (
            <div className="marketing-section-notice">
              <div>
                <strong>{activeNav}</strong>
                <p>
                  You are viewing the {activeNav.toLowerCase()} section
                  of the demo workspace.
                </p>
              </div>

              <button onClick={() => setActiveNav("Overview")}>
                Back to overview
              </button>
            </div>
          )}

          <section className="marketing-filter-row">
            <div className="marketing-date-range">
              <CalendarDays size={17} />
              <span>Last 7 days</span>
              <ChevronDown size={15} />
            </div>

            <div className="marketing-filter-note">
              <span className="marketing-live-dot"></span>
              Sample analytics data
            </div>
          </section>

          <section className="marketing-stats-grid">
            <article className="marketing-stat-card">
              <div className="marketing-stat-top">
                <span>Total reach</span>
                <div className="marketing-stat-icon lime">
                  <Eye size={19} />
                </div>
              </div>

              <h2>1.24M</h2>

              <div className="marketing-stat-bottom">
                <span className="marketing-growth">
                  <ArrowUpRight size={15} /> 18.6%
                </span>
                <span>vs. previous week</span>
              </div>

              <div className="marketing-mini-bars">
                {[35, 49, 40, 65, 54, 79, 61, 88, 72, 96, 78, 100].map(
                  (height, index) => (
                    <span
                      key={index}
                      style={{ height: `${height}%` }}
                    ></span>
                  ),
                )}
              </div>
            </article>

            <article className="marketing-stat-card">
              <div className="marketing-stat-top">
                <span>Engagement rate</span>
                <div className="marketing-stat-icon dark">
                  <Heart size={19} />
                </div>
              </div>

              <h2>8.42%</h2>

              <div className="marketing-stat-bottom">
                <span className="marketing-growth">
                  <ArrowUpRight size={15} /> 2.3%
                </span>
                <span>vs. previous week</span>
              </div>

              <div className="marketing-stat-progress">
                <div style={{ width: "84.2%" }}></div>
              </div>

              <p className="marketing-stat-caption">
                Strong audience interaction
              </p>
            </article>

            <article className="marketing-stat-card">
              <div className="marketing-stat-top">
                <span>Total impressions</span>
                <div className="marketing-stat-icon beige">
                  <Activity size={19} />
                </div>
              </div>

              <h2>3.86M</h2>

              <div className="marketing-stat-bottom">
                <span className="marketing-growth">
                  <ArrowUpRight size={15} /> 12.8%
                </span>
                <span>vs. previous week</span>
              </div>

              <div className="marketing-impression-line">
                <svg viewBox="0 0 240 46" preserveAspectRatio="none">
                  <path
                    d="M0,37 C20,33 25,39 44,24 S70,30 88,18 S117,26 138,13 S168,23 186,8 S220,14 240,3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </article>

            <article className="marketing-stat-card">
              <div className="marketing-stat-top">
                <span>Marketing spend</span>
                <div className="marketing-stat-icon peach">
                  <Wallet size={19} />
                </div>
              </div>

              <h2>₹1.51L</h2>

              <div className="marketing-stat-bottom">
                <span className="marketing-spend-neutral">
                  <ArrowDownRight size={15} /> 4.2%
                </span>
                <span>vs. previous week</span>
              </div>

              <div className="marketing-budget-track">
                <div></div>
              </div>

              <p className="marketing-stat-caption">
                68% of allocated budget used
              </p>
            </article>
          </section>

          <section className="marketing-analytics-grid">
            <article className="marketing-panel marketing-performance-panel">
              <div className="marketing-panel-header">
                <div>
                  <span className="marketing-section-kicker">
                    PERFORMANCE OVERVIEW
                  </span>
                  <h3>Campaign reach</h3>
                  <p>Audience reached throughout the week</p>
                </div>

                <button
                  className="marketing-dropdown-button"
                  onClick={() => setShowReport(true)}
                >
                  This week <ChevronDown size={15} />
                </button>
              </div>

              <div className="marketing-chart-summary">
                <strong>248,600</strong>
                <span>
                  <TrendingUp size={15} /> +18.6%
                </span>
              </div>

              <div className="marketing-chart">
                <div className="marketing-chart-y-axis">
                  <span>300K</span>
                  <span>200K</span>
                  <span>100K</span>
                  <span>0</span>
                </div>

                <div className="marketing-chart-area">
                  <div className="marketing-chart-grid-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <svg
                    className="marketing-chart-svg"
                    viewBox="0 0 700 220"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Illustrative weekly campaign reach chart"
                  >
                    <defs>
                      <linearGradient
                        id="marketingChartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#C3FF35"
                          stopOpacity="0.42"
                        />
                        <stop
                          offset="100%"
                          stopColor="#C3FF35"
                          stopOpacity="0.01"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M0,168 C35,156 58,177 100,133 S160,153 200,109 S260,130 300,87 S360,119 400,72 S465,102 500,61 S560,81 600,44 S655,59 700,18 L700,220 L0,220 Z"
                      fill="url(#marketingChartFill)"
                    />

                    <path
                      d="M0,168 C35,156 58,177 100,133 S160,153 200,109 S260,130 300,87 S360,119 400,72 S465,102 500,61 S560,81 600,44 S655,59 700,18"
                      fill="none"
                      stroke="#8DBB16"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    <circle cx="700" cy="18" r="6" fill="#25271F" />
                    <circle
                      cx="700"
                      cy="18"
                      r="3"
                      fill="#C3FF35"
                    />
                  </svg>

                  <div className="marketing-chart-x-axis">
                    {performanceData.map((item) => (
                      <span key={item.day}>{item.day}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="marketing-chart-footer">
                <span>
                  <i className="marketing-legend-dot"></i>
                  Campaign reach
                </span>
                <span>Illustrative demo data</span>
              </div>
            </article>

            <article className="marketing-panel marketing-platform-panel">
              <div className="marketing-panel-header">
                <div>
                  <span className="marketing-section-kicker">
                    CHANNEL BREAKDOWN
                  </span>
                  <h3>Platform mix</h3>
                  <p>Where your audience is coming from</p>
                </div>

                <button
                  className="marketing-icon-button"
                  aria-label="Platform information"
                  onClick={() => setShowReport(true)}
                >
                  <Activity size={18} />
                </button>
              </div>

              <div className="marketing-platform-total">
                <div>
                  <span>Total impressions</span>
                  <h2>3.86M</h2>
                </div>

                <span className="marketing-growth">
                  <ArrowUpRight size={15} /> 12.8%
                </span>
              </div>

              <div className="marketing-platform-stack">
                <div className="marketing-platform-instagram"></div>
                <div className="marketing-platform-youtube"></div>
                <div className="marketing-platform-other"></div>
              </div>

              <div className="marketing-platform-list">
                <div className="marketing-platform-row">
                  <div className="marketing-platform-name">
                    <span className="marketing-platform-dot instagram"></span>
                    <div>
                      <strong>Instagram</strong>
                      <span>Social discovery</span>
                    </div>
                  </div>
                  <div className="marketing-platform-value">
                    <strong>58%</strong>
                    <span>2.24M</span>
                  </div>
                </div>

                <div className="marketing-platform-row">
                  <div className="marketing-platform-name">
                    <span className="marketing-platform-dot youtube"></span>
                    <div>
                      <strong>YouTube</strong>
                      <span>Video content</span>
                    </div>
                  </div>
                  <div className="marketing-platform-value">
                    <strong>29%</strong>
                    <span>1.12M</span>
                  </div>
                </div>

                <div className="marketing-platform-row">
                  <div className="marketing-platform-name">
                    <span className="marketing-platform-dot other"></span>
                    <div>
                      <strong>Other</strong>
                      <span>Additional channels</span>
                    </div>
                  </div>
                  <div className="marketing-platform-value">
                    <strong>13%</strong>
                    <span>0.50M</span>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="marketing-panel marketing-campaign-panel">
            <div className="marketing-panel-header marketing-campaign-heading">
              <div>
                <span className="marketing-section-kicker">
                  CAMPAIGN MANAGEMENT
                </span>
                <h3>Campaign performance</h3>
                <p>Track your active campaigns and their results.</p>
              </div>

              <button
                className="marketing-button-secondary"
                onClick={handleExport}
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>

            <div className="marketing-table-toolbar">
              <div className="marketing-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search campaigns or brands..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="marketing-table-filter">
                <Filter size={16} />
                <select
                  value={platformFilter}
                  onChange={(event) =>
                    setPlatformFilter(event.target.value)
                  }
                  aria-label="Filter campaigns by platform"
                >
                  <option>All platforms</option>
                  <option>Instagram</option>
                  <option>YouTube</option>
                </select>
              </div>
            </div>

            <div className="marketing-table-wrap">
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>CAMPAIGN / BRAND</th>
                    <th>PLATFORM</th>
                    <th>STATUS</th>
                    <th>REACH</th>
                    <th>ENGAGEMENT</th>
                    <th>CLICKS</th>
                    <th>SPEND</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.name}>
                      <td>
                        <div className="marketing-campaign-name">
                          <div className="marketing-campaign-icon">
                            <Megaphone size={18} />
                          </div>

                          <div>
                            <strong>{campaign.name}</strong>
                            <span>{campaign.brand}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="marketing-platform-badge">
                          {campaign.platform === "YouTube" ? (
                            <Video size={15} />
                          ) : (
                            <Share2 size={15} />
                          )}
                          {campaign.platform}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`marketing-status ${
                            campaign.status === "Active"
                              ? "status-active"
                              : campaign.status === "Completed"
                                ? "status-completed"
                                : "status-planning"
                          }`}
                        >
                          <span></span>
                          {campaign.status}
                        </span>
                      </td>

                      <td className="marketing-table-number">
                        {campaign.reach}
                      </td>

                      <td className="marketing-table-number">
                        {campaign.engagement}
                      </td>

                      <td className="marketing-table-number">
                        {campaign.clicks}
                      </td>

                      <td className="marketing-table-number">
                        {campaign.spend}
                      </td>
                    </tr>
                  ))}

                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="marketing-empty-state"
                      >
                        No campaigns match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="marketing-table-footer">
              <span>
                Showing {filteredCampaigns.length} of {campaigns.length}{" "}
                campaigns
              </span>

              <span>Demo data · Not connected to a live account</span>
            </div>
          </section>

          <section className="marketing-bottom-grid">
            <article className="marketing-panel marketing-creators-panel">
              <div className="marketing-panel-header">
                <div>
                  <span className="marketing-section-kicker">
                    CREATOR INSIGHTS
                  </span>
                  <h3>Top-performing creators</h3>
                  <p>Creators driving the strongest engagement.</p>
                </div>

                <button
                  className="marketing-text-button"
                  onClick={() => setActiveNav("Creators")}
                >
                  View all <span>↗</span>
                </button>
              </div>

              <div className="marketing-creator-list">
                {creators.map((creator, index) => (
                  <div
                    className="marketing-creator-row"
                    key={creator.handle}
                  >
                    <span className="marketing-creator-rank">
                      0{index + 1}
                    </span>

                    <div
                      className={`marketing-avatar marketing-creator-avatar avatar-${index}`}
                    >
                      {creator.initials}
                    </div>

                    <div className="marketing-creator-details">
                      <strong>{creator.name}</strong>
                      <span>{creator.handle}</span>
                    </div>

                    <div className="marketing-creator-metrics">
                      <strong>{creator.engagement}</strong>
                      <span>Engagement</span>
                    </div>

                    <div className="marketing-creator-growth">
                      <ArrowUpRight size={14} />
                      {creator.change}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="marketing-panel marketing-activity-panel">
              <div className="marketing-panel-header">
                <div>
                  <span className="marketing-section-kicker">
                    LATEST UPDATES
                  </span>
                  <h3>Recent activity</h3>
                  <p>What is happening across your workspace.</p>
                </div>

                <button
                  className="marketing-icon-button"
                  aria-label="Activity details"
                  onClick={() => setShowNotifications(true)}
                >
                  <Activity size={18} />
                </button>
              </div>

              <div className="marketing-activity-list">
                {activities.map((activity) => (
                  <div
                    className="marketing-activity-item"
                    key={activity.title}
                  >
                    <div
                      className={`marketing-activity-icon ${activity.type}`}
                    >
                      {activity.type === "success" && (
                        <Target size={16} />
                      )}
                      {activity.type === "creator" && (
                        <Users size={16} />
                      )}
                      {activity.type === "report" && (
                        <FileText size={16} />
                      )}
                      {activity.type === "budget" && (
                        <Wallet size={16} />
                      )}
                    </div>

                    <div className="marketing-activity-details">
                      <strong>{activity.title}</strong>
                      <span>{activity.detail}</span>
                      <small>{activity.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <footer className="marketing-footer">
            <div className="marketing-footer-brand">
              <span className="marketing-footer-mark">C</span>
              <strong>CreatorIQ</strong>
              <span>Creator intelligence, made clearer.</span>
            </div>

            <span>
              Marketing Team Dashboard · Frontend demo · 2026
            </span>
          </footer>
        </div>
      </main>

      {showReport && (
        <div
          className="marketing-modal-overlay"
          onClick={() => setShowReport(false)}
        >
          <div
            className="marketing-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="marketing-modal-close"
              onClick={() => setShowReport(false)}
              aria-label="Close dialog"
            >
              ×
            </button>

            <div className="marketing-modal-icon">
              <FileText size={24} />
            </div>

            <span className="marketing-section-kicker">
              CREATORIQ ANALYTICS
            </span>

            <h2>Marketing insights</h2>

            <p>
              This dashboard currently uses sample data for demonstration.
              You can export the campaign table as a CSV file to review the
              sample performance figures.
            </p>

            <div className="marketing-modal-summary">
              <div>
                <span>Campaigns</span>
                <strong>04</strong>
              </div>
              <div>
                <span>Total reach</span>
                <strong>1.24M</strong>
              </div>
              <div>
                <span>Engagement</span>
                <strong>8.42%</strong>
              </div>
            </div>

            <button
              className="marketing-button-primary marketing-modal-action"
              onClick={() => {
                setShowReport(false);
                handleExport();
              }}
            >
              <Download size={17} />
              Export sample report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingDashboard;
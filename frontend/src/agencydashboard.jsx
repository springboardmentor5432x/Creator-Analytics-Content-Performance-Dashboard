
import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./agency-dashboard.css";

const campaignPerformance = [
  { month: "May", reach: 1200, engagement: 320 },
  { month: "Jun", reach: 1800, engagement: 480 },
  { month: "Jul", reach: 1500, engagement: 400 },
  { month: "Aug", reach: 2400, engagement: 650 },
  { month: "Sep", reach: 2800, engagement: 720 },
  { month: "Oct", reach: 3500, engagement: 950 },
];

const creatorEngagement = [
  { name: "Arun", engagement: 78 },
  { name: "Priya", engagement: 92 },
  { name: "Rahul", engagement: 65 },
  { name: "Divya", engagement: 84 },
];

const chartColors = ["#6558f5", "#18a984", "#f5a623"];

function AgencyDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  const [creators] = useState([
    {
      id: 1,
      name: "Arun Kumar",
      email: "arun@example.com",
      platform: "Instagram",
      followers: "125K",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya@example.com",
      platform: "YouTube",
      followers: "85K",
      status: "Active",
    },
    {
      id: 3,
      name: "Rahul Raj",
      email: "rahul@example.com",
      platform: "Instagram",
      followers: "52K",
      status: "Pending",
    },
    {
      id: 4,
      name: "Divya S",
      email: "divya@example.com",
      platform: "Facebook",
      followers: "42K",
      status: "Active",
    },
  ]);

  const [campaigns] = useState([
    {
      id: 1,
      name: "Summer Fashion",
      creator: "Arun Kumar",
      budget: 50000,
      status: "Active",
    },
    {
      id: 2,
      name: "Beauty Promotion",
      creator: "Priya Sharma",
      budget: 35000,
      status: "In Progress",
    },
    {
      id: 3,
      name: "Lifestyle Launch",
      creator: "Rahul Raj",
      budget: 25000,
      status: "Pending",
    },
  ]);

  const campaignStatusData = [
    {
      name: "Active",
      value: campaigns.filter((c) => c.status === "Active").length,
    },
    {
      name: "In Progress",
      value: campaigns.filter((c) => c.status === "In Progress").length,
    },
    {
      name: "Pending",
      value: campaigns.filter((c) => c.status === "Pending").length,
    },
  ];

  const menuItems = [
    { name: "Overview", icon: "◫" },
    { name: "Creator Management", icon: "♙" },
    { name: "Campaigns", icon: "▣" },
    { name: "Analytics", icon: "▥" },
    { name: "Reports", icon: "▤" },
    { name: "Settings", icon: "⚙" },
  ];

  const filteredCreators = creators.filter((creator) =>
    `${creator.name} ${creator.email} ${creator.platform}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const activeCampaigns = campaigns.filter(
    (campaign) =>
      campaign.status === "Active" ||
      campaign.status === "In Progress"
  ).length;

  const totalBudget = campaigns.reduce(
    (total, campaign) => total + campaign.budget,
    0
  );

  const stats = [
    {
      title: "Total Creators",
      value: creators.length,
      icon: "♙",
      color: "purple",
      note: "Creators in your directory",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns,
      icon: "▣",
      color: "green",
      note: "Currently running",
    },
    {
      title: "Total Budget",
      value: `₹${(totalBudget / 1000).toFixed(0)}K`,
      icon: "₹",
      color: "orange",
      note: "Across listed campaigns",
    },
    {
      title: "Pending Campaigns",
      value: campaigns.filter((c) => c.status === "Pending").length,
      icon: "◷",
      color: "pink",
      note: "Awaiting action",
    },
  ];

  const statusClass = (status) =>
    status.toLowerCase().replace(/\s+/g, "-");

  const formatCurrency = (amount) =>
    `₹${amount.toLocaleString("en-IN")}`;

  function renderCampaignTable() {
    return (
      <div className="agency-table-wrapper">
        <table className="agency-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Creator</th>
              <th>Budget</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>
                  <strong>{campaign.name}</strong>
                </td>
                <td>{campaign.creator}</td>
                <td>{formatCurrency(campaign.budget)}</td>
                <td>
                  <span
                    className={`agency-status ${statusClass(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderAnalytics() {
    return (
      <>
        <section className="agency-graphs-grid">
          <article className="agency-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Campaign Performance</h3>
                <p>Example reach and engagement over six months</p>
              </div>
            </div>

            <div className="agency-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignPerformance}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8eaf3"
                  />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="reach"
                    name="Reach"
                    stroke="#6558f5"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#18a984"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="agency-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Creator Engagement</h3>
                <p>Example engagement scores out of 100</p>
              </div>
            </div>

            <div className="agency-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={creatorEngagement}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8eaf3"
                  />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey="engagement"
                    name="Engagement score"
                    fill="#6558f5"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="agency-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Campaign Status</h3>
                <p>Distribution of listed campaigns</p>
              </div>
            </div>

            <div className="agency-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={campaignStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {campaignStatusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </>
    );
  }

  return (
    <div className="agency-dashboard">
      <aside className="agency-sidebar">
        <div className="agency-brand">
          <div className="agency-brand-icon">C</div>
          <div>
            <h2>CreatorIQ</h2>
            <span>Agency Portal</span>
          </div>
        </div>

        <div className="agency-menu-label">WORKSPACE</div>

        <nav className="agency-nav">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`agency-nav-item ${
                activeTab === item.name ? "selected" : ""
              }`}
              onClick={() => setActiveTab(item.name)}
            >
              <span className="agency-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="agency-sidebar-bottom">
          <div className="agency-help-icon">?</div>
          <h4>Need help?</h4>
          <p>Manage your creators and campaigns in one place.</p>
          <button
            type="button"
            onClick={() => setActiveTab("Reports")}
          >
            View reports
          </button>
        </div>

        <div className="agency-sidebar-footer">
          <div className="agency-avatar">
            {(user?.name || user?.email || "A")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="agency-footer-user">
            <strong>
              {user?.name || user?.email || "Agency Manager"}
            </strong>
            <span>Agency Account</span>
          </div>
        </div>
      </aside>

      <main className="agency-main">
        <header className="agency-topbar">
          <div>
            <div className="agency-breadcrumb">
              Workspace / {activeTab}
            </div>
            <h1>{activeTab}</h1>
            <p>
              Manage your creators, campaigns and brand partnerships.
            </p>
          </div>

          <div className="agency-top-actions">
            <button
              type="button"
              className="agency-notification"
              aria-label="Notifications"
              onClick={() =>
                window.alert("You have no new notifications.")
              }
            >
              ♧<span />
            </button>
            <div className="agency-profile">
              <div className="agency-avatar">
                {(user?.name || user?.email || "A")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <strong>
                  {user?.name || user?.email || "Agency Manager"}
                </strong>
                <span>Agency Manager</span>
              </div>
            </div>
          </div>
        </header>

        {activeTab === "Overview" && (
          <>
            <section className="agency-welcome">
              <div>
                <span className="agency-eyebrow">
                  AGENCY WORKSPACE
                </span>
                <h2>
                  Welcome back,{" "}
                  {user?.name || "Agency Manager"}!
                </h2>
                <p>
                  Here is an overview of your creator network and
                  campaigns.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("Campaigns")}
                >
                  Explore campaigns <span>→</span>
                </button>
              </div>
              <div className="agency-welcome-art">✦</div>
            </section>

            <section className="agency-stats-grid">
              {stats.map((stat) => (
                <article
                  className="agency-stat-card"
                  key={stat.title}
                >
                  <div className="agency-stat-top">
                    <span>{stat.title}</span>
                    <div className={`agency-stat-icon ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                  <h2>{stat.value}</h2>
                  <p>{stat.note}</p>
                </article>
              ))}
            </section>

            {renderAnalytics()}

            <section className="agency-panel agency-campaign-panel">
              <div className="agency-panel-heading">
                <div>
                  <h3>Recent Campaigns</h3>
                  <p>Track your ongoing collaborations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Campaigns")}
                >
                  View all →
                </button>
              </div>
              {renderCampaignTable()}
            </section>

            <section className="agency-panel agency-activity-panel">
              <div className="agency-panel-heading">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Jump to a workspace section</p>
                </div>
              </div>

              <div className="agency-quick-actions">
                <button
                  type="button"
                  onClick={() => setActiveTab("Creator Management")}
                >
                  <span>♙</span>
                  <div>
                    <strong>Manage Creators</strong>
                    <small>Browse your creator directory</small>
                  </div>
                  <b>→</b>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("Campaigns")}
                >
                  <span>▣</span>
                  <div>
                    <strong>Track Campaigns</strong>
                    <small>Review budgets and statuses</small>
                  </div>
                  <b>→</b>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("Analytics")}
                >
                  <span>▥</span>
                  <div>
                    <strong>View Analytics</strong>
                    <small>Explore performance insights</small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </section>
          </>
        )}

        {activeTab === "Creator Management" && (
          <section className="agency-panel agency-page-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Creator Management</h3>
                <p>Search and review creators in your directory.</p>
              </div>
              <span className="agency-count-badge">
                {filteredCreators.length} creators
              </span>
            </div>

            <input
              className="agency-search"
              type="search"
              placeholder="Search by creator, email or platform..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="agency-table-wrapper">
              <table className="agency-table">
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Platform</th>
                    <th>Followers</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.map((creator) => (
                    <tr key={creator.id}>
                      <td>
                        <strong>{creator.name}</strong>
                        <small className="agency-cell-subtitle">
                          {creator.email}
                        </small>
                      </td>
                      <td>{creator.platform}</td>
                      <td>{creator.followers}</td>
                      <td>
                        <span
                          className={`agency-status ${statusClass(
                            creator.status
                          )}`}
                        >
                          {creator.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredCreators.length === 0 && (
                    <tr>
                      <td colSpan="4" className="agency-empty">
                        No creators match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "Campaigns" && (
          <section className="agency-panel agency-page-panel">
            <div className="agency-panel-heading">
              <div>
                <h3>Campaign Management</h3>
                <p>Review campaign budgets and progress.</p>
              </div>
              <span className="agency-count-badge">
                {campaigns.length} campaigns
              </span>
            </div>
            {renderCampaignTable()}
          </section>
        )}

        {activeTab === "Analytics" && (
          <>
            <section className="agency-stats-grid">
              {stats.map((stat) => (
                <article className="agency-stat-card" key={stat.title}>
                  <div className="agency-stat-top">
                    <span>{stat.title}</span>
                    <div className={`agency-stat-icon ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                  <h2>{stat.value}</h2>
                  <p>{stat.note}</p>
                </article>
              ))}
            </section>
            {renderAnalytics()}
          </>
        )}

        {activeTab === "Reports" && (
          <section className="agency-panel agency-page-panel">
            <h3>Agency Reports</h3>
            <p>
              Review creator and campaign summaries using the example
              analytics shown on your dashboard.
            </p>
            <button
              type="button"
              className="agency-primary-button"
              onClick={() =>
                window.alert(
                  "Report export is not connected yet."
                )
              }
            >
              Export report
            </button>
          </section>
        )}

        {activeTab === "Settings" && (
          <section className="agency-panel agency-page-panel">
            <h3>Agency Settings</h3>
            <p>
              Account: {user?.email || "Agency account"}
            </p>
            <p>
              Connect these settings to your backend to save agency
              details and account preferences.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default AgencyDashboard;

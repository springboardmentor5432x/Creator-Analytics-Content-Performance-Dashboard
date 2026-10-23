
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
  Cell
} from "recharts";
import "./marketing-dashboard.css";

const performanceData = [
  { month: "Jan", reach: 12000, clicks: 1800 },
  { month: "Feb", reach: 18000, clicks: 2500 },
  { month: "Mar", reach: 15000, clicks: 2200 },
  { month: "Apr", reach: 24000, clicks: 3900 },
  { month: "May", reach: 28000, clicks: 4600 },
  { month: "Jun", reach: 35000, clicks: 5800 }
];

const channelData = [
  { name: "Instagram", value: 45 },
  { name: "YouTube", value: 30 },
  { name: "TikTok", value: 25 }
];

const campaigns = [
  { name: "Summer Launch", platform: "Instagram", budget: 50000, spent: 32000, status: "Active" },
  { name: "Brand Awareness", platform: "YouTube", budget: 80000, spent: 55000, status: "Active" },
  { name: "Product Promotion", platform: "Instagram", budget: 40000, spent: 40000, status: "Completed" },
  { name: "New Audience", platform: "TikTok", budget: 60000, spent: 18000, status: "Active" }
];

const creators = [
  { name: "Aarav Sharma", platform: "Instagram", followers: "125K", engagement: "8.4%" },
  { name: "Priya Kumar", platform: "YouTube", followers: "210K", engagement: "7.8%" },
  { name: "Riya Patel", platform: "Instagram", followers: "86K", engagement: "9.2%" },
  { name: "Arjun Das", platform: "TikTok", followers: "98K", engagement: "6.9%" }
];

export default function MarketingDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);

  const filteredCreators = creators.filter((creator) =>
    creator.name.toLowerCase().includes(search.toLowerCase()) ||
    creator.platform.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = ["Overview", "Campaigns", "Creators", "Analytics", "Reports"];

  return (
    <div className="marketing-dashboard">
      <aside className="marketing-sidebar">
        <div className="marketing-brand">
          <div className="marketing-logo">C</div>
          <div>
            <h2>CreatorIQ</h2>
            <span>Marketing Studio</span>
          </div>
        </div>

        <div className="marketing-user">
          <div className="marketing-avatar">
            {(user?.full_name || "M").charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user?.full_name || "Marketing User"}</strong>
            <span>Marketing Team</span>
          </div>
        </div>

        <p className="marketing-menu-label">WORKSPACE</p>

        {tabs.map((tab) => (
          <button
            key={tab}
            className={`marketing-nav ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            <span>
              {{
                Overview: "▦",
                Campaigns: "◈",
                Creators: "♙",
                Analytics: "▥",
                Reports: "▤"
              }[tab]}
            </span>
            {tab}
          </button>
        ))}

        <div className="marketing-sidebar-bottom">
          <span>CAMPAIGN INSIGHTS</span>
          <p>Track reach, engagement and budget from one workspace.</p>
        </div>
      </aside>

      <main className="marketing-main">
        <header className="marketing-topbar">
          <div>
            <p>CreatorIQ / Marketing</p>
            <h1>{activeTab}</h1>
          </div>
          <div className="marketing-top-actions">
            <span className="marketing-status">● Workspace active</span>
            <div className="marketing-avatar small">
              {(user?.full_name || "M").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {activeTab === "Overview" && (
          <>
            <section className="marketing-welcome">
              <div>
                <span className="marketing-eyebrow">MARKETING OVERVIEW</span>
                <h2>Make every campaign count.</h2>
                <p>Monitor campaign performance and discover creator opportunities.</p>
              </div>
              <div className="marketing-welcome-icon">↗</div>
            </section>

            <section className="marketing-stats">
              <article className="marketing-stat">
                <span>Total Reach</span>
                <h2>142.8K</h2>
                <p className="positive">↑ 18.6% <span>vs last month</span></p>
              </article>
              <article className="marketing-stat">
                <span>Campaigns</span>
                <h2>{campaigns.length}</h2>
                <p>Across 3 platforms</p>
              </article>
              <article className="marketing-stat">
                <span>Budget Used</span>
                <h2>{Math.round((totalSpent / totalBudget) * 100)}%</h2>
                <p>₹{totalSpent.toLocaleString("en-IN")} spent</p>
              </article>
              <article className="marketing-stat">
                <span>Creator Partners</span>
                <h2>{creators.length}</h2>
                <p>Across social channels</p>
              </article>
            </section>

            <section className="marketing-chart-grid">
              <article className="marketing-card marketing-wide">
                <div className="marketing-card-heading">
                  <div>
                    <h3>Campaign Performance</h3>
                    <p>Reach and clicks over six months</p>
                  </div>
                  <span className="marketing-chip">6 months</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9edf5" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      name="Reach"
                      stroke="#6558e8"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      name="Clicks"
                      stroke="#19b89a"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="marketing-card">
                <div className="marketing-card-heading">
                  <div>
                    <h3>Channel Distribution</h3>
                    <p>Illustrative audience reach share</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={channelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {channelData.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={["#6558e8", "#19b89a", "#f4b544"][index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </article>

              <article className="marketing-card marketing-wide">
                <div className="marketing-card-heading">
                  <div>
                    <h3>Creator Engagement</h3>
                    <p>Compare campaign reach and click volume</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9edf5" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reach" name="Reach" fill="#6558e8" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="clicks" name="Clicks" fill="#19b89a" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </section>
          </>
        )}

        {activeTab === "Campaigns" && (
          <section className="marketing-card marketing-table-card">
            <div className="marketing-card-heading">
              <div>
                <h3>Campaign Management</h3>
                <p>Review campaign budgets and current status.</p>
              </div>
            </div>
            <div className="marketing-table-wrap">
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Platform</th>
                    <th>Budget</th>
                    <th>Spent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.name}>
                      <td><strong>{campaign.name}</strong></td>
                      <td>{campaign.platform}</td>
                      <td>₹{campaign.budget.toLocaleString("en-IN")}</td>
                      <td>₹{campaign.spent.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={`marketing-badge ${campaign.status.toLowerCase()}`}>
                          {campaign.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "Creators" && (
          <section className="marketing-card marketing-table-card">
            <div className="marketing-card-heading marketing-creator-heading">
              <div>
                <h3>Creator Directory</h3>
                <p>Search creators by name or platform.</p>
              </div>
              <input
                className="marketing-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creators..."
              />
            </div>
            <div className="marketing-table-wrap">
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Platform</th>
                    <th>Followers</th>
                    <th>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.map((creator) => (
                    <tr key={creator.name}>
                      <td><strong>{creator.name}</strong></td>
                      <td>{creator.platform}</td>
                      <td>{creator.followers}</td>
                      <td><span className="marketing-engagement">{creator.engagement}</span></td>
                    </tr>
                  ))}
                  {filteredCreators.length === 0 && (
                    <tr><td colSpan="4">No creators found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "Analytics" && (
          <section className="marketing-card">
            <div className="marketing-card-heading">
              <div>
                <h3>Performance Analytics</h3>
                <p>Compare monthly reach and clicks.</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="reach" fill="#6558e8" />
                <Bar dataKey="clicks" fill="#19b89a" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {activeTab === "Reports" && (
          <section className="marketing-card marketing-report">
            <div className="marketing-report-icon">▤</div>
            <h3>Campaign Summary Report</h3>
            <p>
              View a summary of campaign budgets, spending, creator partners,
              and sample performance metrics.
            </p>
            <button
              className="marketing-primary-button"
              onClick={() => {
                const rows = [
                  ["Campaign", "Platform", "Budget", "Spent", "Status"],
                  ...campaigns.map((c) => [
                    c.name, c.platform, c.budget, c.spent, c.status
                  ])
                ];
                const csv = rows
                  .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
                  .join("\n");
                const url = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv;charset=utf-8;" })
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "creatoriq-campaign-report.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Campaign CSV ↗
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

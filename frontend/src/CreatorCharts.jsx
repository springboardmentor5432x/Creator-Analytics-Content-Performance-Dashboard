
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import "./CreatorCharts.css";

const COLORS = ["#635bff", "#20b8a6", "#f59e0b", "#ec4899"];

const OPTIONS = [
  { label: "Last 7 Days", value: "7", days: 7 },
  { label: "Last 30 Days", value: "30", days: 30 },
  { label: "Last 90 Days", value: "90", days: 90 },
  { label: "This Year", value: "year", days: null },
];

const BASE = {
  followers: 5200,
  engagement: 6.8,
  views: 27300,
  posts: 48,
  likes: 3740,
  comments: 1280,
  shares: 890,
};

const platforms = [
  { name: "Instagram", followers: 1800, color: "#c13584" },
  { name: "YouTube", followers: 1200, color: "#ff0000" },
  { name: "LinkedIn", followers: 650, color: "#0a66c2" },
  { name: "TikTok", followers: 950, color: "#111827" },
];

const posts = [
  { title: "Summer Fashion Reel", platform: "Instagram", views: 8400, likes: 1240, engagement: "8.4%" },
  { title: "Creator Tips Video", platform: "YouTube", views: 6100, likes: 820, engagement: "6.2%" },
  { title: "Daily Lifestyle Short", platform: "TikTok", views: 9400, likes: 1680, engagement: "9.1%" },
];

const PlatformIcon = ({ platform }) => {
  const icons = {
    Instagram: ["◎", "instagram"],
    YouTube: ["▶", "youtube"],
    TikTok: ["♪", "tiktok"],
    Facebook: ["f", "facebook"],
    LinkedIn: ["in", "linkedin"],
  };
  const [symbol, className] = icons[platform] || ["●", "default"];

  return (
    <span className={`platform-icon ${className}`} title={platform}>
      {symbol}
    </span>
  );
};

const fmt = (value) => Math.round(value).toLocaleString("en-US");
const compact = (value) =>
  value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(1)}K`
    : fmt(value);

function getDays(value) {
  if (value === "year") {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now - start) / 86400000) + 1;
  }
  return Number(value);
}

function makeDailyData(days) {
  const count = Math.min(days, 30);
  const today = new Date();
  const result = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const index = count - 1 - i;
    const multiplier = 0.55 + (index / Math.max(count - 1, 1)) * 0.9;

    result.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      YouTube: Math.round(1200 * multiplier),
      Instagram: Math.round(1800 * multiplier),
      LinkedIn: Math.round(650 * multiplier),
      TikTok: Math.round(950 * multiplier),
      views: Math.round((2200 + (index % 7) * 1100) * multiplier),
    });
  }

  return result;
}

export default function CreatorCharts() {
  const [range, setRange] = useState("7");

  const days = getDays(range);
  const multiplier = days / 30;
  const dailyData = useMemo(() => makeDailyData(days), [days]);

  const metrics = [
    {
      label: "Total Followers",
      value: compact(BASE.followers * (0.8 + multiplier * 0.2)),
      icon: "👥",
      note: `For ${range === "year" ? "this year" : `last ${days} days`}`,
    },
    {
      label: "Engagement Rate",
      value: `${(BASE.engagement * (0.85 + multiplier * 0.15)).toFixed(1)}%`,
      icon: "💜",
      note: `For ${range === "year" ? "this year" : `last ${days} days`}`,
    },
    {
      label: "Total Views",
      value: compact(BASE.views * multiplier),
      icon: "👁️",
      note: `For ${range === "year" ? "this year" : `last ${days} days`}`,
    },
    {
      label: "Published Posts",
      value: fmt(BASE.posts * multiplier),
      icon: "📝",
      note: "Published content",
    },
    {
      label: "Total Likes",
      value: compact(BASE.likes * multiplier),
      icon: "❤️",
      note: "Content likes",
    },
    {
      label: "Total Comments",
      value: compact(BASE.comments * multiplier),
      icon: "💬",
      note: "Content comments",
    },
    {
      label: "Total Shares",
      value: compact(BASE.shares * multiplier),
      icon: "🔁",
      note: "Content shares",
    },
  ];

  const engagementData = [
    { type: "Likes", count: Math.round(BASE.likes * multiplier) },
    { type: "Comments", count: Math.round(BASE.comments * multiplier) },
    { type: "Shares", count: Math.round(BASE.shares * multiplier) },
    { type: "Saves", count: Math.round(1640 * multiplier) },
  ];

  const audienceData = [
    { name: "Instagram", value: 40 },
    { name: "YouTube", value: 25 },
    { name: "TikTok", value: 25 },
    { name: "LinkedIn", value: 10 },
  ];

  const contentData = dailyData.map((item) => ({
    day: item.date,
    views: item.views,
  }));

  const tablePosts = posts.map((post) => ({
    ...post,
    views: Math.round(post.views * multiplier),
    likes: Math.round(post.likes * multiplier),
  }));

  const selectedLabel =
    OPTIONS.find((option) => option.value === range)?.label || "Last 7 Days";

  return (
    <section className="creator-analytics">
      <div
        className="analytics-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2>Creator Analytics</h2>
          <p>Understand your audience and content performance.</p>
        </div>

        <select
          aria-label="Select analytics date range"
          value={range}
          onChange={(event) => setRange(event.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #d9deea",
            borderRadius: 10,
            background: "#fff",
            color: "#27324a",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p style={{ color: "#64748b", fontSize: 13, margin: "10px 0 18px" }}>
        Selected period: <strong>{selectedLabel}</strong> · {days} days
      </p>

      <div className="creator-metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span className="metric-label">
              <span aria-hidden="true">{metric.icon}</span> {metric.label}
            </span>
            <h3>{metric.value}</h3>
            <p>{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="creator-chart-grid">
        <article className="chart-card">
          <h3>Follower Growth</h3>
          <p>Follower trend · {selectedLabel}</p>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" interval="preserveStartEnd" />
                <YAxis />
                <Tooltip />
                <Legend />
                {platforms.map((platform) => (
                  <Line
                    key={platform.name}
                    type="monotone"
                    dataKey={platform.name}
                    stroke={platform.color}
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h3>Content Performance</h3>
          <p>Views · {selectedLabel}</p>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" interval="preserveStartEnd" />
                <YAxis tickFormatter={compact} />
                <Tooltip formatter={(value) => [fmt(value), "Views"]} />
                <Bar dataKey="views" fill="#20b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h3>Audience by Platform</h3>
          <p>Audience distribution</p>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={audienceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {audienceData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h3>Engagement Breakdown</h3>
          <p>Interactions · {selectedLabel}</p>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis tickFormatter={compact} />
                <Tooltip formatter={(value) => fmt(value)} />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="chart-card recent-content">
        <h3>Recent Content Performance</h3>
        <p>Performance values for {selectedLabel}</p>
        <div className="content-table-wrap">
          <table className="content-table">
            <thead>
              <tr>
                <th>Content</th>
                <th>Platform</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {tablePosts.map((post) => (
                <tr key={post.title}>
                  <td>{post.title}</td>
                  <td>
                    <div className="platform-cell">
                      <PlatformIcon platform={post.platform} />
                      <span>{post.platform}</span>
                    </div>
                  </td>
                  <td>{fmt(post.views)}</td>
                  <td>{fmt(post.likes)}</td>
                  <td>{post.engagement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

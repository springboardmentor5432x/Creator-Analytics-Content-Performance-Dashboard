
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./CreatorCharts.css";

const API_URL = "http://127.0.0.1:8000";

const PLATFORM_COLORS = [
  "#625bff",
  "#16a085",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("en-IN");

const formatPercent = (value) =>
  `${Number(value ?? 0).toFixed(2)}%`;

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="creator-metric-card">
      <div className="creator-metric-top">
        <span className="creator-metric-title">{title}</span>
        <span className="creator-metric-icon">{icon}</span>
      </div>

      <div className="creator-metric-value">{value}</div>

      {subtitle && (
        <div className="creator-metric-subtitle">{subtitle}</div>
      )}
    </div>
  );
}

/*
 * Supports audience data in either format:
 * 1. { date, platform, followers }
 * 2. { date, Instagram, TikTok, YouTube }
 */
function normalizeAudienceGrowth(rows) {
  const grouped = {};

  rows.forEach((item) => {
    const date = String(
      item.date ??
        item.snapshot_date ??
        item.snapshotDate ??
        ""
    ).slice(0, 10);

    if (!date) return;

    if (!grouped[date]) {
      grouped[date] = {
        date,
        Instagram: null,
        TikTok: null,
        YouTube: null,
      };
    }

    ["Instagram", "TikTok", "YouTube"].forEach((name) => {
      if (item[name] != null) {
        grouped[date][name] = Number(item[name]);
      }
    });

    const platform = String(item.platform ?? "")
      .trim()
      .toLowerCase();

    const followers =
      item.followers ?? item.total_followers;

    if (followers == null) return;

    if (platform.includes("instagram")) {
      grouped[date].Instagram = Number(followers);
    } else if (platform.includes("tiktok")) {
      grouped[date].TikTok = Number(followers);
    } else if (platform.includes("youtube")) {
      grouped[date].YouTube = Number(followers);
    }
  });

  return Object.values(grouped).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export default function CreatorCharts({ days = 7 }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoMessage, setDemoMessage] = useState("");

  const selectedDays =
    String(days).toLowerCase() === "year"
      ? "year"
      : String(days);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error(
          "Please log in again to view analytics."
        );
      }

      const response = await fetch(
        `${API_URL}/analytics/creator?days=${encodeURIComponent(
          selectedDays
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load creator analytics."
        );
      }

      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Unable to load analytics.");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleGenerateDemoData = async () => {
    setDemoLoading(true);
    setError("");
    setDemoMessage("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/analytics/demo-data/extend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to generate demo data."
        );
      }

      setDemoMessage(
        `${data.message || "Demo data generated."} ${
          data.posts_added ?? 0
        } posts and ${
          data.snapshots_added ?? 0
        } audience snapshots added.`
      );

      await loadAnalytics();
    } catch (err) {
      setError(
        err.message || "Unable to generate demo data."
      );
    } finally {
      setDemoLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="creator-analytics-status">
        <div className="creator-spinner" />
        <p>Loading creator analytics...</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="creator-analytics-error">
        <h3>Unable to load analytics</h3>
        <p>{error}</p>
        <button type="button" onClick={loadAnalytics}>
          Try Again
        </button>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const dailyTrend = analytics?.daily_trend || [];
  const platformBreakdown =
    analytics?.platform_breakdown || [];

  const audienceGrowth = normalizeAudienceGrowth(
    analytics?.audience_growth || []
  );

  const topPosts = analytics?.top_posts || [];

  const totalViews =
    summary.total_views ?? summary.views ?? 0;

  const totalLikes =
    summary.total_likes ?? summary.likes ?? 0;

  const totalComments =
    summary.total_comments ?? summary.comments ?? 0;

  const totalShares =
    summary.total_shares ?? summary.shares ?? 0;

  const engagementRate =
    summary.engagement_rate ?? summary.engagement ?? 0;

  const totalFollowers =
    summary.total_followers ?? summary.followers ?? 0;

  /*
   * Select the most recent snapshot separately for each
   * platform. This avoids incorrectly using one date row
   * that may not contain all three platforms.
   */
  const latestByPlatform = {
    Instagram: null,
    YouTube: null,
    TikTok: null,
  };

  audienceGrowth.forEach((row) => {
    ["Instagram", "YouTube", "TikTok"].forEach((platform) => {
      const value = row[platform];

      if (value == null || !Number.isFinite(Number(value))) {
        return;
      }

      const previous = latestByPlatform[platform];

      if (!previous || row.date > previous.date) {
        latestByPlatform[platform] = {
          date: row.date,
          followers: Number(value),
        };
      }
    });
  });

  const audienceByPlatform = [
    {
      platform: "Instagram",
      followers: latestByPlatform.Instagram?.followers ?? 0,
    },
    {
      platform: "YouTube",
      followers: latestByPlatform.YouTube?.followers ?? 0,
    },
    {
      platform: "TikTok",
      followers: latestByPlatform.TikTok?.followers ?? 0,
    },
  ];

  return (
    <section className="creator-analytics">
      {/* HEADER */}
      <div className="creator-analytics-header">
        <div>
          <h2>Creator Analytics</h2>
          <p>
            Track your content performance and audience growth.
          </p>

          {analytics?.start_date && analytics?.end_date && (
            <small className="creator-date-label">
              {analytics.start_date} – {analytics.end_date}
            </small>
          )}
        </div>

        <div className="creator-analytics-actions">
          <button
            type="button"
            className="creator-secondary-button"
            onClick={loadAnalytics}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="creator-primary-button"
            onClick={handleGenerateDemoData}
            disabled={demoLoading}
          >
            {demoLoading
              ? "Generating..."
              : "Generate Historical Demo Data"}
          </button>
        </div>
      </div>

      {error && (
        <div className="creator-inline-error" role="alert">
          {error}
        </div>
      )}

      {demoMessage && (
        <div className="creator-inline-success" role="status">
          {demoMessage}
        </div>
      )}

      {analytics?.sample_data && (
        <div className="creator-demo-notice">
          You are viewing generated demo metrics, not live
          social media data.
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="creator-metrics-grid">
        <MetricCard
          title="Total Views"
          value={formatNumber(totalViews)}
          subtitle="Views in selected period"
          icon="👁️"
        />

        <MetricCard
          title="Total Likes"
          value={formatNumber(totalLikes)}
          subtitle="Likes in selected period"
          icon="❤️"
        />

        <MetricCard
          title="Comments"
          value={formatNumber(totalComments)}
          subtitle="Comments in selected period"
          icon="💬"
        />

        <MetricCard
          title="Shares"
          value={formatNumber(totalShares)}
          subtitle="Shares in selected period"
          icon="🔁"
        />

        <MetricCard
          title="Engagement Rate"
          value={formatPercent(engagementRate)}
          subtitle="Engagement performance"
          icon="📈"
        />

        <MetricCard
          title="Total Followers"
          value={formatNumber(totalFollowers)}
          subtitle="Audience snapshot"
          icon="👥"
        />
      </div>

      {/* DASHBOARD CHARTS: TWO COLUMNS */}
      <div className="creator-charts-grid">
        {/* TOP LEFT: CONTENT PERFORMANCE */}
        <div className="creator-chart-card">
          <div className="creator-chart-heading">
            <h3>Content Performance</h3>
            <p>Views, likes, and comments over time</p>
          </div>

          {dailyTrend.length === 0 ? (
            <p className="creator-empty-state">
              No content trend data is available for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={dailyTrend}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="#625bff"
                  strokeWidth={3}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke="#16a085"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="comments"
                  name="Comments"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TOP RIGHT: VIEWS BY PLATFORM */}
        <div className="creator-chart-card">
          <div className="creator-chart-heading">
            <h3>Views by Platform</h3>
            <p>Compare content views across platforms</p>
          </div>

          {platformBreakdown.length === 0 ? (
            <p className="creator-empty-state">
              No platform data is available for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={platformBreakdown}
                  dataKey="views"
                  nameKey="platform"
                  cx="50%"
                  cy="48%"
                  outerRadius={85}
                  label={({ name, value }) =>
                    `${name}: ${formatNumber(value)}`
                  }
                >
                  {platformBreakdown.map((item, index) => (
                    <Cell
                      key={`${item.platform}-${index}`}
                      fill={
                        PLATFORM_COLORS[
                          index % PLATFORM_COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => formatNumber(value)}
                />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BOTTOM LEFT: AUDIENCE BY PLATFORM */}
        <div className="creator-chart-card">
          <div className="creator-chart-heading">
            <h3>Audience by Platform</h3>
            <p>Latest available follower count per platform</p>
          </div>

          {audienceGrowth.length === 0 ? (
            <p className="creator-empty-state">
              No audience growth data is available for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                key={selectedDays}
                data={audienceByPlatform}
                margin={{
                  top: 15,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="platform"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatNumber}
                />

                <Tooltip
                  formatter={(value) => [
                    formatNumber(value),
                    "Followers",
                  ]}
                />

                <Bar
                  dataKey="followers"
                  name="Followers"
                  fill="#625bff"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BOTTOM RIGHT: TOP-PERFORMING CONTENT */}
        <div className="creator-chart-card">
          <div className="creator-chart-heading">
            <h3>Top-Performing Content</h3>
            <p>Posts ranked by views</p>
          </div>

          {topPosts.length === 0 ? (
            <p className="creator-empty-state">
              No posts are available for this period.
            </p>
          ) : (
            <div className="creator-table-wrapper">
              <table className="creator-posts-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Platform</th>
                    <th>Views</th>
                    <th>Likes</th>
                  </tr>
                </thead>

                <tbody>
                  {topPosts.map((post, index) => (
                    <tr
                      key={post.id ?? `${post.title}-${index}`}
                    >
                      <td>{post.title || "Untitled Post"}</td>
                      <td>{post.platform || "—"}</td>
                      <td>{formatNumber(post.views)}</td>
                      <td>{formatNumber(post.likes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

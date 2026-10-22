
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import "./CreatorDashboard.css";
import DashboardHeader from "./DashboardHeader";

const weeklyData = [
  { day: "Mon", followers: 8200, engagement: 3.2 },
  { day: "Tue", followers: 8700, engagement: 3.8 },
  { day: "Wed", followers: 9100, engagement: 4.1 },
  { day: "Thu", followers: 10300, engagement: 3.9 },
  { day: "Fri", followers: 11100, engagement: 4.5 },
  { day: "Sat", followers: 11800, engagement: 4.3 },
  { day: "Sun", followers: 12450, engagement: 4.8 },
];

const contentData = [
  { name: "Images", value: 44 },
  { name: "Videos", value: 28 },
  { name: "Reels", value: 17 },
  { name: "Stories", value: 11 },
];

const platformData = [
  { name: "Instagram", followers: 5240 },
  { name: "TikTok", followers: 3820 },
  { name: "YouTube", followers: 2160 },
  { name: "Facebook", followers: 1240 },
];

const colors = ["#4776f5", "#8055ed", "#35c9a0", "#ffad42"];

const posts = [
  {
    title: "Morning Vibes",
    platform: "Instagram",
    likes: "1.2K",
    comments: 86,
    reach: "High",
  },
  {
    title: "Behind the Scenes",
    platform: "TikTok",
    likes: "856",
    comments: 64,
    reach: "Good",
  },
  {
    title: "Travel Diaries",
    platform: "Instagram",
    likes: "1.8K",
    comments: 124,
    reach: "High",
  },
];


function MetricCard({ title, value, change, icon, tone }) {
  return (
    <article className="creator-metric">
      <div className={`creator-metric-icon ${tone}`}>{icon}</div>
      <div className="creator-metric-info">
        <p>{title}</p>
        <h2>{value}</h2>
        <span>
          <b>↗</b> {change} vs last 7 days
        </span>
      </div>
    </article>
  );
}


function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`creator-panel ${className}`}>
      <div className="creator-panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function CreatorDashboard({ profile }) {
  const navigate = useNavigate();
  const creatorName = profile?.name || profile?.full_name || "Creator";
  const firstName = creatorName.split(" ")[0];

  return (
    <main className="creator-dashboard">
      <DashboardHeader
        title="Creator Dashboard"
        subtitle={`Welcome back, ${firstName}! Here's how your content is performing.`}
      />

      <div className="creator-dashboard-content">
        <div className="creator-dashboard-toolbar">
          <div>
            <span className="creator-eyebrow">
              <i /> CREATOR WORKSPACE
            </span>
            <h2>Performance Overview</h2>
            <p>Track your audience, content, and engagement in one place.</p>
          </div>

          <button
            className="creator-primary-button"
            onClick={() =>
              window.alert(
                "The content creation form can be connected here next."
              )
            }
          >
            <span>＋</span> Create Content
          </button>
        </div>

        <section className="creator-metrics-grid">
          <MetricCard
            title="Total Followers"
            value="12,450"
            change="12.5%"
            icon="♙"
            tone="purple"
          />
          <MetricCard
            title="Engagement Rate"
            value="4.8%"
            change="0.8%"
            icon="♡"
            tone="green"
          />
          <MetricCard
            title="Content Published"
            value="36"
            change="20%"
            icon="▣"
            tone="blue"
          />
          <MetricCard
            title="Estimated Revenue"
            value="$2,480"
            change="18.4%"
            icon="$"
            tone="amber"
          />
        </section>

        <section className="creator-main-grid">
          <Panel
            title="Audience Growth"
            subtitle="Follower growth over the last seven days"
            className="creator-growth-panel"
          >
            <div className="creator-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="creatorFollowersFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4776f5"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="#4776f5"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8edf7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#858ba4", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#858ba4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    name="Followers"
                    stroke="#4776f5"
                    strokeWidth={3}
                    fill="url(#creatorFollowersFill)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Content Performance"
            subtitle="Published content by format"
          >
            <div className="creator-chart creator-pie-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={4}
                  >
                    {contentData.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Recent Content"
            subtitle="A snapshot of your recent posts"
          >
            <div className="creator-post-list">
              {posts.map((post, index) => (
                <article className="creator-post" key={post.title}>
                  <div
                    className={`creator-post-thumbnail creator-thumb-${index + 1}`}
                  >
                    {post.title.charAt(0)}
                  </div>
                  <div className="creator-post-info">
                    <strong>{post.title}</strong>
                    <small>{post.platform}</small>
                    <small>
                      ♡ {post.likes} <span>·</span> Comments {post.comments}
                    </small>
                  </div>
                  <span
                    className={`creator-reach ${
                      post.reach === "High" ? "reach-high" : "reach-good"
                    }`}
                  >
                    {post.reach}
                  </span>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            title="Engagement Trend"
            subtitle="Daily engagement rate"
          >
            <div className="creator-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyData}
                  margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8edf7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#858ba4", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    tick={{ fill: "#858ba4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#8055ed"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#8055ed" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Followers by Platform"
            subtitle="Audience distribution across platforms"
          >
            <div className="creator-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={platformData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8edf7"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#858ba4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={76}
                    tick={{ fill: "#747b94", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="followers"
                    name="Followers"
                    fill="#4776f5"
                    radius={[0, 6, 6, 0]}
                    barSize={19}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Audience Insights"
            subtitle="Ideas to help improve performance"
          >
            <div className="creator-insight">
              <div className="creator-insight-icon">✦</div>
              <div>
                <strong>Your weekly performance</strong>
                <p>
                  Your sample analytics show growth across followers,
                  engagement, and published content.
                </p>
              </div>
            </div>

            <div className="creator-insight">
              <div className="creator-insight-icon">↗</div>
              <div>
                <strong>Content opportunity</strong>
                <p>
                  Compare post performance to find the formats that work best
                  for your audience.
                </p>
              </div>
            </div>

            <div className="creator-insight-note">
              Keep reviewing your strongest posts to spot useful patterns.
            </div>
          </Panel>
        </section>

        <footer className="creator-dashboard-footer">
          <span>CreatorIQ · Creator Workspace</span>
          <span>
            Demo analytics: values are sample data, not live social-platform
            metrics or verified earnings.
          </span>
        </footer>
            </div>
    </main>
  );
}
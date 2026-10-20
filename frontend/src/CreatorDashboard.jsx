
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
import "./CreatorDashboard.css";

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
  { title: "Morning Vibes", platform: "Instagram", likes: "1.2K", comments: 86, reach: "High" },
  { title: "Behind the Scenes", platform: "TikTok", likes: "856", comments: 64, reach: "Good" },
  { title: "Travel Diaries", platform: "Instagram", likes: "1.8K", comments: 124, reach: "High" },
];

function MetricCard({ title, value, change, icon }) {
  return (
    <article className="creator-metric">
      <div className="metric-icon">{icon}</div>
      <div className="metric-info">
        <p>{title}</p>
        <h2>{value}</h2>
        <span>↗ {change} vs last 7 days</span>
      </div>
    </article>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`creator-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function CreatorDashboard({ profile }) {
  const creatorName = profile?.name || "Creator";
  const firstName = creatorName.split(" ")[0];

  return (
    <div className="creator-dashboard">
      <header className="creator-header">
        <div>
          <p className="creator-eyebrow">WORKSPACE / DASHBOARD</p>
          <h1>Creator Dashboard</h1>
          <p>Welcome back, {firstName}! Here's how your content is performing.</p>
        </div>
        <button
          className="creator-primary-button"
          onClick={() => window.alert("Connect this button to your content creation form next.")}
        >
          + Create Content
        </button>
      </header>

      <div className="creator-metrics-grid">
        <MetricCard title="Followers" value="12,450" change="12.5%" icon="♙" />
        <MetricCard title="Engagement Rate" value="4.8%" change="0.8%" icon="♡" />
        <MetricCard title="Content Published" value="36" change="20%" icon="▣" />
        <MetricCard title="Estimated Revenue" value="$2,480" change="18.4%" icon="$" />
      </div>

      <div className="creator-main-grid">
        <Panel title="Audience Growth" className="creator-growth-panel">
          <div className="creator-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="followersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4776f5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4776f5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="#4776f5"
                  strokeWidth={3}
                  fill="url(#followersFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Content Performance">
          <div className="creator-chart creator-pie-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contentData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {contentData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Recent Content">
          <div className="creator-post-list">
            {posts.map((post) => (
              <div className="creator-post" key={post.title}>
                <div className="creator-post-thumbnail">{post.title.charAt(0)}</div>
                <div className="creator-post-info">
                  <strong>{post.title}</strong>
                  <small>{post.platform}</small>
                  <small>♡ {post.likes} · Comments {post.comments}</small>
                </div>
                <span className="creator-reach">{post.reach} reach</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Engagement Trend">
          <div className="creator-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                <XAxis dataKey="day" />
                <YAxis unit="%" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#8055ed"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Followers by Platform">
          <div className="creator-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="followers" fill="#4776f5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Audience Insights">
          <div className="creator-insight">
            <div className="creator-insight-icon">✦</div>
            <div>
              <strong>Your weekly performance</strong>
              <p>Your sample analytics show growth across followers, engagement, and published content.</p>
            </div>
          </div>
          <div className="creator-insight">
            <div className="creator-insight-icon">↗</div>
            <div>
              <strong>Content opportunity</strong>
              <p>Compare post performance to find the formats that work best for your audience.</p>
            </div>
          </div>
        </Panel>
      </div>

      <p className="creator-demo-note">
        Demo analytics: chart values are sample data, not live social-platform metrics or verified earnings.
      </p>
    </div>
  );
}

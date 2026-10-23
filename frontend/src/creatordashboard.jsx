import React, { useState } from "react";
import "./cdashboard.css";

const periods = {
  "7 days": {
    followers: "24.8K",
    reach: "86.4K",
    engagement: "6.8%",
    views: "142.6K",
    growth: ["+12.8%", "+18.4%", "+2.1%", "+24.6%"],
    audience: [14, 25, 35, 31, 43, 52, 51, 70],
    content: [25, 48, 45, 58, 70, 72, 90, 100],
    bars: [5, 7, 7.5, 9, 11, 12.5, 15],
  },
  "30 days": {
    followers: "28.2K",
    reach: "124.8K",
    engagement: "7.2%",
    views: "218.4K",
    growth: ["+15.2%", "+21.8%", "+3.4%", "+28.6%"],
    audience: [12, 28, 24, 42, 50, 58, 66, 80],
    content: [22, 35, 48, 52, 68, 76, 88, 100],
    bars: [6, 8, 10, 9, 12, 14, 16],
  },
  "90 days": {
    followers: "32.6K",
    reach: "186.2K",
    engagement: "7.8%",
    views: "364.8K",
    growth: ["+22.8%", "+31.4%", "+5.1%", "+36.6%"],
    audience: [10, 18, 32, 29, 48, 60, 70, 88],
    content: [18, 30, 42, 58, 65, 80, 92, 100],
    bars: [4, 7, 9, 12, 13, 16, 19],
  },
};

const posts = [
  {
    title: "Behind the scenes ✨",
    platform: "Instagram",
    views: "18.2K views",
    rate: "8.4%",
    image: "🌅",
    color: "sunset",
  },
  {
    title: "My latest video",
    platform: "YouTube",
    views: "12.8K views",
    rate: "7.1%",
    image: "🎬",
    color: "video",
  },
  {
    title: "A day in my life",
    platform: "Instagram",
    views: "9.6K views",
    rate: "6.7%",
    image: "🌴",
    color: "travel",
  },
];

function MetricCard({ icon, title, value, growth, color }) {
  return (
    <article className="ci-metric">
      <div className={`ci-metric-icon ${color}`}>{icon}</div>
      <div className="ci-metric-info">
        <p>{title}</p>
        <h2>{value}</h2>
        <div className="ci-growth">
          <span>↗ {growth}</span>
          <small>vs previous period</small>
        </div>
      </div>
    </article>
  );
}

function LineChart({ data }) {
  const makePoints = (values) =>
    values.map((value, index) => {
      const x = 38 + index * 106;
      const y = 166 - value * 1.5;
      return `${x},${y}`;
    }).join(" ");

  const purple = makePoints(data.audience);
  const blue = makePoints(data.content);

  return (
    <svg
      className="ci-line-svg"
      viewBox="0 0 800 210"
      role="img"
      aria-label="Audience growth and content views line chart"
    >
      {[30, 65, 100, 135, 170].map((y, i) => (
        <g key={y}>
          <line x1="38" y1={y} x2="780" y2={y} className="ci-gridline" />
          <text x="3" y={y + 4} className="ci-axis-label">
            {10 - i * 2}K
          </text>
        </g>
      ))}
      <polygon
        points={`38,170 ${purple} 780,170`}
        fill="url(#purpleFill)"
      />
      <defs>
        <linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8651ff" stopOpacity=".25" />
          <stop offset="100%" stopColor="#8651ff" stopOpacity=".01" />
        </linearGradient>
      </defs>
      <polyline points={purple} className="ci-line-purple" />
      <polyline points={blue} className="ci-line-blue" />
      {data.audience.map((value, index) => (
        <circle
          key={`p${index}`}
          cx={38 + index * 106}
          cy={166 - value * 1.5}
          r="3"
          fill="#8651ff"
        />
      ))}
      {data.content.map((value, index) => (
        <circle
          key={`b${index}`}
          cx={38 + index * 106}
          cy={166 - value * 1.5}
          r="3"
          fill="#09a8f5"
        />
      ))}
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
        (day, index) => (
          <text
            key={day}
            x={55 + index * 106}
            y="198"
            textAnchor="middle"
            className="ci-axis-label"
          >
            {day}
          </text>
        )
      )}
    </svg>
  );
}

function BarChart({ values }) {
  const max = Math.max(...values);

  return (
    <div className="ci-bar-chart">
      <div className="ci-bar-ylabels">
        <span>15K</span>
        <span>10K</span>
        <span>5K</span>
        <span>0</span>
      </div>
      <div className="ci-bar-area">
        <div className="ci-bar-grid">
          <i /><i /><i /><i />
        </div>
        <div className="ci-bars">
          {values.map((value, index) => (
            <div className="ci-bar-column" key={index}>
              <div
                className="ci-bar"
                style={{ height: `${(value / max) * 100}%` }}
                title={`${value}K views`}
              />
              <span>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlatformChart({ total }) {
  return (
    <div className="ci-platform-content">
      <div className="ci-donut-wrap">
        <div className="ci-donut">
          <div className="ci-donut-center">
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <span className="ci-donut-label ci-donut-label-one">62%</span>
          <span className="ci-donut-label ci-donut-label-two">38%</span>
        </div>
      </div>
      <div className="ci-platform-row">
        <span className="ci-platform-icon instagram">◎</span>
        <span>Instagram</span>
        <strong>62%</strong>
      </div>
      <div className="ci-platform-row">
        <span className="ci-platform-icon youtube">▶</span>
        <span>YouTube</span>
        <strong>38%</strong>
      </div>
    </div>
  );
}

export default function CreatorDashboard({ user, activeNav }) {
  const [period, setPeriod] = useState("7 days");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const data = periods[period];

  const metrics = [
    {
      icon: "♙",
      title: "Total followers",
      value: data.followers,
      growth: data.growth[0],
      color: "purple",
    },
    {
      icon: "◉",
      title: "Total reach",
      value: data.reach,
      growth: data.growth[1],
      color: "blue",
    },
    {
      icon: "♡",
      title: "Engagement rate",
      value: data.engagement,
      growth: data.growth[2],
      color: "pink",
    },
    {
      icon: "↗",
      title: "Content views",
      value: data.views,
      growth: data.growth[3],
      color: "green",
    },
  ];

  const menuItems = [
    ["Dashboard", "⌂"],
    ["Analytics", "↗"],
    ["Content", "▧"],
    ["Audience", "♙"],
    ["Collaboration", "▣"],
    ["Reports", "▤"],
    ["Settings", "⚙"],
  ];

  return (
    <div className="ci-app">
      <aside className="ci-sidebar">
        <div className="ci-brand">
          <span className="ci-brand-mark">Q</span>
          <span>Creator<span className="ci-brand-purple">IQ</span></span>
        </div>

        <nav className="ci-nav">
          {menuItems.map(([name, icon]) => (
            <button
              key={name}
              className={`ci-nav-item ${activeMenu === name ? "selected" : ""}`}
              onClick={() => setActiveMenu(name)}
            >
              <span className="ci-nav-icon">{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="ci-sidebar-bottom">
          <div className="ci-help-icon">?</div>
          <div>
            <strong>Need help?</strong>
            <small>Visit our help center</small>
          </div>
        </div>
      </aside>

      <main className="ci-main">
        <header className="ci-topbar">
          <span className="ci-mobile-brand">CreatorIQ</span>
          <div className="ci-topbar-right">
            <button className="ci-bell" aria-label="Notifications">
              ♧ <i />
            </button>
            <div className="ci-avatar">SC</div>
            <div className="ci-user">
              <strong>{user?.name || user?.full_name || "Sarah Creator"}</strong>
              <small>Creator</small>
            </div>
            <span className="ci-chevron">⌄</span>
          </div>
        </header>

        <div className="ci-content">
          <div className="ci-demo-banner">
            <span>✧</span>
            <strong>Demo analytics</strong>
            <span className="ci-banner-separator">·</span>
            Example values, not live social account data
          </div>

          <div className="ci-heading-row">
            <div>
              <div className="ci-breadcrumb">CREATOR WORKSPACE / <strong>{activeMenu.toUpperCase()}</strong></div>
              <h1>Welcome back, {user?.name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Sarah"} <span>✨</span></h1>
              <p className="ci-subtitle">Here's how your content is performing.</p>
            </div>

            <label className="ci-period-select">
              <span>▦</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {Object.keys(periods).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <span className="ci-select-arrow">⌄</span>
            </label>
          </div>

          <section className="ci-metrics-grid">
            {metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </section>

          <section className="ci-charts-grid">
            <article className="ci-panel ci-growth-panel">
              <div className="ci-panel-heading">
                <div>
                  <h3>Audience &amp; content growth</h3>
                  <p>Performance across the selected period</p>
                </div>
                <span className="ci-growing">↗ Growing</span>
              </div>
              <div className="ci-chart-legend">
                <span><i className="legend-purple" />Audience growth</span>
                <span><i className="legend-blue" />Content views</span>
              </div>
              <LineChart data={data} />
            </article>

            <article className="ci-panel ci-platform-panel">
              <div className="ci-panel-heading">
                <div>
                  <h3>Platform distribution</h3>
                  <p>Illustrative audience split</p>
                </div>
              </div>
              <PlatformChart total={data.followers} />
            </article>
          </section>

          <section className="ci-bottom-grid">
            <article className="ci-panel ci-views-panel">
              <div className="ci-panel-heading">
                <div>
                  <h3>Views by period</h3>
                  <p>Compare content performance</p>
                </div>
                <span className="ci-chart-legend"><i className="legend-purple" /> Views</span>
              </div>
              <BarChart values={data.bars} />
            </article>

            <article className="ci-panel ci-posts-panel">
              <div className="ci-panel-heading">
                <div>
                  <h3>Top content</h3>
                  <p>Your best performing posts</p>
                </div>
              </div>
              <div className="ci-post-list">
                {posts.map((post, index) => (
                  <div className="ci-post" key={post.title}>
                    <div className={`ci-post-number post-number-${index + 1}`}>
                      0{index + 1}
                    </div>
                    <div className={`ci-post-thumb ${post.color}`}>{post.image}</div>
                    <div className="ci-post-details">
                      <strong>{post.title}</strong>
                      <small>{post.platform} · {post.views}</small>
                    </div>
                    <span className="ci-post-rate">{post.rate}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <footer className="ci-footer">
            <span>CreatorIQ Analytics</span>
            <span>Demo data shown · Connect a data source for real metrics</span>
          </footer>
        </div>
      </main>
    </div>
  );
}


import { useState } from "react";
import "./App.css";



const STUDIO_IMAGE =
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1800&q=85";

const CREATOR_IMAGE =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85";

const SECOND_CREATOR_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85";

const ROLES = ["Creator", "Agency", "Admin", "Marketing Team"];

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="CreatorIQ home">
      <span className="brand-mark">✳</span>
      <span>CreatorIQ<span className="brand-dot">.</span></span>
    </button>
  );
}

function Home({ goTo }) {
  return (
    <main className="home-page">
      <div className="home-glow home-glow-one" />
      <div className="home-glow home-glow-two" />

      <header className="topbar">
        <Brand onClick={() => goTo("home")} />

        <nav className="topnav">
          <a href="#vision">Our vision</a>
          <a href="#discover">Discover</a>
          <button onClick={() => goTo("login")}>Sign in</button>
          <button className="nav-join" onClick={() => goTo("register")}>
            Join CreatorIQ ↗
          </button>
        </nav>
      </header>

      <section className="hero" id="vision">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            A NEW WAY TO CREATE
          </div>

          <h1>
            Your creativity
            <br />
            deserves a
            <br />
            <em>bigger stage.</em>
          </h1>

          <p className="hero-description">
            Not just another dashboard. Your ideas, your audience, your growth —
            all coming together in one beautiful space.
          </p>

          <div className="hero-actions">
            <button
              className="button button-primary"
              onClick={() => goTo("register")}
            >
              Start your journey <span>↗</span>
            </button>
            <button
              className="button button-outline"
              onClick={() => goTo("login")}
            >
              Sign in <span>→</span>
            </button>
          </div>

          <div className="community-note">
            <div className="avatar-stack">
              <img src={CREATOR_IMAGE} alt="" />
              <img src={SECOND_CREATOR_IMAGE} alt="" />
              <span className="avatar-symbol">✳</span>
            </div>
            <p>
              Made for people who create
              <strong>and dream a little bigger.</strong>
            </p>
          </div>
        </div>

        <div className="hero-art" id="discover">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-coral-shape" />

          <div className="creator-frame creator-frame-back">
            <img src={CREATOR_IMAGE} alt="Creative portrait" />
            <span className="frame-caption">THE CREATIVE MIND ✳</span>
          </div>

          <div className="creator-frame creator-frame-front">
            <img src={SECOND_CREATOR_IMAGE} alt="Creator portrait" />
            <span className="frame-caption">THE NEXT BIG IDEA ↗</span>
          </div>

          <div className="floating-note note-top">
            <span className="note-icon">↗</span>
            <span>
              <small>YOUR POTENTIAL</small>
              <strong>Ready to grow.</strong>
            </span>
            <i>✳</i>
          </div>

          <div className="floating-note note-bottom">
            <span className="note-dot" />
            <span>
              <small>YOUR CREATIVE SPACE</small>
              <strong>Ideas into impact.</strong>
            </span>
          </div>

          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✳</div>
          <p className="art-footer">CREATE WITH PURPOSE.</p>
        </div>
      </section>

      <footer className="home-footer">
        <span>CREATIVITY, WITH CLARITY.</span>
        <span>YOUR NEXT CHAPTER STARTS HERE ↗</span>
      </footer>
    </main>
  );
}

function AuthLayout({ goTo, children, mode }) {
  return (
    <main className="auth-page">
      <div className="auth-photo" style={{ backgroundImage: `url("${STUDIO_IMAGE}")` }} />
      <div className="auth-shade" />

      <header className="auth-header">
        <Brand onClick={() => goTo("home")} />
        <button className="back-home" onClick={() => goTo("home")}>
          ← Back to home
        </button>
      </header>

      <section className="auth-content">
        <div className="auth-story">
          <span className="eyebrow">
            <span className="status-dot" />
            YOUR CREATIVE SPACE
          </span>
          <h1>
            Make room
            <br />
            for your next
            <br />
            <em>big idea.</em>
          </h1>
          <p>
            One space for your content, audience insights and creative growth.
          </p>
          <div className="studio-tags">
            <span>✦ Content</span>
            <span>✦ Community</span>
            <span>✦ Growth</span>
          </div>
        </div>

        <div className="auth-card">
          {children}
          <p className="auth-switch">
            {mode === "login" ? "New to CreatorIQ?" : "Already have an account?"}{" "}
            <button onClick={() => goTo(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>

      <p className="auth-footer">CREATE WITH PURPOSE. GROW WITH CONFIDENCE.</p>
    </main>
  );
}

function Login({ goTo, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    onLogin({ name: email.split("@")[0] || "Creator", email, role: "Creator", remember });
  }

  return (
    <AuthLayout goTo={goTo} mode="login">
      <span className="form-kicker">WELCOME BACK</span>
      <h2>Sign in to your space.</h2>
      <p className="form-description">
        Your next breakthrough is waiting.
      </p>

      <form onSubmit={submit}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="label-row">
          <label htmlFor="login-password">Password</label>
          <button
            type="button"
            className="text-button"
            onClick={() => setError("Password recovery can be connected to your backend.")}
          >
            Forgot password?
          </button>
        </div>
        <input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="remember-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Remember me</span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="button button-submit" type="submit">
          Sign in <span>→</span>
        </button>
      </form>

      <div className="form-divider"><span>YOUR CREATIVE JOURNEY</span></div>
      <p className="secure-note">✳ A little more clarity. A lot more possibility.</p>
    </AuthLayout>
  );
}

function Register({ goTo, onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Creator");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Enter your details. Password must have at least 6 characters.");
      return;
    }
    setError("");
    onRegister({ name, email, role });
  }

  return (
    <AuthLayout goTo={goTo} mode="register">
      <span className="form-kicker">YOUR NEXT CHAPTER</span>
      <h2>Create your space.</h2>
      <p className="form-description">
        Let's bring your creative work into focus.
      </p>

      <form onSubmit={submit}>
        <label htmlFor="register-name">Your name</label>
        <input
          id="register-name"
          type="text"
          placeholder="How should we call you?"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="register-email">Email address</label>
        <input
          id="register-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="register-password">Create password</label>
        <input
          id="register-password"
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label htmlFor="register-role">I am joining as</label>
        <select className="role-select" id="register-role" value={role} onChange={(e) => setRole(e.target.value)} required>
          {ROLES.map((item) => <option key={item}>{item}</option>)}
        </select>

        {error && <p className="form-error">{error}</p>}

        <button className="button button-submit" type="submit">
          Create account <span>↗</span>
        </button>
      </form>
    </AuthLayout>
  );
}

function Dashboard({ user, goTo, onLogout }) {
  const [active, setActive] = useState("Dashboard");
  const [platform, setPlatform] = useState("All Platforms");
  const [period, setPeriod] = useState("Last 30 Days");
  const [metric, setMetric] = useState("Views");
  const [search, setSearch] = useState("");

  const role = user?.role || "Creator";
  const roleMenus = {
    Creator: [["Dashboard", "▦"], ["My Profile", "♙"], ["Social Accounts", "◎"], ["Content", "▤"], ["Analytics", "⌁"], ["Audience", "♧"], ["Revenue", "₹"], ["Reports", "▧"], ["Notifications", "♧"], ["Settings", "⚙"]],
    Agency: [["Dashboard", "▦"], ["Client Campaigns", "▤"], ["Creators", "♙"], ["Content", "▧"], ["Analytics", "⌁"], ["Budget & Revenue", "₹"], ["Reports", "▨"], ["Notifications", "♧"], ["Settings", "⚙"]],
    Admin: [["Dashboard", "▦"], ["User Management", "♙"], ["Role Permissions", "⚙"], ["Platform Analytics", "⌁"], ["Reports", "▧"], ["Notifications", "♧"], ["Settings", "⚙"]],
    "Marketing Team": [["Dashboard", "▦"], ["Campaigns", "▤"], ["Content Calendar", "▧"], ["Audience", "♧"], ["Analytics", "⌁"], ["Leads", "♙"], ["Reports", "▨"], ["Notifications", "♧"], ["Settings", "⚙"]]
  };
  const menu = roleMenus[role] || roleMenus.Creator;

  const roleMetrics = {
    Creator: [
      { name: "Total Followers", value: "125,430", change: "+12.4%", icon: "♧", color: "purple" },
      { name: "Total Views", value: "1.8M", change: "+18.7%", icon: "◉", color: "blue" },
      { name: "Total Likes", value: "98,240", change: "+15.3%", icon: "♡", color: "pink" },
      { name: "Comments", value: "8,932", change: "+11.6%", icon: "▤", color: "orange" },
      { name: "Shares", value: "6,120", change: "+9.8%", icon: "↗", color: "green" },
      { name: "Engagement Rate", value: "6.8%", change: "+1.2%", icon: "♛", color: "purple" }
    ],
    Agency: [
      { name: "Active Clients", value: "24", change: "+8.2%", icon: "♙", color: "purple" },
      { name: "Live Campaigns", value: "18", change: "+12.7%", icon: "▤", color: "blue" },
      { name: "Managed Creators", value: "86", change: "+9.3%", icon: "◎", color: "pink" },
      { name: "Campaign Reach", value: "4.2M", change: "+15.1%", icon: "◉", color: "orange" },
      { name: "Budget Used", value: "68%", change: "+4.8%", icon: "₹", color: "green" },
      { name: "ROI", value: "3.8x", change: "+1.2%", icon: "↗", color: "purple" }
    ],
    Admin: [
      { name: "Total Users", value: "2,840", change: "+10.4%", icon: "♙", color: "purple" },
      { name: "Active Accounts", value: "2,316", change: "+8.7%", icon: "◎", color: "blue" },
      { name: "Pending Reviews", value: "34", change: "-5.3%", icon: "▤", color: "pink" },
      { name: "Reports", value: "128", change: "+11.6%", icon: "▧", color: "orange" },
      { name: "System Health", value: "99.9%", change: "+0.2%", icon: "✳", color: "green" },
      { name: "Open Alerts", value: "7", change: "-2.1%", icon: "!", color: "purple" }
    ],
    "Marketing Team": [
      { name: "Active Campaigns", value: "12", change: "+12.4%", icon: "▤", color: "purple" },
      { name: "Total Reach", value: "2.6M", change: "+18.7%", icon: "◉", color: "blue" },
      { name: "Engagement", value: "8.4%", change: "+15.3%", icon: "♡", color: "pink" },
      { name: "Leads Generated", value: "3,932", change: "+11.6%", icon: "♙", color: "orange" },
      { name: "Conversions", value: "620", change: "+9.8%", icon: "↗", color: "green" },
      { name: "Campaign ROI", value: "4.6x", change: "+1.2%", icon: "₹", color: "purple" }
    ]
  };
  const metrics = roleMetrics[role] || roleMetrics.Creator;

  const posts = [
    { title: "5 AI Tools Every Creator Should Know", type: "Video", platform: "YouTube", views: "125K", likes: "8.4K", comments: "620", engagement: "7.9%", date: "Sep 12" },
    { title: "A Day in My Life", type: "Reel", platform: "Instagram", views: "98K", likes: "6.1K", comments: "340", engagement: "6.8%", date: "Sep 10" },
    { title: "Healthy Meal Prep Ideas", type: "Video", platform: "TikTok", views: "76K", likes: "5.2K", comments: "410", engagement: "7.4%", date: "Sep 8" },
    { title: "My Study Setup 2026", type: "Image", platform: "Instagram", views: "62K", likes: "4.3K", comments: "290", engagement: "6.1%", date: "Sep 5" },
    { title: "How I Manage My Workflow", type: "Video", platform: "YouTube", views: "58K", likes: "3.9K", comments: "210", engagement: "5.8%", date: "Sep 2" },
  ];

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(search.toLowerCase()) &&
    (platform === "All Platforms" || post.platform === platform)
  );

  function choosePage(name) {
    setActive(name);
  }

  function pageTitle() {
    const titles = {
      Dashboard: role === "Agency" ? `Agency overview, ${user?.name || "there"}! 👋` : role === "Admin" ? `Admin control center, ${user?.name || "there"}! 👋` : role === "Marketing Team" ? `Campaign overview, ${user?.name || "there"}! 👋` : `Good to see you, ${user?.name || "Creator"}! 👋`,
      "Client Campaigns": "Client Campaigns",
      Creators: "Creator Management",
      "Budget & Revenue": "Budget & Revenue",
      "User Management": "User Management",
      "Role Permissions": "Role Permissions",
      "Platform Analytics": "Platform Analytics",
      Campaigns: "Campaigns",
      "Content Calendar": "Content Calendar",
      Leads: "Leads",
      "My Profile": "My Profile",
      "Social Accounts": "Your Social Accounts",
      Content: "Content Studio",
      Analytics: "Analytics & Performance",
      Audience: "Know Your Audience",
      Revenue: "Revenue Overview",
      Reports: "Reports & Insights",
      Notifications: "Notifications",
      Settings: "Workspace Settings",
    };
    return titles[active] || active;
  }

  return (
    <main className={`creator-app role-${role.toLowerCase().replace(/\s+/g, "-")}`}>
      <aside className="creator-sidebar">
        <button className="creator-logo" onClick={() => choosePage("Dashboard")}>
          <span className="creator-logo-mark">▥</span>
          <span>Creator<span>Hub</span></span>
        </button>

        <div className="sidebar-menu">
          <p className="sidebar-label">WORKSPACE</p>
          {menu.map(([name, icon]) => (
            <button
              key={name}
              className={`sidebar-link ${active === name ? "selected" : ""}`}
              onClick={() => choosePage(name)}
            >
              <span className="sidebar-icon">{icon}</span>
              <span>{name}</span>
              {name === "Notifications" && <i className="notification-dot" />}
            </button>
          ))}
        </div>

        <div className="upgrade-card">
          <div className="upgrade-crown">♛</div>
          <strong>Creator Pro</strong>
          <p>Unlock deeper insights and grow your creative business.</p>
          <button onClick={() => choosePage("Revenue")}>Explore Pro ↗</button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{(user?.name || "C").slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <strong>{user?.name || "Creator"}</strong>
            <span>{user?.role || "Creator"}</span>
          </div>
          <button title="Log out" onClick={onLogout}>↗</button>
        </div>
      </aside>

      <section className="creator-workspace">
        <header className="creator-topbar">
          <div className="workspace-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search content, analytics, reports..."
              aria-label="Search content"
            />
          </div>

          <div className="topbar-actions">
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <button className="topbar-notification" onClick={() => choosePage("Notifications")}>
              ♧ <i />
            </button>
            <button className="topbar-profile" onClick={() => choosePage("My Profile")}>
              <span className="user-avatar">{(user?.name || "C").slice(0, 1).toUpperCase()}</span>
              <span><strong>{user?.name || "Creator"}</strong><small>{user?.role || "Creator"}</small></span>
              <span>⌄</span>
            </button>
            <button className="mobile-logout" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <div className="creator-content">
          <div className="workspace-heading">
            <div>
              <span className="workspace-eyebrow">{role.toUpperCase()} WORKSPACE</span>
              <h1>{pageTitle()}</h1>
              <p>
                {active === "Dashboard"
                  ? role === "Agency" ? "Manage client campaigns, creator partnerships and budgets in one place." : role === "Admin" ? "Monitor platform activity, user access and workspace health." : role === "Marketing Team" ? "Track campaigns, audience engagement and marketing outcomes." : "Here's your content performance across your creative platforms."
                  : `Explore your ${active.toLowerCase()} workspace and keep your work moving.`}
              </p>
            </div>
            <div className="heading-date">{period} <span>⌄</span></div>
          </div>

          {active === "Dashboard" ? (
            <>
              <div className="platform-filter">
                {["All Platforms", "YouTube", "Instagram", "TikTok", "LinkedIn"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setPlatform(item)}
                    className={platform === item ? "platform-selected" : ""}
                  >
                    {item === "YouTube" ? "▶ " : item === "Instagram" ? "◎ " : item === "TikTok" ? "♪ " : item === "LinkedIn" ? "in " : ""}
                    {item}
                  </button>
                ))}
                <button className="add-platform" onClick={() => choosePage("Social Accounts")}>＋ Add Platform</button>
              </div>

              <section className="creator-metric-grid">
                {metrics.map((item) => (
                  <article className="creator-metric" key={item.name}>
                    <div className={`metric-icon ${item.color}`}>{item.icon}</div>
                    <div className="metric-name">{item.name}</div>
                    <div className="metric-value">{item.value}</div>
                    <div className="metric-change"><span>↗ {item.change}</span> vs last month</div>
                  </article>
                ))}
              </section>

              <section className="creator-chart-grid">
                <article className="creator-panel follower-panel">
                  <div className="panel-heading">
                    <div><h2>Follower Growth</h2><p>Growth across your channels</p></div>
                    <button onClick={() => choosePage("Analytics")}>View details ↗</button>
                  </div>

                  <div className="chart-legend">
                    <span><i className="legend-red" /> YouTube</span>
                    <span><i className="legend-pink" /> Instagram</span>
                    <span><i className="legend-dark" /> TikTok</span>
                    <span><i className="legend-blue" /> LinkedIn</span>
                  </div>

                  <div className="line-chart">
                    <div className="chart-y-labels"><span>200K</span><span>150K</span><span>100K</span><span>50K</span><span>0</span></div>
                    <svg viewBox="0 0 700 205" preserveAspectRatio="none" role="img" aria-label="Illustrative follower growth line chart">
                      {[20, 60, 100, 140, 180].map((y) => <line key={y} x1="0" y1={y} x2="700" y2={y} className="chart-grid-line" />)}
                      <polyline points="0,160 100,135 200,105 300,88 400,78 500,53 600,34 700,15" className="chart-line line-red" />
                      <polyline points="0,174 100,157 200,140 300,121 400,107 500,89 600,70 700,53" className="chart-line line-pink" />
                      <polyline points="0,186 100,176 200,166 300,153 400,141 500,129 600,114 700,101" className="chart-line line-dark" />
                      <polyline points="0,193 100,187 200,181 300,176 400,170 500,165 600,160 700,154" className="chart-line line-blue" />
                    </svg>
                    <div className="chart-x-labels"><span>Aug 17</span><span>Aug 22</span><span>Aug 27</span><span>Sep 1</span><span>Sep 6</span><span>Sep 11</span><span>Sep 16</span></div>
                  </div>
                </article>

                <article className="creator-panel performance-panel">
                  <div className="panel-heading">
                    <div><h2>Content Performance</h2><p>Weekly content overview</p></div>
                    <button onClick={() => choosePage("Content")}>View all ↗</button>
                  </div>
                  <div className="metric-tabs">
                    {["Views", "Likes", "Comments", "Shares"].map((item) => (
                      <button key={item} className={metric === item ? "metric-tab-active" : ""} onClick={() => setMetric(item)}>{item}</button>
                    ))}
                  </div>
                  <div className="bar-chart">
                    {[38, 57, 73, 88, 100, 75, 54].map((height, index) => (
                      <div className="bar-column" key={index}>
                        <span style={{ height: `${height}%` }} />
                        <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small>
                      </div>
                    ))}
                  </div>
                  <p className="chart-footnote">Illustrative {metric.toLowerCase()} data · Connect your accounts for real metrics.</p>
                </article>
              </section>

              <section className="creator-lower-grid">
                <article className="creator-panel posts-panel">
                  <div className="panel-heading">
                    <div><h2>Top Performing Posts</h2><p>Your latest content at a glance</p></div>
                    <button onClick={() => choosePage("Content")}>View all →</button>
                  </div>
                  <div className="post-table-wrap">
                    <table className="post-table">
                      <thead><tr><th>Content</th><th>Platform</th><th>Views</th><th>Likes</th><th>Engagement</th></tr></thead>
                      <tbody>
                        {filteredPosts.map((post) => (
                          <tr key={post.title}>
                            <td><div className="post-title"><span className="post-thumb">{post.platform === "YouTube" ? "▶" : post.platform === "Instagram" ? "◎" : "♪"}</span><span><strong>{post.title}</strong><small>{post.type} · {post.date}</small></span></div></td>
                            <td><span className={`platform-tag ${post.platform.toLowerCase()}`}>{post.platform}</span></td>
                            <td>{post.views}</td><td>{post.likes}</td><td><span className="engagement-pill">{post.engagement}</span></td>
                          </tr>
                        ))}
                        {filteredPosts.length === 0 && <tr><td colSpan="5">No matching posts found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </article>

                <div className="creator-right-stack">
                  <article className="creator-panel audience-panel">
                    <div className="panel-heading"><div><h2>Audience Demographics</h2><p>Who follows your work</p></div><button onClick={() => choosePage("Audience")}>View all →</button></div>
                    <div className="audience-content">
                      <div className="donut-chart"><div><strong>125.4K</strong><small>Followers</small></div></div>
                      <div className="audience-legend">
                        <span><i />18–24 <strong>48%</strong></span>
                        <span><i />25–34 <strong>32%</strong></span>
                        <span><i />13–17 <strong>12%</strong></span>
                        <span><i />35–44 <strong>6%</strong></span>
                        <span><i />45+ <strong>2%</strong></span>
                      </div>
                    </div>
                  </article>

                  <article className="creator-panel revenue-panel">
                    <div className="panel-heading"><div><h2>Revenue Overview</h2><p>Creator earnings</p></div><button onClick={() => choosePage("Revenue")}>View all →</button></div>
                    <div className="revenue-total">₹48,250 <span>↗ 20.6%</span></div>
                    <div className="revenue-bars">{[25, 45, 35, 60, 49, 72, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
                    <small className="revenue-note">Illustrative earnings · Last 30 days</small>
                  </article>
                </div>
              </section>

              <section className="creator-bottom-banner">
                <div><span>✳ CREATIVE MOMENTUM</span><h2>Your next great idea starts here.</h2><p>Keep creating, learning and growing your audience.</p></div>
                <button onClick={() => choosePage("Content")}>Explore your content ↗</button>
              </section>
            </>
          ) : (
            <section className="creator-inner-page">
              <div className="inner-icon">{menu.find((item) => item[0] === active)?.[1] || "✳"}</div>
              <h2>{active}</h2>
              <p>
                {active === "My Profile" ? "Your account information and creator identity." :
                  active === "Social Accounts" ? "Connect your social platforms to bring performance data into one workspace." :
                  active === "Content" ? "Organize your content ideas, posts and publishing workflow." :
                  active === "Analytics" ? "Explore audience growth, post performance and engagement trends." :
                  active === "Audience" ? "Learn about your community and the people who engage with your content." :
                  active === "Revenue" ? "Track creator earnings, brand partnerships and revenue trends." :
                  active === "Reports" ? "Review your performance reports and exportable insights." :
                  active === "Notifications" ? "You're all caught up. New notifications will appear here." :
                  "Manage your CreatorIQ workspace preferences."}
              </p>

              {active === "My Profile" && <div className="profile-detail-card"><div className="profile-big-avatar">{(user?.name || "C").slice(0, 1).toUpperCase()}</div><div><h3>{user?.name}</h3><p>{user?.email}</p><span className="profile-role-badge">{user?.role}</span></div></div>}

              {active === "Social Accounts" && <div className="social-connect-grid">{["YouTube", "Instagram", "TikTok", "LinkedIn"].map((name) => <div key={name}><strong>{name}</strong><p>Not connected</p><button onClick={() => alert("Platform connection needs OAuth and backend setup.")}>Connect account +</button></div>)}</div>}

              {active === "Content" && <div className="inner-table"><h3>Your recent content</h3>{posts.map((post) => <p key={post.title}>✳ {post.title} <span>{post.platform} · {post.views} views</span></p>)}</div>}

              {active === "Analytics" && <div className="inner-stats">{metrics.slice(0, 4).map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.value}</strong><small>{item.change} vs last month</small></div>)}</div>}

              {active === "Audience" && <div className="inner-stats"><div><span>Total audience</span><strong>125.4K</strong></div><div><span>Top age group</span><strong>18–24</strong></div><div><span>Engagement</span><strong>6.8%</strong></div></div>}

              {active === "Revenue" && <div className="inner-stats"><div><span>Total revenue</span><strong>₹48,250</strong></div><div><span>Monthly growth</span><strong>+20.6%</strong></div><div><span>Partnerships</span><strong>08</strong></div></div>}

              {active === "Reports" && <div className="inner-table"><h3>Available reports</h3><p>Monthly creator performance <button onClick={() => window.print()}>Print report</button></p><p>Audience growth summary <button onClick={() => window.print()}>Print report</button></p></div>}

              {active === "Notifications" && <div className="inner-table"><p>You're all caught up! ✨</p><p>Connect your social accounts to receive platform updates.</p></div>}

              {active === "Settings" && <div className="inner-table"><h3>Account information</h3><p>Name: {user?.name}</p><p>Email: {user?.email}</p><p>Role: {user?.role}</p><p>Settings are currently a demo. Connect a backend for persistent changes.</p></div>}

              <button className="back-dashboard-button" onClick={() => choosePage("Dashboard")}>← Back to Dashboard</button>
            </section>
          )}
        </div>

        <footer className="creator-footer"><span>CreatorHub · CreatorIQ Workspace</span><span>CREATE WITH PURPOSE ✳</span></footer>
      </section>
    </main>
  );
}


export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("creatoriq-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function signIn(userData) {
    setUser(userData);
    sessionStorage.setItem("creatoriq-user", JSON.stringify(userData));
    setPage("dashboard");
  }

  function register(userData) {
    setUser(userData);
    sessionStorage.setItem("creatoriq-user", JSON.stringify(userData));
    setPage("dashboard");
  }

  function logout() {
  sessionStorage.removeItem("creatoriq-user");
  setUser(null);
  setPage("home");
}

if (page === "dashboard" && user) {
  return <Dashboard user={user} goTo={setPage} onLogout={logout} />;
}

if (page === "login") {
  return <Login goTo={setPage} onLogin={signIn} />;
}

if (page === "register") {
  return <Register goTo={setPage} onRegister={register} />;
}

return <Home goTo={setPage} />;
}
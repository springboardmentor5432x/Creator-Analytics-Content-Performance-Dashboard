  import { useMemo, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import "../styles/CreatorDashboard.css";

  const metricData = [
    { label: "Total Followers", value: "125,430", delta: "+12.4%", note: "+13,800 from last month", icon: "♧", color: "purple" },
    { label: "Total Views", value: "1.8M", delta: "+18.7%", note: "+285K from last month", icon: "◉", color: "blue" },
    { label: "Total Likes", value: "98,240", delta: "+15.3%", note: "+12K from last month", icon: "♡", color: "pink" },
    { label: "Comments", value: "8,932", delta: "+11.6%", note: "+900 from last month", icon: "▤", color: "cyan" },
    { label: "Shares", value: "6,120", delta: "+9.8%", note: "+550 from last month", icon: "↗", color: "violet" },
    { label: "Engagement Rate", value: "6.8%", delta: "+1.2%", note: "vs last month", icon: "♛", color: "gold" },
  ];

  const posts = [
    { title: "5 AI Tools Every Student Should Know", type: "Video", platform: "▶", views: "125K", likes: "8.4K", comments: "620", engagement: "7.9%", date: "Sep 12, 2026", color: "thumb-purple" },
    { title: "A Day in My Life at NIT Roorkee", type: "Reel", platform: "◎", views: "98K", likes: "6.1K", comments: "340", engagement: "6.8%", date: "Sep 10, 2026", color: "thumb-peach" },
    { title: "Healthy Meal Prep Ideas", type: "Video", platform: "♪", views: "76K", likes: "5.2K", comments: "410", engagement: "7.4%", date: "Sep 8, 2026", color: "thumb-blue" },
    { title: "My Study Setup 2026", type: "Image", platform: "◎", views: "62K", likes: "4.3K", comments: "290", engagement: "6.1%", date: "Sep 5, 2026", color: "thumb-mint" },
    { title: "How I Manage College, Work & Life", type: "Video", platform: "▶", views: "58K", likes: "3.9K", comments: "210", engagement: "5.8%", date: "Sep 2, 2026", color: "thumb-rose" },
  ];

  const growthLines = [
    { name: "YouTube", color: "#e65a69", points: "0,142 70,128 140,113 210,100 280,80 350,64 420,47 490,28 560,12" },
    { name: "Instagram", color: "#c45acb", points: "0,151 70,142 140,130 210,120 280,107 350,92 420,76 490,60 560,45" },
    { name: "TikTok", color: "#34384d", points: "0,161 70,156 140,148 210,143 280,132 350,123 420,112 490,101 560,88" },
    { name: "LinkedIn", color: "#4c91ec", points: "0,168 70,166 140,163 210,160 280,158 350,154 420,151 490,148 560,145" },
  ];

  export default function Dashboard() {
    const navigate = useNavigate();
    const [activeMetric, setActiveMetric] = useState("Views");
    const [platform, setPlatform] = useState("All Platforms");
    const [period, setPeriod] = useState("Last 30 Days");
    const user = useMemo(() => {
      try { return JSON.parse(localStorage.getItem("creatoriq_user") || sessionStorage.getItem("creatoriq_user") || "{}"); }
      catch { return {}; }
    }, []);
    const name = user.name || user.full_name || (user.email ? user.email.split("@")[0] : "Creator");
    const firstName = name.split(" ")[0];


function logout() {
  localStorage.removeItem("creatoriq_token");
  localStorage.removeItem("creatoriq_user");

  sessionStorage.removeItem("creatoriq_token");
  sessionStorage.removeItem("creatoriq_user");

  navigate("/login", { replace: true });
}


    const nav = [
      { icon: "▦", label: "Dashboard", href: "#overview", active: true },
      { icon: "♙", label: "My Profile", href: "#profile" },
      { icon: "◎", label: "Social Accounts", href: "#accounts" },
      { icon: "▤", label: "Content", href: "#posts" },
      { icon: "⌁", label: "Analytics", href: "#analytics", expandable: true },
      { icon: "♧", label: "Audience", href: "#demographics", expandable: true },
      { icon: "₹", label: "Revenue", href: "#revenue" },
      { icon: "▧", label: "Reports", href: "#reports" },
      { icon: "♧", label: "Notifications", href: "#notifications" },
      { icon: "⚙", label: "Settings", href: "#settings" },
    ];

    return (
      <main className="ciq-dashboard ciq-reference-dashboard" id="overview">
        <aside className="ciq-sidebar">
          <a className="ciq-dash-brand" href="#overview"><span className="ciq-brand-mark">✦</span><span>Creator<span>IQ</span></span></a>
          <div className="ciq-workspace">
            <img className="ciq-avatar ciq-avatar-photo" src="/creator-profile.png" alt="Creator profile" />
            <div><strong>{name}</strong><small>Creator workspace</small></div>
            <span className="ciq-workspace-more">⌄</span>
          </div>
          <p className="ciq-nav-label">WORKSPACE</p>
          <nav className="ciq-side-nav">
            {nav.slice(0, 8).map(item => <a key={item.label} className={item.active ? "active" : ""} href={item.href}><span>{item.icon}</span>{item.label}{item.expandable && <b className="ciq-nav-chevron">⌄</b>}</a>)}
          </nav>
          <p className="ciq-nav-label ciq-nav-label-bottom">PREFERENCES</p>
          <nav className="ciq-side-nav">
            {nav.slice(8).map(item => item.label === "Settings" ? <a key={item.label} href={item.href}><span>{item.icon}</span>{item.label}</a> : <a key={item.label} href={item.href}><span>{item.icon}</span>{item.label}<i className="ciq-notification-count">3</i></a>)}
            <button onClick={logout}><span>↪</span>Sign out</button>
          </nav>
          <div className="ciq-sidebar-profile"><img className="ciq-profile-avatar ciq-avatar-photo" src="/creator-profile.png" alt="Creator profile" /><span><strong>{name}</strong><small>Creator account</small></span><span className="ciq-profile-menu">···</span></div>
        </aside>

        <section className="ciq-dash-main">
          <header className="ciq-dash-header">
            <div><span className="ciq-breadcrumb">CREATOR STUDIO <span>/</span> DASHBOARD</span><h1>Good evening, {firstName}! <span>✦</span></h1><p>Here's your content performance across all connected platforms.</p></div>
            <div className="ciq-header-actions">
              <label className="ciq-search"><span>⌕</span><input placeholder="Search content, analytics..." aria-label="Search content and analytics" /></label>
              <select className="ciq-date-button" aria-label="Date range" value={period} onChange={e => setPeriod(e.target.value)}><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select>
              <button className="ciq-icon-button" aria-label="Notifications">♧<i /></button><img className="ciq-header-avatar ciq-avatar-photo" src="/creator-profile.png" alt="Creator profile" />
            </div>
          </header>

          <div className="ciq-creator-visual-strip" aria-label="Creator inspiration banner"><img src="/creatoriq-hero.png" alt="Creator studio inspiration" /><div><span>CREATE · SHARE · GROW</span><strong>Your next big idea starts here.</strong><small>One space for your content, community, and growth.</small></div><div className="ciq-visual-growth"><b>+18.7%</b><span>creator growth</span></div></div>

          <div className="ciq-platform-filter" aria-label="Filter by platform">
            <span className="ciq-filter-label">PLATFORM</span>
            {["All Platforms", "YouTube", "Instagram", "TikTok", "LinkedIn"].map(p => <button key={p} className={platform === p ? "selected" : ""} onClick={() => setPlatform(p)}>{p === "All Platforms" ? p : <><img className="ciq-platform-logo-img" src={`/platform-icons/${p.toLowerCase()}.svg`} alt="" />{p}</>}</button>)}
            <button className="ciq-add-platform" onClick={() => alert("Platform connections will be added in a later milestone.")}>＋ Add Platform</button>
          </div>

          <div className="ciq-metric-grid">
            {metricData.map(m => <article className="ciq-metric-card" key={m.label}><div className="ciq-metric-top"><span className={`ciq-metric-icon ${m.color}`}>{m.icon}</span><span className="ciq-metric-label">{m.label}</span></div><div className="ciq-metric-value">{m.value}</div><div className="ciq-metric-change"><b>↗ {m.delta}</b><span>{m.note}</span></div></article>)}
          </div>

          <div className="ciq-analytics-grid" id="analytics">
            <section className="ciq-panel ciq-growth-panel">
              <div className="ciq-panel-heading"><div><h3>Follower Growth <span className="ciq-info">i</span></h3><p>See how your community is growing across platforms.</p></div><button className="ciq-small-more" aria-label="More follower growth options">···</button></div>
              <div className="ciq-legend">{growthLines.map(line => <span key={line.name}><i style={{background:line.color}} />{line.name}</span>)}</div>
              <div className="ciq-line-chart"><div className="ciq-y-labels"><span>200K</span><span>150K</span><span>100K</span><span>50K</span><span>0</span></div><div className="ciq-line-plot"><div className="ciq-chart-gridlines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 560 180" preserveAspectRatio="none" aria-label="Illustrative follower growth chart">{growthLines.map(line => <polyline key={line.name} points={line.points} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}{growthLines.map(line => line.points.split(" ").filter((_,i)=>i===2||i===5||i===8).map((point,i)=>{const [cx,cy]=point.split(",");return <circle key={line.name+i} cx={cx} cy={cy} r="3.5" fill={line.color}/> }))}</svg><div className="ciq-x-labels"><span>Aug 17</span><span>Aug 22</span><span>Aug 27</span><span>Sep 1</span><span>Sep 6</span><span>Sep 11</span><span>Sep 16</span></div></div></div>
            </section>
            <section className="ciq-panel ciq-performance-panel">
              <div className="ciq-panel-heading"><div><h3>Content Performance <span className="ciq-info">i</span></h3><p>Compare how your content is doing.</p></div><button className="ciq-small-more" aria-label="More content performance options">···</button></div>
              <div className="ciq-chart-tabs">{["Views","Likes","Comments","Shares"].map(t=><button key={t} className={activeMetric===t?"active":""} onClick={()=>setActiveMetric(t)}>{t}</button>)}</div>
              <div className="ciq-bar-chart"><div className="ciq-bar-y"><span>200K</span><span>150K</span><span>100K</span><span>50K</span><span>0</span></div><div className="ciq-bars">{[38,58,76,103,139,94,67].map((h,i)=><div key={i} className="ciq-bar-column"><i style={{height:`${h}px`}}/><span>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span></div>)}</div></div>
            </section>
          </div>

          <div className="ciq-bottom-grid">
            <section className="ciq-panel ciq-posts-panel" id="posts">
              <div className="ciq-panel-heading"><div><h3>Top Performing Posts <span className="ciq-info">i</span></h3><p>Your content that's getting the most attention.</p></div><a className="ciq-view-all" href="#content">View All <span>↗</span></a></div>
              <div className="ciq-post-table">
                <div className="ciq-post-table-head"><span>CONTENT</span><span>PLATFORM</span><span>VIEWS</span><span>LIKES</span><span>COMMENTS</span><span>ENGAGEMENT</span></div>
                {posts.map(post=><div className="ciq-post-row" key={post.title}><span className="ciq-post-info"><i className={`ciq-post-thumb ${post.color}`}>{post.platform==="▶"?"▶":post.platform}</i><span><strong>{post.title}</strong><small>{post.type}</small></span></span><span className={`ciq-post-platform ${post.platform==="▶"?"yt":post.platform==="♪"?"tt":"ig"}`}>{post.platform}</span><strong>{post.views}</strong><strong>{post.likes}</strong><span>{post.comments}</span><span className="ciq-post-engagement">{post.engagement}</span></div>)}
              </div>
              <p className="ciq-demo-note">✦ Sample metrics for the UI milestone. Live social-platform data is not connected.</p>
            </section>
            <div className="ciq-right-stack">
              <section className="ciq-panel ciq-demographics-panel" id="demographics">
                <div className="ciq-panel-heading"><div><h3>Audience Demographics <span className="ciq-info">i</span></h3><p>Get to know your audience.</p></div><a className="ciq-view-all" href="#audience">View All <span>↗</span></a></div>
                <div className="ciq-demographic-tabs"><button className="active">Age</button><button>Gender</button><button>Location</button><button>Device</button></div>
                <div className="ciq-demographic-content"><div className="ciq-donut"><div><strong>125.4K</strong><small>Followers</small></div></div><div className="ciq-age-legend"><span><i className="age-one"/>18–24 <b>48%</b></span><span><i className="age-two"/>25–34 <b>32%</b></span><span><i className="age-three"/>13–17 <b>12%</b></span><span><i className="age-four"/>35–44 <b>6%</b></span><span><i className="age-five"/>45+ <b>2%</b></span></div></div>
              </section>
              <section className="ciq-panel ciq-revenue-panel" id="revenue">
                <div className="ciq-panel-heading"><div><h3>Revenue Overview <span className="ciq-info">i</span></h3><p>Total estimated revenue</p></div><a className="ciq-view-all" href="#revenue">View All <span>↗</span></a></div>
                <div className="ciq-revenue-total"><strong>₹48,250</strong><span>↗ 20.6%</span></div><small className="ciq-revenue-caption">+₹8,240 from last month</small>
                <div className="ciq-revenue-bars">{[28,38,31,50,44,58,67,78,72,93].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div>
              </section>
            </div>
          </div>
          <footer className="ciq-dash-footer">CreatorIQ <span>·</span> Make every insight count.</footer>
        </section>
      </main>
    );
  }

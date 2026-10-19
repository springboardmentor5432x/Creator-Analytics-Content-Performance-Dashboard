import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoleDashboards.css";

const recentUsers = [
  { name: "Riya Sharma", email: "riya@example.com", role: "Creator", date: "Sep 15, 2026", status: "Active", tone: "lavender" },
  { name: "Growth Agency", email: "agency@example.com", role: "Agency", date: "Sep 14, 2026", status: "Active", tone: "blue" },
  { name: "Brand Studio", email: "brand@example.com", role: "Marketing Team", date: "Sep 13, 2026", status: "Active", tone: "peach" },
  { name: "Arjun Mehta", email: "arjun@example.com", role: "Creator", date: "Sep 12, 2026", status: "Inactive", tone: "mint" },
  { name: "Content Co.", email: "content@example.com", role: "Agency", date: "Sep 11, 2026", status: "Active", tone: "lavender" },
];
const activities = [
  { icon: "♙", title: "New creator registered", time: "10 min ago", tone: "green" },
  { icon: "◈", title: "Campaign created", time: "25 min ago", tone: "blue" },
  { icon: "⚙", title: "User role updated", time: "1 hour ago", tone: "purple" },
  { icon: "◎", title: "Platform integration added", time: "2 hours ago", tone: "orange" },
  { icon: "▤", title: "Report generated", time: "3 hours ago", tone: "green" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("creatoriq_user") || sessionStorage.getItem("creatoriq_user") || "{}"); }
    catch { return {}; }
  }, []);
  const name = user.name || user.full_name || (user.email ? user.email.split("@")[0] : "Administrator");

function logout() {
  localStorage.removeItem("creatoriq_token");
  localStorage.removeItem("creatoriq_user");

  sessionStorage.removeItem("creatoriq_token");
  sessionStorage.removeItem("creatoriq_user");

  navigate("/login", { replace: true });
}

  return <main className="rd-shell admin-theme">
    <aside className="rd-sidebar">
      <a className="rd-brand" href="/admin-dashboard"><span className="rd-brand-mark admin-mark">✦</span> Creator<span>IQ</span></a>
      <div className="rd-workspace"><div className="rd-avatar admin-avatar">{name.charAt(0).toUpperCase()}</div><div><strong>{name}</strong><small>System administration</small></div><span className="rd-chevron">⌄</span></div>
      <div className="rd-nav-label">CONTROL CENTER</div>
      <nav className="rd-nav">
        <a className="active" href="#admin-overview"><span>▦</span> Overview</a>
        <a href="#admin-users"><span>♙</span> User management <b>148</b></a>
        <a href="#admin-content"><span>▤</span> Content monitoring</a>
        <a href="#admin-integrations"><span>⌘</span> Platform integrations</a>
        <a href="#admin-analytics"><span>⌁</span> Analytics overview</a>
        <a href="#admin-reports"><span>▧</span> Reports</a>
        <a href="#admin-settings"><span>⚙</span> System settings</a>
        <a href="#admin-activity"><span>◷</span> Activity logs</a>
      </nav>
      <div className="rd-nav-label rd-pref">ACCOUNT</div>
      <nav className="rd-nav"><a href="#admin-profile"><span>♙</span> My account</a><button onClick={logout}><span>↪</span> Sign out</button></nav>
      <div className="rd-side-promo admin-promo"><div className="rd-security-illustration"><span>⬡</span><i>✓</i></div><strong>Everything in balance.</strong><p>Monitor platform health and keep CreatorIQ running smoothly.</p><button onClick={() => document.getElementById("admin-activity")?.scrollIntoView({behavior:"smooth"})}>View system activity ↗</button></div>
    </aside>
    <section className="rd-main" id="admin-overview">
      <header className="rd-header"><div><div className="rd-eyebrow">SYSTEM CONTROL <span>/</span> OVERVIEW</div><h1>Welcome back, {name.split(" ")[0]} <span className="rd-title-spark">✦</span></h1><p>A clear view of platform activity, user health, and system performance.</p></div><div className="rd-header-tools"><label className="rd-search"><span>⌕</span><input placeholder="Search users, content..." /></label><button className="rd-date">◷ &nbsp; Last 30 days⌄</button><button className="rd-notice" aria-label="Notifications">♧<i /></button><span className="rd-header-user">{name.charAt(0).toUpperCase()}</span></div></header>
      <section className="rd-admin-hero"><div><span className="rd-kicker">YOUR PLATFORM, AT A GLANCE</span><h2>Secure, steady, <em>scaling.</em></h2><p>Keep an eye on your community, platform usage, and the small details that keep everything working.</p><div className="rd-health"><i/> All systems operational <span>·</span> Updated just now</div></div><div className="rd-admin-art"><img src="/admin-security-art.svg" alt="Security and platform operations illustration"/><div className="rd-admin-art-badge"><span>✓</span><div><strong>99.9%</strong><small>platform uptime</small></div></div></div></section>
      <div className="rd-section-head"><div><h2>Platform overview</h2><p>Key numbers across the CreatorIQ ecosystem.</p></div><button className="rd-text-button" onClick={() => document.getElementById("admin-analytics")?.scrollIntoView({behavior:"smooth"})}>System report ↗</button></div>
      <div className="rd-stat-grid rd-admin-stats">
        <article className="rd-stat"><div className="rd-stat-top"><span>Total users</span><i className="stat-blue">♙</i></div><strong>148</strong><small className="rd-positive">↗ 12 this month</small><div className="rd-stat-progress"><i style={{width:"74%"}}/></div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Creators</span><i className="stat-purple">✦</i></div><strong>120</strong><small className="rd-positive">↗ 5 this month</small><div className="rd-mini-bars purple-bars">{[22,35,30,47,55,61,72,88].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Agencies</span><i className="stat-pink">♧</i></div><strong>18</strong><small className="rd-positive">↗ 1 this month</small><div className="rd-stat-progress pink-progress"><i style={{width:"54%"}}/></div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Marketing teams</span><i className="stat-orange">◈</i></div><strong>7</strong><small className="rd-neutral">Across workspaces</small><div className="rd-stat-progress orange-progress"><i style={{width:"45%"}}/></div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Active users</span><i className="stat-green">✓</i></div><strong>132</strong><small className="rd-positive">↗ 8.2% this month</small><div className="rd-mini-bars green-bars">{[40,46,43,58,64,69,81,94].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
      </div>
      <div className="rd-chart-grid rd-admin-chart-grid" id="admin-analytics">
        <section className="rd-panel rd-performance"><div className="rd-panel-head"><div><h3>User growth</h3><p>New accounts across role groups.</p></div><span className="rd-chip">6 weeks⌄</span></div><div className="rd-legend"><span><i className="legend-red"/> Creators</span><span><i className="legend-purple"/> Agencies</span><span><i className="legend-blue"/> Marketing teams</span></div><div className="rd-line-chart"><div className="rd-y-labels"><span>200</span><span>150</span><span>100</span><span>0</span></div><svg viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="Illustrative user growth chart">{[18,68,118,168].map(y=><line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#eeeaf7" strokeDasharray="4 5"/>)}<polyline points="0,151 95,130 190,111 285,93 380,77 475,55 570,38 620,25" fill="none" stroke="#ef6475" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="0,164 95,153 190,140 285,125 380,109 475,90 570,72 620,60" fill="none" stroke="#a45be8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="0,178 95,174 190,166 285,162 380,153 475,149 570,139 620,132" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div className="rd-x-labels"><span>Aug 17</span><span>Aug 24</span><span>Aug 31</span><span>Sep 7</span><span>Sep 14</span><span>Sep 21</span></div></section>
        <section className="rd-panel rd-usage-panel"><div className="rd-panel-head"><div><h3>Platform usage</h3><p>Activity across connected channels.</p></div><button className="rd-more" aria-label="More options">···</button></div><div className="rd-usage-bars">{[{name:"YouTube",v:92,c:"usage-violet"},{name:"Instagram",v:75,c:"usage-blue"},{name:"TikTok",v:59,c:"usage-cyan"},{name:"LinkedIn",v:38,c:"usage-orange"},{name:"Other",v:27,c:"usage-pink"}].map(p=><div key={p.name}><span className={"rd-usage-bar "+p.c} style={{height:p.v+"%"}}/><small>{p.name}</small></div>)}</div></section>
      </div>
      <div className="rd-bottom-grid rd-admin-bottom" id="admin-users">
        <section className="rd-panel rd-users-panel"><div className="rd-panel-head"><div><h3>Recent users</h3><p>Latest accounts across all roles.</p></div><button className="rd-text-button" onClick={() => alert("User management actions will be connected to protected admin APIs in a later milestone.")}>Manage users ↗</button></div><div className="rd-table-wrap"><table><thead><tr><th>USER</th><th>ROLE</th><th>JOINED</th><th>STATUS</th></tr></thead><tbody>{recentUsers.map(u=><tr key={u.email}><td><div className="rd-person"><span className={"rd-person-avatar "+u.tone}>{u.name.charAt(0)}</span><span><strong>{u.name}</strong><small>{u.email}</small></span></div></td><td><span className={"rd-role-tag role-"+u.role.toLowerCase().replace(" ","-")}>{u.role}</span></td><td>{u.date}</td><td><span className={"rd-status "+(u.status==="Active"?"status-active":"status-paused")}>{u.status}</span></td></tr>)}</tbody></table></div></section>
        <section className="rd-panel rd-activity-panel" id="admin-activity"><div className="rd-panel-head"><div><h3>System activity</h3><p>Recent platform events.</p></div><span className="rd-live-tag"><i/> LIVE FEED DEMO</span></div><div className="rd-activity-list">{activities.map(a=><div className="rd-activity" key={a.title}><span className={"rd-activity-icon "+a.tone}>{a.icon}</span><span><strong>{a.title}</strong><small>{a.time}</small></span><span className="rd-activity-dot">↗</span></div>)}</div></section>
      </div>
      <footer className="rd-footer">CreatorIQ <span>·</span> Thoughtful oversight. Better creator experiences.</footer>
    </section>
  </main>;
}

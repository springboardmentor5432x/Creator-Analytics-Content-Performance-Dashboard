import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoleDashboards.css";

const creators = [
  { name: "Tech With Riya", niche: "Tech · YouTube, Instagram", followers: "450K", views: "5.2M", engagement: "7.8%", revenue: "₹85,000", status: "Active", avatar: "R", tone: "lavender" },
  { name: "Foodie Diaries", niche: "Food · Instagram, TikTok", followers: "320K", views: "3.1M", engagement: "6.4%", revenue: "₹62,000", status: "Active", avatar: "F", tone: "peach" },
  { name: "Travel With Arjun", niche: "Travel · YouTube, Instagram", followers: "280K", views: "4.8M", engagement: "8.1%", revenue: "₹70,000", status: "Active", avatar: "A", tone: "blue" },
  { name: "Fitness Hub", niche: "Fitness · Instagram, TikTok", followers: "210K", views: "2.4M", engagement: "5.9%", revenue: "₹45,000", status: "Paused", avatar: "H", tone: "mint" },
];
const campaigns = [
  { name: "Summer Stories", creator: "Tech With Riya", platform: "Instagram", reach: "820K", spend: "₹1,20,000", status: "Live", progress: 78 },
  { name: "Taste the Weekend", creator: "Foodie Diaries", platform: "TikTok", reach: "540K", spend: "₹85,000", status: "Live", progress: 62 },
  { name: "Explore More", creator: "Travel With Arjun", platform: "YouTube", reach: "1.2M", spend: "₹1,60,000", status: "Review", progress: 44 },
];

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("creatoriq_user") || sessionStorage.getItem("creatoriq_user") || "{}"); }
    catch { return {}; }
  }, []);
  const name = user.name || user.full_name || (user.email ? user.email.split("@")[0] : "Growth Agency");

function logout() {
  localStorage.removeItem("creatoriq_token");
  localStorage.removeItem("creatoriq_user");

  sessionStorage.removeItem("creatoriq_token");
  sessionStorage.removeItem("creatoriq_user");

  navigate("/login", { replace: true });
}

  return <main className="rd-shell agency-theme">
    <aside className="rd-sidebar">
      <a className="rd-brand" href="/agency-dashboard"><span className="rd-brand-mark">✦</span> Creator<span>IQ</span></a>
      <div className="rd-workspace"><div className="rd-avatar agency-avatar">{name.charAt(0).toUpperCase()}</div><div><strong>{name}</strong><small>Agency workspace</small></div><span className="rd-chevron">⌄</span></div>
      <div className="rd-nav-label">WORKSPACE</div>
      <nav className="rd-nav">
        <a className="active" href="#agency-overview"><span>▦</span> Overview</a>
        <a href="#agency-creators"><span>♙</span> Creators <b>12</b></a>
        <a href="#agency-campaigns"><span>◈</span> Campaigns</a>
        <a href="#agency-performance"><span>⌁</span> Analytics</a>
        <a href="#agency-library"><span>▤</span> Content library</a>
        <a href="#agency-reports"><span>▧</span> Reports</a>
        <a href="#agency-team"><span>♧</span> Team members</a>
      </nav>
      <div className="rd-nav-label rd-pref">PREFERENCES</div>
      <nav className="rd-nav"><a href="#agency-settings"><span>⚙</span> Settings</a><button onClick={logout}><span>↪</span> Sign out</button></nav>
      <div className="rd-side-promo agency-promo"><img src="/agency-team-art.svg" alt="" /><strong>Better work, together.</strong><p>Bring your next creator campaign to life.</p><button onClick={() => document.getElementById("agency-campaigns")?.scrollIntoView({behavior:"smooth"})}>Explore campaigns ↗</button></div>
    </aside>
    <section className="rd-main" id="agency-overview">
      <header className="rd-header"><div><div className="rd-eyebrow">AGENCY WORKSPACE <span>/</span> OVERVIEW</div><h1>Good morning, {name.split(" ")[0]} <span className="rd-title-spark">✦</span></h1><p>Your creators, campaigns, and performance — all in one place.</p></div><div className="rd-header-tools"><label className="rd-search"><span>⌕</span><input placeholder="Search creators, campaigns..." /></label><button className="rd-date">◷ &nbsp; Last 30 days⌄</button><button className="rd-notice" aria-label="Notifications">♧<i /></button><span className="rd-header-user">{name.charAt(0).toUpperCase()}</span></div></header>
      <section className="rd-agency-hero"><div className="rd-hero-copy"><span className="rd-kicker">MAKE EVERY PARTNERSHIP COUNT</span><h2>Great creators.<br/><em>Stronger campaigns.</em></h2><p>One clear view of the people and partnerships moving your brand forward.</p><button onClick={() => document.getElementById("agency-creators")?.scrollIntoView({behavior:"smooth"})}>Explore your creators <span>→</span></button></div><div className="rd-agency-art"><img src="/agency-team-art.svg" alt="Illustration of a team planning a creator campaign" /><div className="rd-art-note"><span>↗</span><strong>+27.3%</strong><small>campaign ROI</small></div></div><div className="rd-hero-orb rd-orb-a"/><div className="rd-hero-orb rd-orb-b"/></section>
      <div className="rd-section-head"><div><h2>Agency at a glance</h2><p>A quick pulse check on your portfolio.</p></div><button className="rd-text-button" onClick={() => document.getElementById("agency-performance")?.scrollIntoView({behavior:"smooth"})}>Full report ↗</button></div>
      <div className="rd-stat-grid">
        <article className="rd-stat"><div className="rd-stat-top"><span>Total creators</span><i className="stat-purple">♙</i></div><strong>12</strong><small className="rd-positive">↗ 3 this month</small><div className="rd-mini-bars purple-bars">{[30,44,38,55,47,70,62,88].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Total followers</span><i className="stat-blue">◎</i></div><strong>2.4M</strong><small className="rd-positive">↗ 18.5% this month</small><div className="rd-mini-bars blue-bars">{[24,35,33,48,57,52,76,90].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Total views</span><i className="stat-pink">◉</i></div><strong>18.7M</strong><small className="rd-positive">↗ 22.1% this month</small><div className="rd-mini-bars pink-bars">{[20,30,42,36,58,66,78,94].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Active campaigns</span><i className="stat-orange">◈</i></div><strong>5</strong><small className="rd-neutral">2 awaiting review</small><div className="rd-stat-progress"><i style={{width:"68%"}}/></div></article>
        <article className="rd-stat"><div className="rd-stat-top"><span>Total revenue</span><i className="stat-green">₹</i></div><strong>₹3,48,600</strong><small className="rd-positive">↗ 27.3% this month</small><div className="rd-mini-bars green-bars">{[28,37,33,48,55,67,80,95].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div></article>
      </div>
      <div className="rd-chart-grid" id="agency-performance">
        <section className="rd-panel rd-performance"><div className="rd-panel-head"><div><h3>Portfolio performance</h3><p>How your creator network is trending.</p></div><span className="rd-chip">Last 6 weeks⌄</span></div><div className="rd-legend"><span><i className="legend-purple"/> Followers</span><span><i className="legend-pink"/> Views</span><span><i className="legend-blue"/> Engagement</span></div><div className="rd-line-chart"><div className="rd-y-labels"><span>6M</span><span>4M</span><span>2M</span><span>0</span></div><svg viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="Illustrative agency portfolio performance"><defs><linearGradient id="agencyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8d65f3" stopOpacity=".22"/><stop offset="100%" stopColor="#8d65f3" stopOpacity="0"/></linearGradient></defs>{[18,68,118,168].map(y=><line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#eeeaf7" strokeDasharray="4 5"/>)}<path d="M0 155 L95 130 L190 112 L285 87 L380 72 L475 42 L570 25 L620 15 L620 180 L0 180Z" fill="url(#agencyArea)"/><polyline points="0,155 95,130 190,112 285,87 380,72 475,42 570,25 620,15" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="0,169 95,153 190,141 285,126 380,108 475,90 570,72 620,62" fill="none" stroke="#e653b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="0,178 95,172 190,163 285,155 380,145 475,139 570,128 620,118" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div className="rd-x-labels"><span>Aug 17</span><span>Aug 24</span><span>Aug 31</span><span>Sep 7</span><span>Sep 14</span><span>Sep 21</span></div></section>
        <section className="rd-panel rd-distribution"><div className="rd-panel-head"><div><h3>Platform distribution</h3><p>Where your creator audience lives.</p></div><button className="rd-more" aria-label="More options">···</button></div><div className="rd-donut-layout"><div className="rd-donut"><div><strong>2.4M</strong><small>followers</small></div></div><div className="rd-platform-legend"><span><i className="legend-purple"/>Instagram <b>42%</b></span><span><i className="legend-red"/>YouTube <b>28%</b></span><span><i className="legend-blue"/>TikTok <b>18%</b></span><span><i className="legend-navy"/>LinkedIn <b>8%</b></span><span><i className="legend-sky"/>Other <b>4%</b></span></div></div></section>
      </div>
      <section className="rd-panel rd-table-panel" id="agency-creators"><div className="rd-panel-head"><div><h3>Creators overview</h3><p>Know who is growing and what is performing.</p></div><button className="rd-text-button" onClick={() => alert("Creator directory can be connected in the next milestone.")}>View all creators ↗</button></div><div className="rd-table-wrap"><table><thead><tr><th>CREATOR</th><th>FOLLOWERS</th><th>VIEWS</th><th>ENGAGEMENT</th><th>REVENUE</th><th>STATUS</th></tr></thead><tbody>{creators.map(c=><tr key={c.name}><td><div className="rd-person"><span className={"rd-person-avatar "+c.tone}>{c.avatar}</span><span><strong>{c.name}</strong><small>{c.niche}</small></span></div></td><td>{c.followers}</td><td>{c.views}</td><td><span className="rd-engagement">{c.engagement}</span></td><td>{c.revenue}</td><td><span className={"rd-status "+(c.status==="Active"?"status-active":"status-paused")}>{c.status}</span></td></tr>)}</tbody></table></div></section>
      <div className="rd-bottom-grid" id="agency-campaigns"><section className="rd-panel"><div className="rd-panel-head"><div><h3>Campaign tracker</h3><p>Keep every collaboration moving.</p></div><button className="rd-text-button" onClick={() => alert("Campaign creation is planned for a later milestone.")}>New campaign +</button></div><div className="rd-campaign-list">{campaigns.map(c=><article className="rd-campaign" key={c.name}><div className="rd-campaign-icon">✦</div><div className="rd-campaign-info"><strong>{c.name}</strong><small>{c.creator} · {c.platform}</small><div className="rd-progress"><i style={{width:c.progress+"%"}}/></div></div><div className="rd-campaign-side"><b>{c.reach}</b><small>reach</small><span className={"rd-status "+(c.status==="Live"?"status-active":"status-review")}>{c.status}</span></div></article>)}</div></section><section className="rd-panel rd-insight-panel"><img src="/agency-insights-art.svg" alt="Campaign insights illustration"/><span className="rd-kicker">A LITTLE MORE CLARITY</span><h3>Find the next big win.</h3><p>Compare creator performance, spot rising channels, and plan your next partnership with confidence.</p><button onClick={() => document.getElementById("agency-performance")?.scrollIntoView({behavior:"smooth"})}>Explore insights ↗</button></section></div>
      <footer className="rd-footer">CreatorIQ <span>·</span> Strong partnerships start with clear insights.</footer>
    </section>
  </main>;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronDown,
  CircleDollarSign, Clapperboard, Clock3, Eye, FileText, Gauge,
  Instagram, LayoutDashboard, LogOut, Megaphone, Menu, MessageCircle, Plus, Search,
  Settings2, ShieldCheck, Sparkles, TrendingUp, Users, X, Youtube,
  UserCog, UserPlus, RefreshCw,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, setAuthToken } from './api.js';
import IntegrationsPage from './pages/IntegrationsPage.jsx';
import { AudienceInsightsPage, ContentAnalyticsPage, GrowthTrendsPage } from './pages/AnalyticsPages.jsx';
import CreatorDiscoveryPage from './pages/CreatorDiscoveryPage.jsx';
import RevenuePage from './pages/RevenuePage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ReportsPage, { NotificationsMenu } from './pages/ProductionReportsPage.jsx';
import { AccessGovernancePage, CollaboratorWorkspacePage, CreatorSharingPage } from './pages/WorkspaceAccessPages.jsx';
import { AgencyCampaignsPage, AgencyContentPage, AgencyReportsPage, AgencyTeamPage } from './pages/AgencyPages.jsx';

const fmtNumber = (value) => new Intl.NumberFormat('en-IN', { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0);

function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Activity size={18} strokeWidth={2.6} /></span><span>creator<span className="brand-iq">IQ</span></span></div>;
}

function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [niche, setNiche] = useState('Technology & Education');
  const [registerRole, setRegisterRole] = useState('creator');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = mode === 'login'
        ? { email, password }
        : { email, password, full_name: fullName, profile_name: creatorName, focus_area: niche, role: registerRole };
      const { data } = await api.post(mode === 'login' ? '/auth/login' : '/auth/register', payload);
      onAuthenticated(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not connect to CreatorIQ. Check that the backend is running.'));
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-showcase">
      <div className="showcase-grid" />
      <div className="showcase-content">
        <Brand light />
        <div className="showcase-copy">
          <div className="eyebrow"><Sparkles size={14} /> ONE WORKSPACE. CLEARER GROWTH.</div>
          <h1>Your content has a story.<br /><span>See the signal.</span></h1>
          <p>Understand what resonates, spot your next opportunity, and make every post count with one focused creator analytics workspace.</p>
        </div>
        <div className="showcase-preview" aria-hidden="true">
          <div className="preview-top"><span className="preview-dot"/><span className="preview-dot"/><span className="preview-dot"/><span className="preview-label">PERFORMANCE OVERVIEW</span><span className="preview-live">INSIGHTS</span></div>
          <div className="preview-kpis"><div><span>Total views</span><strong>128.6K</strong><em>↗ 18.4%</em></div><div><span>Engagement</span><strong>6.82%</strong><em>↗ 2.1%</em></div></div>
          <svg viewBox="0 0 520 120" className="preview-chart" role="presentation"><defs><linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7bff" stopOpacity=".38"/><stop offset="100%" stopColor="#8b7bff" stopOpacity="0"/></linearGradient></defs><path d="M0 94 C28 88 30 66 66 77 S108 95 142 61 S187 80 222 52 S265 61 301 34 S352 49 383 25 S434 48 470 17 S501 28 520 7 L520 120 L0 120 Z" fill="url(#previewFill)"/><path d="M0 94 C28 88 30 66 66 77 S108 95 142 61 S187 80 222 52 S265 61 301 34 S352 49 383 25 S434 48 470 17 S501 28 520 7" fill="none" stroke="#a79aff" strokeWidth="3" strokeLinecap="round"/></svg>
          <div className="preview-footer"><span><i className="legend-purple"/> Views</span><span><i className="legend-blue"/> Engagement</span><span>Last 7 days</span></div>
        </div>
        <div className="showcase-footer"><span><ShieldCheck size={15} /> Secure sign-in</span><span>Built for creators & teams</span></div>
      </div>
    </section>

    <section className="auth-panel">
      <div className="mobile-brand"><Brand /></div>
      <div className="auth-form-wrap">
        <div className="auth-heading"><div className="auth-icon"><Gauge size={21}/></div><p className="auth-kicker">CREATORIQ WORKSPACE</p><h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Your performance workspace is ready.' : 'A focused workspace for creator performance.'}</p></div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <>
            <label>Account type<select value={registerRole} onChange={(e) => { const nextRole = e.target.value; setRegisterRole(nextRole); setCreatorName(''); setNiche(nextRole === 'creator' ? 'Technology & Education' : nextRole === 'agency' ? 'Creator partnerships' : 'Content marketing'); }}><option value="creator">Creator</option><option value="agency">Agency</option><option value="marketing_team">Marketing Team</option></select></label>
            <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Your full name" minLength={2} required /></label>
            <label>{registerRole === 'creator' ? 'Creator / profile name' : registerRole === 'agency' ? 'Agency / workspace name' : 'Team / workspace name'}<input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder={registerRole === 'creator' ? 'How your audience knows you' : 'Enter your workspace name'} minLength={2} required /></label>
            <label>{registerRole === 'creator' ? 'Content niche' : registerRole === 'agency' ? 'Agency service focus' : 'Team focus area'}<input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder={registerRole === 'creator' ? 'e.g. Technology & Education' : registerRole === 'agency' ? 'e.g. Creator partnerships' : 'e.g. Content marketing'} minLength={2} required /></label>
          </>}
          <label>Email address<div className="input-wrap"><span className="input-icon">@</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></div></label>
          <label>Password<div className="input-wrap"><span className="input-icon"><ShieldCheck size={16}/></span><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} minLength={mode === 'register' ? 8 : 1} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          {error && <div className="form-error" role="alert"><X size={15}/>{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to workspace' : 'Create account'} <ArrowRight size={17}/></button>
        </form>
        <div className="auth-switch">{mode === 'login' ? 'New to CreatorIQ?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} type="button">{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
        <p className="auth-legal">By continuing, you agree to the CreatorIQ terms and privacy policy.</p>
      </div>
      <div className="auth-bottom"><span>© 2026 CreatorIQ</span></div>
    </section>
  </main>;
}

function Sidebar({ active, onNavigate, onLogout, user, mobileOpen, setMobileOpen }) {
  const drawerRef = useRef(null);
  const animationRef = useRef(null);
  const dragRef = useRef(null);
  const closeDrawer = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setMobileOpen(false);
    document.querySelector('.mobile-menu')?.focus();
  }, [setMobileOpen]);

  useEffect(() => {
    if (mobileOpen) return;
    const drawer = drawerRef.current;
    if (drawer?.classList.contains('sidebar-dragging')) {
      drawer.classList.remove('sidebar-dragging');
      drawer.style.removeProperty('transform');
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, mobileOpen]);

  useEffect(() => () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const animateDrawerTo = useCallback((target, initialVelocity) => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);

    drawer.classList.add('sidebar-dragging');
    let position = drawer.getBoundingClientRect().left;
    let velocity = initialVelocity;
    let previousTime = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      drawer.style.transform = `translateX(${target}px)`;
      if (target < 0) {
        closeDrawer();
      } else {
        drawer.classList.remove('sidebar-dragging');
        drawer.style.removeProperty('transform');
      }
      return;
    }

    const stiffness = 320;
    const damping = 2 * Math.sqrt(stiffness);
    const step = (time) => {
      const elapsed = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      const acceleration = -stiffness * (position - target) - damping * velocity;
      velocity += acceleration * elapsed;
      position += velocity * elapsed;
      drawer.style.transform = `translateX(${position}px)`;

      if (Math.abs(position - target) < 0.5 && Math.abs(velocity) < 5) {
        drawer.style.transform = `translateX(${target}px)`;
        animationRef.current = null;
        if (target < 0) {
          closeDrawer();
        } else {
          drawer.classList.remove('sidebar-dragging');
          drawer.style.removeProperty('transform');
        }
        return;
      }

      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  }, [closeDrawer]);

  const handleDragStart = (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    const position = drawer.getBoundingClientRect().left;
    drawer.classList.add('sidebar-dragging');
    drawer.style.transform = `translateX(${position}px)`;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: position,
      width: drawer.getBoundingClientRect().width,
      samples: [{ x: position, time: event.timeStamp }],
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event) => {
    const drag = dragRef.current;
    const drawer = drawerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !drawer) return;
    const position = Math.max(-drag.width * 1.05, Math.min(0, drag.startPosition + event.clientX - drag.startX));
    drawer.style.transform = `translateX(${position}px)`;
    drag.samples.push({ x: position, time: event.timeStamp });
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= 100);
  };

  const handleDragEnd = (event) => {
    const drag = dragRef.current;
    const drawer = drawerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !drawer) return;
    dragRef.current = null;
    const position = drawer.getBoundingClientRect().left;
    const samples = drag.samples;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const duration = last.time - first.time;
    const velocity = duration > 0 ? ((last.x - first.x) / duration) * 1000 : 0;
    const projectedPosition = position + (velocity / 1000) * 0.998 / (1 - 0.998);
    animateDrawerTo(projectedPosition < -drag.width * 0.525 ? -drag.width * 1.05 : 0, velocity);
  };

  const isCreator = user?.role === 'creator';
  const isAgency = user?.role === 'agency';
  const isCollaborator = user?.role === 'agency' || user?.role === 'marketing_team';
  const workspaceItems = [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    ...(isCreator ? [
      { label: 'Creator discovery', icon: Search },
      { label: 'Connected accounts', icon: Plus },
      { label: 'Content analytics', icon: Clapperboard },
      { label: 'Audience insights', icon: Users },
      { label: 'Growth & trends', icon: TrendingUp },
      { label: 'Revenue', icon: CircleDollarSign },
      { label: 'Reports', icon: FileText },
      { label: 'Notifications', icon: Bell },
      { label: 'Shared access', icon: Users },
    ] : []),
    ...(isAgency ? [
      { label: 'Creator access', icon: Users },
      { label: 'Campaigns', icon: Megaphone },
      { label: 'Content', icon: Clapperboard },
      { label: 'Reports', icon: FileText },
      { label: 'Notifications', icon: Bell },
    ] : []),
    ...(user?.role === 'marketing_team' ? [
      { label: 'Creator access', icon: Users },
      { label: 'Notifications', icon: Bell },
    ] : []),
    ...(user?.role === 'administrator' ? [{ label: 'User management', icon: UserCog }, { label: 'Access governance', icon: ShieldCheck }] : []),
  ];
  const teamItems = isAgency ? [{ label: 'Team management', icon: Users }] : [];
  const accountItems = [{ label: 'Account settings', icon: Settings2 }];
  const renderNavItem = (item) => {
    const Icon = item.icon;
    return <button key={item.label} className={`nav-item ${active === item.label ? 'nav-active' : ''}`} onClick={() => { onNavigate(item.label); closeDrawer(); }}><Icon size={18} /><span>{item.label}</span></button>;
  };
  return <>
    {mobileOpen && <button className="sidebar-backdrop" onClick={closeDrawer} aria-label="Close navigation"/>}
    <aside id="workspace-sidebar" ref={drawerRef} className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-drag-handle" onPointerDown={handleDragStart} onPointerMove={handleDragMove} onPointerUp={handleDragEnd} onPointerCancel={handleDragEnd} aria-hidden="true"/>
      <div className="sidebar-brand"><Brand light/><button className="sidebar-close" onClick={closeDrawer} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">{(user?.full_name || 'A').charAt(0).toUpperCase()}</div><div className="workspace-text"><strong>{user?.full_name || 'Creator workspace'}</strong><span>{(user?.role || "creator").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} role</span></div><ChevronDown size={15}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{workspaceItems.map(renderNavItem)}</nav>
      {teamItems.length > 0 && <><div className="nav-caption">TEAM</div><nav className="main-nav" aria-label="Team navigation">{teamItems.map(renderNavItem)}</nav></>}
      <div className="nav-caption">ACCOUNT</div>
      <nav className="main-nav" aria-label="Account navigation">{accountItems.map(renderNavItem)}</nav>
      <div className="sidebar-grow"/>
      <div className="sidebar-user"><div className="user-avatar">{(user?.full_name || 'A').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}</div><div className="sidebar-user-info"><strong>{user?.full_name || 'Creator'}</strong><span>{user?.email}</span></div><button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    </aside>
  </>;
}

function KpiCard({ title, value, change, icon: Icon, tone, caption, positive = true }) {
  return <article className="kpi-card"><div className="kpi-top"><span>{title}</span><span className={`kpi-icon ${tone}`}><Icon size={18}/></span></div><div className="kpi-value">{value}</div><div className="kpi-bottom"><span className={`kpi-change ${positive ? 'positive' : 'neutral'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span><span className="kpi-caption">{caption}</span></div></article>;
}

function PerformanceChart({ data, isDemo, days }) {
  const [metric, setMetric] = useState('views');
  const displayData = useMemo(() => data.map((item) => ({ ...item, displayViews: item.views, displayRate: item.engagement_rate })), [data]);
  return <section className="card performance-card">
    <div className="card-header performance-header"><div><div className="card-title-row"><h3>Performance overview</h3><span className="subtle-pill"><span className="tiny-pulse"/> {isDemo ? 'Sample data' : 'Synced data'}</span></div><p>{isDemo ? 'Daily activity across sample platform profiles.' : 'Daily activity reported by connected platforms.'}</p></div><div className="chart-controls"><div className="segmented-control"><button className={metric === 'views' ? 'selected' : ''} onClick={() => setMetric('views')}>Views</button><button className={metric === 'engagement' ? 'selected' : ''} onClick={() => setMetric('engagement')}>Engagement</button></div></div></div>
    <div className="chart-summary"><strong>{metric === 'views' ? fmtNumber(data.reduce((sum, d) => sum + d.views, 0)) : `${(data.reduce((sum, d) => sum + d.engagement_rate, 0) / Math.max(data.length, 1)).toFixed(2)}%`}</strong><span>{metric === 'views' ? `views over ${days} days` : 'average engagement rate'}</span></div>
    <div className="main-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={displayData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
      <defs><linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7667f8" stopOpacity={0.24}/><stop offset="100%" stopColor="#7667f8" stopOpacity={0.015}/></linearGradient><linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a6a1" stopOpacity={0.18}/><stop offset="100%" stopColor="#22a6a1" stopOpacity={0.015}/></linearGradient></defs>
      <CartesianGrid stroke="#edf0f5" vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }} tickFormatter={(v) => metric === 'views' ? fmtNumber(v) : `${v}%`} width={48}/><Tooltip contentStyle={{ border: '1px solid #e7eaf1', borderRadius: 12, boxShadow: '0 8px 32px rgba(22,31,53,.10)', fontSize: 12 }} formatter={(value) => metric === 'views' ? [fmtNumber(value), 'Views'] : [`${value}%`, 'Engagement']}/><Area type="monotone" dataKey={metric === 'views' ? 'displayViews' : 'displayRate'} stroke={metric === 'views' ? '#7667f8' : '#22a6a1'} strokeWidth={2.6} fill={metric === 'views' ? 'url(#viewsGradient)' : 'url(#engagementGradient)'} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} dot={false}/>
    </AreaChart></ResponsiveContainer></div>
    <div className="chart-footnote"><span><i className={metric === 'views' ? 'legend-dot purple-dot' : 'legend-dot teal-dot'}/>{metric === 'views' ? 'Total views' : 'Engagement rate'}</span><span><Clock3 size={13}/> Last {days} days</span></div>
  </section>;
}

function PlatformCard({ platforms, isDemo, days }) {
  const iconFor = (name) => name === 'YouTube' ? Youtube : name === 'Instagram' ? Instagram : Activity;
  const classFor = (name) => name.toLowerCase();
  const visiblePlatforms = platforms.filter(
    (platform) => platform.platform.toLowerCase() !== 'tiktok'
  );
  const total = visiblePlatforms.reduce((sum, platform) => sum + platform.followers, 0);
  const scale = total || 1;
  return <section className="card platform-card"><div className="card-header"><div><h3>Platform performance</h3><p>Your account mix at a glance.</p></div></div>
    <div className="platform-total"><strong>{fmtNumber(total)}</strong><span>combined followers {isDemo && <span className="neutral-inline">· sample</span>}</span></div>
    {visiblePlatforms.length ? <div className="platform-list">{visiblePlatforms.map((platform) => { const Icon = iconFor(platform.platform); return <div className="platform-row" key={platform.platform}><div className={`platform-icon ${classFor(platform.platform)}`}><Icon size={17}/></div><div className="platform-meta"><div className="platform-name"><strong>{platform.platform}</strong><span>{fmtNumber(platform.followers)} followers</span></div><small className="platform-sync">{platform.connected ? 'Connected' : 'Historical only'} · {platform.last_synced_at ? `Synced ${new Date(platform.last_synced_at).toLocaleString()}` : 'No successful sync yet'}</small><div className="platform-track"><span className={`platform-fill ${classFor(platform.platform)}`} style={{ width: `${Math.max(platform.followers / scale * 100, 4)}%` }}/></div></div><div className="platform-growth"><strong>{platform.metric_availability?.views ? fmtNumber(platform.views_period) : 'N/A'}</strong><span>{days}d views</span></div></div>; })}</div> : <div className="empty-state">No connected platform data yet.</div>}
    <div className="platform-note"><span className="note-icon"><ShieldCheck size={15}/></span><p>{isDemo ? 'Sample accounts are marked separately from live connections.' : 'Only connected-platform metrics are shown.'}</p></div>
  </section>;
}

function TopContent({ posts, onNavigate, isDemo, days }) {
  const platformIcon = (name) => name === 'YouTube' ? <Youtube size={16}/> : name === 'Instagram' ? <Instagram size={16}/> : <Activity size={16}/>;
  return <section className="card content-card"><div className="card-header"><div><h3>Top-performing content</h3><p>Ranked by views during the last {days} days.</p></div><button className="text-action" type="button" onClick={() => onNavigate?.('Content analytics')}>View analytics <ArrowRight size={14}/></button></div>
    <div className="content-table-wrap"><table className="content-table"><thead><tr><th>CONTENT</th><th>PLATFORM</th><th>VIEWS · {days}D</th><th>ENGAGEMENT</th></tr></thead><tbody>{posts.map((post, index) => <tr key={post.id}><td><div className="post-title-cell"><span className={`post-rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><div><strong>{post.title}</strong><span>{post.content_type}</span></div></div></td><td><span className={`table-platform ${post.platform.toLowerCase()}`}>{platformIcon(post.platform)}{post.platform}</span></td><td className="table-views">{post.metric_availability?.views ? fmtNumber(post.views_period) : 'N/A'}</td><td><span className="engagement-badge">{post.metric_availability?.engagement_rate ? `${Number(post.engagement_rate).toFixed(2)}%` : 'N/A'}</span></td></tr>)}</tbody></table>{posts.length === 0 && <div className="empty-state">{isDemo ? 'No sample content metrics available.' : 'Connect and sync a platform to see content metrics.'}</div>}</div>
    <div className="content-footer"><span>Showing {posts.length} posts</span><button className="text-action" type="button" onClick={() => onNavigate?.('Content analytics')}>Open detailed analytics <ArrowRight size={13}/></button></div>
  </section>;
}

function OverviewUpdates({ posts, platforms, onNavigate, onRefresh }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications?limit=3');
      setNotifications(data.notifications || []);
    } catch (requestError) {
      if (requestError?.response?.status === 401) onRefresh('expired');
      else setError(requestError?.response?.data?.detail || 'Could not load recent notifications.');
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const topPost = posts.find((post) => post.metric_availability?.views);
  const leadingPlatform = platforms
    .filter((platform) => platform.metric_availability?.views)
    .sort((a, b) => b.views_period - a.views_period)[0];

  return <div className="overview-updates-grid">
    <section className="card overview-insights-card">
      <div className="card-header"><div><h3><Sparkles size={16}/> Creator insights</h3><p>Highlights from your available platform data.</p></div></div>
      {topPost || leadingPlatform ? <ul className="overview-insights-list">
        {leadingPlatform && <li><span className="insight-marker"/><span><strong>{leadingPlatform.platform}</strong> had the most reported views across your platforms ({fmtNumber(leadingPlatform.views_period)} in this period).</span></li>}
        {topPost && <li><span className="insight-marker"/><span><strong>{topPost.title}</strong> is your top-viewed content ({fmtNumber(topPost.views_period)} views in this period).</span></li>}
      </ul> : <div className="analytics-empty">Sync a connected account to see insights based on your actual performance.</div>}
      <button className="text-action" type="button" onClick={() => onNavigate?.('Growth & trends')}>Explore growth trends <ArrowRight size={14}/></button>
    </section>
    <section className="card overview-notifications-card">
      <div className="card-header"><div><h3><Bell size={16}/> Recent notifications</h3><p>Your latest workspace updates.</p></div><button className="text-action" type="button" onClick={() => onNavigate?.('Notifications')}>View all <ArrowRight size={14}/></button></div>
      {error && <div className="load-error" role="alert"><span>{error}</span><button onClick={loadNotifications}>Retry</button></div>}
      {loading ? <div className="analytics-loading">Loading notifications…</div> : notifications.length ? <div className="overview-notification-list">{notifications.map((notification) => <button type="button" key={notification.id} className={`overview-notification ${notification.is_read ? 'read' : ''}`} onClick={() => onNavigate?.('Notifications')}><span className="notification-status-dot"/><span><strong>{notification.title}</strong><small>{notification.message}</small></span><time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</time></button>)}</div> : <div className="analytics-empty">You’re all caught up. New account, sync, and report activity will appear here.</div>}
    </section>
  </div>;
}

function CreatorOverview({ user, onRefresh, onNavigate }) {
  const [data, setData] = useState({ profile: null, summary: null, trends: [], platforms: [], posts: [] });
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const [profileResponse, summaryResponse, trendsResponse, platformsResponse, postsResponse] = await Promise.all([
        api.get('/account/profile'),
        api.get(`/dashboard/summary?days=${days}`),
        api.get(`/dashboard/trends?days=${days}`),
        api.get(`/dashboard/platforms?days=${days}`),
        api.get(`/dashboard/top-content?limit=5&days=${days}`),
      ]);
      setData({ profile: profileResponse.data, summary: summaryResponse.data, trends: trendsResponse.data.days || [], platforms: platformsResponse.data.platforms || [], posts: postsResponse.data.posts || [] });
    } catch (error) {
      if (error?.response?.status === 401) onRefresh('expired');
      else setLoadError('Could not load dashboard data. Check that the API is running and try again.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [days, onRefresh]);
  useEffect(() => { load(); }, [load]);

  const summary = data.summary || { followers: 0, views_period: 0, engagement_rate_period: 0, total_engagements: 0, revenue_mtd: 0, posts_count: 0, platforms_count: 0, metric_availability: {} };
  const firstName = (user?.full_name || 'Creator').trim().split(/\s+/)[0];
  const demoData = Boolean(summary.demo_data);
  return <>
    <div className="welcome-row"><div><div className="welcome-eyebrow"><span className="welcome-dot"/> YOUR CREATOR WORKSPACE</div><h1>Good to see you, {firstName}<span className="wave">✦</span></h1><p>Review the currently available performance data for your connected accounts.</p>{(data.profile?.profile_name || data.profile?.focus_area) && <div className="creator-profile-summary"><strong>{data.profile.profile_name || user?.full_name}</strong>{data.profile.focus_area && <span>{data.profile.focus_area}</span>}{data.profile.country && <span>{data.profile.country}</span>}</div>}</div><div className="welcome-actions"><button className="secondary-button" onClick={() => load(true)} disabled={refreshing}><Activity size={16} className={refreshing ? 'spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh data'}</button><button className="primary-button" onClick={() => onNavigate?.('Connected accounts')}><Plus size={16}/> Connect platform</button></div></div>
    <div className="demo-banner"><span className="banner-icon"><Sparkles size={16}/></span><div><strong>{demoData ? 'Sample analytics workspace' : summary.platforms_count ? 'Analytics connected' : 'Connect a platform'}</strong><span>{demoData ? 'Sample records are marked separately from live data.' : summary.platforms_count ? 'Metrics update when you sync a connected provider.' : 'Connect a supported platform and run Sync to import metrics.'}</span></div><span className="banner-tag">{demoData ? 'SAMPLE' : summary.platforms_count ? 'CONNECTED' : 'SETUP'}</span></div>
    {loadError && <div className="load-error" role="alert"><span>{loadError}</span><button onClick={() => load(true)}>Retry</button></div>}
    {loading ? <div className="loading-grid"><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton big-skeleton"/><div className="skeleton big-skeleton"/></div> : <>
      <div className="section-heading"><div><h2>Performance snapshot</h2><p>Summary of your recent activity</p></div><label className="date-filter"><Clock3 size={14}/><span className="sr-only">Analytics date range</span><select className="overview-date-range" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select><ChevronDown size={14}/></label></div>
      <div className="kpi-grid">
        <KpiCard title="Total followers" value={summary.metric_availability?.followers ? fmtNumber(summary.followers) : 'N/A'} change={`${summary.platforms_count} platforms`} caption={demoData ? "Across demo profiles" : "Across your profiles"} icon={Users} tone="violet" positive={false}/>
        <KpiCard title="Content views" value={summary.metric_availability?.views ? fmtNumber(summary.views_period) : 'N/A'} change={`${days} day total`} caption="Views in selected period" icon={Eye} tone="blue" positive/>
        <KpiCard title="Engagement rate" value={summary.metric_availability?.engagement_rate ? `${Number(summary.engagement_rate_period).toFixed(2)}%` : 'N/A'} change="Avg. engagement" caption="Based on available interactions" icon={MessageCircle} tone="teal" positive/>
        <KpiCard title="Total engagements" value={summary.metric_availability?.total_engagements ? fmtNumber(summary.total_engagements) : 'N/A'} change={`${days} day total`} caption="Likes, comments, shares & saves" icon={Activity} tone="amber" positive/>
      </div>
      <div className="analytics-grid"><PerformanceChart data={data.trends} isDemo={demoData} days={days}/><PlatformCard platforms={data.platforms} isDemo={demoData} days={days}/></div>
      <TopContent posts={data.posts} onNavigate={onNavigate} isDemo={demoData} days={days}/>
      <OverviewUpdates posts={data.posts} platforms={data.platforms} onNavigate={onNavigate} onRefresh={onRefresh}/>
      <footer className="dashboard-footer"><span>CreatorIQ <span className="footer-separator">/</span> Creator workspace</span><span><span className="footer-dot"/> {demoData ? "Analytics workspace" : "API connected"}</span></footer>
    </>}
  </>;
}

const roleWorkspaceContent = {
  agency: {
    eyebrow: 'AGENCY WORKSPACE',
    title: 'Agency workspace',
    description: 'Request creator-approved workspace summaries and keep client collaborations organised.',
    accessTitle: 'Creator data access',
    accessValue: 'Consent required',
    accessNote: 'A Creator must approve each workspace connection before any summary is visible.',
    primaryLabel: 'Open creator access',
    steps: [
      ['Complete your agency profile', 'Add your agency name, focus area, and short description.'],
      ['Request creator access', 'Send a consent request using the creator’s CreatorIQ email address.'],
      ['Keep credentials separate', 'Creators connect their own social accounts; agency accounts cannot use another creator’s token.'],
    ],
  },
  marketing_team: {
    eyebrow: 'MARKETING TEAM WORKSPACE',
    title: 'Marketing team workspace',
    description: 'Coordinate approved creator summaries while creators retain ownership of their private analytics.',
    accessTitle: 'Campaign data access',
    accessValue: 'Consent required',
    accessNote: 'Use Creator access to request only the workspace summaries a creator approves.',
    primaryLabel: 'Open creator access',
    steps: [
      ['Complete the team profile', 'Add the team name, focus area, and short description.'],
      ['Request approved access', 'Campaign and creator reporting begin with the creator’s explicit approval.'],
      ['Use creator-owned connections', 'Only the creator who owns a social account can authorize and sync its private analytics.'],
    ],
  },
  administrator: {
    eyebrow: 'ADMINISTRATION',
    title: 'Administrator workspace',
    description: 'Manage application access without exposing private creator analytics.',
    accessTitle: 'Analytics visibility',
    accessValue: 'Protected',
    accessNote: 'Administrators manage accounts; private creator analytics remain scoped to the owning Creator account.',
    primaryLabel: 'Open user management',
    steps: [
      ['Create the correct account type', 'Provision Creator, Agency, Marketing Team, or Administrator accounts from User management.'],
      ['Review roles', 'Role changes take effect on the next API request and preserve existing records.'],
      ['Protect account boundaries', 'Do not share creator credentials or social-provider tokens between workspaces.'],
    ],
  },
};

function RoleWorkspaceOverview({ user, onNavigate }) {
  const role = user?.role || 'agency';
  const content = roleWorkspaceContent[role] || roleWorkspaceContent.agency;
  const firstName = (user?.full_name || 'Workspace').trim().split(/\s+/)[0];
  const goTo = role === 'administrator' ? 'User management' : ['agency', 'marketing_team'].includes(role) ? 'Creator access' : 'Account settings';

  return <section className="role-workspace">
    <div className="welcome-row role-welcome"><div><div className="welcome-eyebrow"><span className="welcome-dot"/> {content.eyebrow}</div><h1>Welcome, {firstName}<span className="wave">✦</span></h1><p>{content.description}</p></div><button className="primary-button" onClick={() => onNavigate?.(goTo)}>{content.primaryLabel} <ArrowRight size={16}/></button></div>

    <div className="role-status-grid">
      <article className="role-status-card"><span className="role-status-icon violet"><ShieldCheck size={19}/></span><div><span>Workspace status</span><strong>Ready</strong><small>Your role-specific workspace profile is active.</small></div></article>
      <article className="role-status-card"><span className="role-status-icon blue"><Users size={19}/></span><div><span>{content.accessTitle}</span><strong>{content.accessValue}</strong><small>{content.accessNote}</small></div></article>
      <article className="role-status-card"><span className="role-status-icon teal"><Settings2 size={19}/></span><div><span>Next action</span><strong>{role === 'administrator' ? 'Manage users' : ['agency', 'marketing_team'].includes(role) ? 'Request access' : 'Review profile'}</strong><small>Use the workspace controls for the actions available to this role.</small></div></article>
    </div>

    <section className="card role-plan-card">
      <div className="card-header"><div><h3>Workspace checklist</h3><p>Clear actions for this role in the current CreatorIQ workspace.</p></div><span className="admin-lock"><ShieldCheck size={14}/>{role.replaceAll('_', ' ').toUpperCase()}</span></div>
      <ol className="role-step-list">{content.steps.map(([title, note], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><p>{note}</p></div></li>)}</ol>
    </section>
  </section>;
}

function Overview(props) {
  return props.user?.role === 'creator'
    ? <CreatorOverview {...props}/>
    : <RoleWorkspaceOverview {...props}/>;
}

function UserManagement({ onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'creator',
    profile_name: '', focus_area: 'General',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load accounts. Confirm that you are signed in as an administrator.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const createAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/admin/users', form);
      setUsers((current) => [...current, data].sort((a, b) => a.id - b.id));
      setForm({ full_name: '', email: '', password: '', role: 'creator', profile_name: '', focus_area: 'General' });
      onToast(`Created ${data.role.replaceAll('_', ' ')} account for ${data.email}.`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not create account.'));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (account, nextRole) => {
    if (account.role === nextRole) return;
    setError('');
    try {
      const { data } = await api.patch(`/admin/users/${account.id}/role`, { role: nextRole });
      setUsers((current) => current.map((item) => item.id === data.id ? data : item));
      onToast(`Updated ${data.email} to ${data.role.replaceAll('_', ' ')}.`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not update role.'));
      await loadUsers();
    }
  };

  return <section className="admin-page">
    <div className="welcome-row admin-welcome"><div><div className="welcome-eyebrow"><span className="welcome-dot"/> ADMINISTRATION</div><h1>User management</h1><p>Create accounts, assign roles, and review who can access CreatorIQ.</p></div><button className="secondary-button" onClick={loadUsers} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Refreshing…' : 'Refresh users'}</button></div>
    {error && <div className="admin-error" role="alert"><X size={15}/>{error}</div>}
    <div className="admin-layout">
      <section className="card admin-card">
        <div className="card-header"><div><h3><UserPlus size={16}/> Create an account</h3><p>Administrator-only account provisioning.</p></div><span className="admin-lock"><ShieldCheck size={14}/> ADMIN</span></div>
        <form className="admin-form" onSubmit={createAccount}>
          <label>Full name<input value={form.full_name} onChange={(e) => updateForm('full_name', e.target.value)} minLength={2} maxLength={120} required placeholder="Account holder name" /></label>
          <label>Email address<input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required placeholder="person@example.com" /></label>
          <label>Temporary password<input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} minLength={8} maxLength={128} required placeholder="At least 8 characters" /></label>
          <label>Assign role<select value={form.role} onChange={(e) => updateForm('role', e.target.value)}><option value="creator">Creator</option><option value="agency">Agency</option><option value="marketing_team">Marketing Team</option><option value="administrator">Administrator</option></select></label>
          {form.role !== 'administrator' && <>
            <label>{form.role === 'creator' ? 'Creator / profile name' : form.role === 'agency' ? 'Agency / workspace name' : 'Team / workspace name'}<input value={form.profile_name} onChange={(e) => updateForm('profile_name', e.target.value)} placeholder="Defaults to full name" /></label>
            <label>{form.role === 'creator' ? 'Content niche' : form.role === 'agency' ? 'Agency service focus' : 'Team focus area'}<input value={form.focus_area} onChange={(e) => updateForm('focus_area', e.target.value)} minLength={2} maxLength={100} required /></label>
          </>}
          <button className="primary-button admin-create-button" disabled={saving}>{saving ? 'Creating account…' : 'Create account'} <ArrowRight size={16}/></button>
          <p className="admin-help">New accounts can sign in immediately. Public sign-up cannot assign the Administrator role.</p>
        </form>
      </section>

      <section className="card admin-card admin-users-card">
        <div className="card-header"><div><h3><Users size={16}/> Registered accounts</h3><p>{users.length} account{users.length === 1 ? '' : 's'} · role changes take effect on the next request.</p></div><span className="account-count">{users.length}</span></div>
        {loading ? <div className="admin-empty">Loading accounts…</div> : users.length === 0 ? <div className="admin-empty">No accounts found.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td><div className="admin-user-cell"><span className="admin-avatar">{(account.full_name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{account.full_name}</strong><span>{account.email}</span></div></div></td><td><select aria-label={`Role for ${account.email}`} value={account.role} onChange={(e) => changeRole(account, e.target.value)}><option value="creator">Creator</option><option value="agency">Agency</option><option value="marketing_team">Marketing Team</option><option value="administrator">Administrator</option></select></td><td className="admin-date">{account.created_at ? new Date(account.created_at).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </section>;
}

function AccountSettings({ user, onUserUpdated, onToast, onSessionRefresh }) {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', profile_name: '', focus_area: '', bio: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [preferences, setPreferences] = useState(null);
  const [preferenceForm, setPreferenceForm] = useState(null);
  const [activity, setActivity] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [preferenceError, setPreferenceError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, preferenceResponse, activityResponse, sessionResponse] = await Promise.all([
        api.get('/account/profile'),
        api.get('/account/preferences'),
        api.get('/account/login-activity?limit=10'),
        api.get('/account/sessions'),
      ]);
      setProfile(profileResponse.data);
      setProfileForm({
        full_name: profileResponse.data.full_name || '',
        profile_name: profileResponse.data.profile_name || '',
        focus_area: profileResponse.data.focus_area || '',
        bio: profileResponse.data.bio || '',
      });
      setPreferences(preferenceResponse.data);
      setPreferenceForm({
        timezone: preferenceResponse.data.timezone || 'UTC',
        date_format: preferenceResponse.data.date_format || 'DD/MM/YYYY',
        notification_preferences: preferenceResponse.data.notification_preferences || {},
      });
      setActivity(activityResponse.data);
      setSessionInfo(sessionResponse.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load account settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const updateProfileForm = (key, value) => setProfileForm((current) => ({ ...current, [key]: value }));
  const updatePasswordForm = (key, value) => setPasswordForm((current) => ({ ...current, [key]: value }));
  const isAdmin = user?.role === 'administrator';
  const profileLabel = user?.role === 'creator' ? 'Creator / profile name' : user?.role === 'agency' ? 'Agency / workspace name' : 'Team / workspace name';
  const focusLabel = user?.role === 'creator' ? 'Content niche' : user?.role === 'agency' ? 'Agency service focus' : 'Team focus area';

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      const payload = { full_name: profileForm.full_name };
      if (!isAdmin) Object.assign(payload, {
        profile_name: profileForm.profile_name,
        focus_area: profileForm.focus_area,
        bio: profileForm.bio,
      });
      const { data } = await api.patch('/account/profile', payload);
      setProfile(data);
      setProfileForm({ full_name: data.full_name || '', profile_name: data.profile_name || '', focus_area: data.focus_area || '', bio: data.bio || '' });
      onUserUpdated({ full_name: data.full_name });
      onToast('Account settings saved.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not save account settings.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      // The backend rotates the session version on a password change and
      // returns a fresh token for this device; older sessions are revoked.
      const { data } = await api.post('/account/password', { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      if (data?.access_token && onSessionRefresh) onSessionRefresh(data.access_token);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      onToast('Password updated. Other signed-in sessions were revoked.');
      await loadProfile();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setPasswordError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!preferenceForm) return;
    setSavingPreferences(true);
    setPreferenceError('');
    try {
      const { data } = await api.patch('/account/preferences', {
        timezone: preferenceForm.timezone,
        date_format: preferenceForm.date_format,
        notification_preferences: preferenceForm.notification_preferences,
      });
      setPreferences(data);
      setPreferenceForm({
        timezone: data.timezone || 'UTC',
        date_format: data.date_format || 'DD/MM/YYYY',
        notification_preferences: data.notification_preferences || {},
      });
      onToast('Preferences saved.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setPreferenceError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not save preferences.'));
    } finally {
      setSavingPreferences(false);
    }
  };

  const togglePreference = (key) => setPreferenceForm((current) => ({
    ...current,
    notification_preferences: {
      ...current.notification_preferences,
      [key]: !current.notification_preferences?.[key],
    },
  }));

  const logoutOtherSessions = async () => {
    if (!window.confirm('Sign out every other device using this account? This device stays signed in.')) return;
    setRevokingSessions(true);
    setError('');
    try {
      const { data } = await api.post('/account/sessions/logout-others');
      if (data?.access_token && onSessionRefresh) onSessionRefresh(data.access_token);
      onToast('All other sessions have been signed out.');
      await loadProfile();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not sign out other sessions.');
    } finally {
      setRevokingSessions(false);
    }
  };

  const activityLabels = {
    'auth.login': 'Signed in',
    'auth.login_failed': 'Failed sign-in attempt',
    'auth.logout': 'Signed out',
    'account.password_changed': 'Password changed',
    'account.sessions_revoked': 'Other sessions signed out',
  };

  return <section className="admin-page">
    <div className="welcome-row admin-welcome">
      <div><div className="welcome-eyebrow"><span className="welcome-dot"/> ACCOUNT</div><h1>Account settings</h1><p>Manage your sign-in details and {isAdmin ? 'administrator account.' : 'workspace profile.'}</p></div>
      <span className="admin-lock"><ShieldCheck size={14}/> {String(user?.role || '').replaceAll('_', ' ').toUpperCase()}</span>
    </div>
    {error && <div className="admin-error" role="alert"><X size={15}/>{error}</div>}
    {loading ? <div className="card admin-card admin-empty">Loading account settings…</div> : <div className="admin-layout settings-layout">
      <section className="card admin-card">
        <div className="card-header"><div><h3><Settings2 size={16}/> Profile information</h3><p>Update your account and workspace details.</p></div></div>
        <form className="admin-form" onSubmit={saveProfile}>
          <label>Full name<input value={profileForm.full_name} onChange={(e) => updateProfileForm('full_name', e.target.value)} minLength={2} maxLength={120} required /></label>
          <label>Email address<input value={profile?.email || ''} readOnly disabled /></label>
          {!isAdmin && <>
            <label>{profileLabel}<input value={profileForm.profile_name} onChange={(e) => updateProfileForm('profile_name', e.target.value)} minLength={2} maxLength={120} required /></label>
            <label>{focusLabel}<input value={profileForm.focus_area} onChange={(e) => updateProfileForm('focus_area', e.target.value)} minLength={2} maxLength={100} required /></label>
            <label>Bio / description<textarea className="settings-textarea" value={profileForm.bio} onChange={(e) => updateProfileForm('bio', e.target.value)} maxLength={1000} rows={4} placeholder="A short description of your profile or workspace" /></label>
          </>}
          <button className="primary-button admin-create-button" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'} <ArrowRight size={16}/></button>
        </form>
      </section>
      <section className="card admin-card">
        <div className="card-header"><div><h3><ShieldCheck size={16}/> Security</h3><p>Change your password without exposing it to the administrator.</p></div></div>
        <form className="admin-form" onSubmit={savePassword}>
          <label>Current password<input type="password" value={passwordForm.current_password} onChange={(e) => updatePasswordForm('current_password', e.target.value)} autoComplete="current-password" required /></label>
          <label>New password<input type="password" value={passwordForm.new_password} onChange={(e) => updatePasswordForm('new_password', e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
          <label>Confirm new password<input type="password" value={passwordForm.confirm_password} onChange={(e) => updatePasswordForm('confirm_password', e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
          {passwordError && <div className="admin-error" role="alert"><X size={15}/>{passwordError}</div>}
          <button className="primary-button admin-create-button" disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Update password'} <ArrowRight size={16}/></button>
          <p className="admin-help">Use at least 8 characters. Changing your password signs out every other session immediately.</p>
        </form>
      </section>
      <section className="card admin-card">
        <div className="card-header"><div><h3><Clock3 size={16}/> Sessions &amp; login activity</h3><p>Review recent sign-in activity and revoke every other session.</p></div></div>
        <div className="session-summary">
          <div><small>Session generation</small><strong>{sessionInfo ? `v${sessionInfo.session_version}` : '—'}</strong></div>
          <div><small>Last sign-in</small><strong>{sessionInfo?.last_login_at ? new Date(sessionInfo.last_login_at).toLocaleString('en-IN') : '—'}</strong></div>
        </div>
        {activity?.events?.length ? <div className="admin-table-wrap"><table className="admin-table activity-table">
          <thead><tr><th>EVENT</th><th>WHEN</th><th>IP</th></tr></thead>
          <tbody>{activity.events.map((event) => (
            <tr key={event.id}>
              <td><strong>{activityLabels[event.action] || event.action}</strong></td>
              <td className="admin-date">{new Date(event.created_at).toLocaleString('en-IN')}</td>
              <td>{event.ip || '—'}</td>
            </tr>
          ))}</tbody>
        </table></div> : <div className="analytics-empty">No login activity recorded yet.</div>}
        <button className="secondary-button logout-others-button" onClick={logoutOtherSessions} disabled={revokingSessions}>
          {revokingSessions ? 'Signing out…' : 'Log out other sessions'}
        </button>
      </section>
      <section className="card admin-card">
        <div className="card-header"><div><h3><Bell size={16}/> Preferences</h3><p>Timezone, date format, and the in-app alerts you want to receive.</p></div></div>
        {preferenceForm ? <form className="admin-form" onSubmit={savePreferences}>
          <label>Timezone<input value={preferenceForm.timezone} onChange={(e) => setPreferenceForm((current) => ({ ...current, timezone: e.target.value }))} maxLength={60} placeholder="e.g. Asia/Kolkata" /></label>
          <label>Date format<select value={preferenceForm.date_format} onChange={(e) => setPreferenceForm((current) => ({ ...current, date_format: e.target.value }))}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select></label>
          <fieldset className="preference-toggles">
            <legend>In-app notifications</legend>
            {[['access_requests', 'Access requests'], ['access_decisions', 'Access approvals & revocations'], ['reports', 'Report ready'], ['revenue', 'Revenue entries'], ['sync_failures', 'Sync failures'], ['security', 'Security events (always recommended)']].map(([key, label]) => (
              <label key={key} className="checkbox-row">
                <input type="checkbox" checked={Boolean(preferenceForm.notification_preferences?.[key])} onChange={() => togglePreference(key)} disabled={key === 'security'} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {preferenceError && <div className="admin-error" role="alert"><X size={15}/>{preferenceError}</div>}
          <button className="primary-button admin-create-button" disabled={savingPreferences}>{savingPreferences ? 'Saving…' : 'Save preferences'} <ArrowRight size={16}/></button>
        </form> : <div className="analytics-loading">Loading preferences…</div>}
      </section>
    </div>}
  </section>;
}

function GlobalSearch({ user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const isCreator = user?.role === 'creator';
  const isAdmin = user?.role === 'administrator';
  const options = useMemo(() => [
    { label: 'Overview', hint: 'Workspace summary', keywords: 'home dashboard summary start' },
    ...(isCreator ? [
      { label: 'Creator discovery', hint: 'Find public channels', keywords: 'search youtube public creators' },
      { label: 'Connected accounts', hint: 'Manage integrations', keywords: 'connect sync youtube instagram facebook x linkedin' },
      { label: 'Content analytics', hint: 'Performance by content', keywords: 'posts videos content performance' },
      { label: 'Audience insights', hint: 'Audience breakdown', keywords: 'followers demographics audience' },
      { label: 'Growth & trends', hint: 'Historical growth', keywords: 'growth trend chart history' },
      { label: 'Revenue', hint: 'Income tracking', keywords: 'money income earnings revenue' },
      { label: 'Reports', hint: 'Exports and schedules', keywords: 'report export pdf csv excel schedule' },
      { label: 'Notifications', hint: 'Workspace alerts', keywords: 'alerts inbox notifications' },
      { label: 'Shared access', hint: 'Creator sharing', keywords: 'share access permissions collaborators' },
    ] : []),
    ...(user?.role === 'agency' ? [
      { label: 'Creator access', hint: 'Request creator summaries', keywords: 'access request creators' },
      { label: 'Campaigns', hint: 'Brand work and budgets', keywords: 'campaigns brand budget assignments' },
      { label: 'Content', hint: 'Authorized creator content', keywords: 'content performance creators' },
      { label: 'Reports', hint: 'Agency exports', keywords: 'report export pdf csv excel agency' },
      { label: 'Notifications', hint: 'Workspace alerts', keywords: 'alerts inbox notifications' },
      { label: 'Team management', hint: 'Agency colleagues', keywords: 'team members invite roles' },
    ] : []),
    ...(user?.role === 'marketing_team' ? [
      { label: 'Creator access', hint: 'Request creator summaries', keywords: 'access request creators' },
      { label: 'Notifications', hint: 'Workspace alerts', keywords: 'alerts inbox notifications' },
    ] : []),
    ...(isAdmin ? [
      { label: 'User management', hint: 'Accounts and roles', keywords: 'users accounts roles admin' },
      { label: 'Access governance', hint: 'Collaboration review', keywords: 'governance access audit' },
    ] : []),
    { label: 'Account settings', hint: 'Profile and security', keywords: 'profile password security settings' },
  ], [isAdmin, isCreator, user?.role]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((option) => `${option.label} ${option.hint} ${option.keywords}`.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const choose = (label) => { onNavigate(label); setOpen(false); };

  return <div className="global-search" ref={wrapRef}>
    <button className="topbar-search-trigger" onClick={() => setOpen((value) => !value)} aria-label="Search workspace" aria-expanded={open}>
      <Search size={15}/><span>Search workspace</span><kbd>⌘ K</kbd>
    </button>
    {open && <div className="global-search-panel" role="dialog" aria-label="Workspace search" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } }}>
      <div className="global-search-input">
        <Search size={16}/>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setHighlight(0); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setHighlight((value) => Math.min(value + 1, results.length - 1)); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight((value) => Math.max(value - 1, 0)); }
            else if (event.key === 'Enter' && results[highlight]) { event.preventDefault(); choose(results[highlight].label); }
          }}
          placeholder="Search pages and actions…"
          aria-label="Search pages and actions"
        />
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close search"><X size={15}/></button>
      </div>
      <div className="global-search-results">
        {results.length ? results.map((result, index) => <button key={result.label} className={`global-search-item ${index === highlight ? 'is-highlighted' : ''}`} onMouseEnter={() => setHighlight(index)} onClick={() => choose(result.label)}>
          <span><strong>{result.label}</strong><small>{result.hint}</small></span><ArrowRight size={14}/>
        </button>) : <div className="global-search-empty">No pages match “{query}”.</div>}
      </div>
    </div>}
  </div>;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('creatoriq_token') || '');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('creatoriq_user') || 'null'); } catch { return null; } });
  const [authChecked, setAuthChecked] = useState(false);
  const [active, setActive] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const logout = useCallback((reason) => {
    localStorage.removeItem('creatoriq_token');
    localStorage.removeItem('creatoriq_user');
    setAuthToken('');
    setToken('');
    setUser(null);
    setActive('Overview');
    setMobileOpen(false);
    setNotificationOpen(false);
    setUnreadNotifications(0);
    if (reason === 'expired') setToast('Your session expired. Please sign in again.');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('integration');
    const reason = params.get('reason');
    const providerNames = { youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn' };
    const reasonMessages = {
      authorization_denied: 'authorization was denied or blocked by the provider',
      invalid_state: 'the sign-in session expired or was already used; start the connection again',
      missing_state: 'the provider did not return a valid sign-in session',
      missing_code: 'the provider did not return an authorization code',
      provider_error: 'the provider rejected the request; check its app configuration and approved scopes',
      connection_failed: 'the connection could not be completed; check the provider setup and retry',
      channel_not_found: 'no eligible YouTube channel was returned for this Google account',
      channel_already_connected: 'that channel is already connected to this creator workspace',
      secure_storage_failed: 'secure token storage is not available on the backend',
      user_unavailable: 'the signed-in Creator account is no longer available',
      no_managed_pages: 'the Facebook account does not manage any Pages, or Page permissions were not granted',
      page_already_connected: 'one of those Pages is already connected to this creator workspace',
      no_assigned_instagram_account: 'no Instagram professional account is shared with this app; reconnect and select the business portfolio that owns it',
      multiple_instagram_accounts: 'more than one Instagram account is shared with this app; keep one shared account and retry',
      account_already_connected: 'that Instagram account is already connected to this creator workspace',
    };
    if (['youtube_connected', 'instagram_connected', 'facebook_connected', 'x_connected', 'linkedin_connected'].includes(result)) {
      const provider = result.split('_')[0];
      setActive('Connected accounts');
      setToast(`${providerNames[provider] || provider} account connected successfully. Click Sync to import analytics.`);
    } else if (['youtube_error', 'instagram_error', 'facebook_error', 'x_error', 'linkedin_error'].includes(result)) {
      const provider = result.replace('_error', '');
      setActive('Connected accounts');
      setToast(`${providerNames[provider] || provider} connection did not complete: ${reasonMessages[reason] || 'check provider setup and permissions, then try again'}.`);
    }
    if (result) window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    if (!token) { setAuthToken(''); setAuthChecked(true); return; }
    setAuthToken(token);
    api.get('/auth/me').then(({ data }) => { setUser(data); localStorage.setItem('creatoriq_user', JSON.stringify(data)); }).catch(() => logout()).finally(() => setAuthChecked(true));
  }, [token, logout]);

  const authenticated = useCallback((response) => {
    localStorage.setItem('creatoriq_token', response.access_token);
    localStorage.setItem('creatoriq_user', JSON.stringify(response.user));
    setAuthToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    setAuthChecked(true);
    setToast('Signed in successfully.');
  }, []);

  const handleSessionRefresh = useCallback((freshToken) => {
    if (!freshToken) return;
    localStorage.setItem('creatoriq_token', freshToken);
    setAuthToken(freshToken);
    setToken(freshToken);
  }, []);

  useEffect(() => { if (!toast) return undefined; const id = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(id); }, [toast]);

  const updateUnreadNotifications = useCallback((count) => setUnreadNotifications(Number(count || 0)), []);

  useEffect(() => {
    if (!user || user.role === 'administrator') {
      setUnreadNotifications(0);
      return undefined;
    }
    let activeRequest = true;
    api.get('/notifications?limit=1').then(({ data }) => {
      if (activeRequest) updateUnreadNotifications(data.unread_count);
    }).catch(() => {
      if (activeRequest) setUnreadNotifications(0);
    });
    return () => { activeRequest = false; };
  }, [user?.id, user?.role, updateUnreadNotifications]);

  const navigate = (label) => {
    setActive(label);
  };

  if (!authChecked) return <div className="app-loading"><div className="loading-brand"><Brand/><span className="spinner"/></div><p>Securing your workspace…</p></div>;
  if (!token || !user) return <><LoginScreen onAuthenticated={authenticated}/>{toast && <div className="toast toast-floating"><ShieldCheck size={16}/>{toast}</div>}</>;

  const handleUserUpdated = (updates) => {
    setUser((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem('creatoriq_user', JSON.stringify(next));
      return next;
    });
  };

  return <div className="app-shell">
    <Sidebar active={active} onNavigate={navigate} onLogout={() => logout()} user={user} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button>
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
        <div className="topbar-right">
          <GlobalSearch user={user} onNavigate={navigate}/>
          {user.role !== 'administrator' && <div className="notification-anchor"><button className="top-icon-button" title="Notifications" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}><Bell size={18}/>{unreadNotifications > 0 && <i>{unreadNotifications > 9 ? '9+' : unreadNotifications}</i>}</button>{notificationOpen && <NotificationsMenu onClose={() => setNotificationOpen(false)} onUnreadChange={updateUnreadNotifications}/>}</div>}
          <span className="topbar-divider"/>
          <div className="top-user"><div className="user-avatar small-avatar">{(user.full_name || 'A').split(' ').map((s) => s[0]).join('').slice(0,2).toUpperCase()}</div><span>{user.full_name?.split(' ')[0] || 'Creator'}</span><ChevronDown size={14}/></div>
        </div>
      </header>
      <div className="page-content">
        {active === 'User management' && user.role === 'administrator' ? <UserManagement onToast={setToast}/>
          : active === 'Account settings' ? <AccountSettings user={user} onUserUpdated={handleUserUpdated} onToast={setToast} onSessionRefresh={handleSessionRefresh}/>
          : active === 'Creator discovery' && user.role === 'creator' ? <CreatorDiscoveryPage onToast={setToast}/>
          : active === 'Connected accounts' && user.role === 'creator' ? <IntegrationsPage onToast={setToast}/>
          : active === 'Content analytics' && user.role === 'creator' ? <ContentAnalyticsPage/>
          : active === 'Audience insights' && user.role === 'creator' ? <AudienceInsightsPage/>
          : active === 'Growth & trends' && user.role === 'creator' ? <GrowthTrendsPage/>
          : active === 'Revenue' && user.role === 'creator' ? <RevenuePage onToast={setToast}/>
          : active === 'Reports' && user.role === 'creator' ? <ReportsPage onToast={setToast}/>
          : active === 'Reports' && user.role === 'agency' ? <AgencyReportsPage onToast={setToast}/>
          : active === 'Notifications' && (user.role === 'creator' || user.role === 'agency' || user.role === 'marketing_team') ? <NotificationsPage onToast={setToast} onUnreadChange={updateUnreadNotifications} onNavigate={navigate}/>
          : active === 'Shared access' && user.role === 'creator' ? <CreatorSharingPage onToast={setToast}/>
          : active === 'Creator access' && (user.role === 'agency' || user.role === 'marketing_team') ? <CollaboratorWorkspacePage role={user.role} onToast={setToast}/>
          : active === 'Team management' && user.role === 'agency' ? <AgencyTeamPage onToast={setToast}/>
          : active === 'Campaigns' && user.role === 'agency' ? <AgencyCampaignsPage onToast={setToast}/>
          : active === 'Content' && user.role === 'agency' ? <AgencyContentPage/>
          : active === 'Access governance' && user.role === 'administrator' ? <AccessGovernancePage/>
          : <Overview user={user} onRefresh={logout} onNavigate={navigate}/>} 
      </div>
    </main>
    {toast && <div className="toast"><ShieldCheck size={16}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14}/></button></div>}
  </div>;
}

export default App;

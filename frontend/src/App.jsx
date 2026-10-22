import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronDown,
  CircleHelp, Clapperboard, Clock3, Download, Eye, FileBarChart2, Gauge,
  Instagram, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search,
  Settings2, ShieldCheck, Sparkles, TrendingUp, Users, Wallet, X, Youtube,
  UserCog, UserPlus, RefreshCw,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, setAuthToken } from './api.js';

const fmtNumber = (value) => new Intl.NumberFormat('en-IN', { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0);
const fmtMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Activity size={18} strokeWidth={2.6} /></span><span>creator<span className="brand-iq">IQ</span></span></div>;
}

function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@creatoriq.dev');
  const [password, setPassword] = useState('CreatorIQ@123');
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
          <div className="preview-top"><span className="preview-dot"/><span className="preview-dot"/><span className="preview-dot"/><span className="preview-label">PERFORMANCE OVERVIEW</span><span className="preview-live">DEMO</span></div>
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
        <div className="auth-heading"><div className="auth-icon"><Gauge size={21}/></div><p className="auth-kicker">CREATORIQ WORKSPACE</p><h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Sign in to continue to your performance overview.' : registerRole === 'creator' ? 'Set up your creator profile to get started.' : registerRole === 'agency' ? 'Set up your agency workspace to manage creator performance.' : 'Set up your marketing team workspace to review content performance.'}</p></div>
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
        <div className="demo-note"><div className="demo-note-icon"><ShieldCheck size={16}/></div><div><strong>Demo workspace ready</strong><span>Use the prefilled details to explore sample analytics.</span></div><button type="button" onClick={() => { setEmail('demo@creatoriq.dev'); setPassword('CreatorIQ@123'); setMode('login'); setError(''); }}>Use demo <ArrowRight size={14}/></button></div>
        <p className="auth-legal">By continuing, you agree to use this prototype responsibly. Social platform integrations are not connected in this milestone.</p>
      </div>
      <div className="auth-bottom"><span>© 2026 CreatorIQ</span><span><CircleHelp size={14}/> Help & support</span></div>
    </section>
  </main>;
}

function Sidebar({ active, onNavigate, onLogout, user, mobileOpen, setMobileOpen }) {
  const items = [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'Content analytics', icon: Clapperboard, badge: 'NEXT' },
    { label: 'Audience insights', icon: Users, badge: 'NEXT' },
    { label: 'Growth & trends', icon: TrendingUp, badge: 'NEXT' },
    { label: 'Revenue', icon: Wallet, badge: 'NEXT' },
    { label: 'Reports', icon: FileBarChart2, badge: 'NEXT' },
    ...(user?.role === 'administrator' ? [{ label: 'User management', icon: UserCog }] : []),
    { label: 'Account settings', icon: Settings2 },
  ];
  return <>
    {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand light/><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">{(user?.full_name || 'A').charAt(0).toUpperCase()}</div><div className="workspace-text"><strong>{user?.full_name || 'Creator workspace'}</strong><span>{(user?.role || "creator").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} role</span></div><ChevronDown size={15}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{items.map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'nav-active' : ''} ${item.badge ? 'nav-planned' : ''}`} onClick={() => { onNavigate(item.label); setMobileOpen(false); }}><Icon size={18}/><span>{item.label}</span>{item.badge && <small>{item.badge}</small>}</button>; })}</nav>
      <div className="sidebar-grow"/>
      <div className="sidebar-status"><span className="status-pulse"/><div><strong>Milestone 1</strong><span>Analytics preview</span></div><span className="status-step">01/04</span></div>
      <button className="sidebar-help" onClick={() => onNavigate('Help & support')}><CircleHelp size={17}/> Help & support <ArrowRight size={14}/></button>
      <div className="sidebar-user"><div className="user-avatar">{(user?.full_name || 'A').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}</div><div className="sidebar-user-info"><strong>{user?.full_name || 'Creator'}</strong><span>{user?.email}</span></div><button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    </aside>
  </>;
}

function KpiCard({ title, value, change, icon: Icon, tone, caption, positive = true }) {
  return <article className="kpi-card"><div className="kpi-top"><span>{title}</span><span className={`kpi-icon ${tone}`}><Icon size={18}/></span></div><div className="kpi-value">{value}</div><div className="kpi-bottom"><span className={`kpi-change ${positive ? 'positive' : 'neutral'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span><span className="kpi-caption">{caption}</span></div></article>;
}

function PerformanceChart({ data }) {
  const [metric, setMetric] = useState('views');
  const displayData = useMemo(() => data.map((item) => ({ ...item, displayViews: item.views, displayRate: item.engagement_rate })), [data]);
  return <section className="card performance-card">
    <div className="card-header performance-header"><div><div className="card-title-row"><h3>Performance overview</h3><span className="subtle-pill"><span className="tiny-pulse"/> Sample data</span></div><p>Daily activity across the demo platform profiles.</p></div><div className="chart-controls"><div className="segmented-control"><button className={metric === 'views' ? 'selected' : ''} onClick={() => setMetric('views')}>Views</button><button className={metric === 'engagement' ? 'selected' : ''} onClick={() => setMetric('engagement')}>Engagement</button></div><button className="icon-button" title="Chart settings" aria-label="Chart settings"><Settings2 size={17}/></button></div></div>
    <div className="chart-summary"><strong>{metric === 'views' ? fmtNumber(data.reduce((sum, d) => sum + d.views, 0)) : `${(data.reduce((sum, d) => sum + d.engagement_rate, 0) / Math.max(data.length, 1)).toFixed(2)}%`}</strong><span>{metric === 'views' ? 'views over 7 days' : 'average engagement rate'}</span></div>
    <div className="main-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={displayData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
      <defs><linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7667f8" stopOpacity={0.24}/><stop offset="100%" stopColor="#7667f8" stopOpacity={0.015}/></linearGradient><linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a6a1" stopOpacity={0.18}/><stop offset="100%" stopColor="#22a6a1" stopOpacity={0.015}/></linearGradient></defs>
      <CartesianGrid stroke="#edf0f5" vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }} tickFormatter={(v) => metric === 'views' ? fmtNumber(v) : `${v}%`} width={48}/><Tooltip contentStyle={{ border: '1px solid #e7eaf1', borderRadius: 12, boxShadow: '0 8px 32px rgba(22,31,53,.10)', fontSize: 12 }} formatter={(value) => metric === 'views' ? [fmtNumber(value), 'Views'] : [`${value}%`, 'Engagement']}/><Area type="monotone" dataKey={metric === 'views' ? 'displayViews' : 'displayRate'} stroke={metric === 'views' ? '#7667f8' : '#22a6a1'} strokeWidth={2.6} fill={metric === 'views' ? 'url(#viewsGradient)' : 'url(#engagementGradient)'} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} dot={false}/>
    </AreaChart></ResponsiveContainer></div>
    <div className="chart-footnote"><span><i className={metric === 'views' ? 'legend-dot purple-dot' : 'legend-dot teal-dot'}/>{metric === 'views' ? 'Total views' : 'Engagement rate'}</span><span><Clock3 size={13}/> Last 7 days</span></div>
  </section>;
}

function PlatformCard({ platforms }) {
  const iconFor = (name) => name === 'YouTube' ? Youtube : name === 'Instagram' ? Instagram : Activity;
  const classFor = (name) => name.toLowerCase();
  const total = platforms.reduce((sum, platform) => sum + platform.followers, 0) || 1;
  return <section className="card platform-card"><div className="card-header"><div><h3>Platform performance</h3><p>Your account mix at a glance.</p></div><button className="more-button" aria-label="Platform options">•••</button></div>
    <div className="platform-total"><strong>{fmtNumber(total)}</strong><span>combined followers <span className="neutral-inline">· demo</span></span></div>
    <div className="platform-list">{platforms.map((platform) => { const Icon = iconFor(platform.platform); return <div className="platform-row" key={platform.platform}><div className={`platform-icon ${classFor(platform.platform)}`}><Icon size={17}/></div><div className="platform-meta"><div className="platform-name"><strong>{platform.platform}</strong><span>{fmtNumber(platform.followers)} followers</span></div><div className="platform-track"><span className={`platform-fill ${classFor(platform.platform)}`} style={{ width: `${Math.max(platform.followers / total * 100, 4)}%` }}/></div></div><div className="platform-growth"><strong>{fmtNumber(platform.views_7d)}</strong><span>7d views</span></div></div>; })}</div>
    <div className="platform-note"><span className="note-icon"><ShieldCheck size={15}/></span><p>These are example accounts. Official platform sign-in and data sync are planned next.</p></div>
  </section>;
}

function TopContent({ posts }) {
  const platformIcon = (name) => name === 'YouTube' ? <Youtube size={16}/> : name === 'Instagram' ? <Instagram size={16}/> : <Activity size={16}/>;
  return <section className="card content-card"><div className="card-header"><div><h3>Top-performing content</h3><p>Ranked by views during the last 7 days.</p></div><button className="text-action" type="button" onClick={() => window.alert('Content analytics is planned for Milestone 2.')}>View analytics <ArrowRight size={14}/></button></div>
    <div className="content-table-wrap"><table className="content-table"><thead><tr><th>CONTENT</th><th>PLATFORM</th><th>VIEWS · 7D</th><th>ENGAGEMENT</th></tr></thead><tbody>{posts.map((post, index) => <tr key={post.id}><td><div className="post-title-cell"><span className={`post-rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><div><strong>{post.title}</strong><span>{post.content_type}</span></div></div></td><td><span className={`table-platform ${post.platform.toLowerCase()}`}>{platformIcon(post.platform)}{post.platform}</span></td><td className="table-views">{fmtNumber(post.views_7d)}</td><td><span className="engagement-badge">{post.engagement_rate.toFixed(2)}%</span></td></tr>)}</tbody></table>{posts.length === 0 && <div className="empty-state">No content metrics yet. Demo data or connected-platform metrics will appear here.</div>}</div>
    <div className="content-footer"><span>Showing {posts.length} posts</span><span>More content insights arrive in Milestone 2</span></div>
  </section>;
}

function Overview({ user, onRefresh }) {
  const [data, setData] = useState({ summary: null, trends: [], platforms: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const [summaryResponse, trendsResponse, platformsResponse, postsResponse] = await Promise.all([
        api.get('/dashboard/summary'), api.get('/dashboard/trends?days=7'), api.get('/dashboard/platforms'), api.get('/dashboard/top-content?limit=5'),
      ]);
      setData({ summary: summaryResponse.data, trends: trendsResponse.data.days || [], platforms: platformsResponse.data.platforms || [], posts: postsResponse.data.posts || [] });
    } catch (error) {
      if (error?.response?.status === 401) onRefresh('expired');
      else setLoadError('Could not load dashboard data. Check that the API is running and try again.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [onRefresh]);
  useEffect(() => { load(); }, [load]);

  const summary = data.summary || { followers: 0, views_7d: 0, engagement_rate: 0, revenue_mtd: 0, posts_count: 0, platforms_count: 0 };
  const firstName = (user?.full_name || 'Creator').trim().split(/\s+/)[0];
  const demoData = Boolean(summary.demo_data);
  const emptyRoleMessage = user?.role === 'agency'
    ? 'This agency does not have assigned creator profiles yet. Multi-client analytics are planned for a later milestone.'
    : user?.role === 'marketing_team'
      ? 'This team does not have campaign or creator metrics yet. Campaign workflows are planned for a later milestone.'
      : user?.role === 'administrator'
        ? 'Administrator overview has no creator-owned metrics. Use User management to administer accounts.'
        : 'No linked account metrics are available yet. Social media account authorization and live sync are part of the next milestone.';
  return <>
    <div className="welcome-row"><div><div className="welcome-eyebrow"><span className="welcome-dot"/> {(user?.role || 'creator') === 'creator' ? 'YOUR CREATOR WORKSPACE' : (user?.role || '') === 'agency' ? 'AGENCY WORKSPACE' : (user?.role || '') === 'marketing_team' ? 'MARKETING TEAM WORKSPACE' : 'ADMIN WORKSPACE'}</div><h1>Good to see you, {firstName}<span className="wave">✦</span></h1><p>{user?.role === 'administrator' ? 'Manage access and review the analytics prototype.' : user?.role === 'agency' ? 'Your agency profile is ready. Creator assignment and multi-client analytics are planned for a later milestone.' : user?.role === 'marketing_team' ? 'Your team workspace is ready. Campaign tracking and social connections will be added in later milestones.' : 'Here’s how your content has been performing this week.'}</p></div><div className="welcome-actions"><button className="secondary-button" onClick={() => load(true)} disabled={refreshing}><Activity size={16} className={refreshing ? 'spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh data'}</button><button className="primary-button" onClick={() => window.alert('Connect platform will be built as part of Milestone 2.')}><Plus size={16}/> Connect platform</button></div></div>
    <div className="demo-banner"><span className="banner-icon"><Sparkles size={16}/></span><div><strong>{demoData ? 'You’re viewing demo analytics' : 'Your analytics workspace is ready'}</strong><span>{demoData ? 'Sample metrics are loaded locally. Social media account authorization and live sync are part of the next milestone.' : emptyRoleMessage}</span></div><span className="banner-tag">{demoData ? 'PREVIEW MODE' : 'NO DATA YET'}</span></div>
    {loadError && <div className="load-error" role="alert"><span>{loadError}</span><button onClick={() => load(true)}>Retry</button></div>}
    {loading ? <div className="loading-grid"><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton kpi-skeleton"/><div className="skeleton big-skeleton"/><div className="skeleton big-skeleton"/></div> : <>
      <div className="section-heading"><div><h2>Performance snapshot</h2><p>Summary of your recent activity</p></div><span className="date-filter"><Clock3 size={14}/> Last 7 days <ChevronDown size={14}/></span></div>
      <div className="kpi-grid">
        <KpiCard title="Total followers" value={fmtNumber(summary.followers)} change={`${summary.platforms_count} platforms`} caption={demoData ? "Across demo profiles" : "Across your profiles"} icon={Users} tone="violet" positive={false}/>
        <KpiCard title="Content views" value={fmtNumber(summary.views_7d)} change="7 day total" caption="Views in selected period" icon={Eye} tone="blue" positive/>
        <KpiCard title="Engagement rate" value={`${Number(summary.engagement_rate).toFixed(2)}%`} change="Avg. engagement" caption="Likes, comments, shares & saves" icon={MessageCircle} tone="teal" positive/>
        <KpiCard title="Revenue this month" value={fmtMoney(summary.revenue_mtd)} change={demoData ? "Sample earnings" : "This month"} caption="Ad & sponsorship records" icon={Wallet} tone="amber" positive={false}/>
      </div>
      <div className="analytics-grid"><PerformanceChart data={data.trends}/><PlatformCard platforms={data.platforms}/></div>
      <TopContent posts={data.posts}/>
      <footer className="dashboard-footer"><span>CreatorIQ <span className="footer-separator">/</span> Milestone 1 · Analytics preview</span><span><span className="footer-dot"/> {demoData ? "API connected · demo dataset" : "API connected"}</span></footer>
    </>}
  </>;
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

function AccountSettings({ user, onUserUpdated, onToast }) {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', profile_name: '', focus_area: '', bio: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/account/profile');
      setProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        profile_name: data.profile_name || '',
        focus_area: data.focus_area || '',
        bio: data.bio || '',
      });
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
      await api.post('/account/password', { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      onToast('Password updated successfully.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setPasswordError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not update password.'));
    } finally {
      setSavingPassword(false);
    }
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
          <p className="admin-help">Use at least 8 characters. Your current password is required to make this change.</p>
        </form>
      </section>
    </div>}
  </section>;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('creatoriq_token') || '');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('creatoriq_user') || 'null'); } catch { return null; } });
  const [authChecked, setAuthChecked] = useState(false);
  const [active, setActive] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');

  const logout = useCallback((reason) => {
    localStorage.removeItem('creatoriq_token');
    localStorage.removeItem('creatoriq_user');
    setAuthToken('');
    setToken('');
    setUser(null);
    setActive('Overview');
    setMobileOpen(false);
    if (reason === 'expired') setToast('Your session expired. Please sign in again.');
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

  useEffect(() => { if (!toast) return undefined; const id = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(id); }, [toast]);

  const navigate = (label) => {
    setActive(label);
    if (label !== 'Overview' && label !== 'User management' && label !== 'Account settings') setToast(label === 'Help & support' ? 'For this milestone, ask your mentor or project team for support.' : `${label} is planned for a later project milestone.`);
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

  return <div className="app-shell"><Sidebar active={active} onNavigate={navigate} onLogout={() => logout()} user={user} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/><main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="topbar-right"><div className="topbar-search"><Search size={15}/><span>Search anything</span><kbd>⌘ K</kbd></div><button className="top-icon-button" title="Notifications" aria-label="Notifications" onClick={() => setToast('No new notifications in this demo workspace.')}><Bell size={18}/><i/></button><span className="topbar-divider"/><div className="top-user"><div className="user-avatar small-avatar">{(user.full_name || 'A').split(' ').map((s) => s[0]).join('').slice(0,2).toUpperCase()}</div><span>{user.full_name?.split(' ')[0] || 'Creator'}</span><ChevronDown size={14}/></div></div></header><div className="page-content">{active === 'User management' && user.role === 'administrator' ? <UserManagement onToast={setToast}/> : active === 'Account settings' ? <AccountSettings user={user} onUserUpdated={handleUserUpdated} onToast={setToast}/> : <Overview user={user} onRefresh={logout}/>}</div></main>{toast && <div className="toast"><ShieldCheck size={16}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14}/></button></div>}</div>;
}

export default App;

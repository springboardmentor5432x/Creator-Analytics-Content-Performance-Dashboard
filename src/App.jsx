import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Crown, Download, Eye, FileText, Heart, Home, Instagram, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings, Share2, ShieldCheck, Sparkles, Users, Video, Wallet, X, Youtube, Music2, UserRound, Globe2, Bookmark, TrendingUp, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { metrics, posts, growth, weekly } from './data/demo.js';

const navGroups = [
  { title: 'WORKSPACE', items: [{label:'Dashboard',icon:LayoutDashboard},{label:'My Profile',icon:UserRound},{label:'Social Accounts',icon:Globe2},{label:'Content Library',icon:Video},{label:'Analytics',icon:BarChart3,expand:true},{label:'Audience',icon:Users,expand:true},{label:'Revenue',icon:Wallet,expand:true}] },
  { title: 'MANAGE', items: [{label:'Reports',icon:FileText},{label:'Notifications',icon:Bell,badge:'3'},{label:'Saved Reports',icon:Bookmark},{label:'Settings',icon:Settings}] }
];
const IconMetric = ({name}) => { const map={users:Users,eye:Eye,heart:Heart,message:MessageCircle,share:Share2,crown:Crown}; const C=map[name]||Activity; return <C size={19}/>; };
const roleOptions = [
  { value: 'creator', label: 'Creator' },
  { value: 'agency', label: 'Agency' },
  { value: 'marketing', label: 'Marketing Team' },
  { value: 'admin', label: 'Admin' },
];
const roleLabel = role => roleOptions.find(r => r.value === role)?.label || 'Creator';
async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function Auth({onLogin}) {
  const [mode,setMode]=useState('login');
  const [name,setName]=useState(''); const [email,setEmail]=useState('');
  const [role,setRole]=useState('creator'); const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState(''); const [rememberMe,setRememberMe]=useState(true);
  const [error,setError]=useState(''); const [success,setSuccess]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess('');
    const cleanEmail = email.trim().toLowerCase();

if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
  return setError('Enter a valid email address.');
}

if (mode !== 'forgot' && password.length < 8) {
  return setError('Password must be at least 8 characters.');
}

setBusy(true);
    try {
      const users=JSON.parse(localStorage.getItem('ci_users')||'[]');
      // FORGOT PASSWORD
if (mode === 'forgot') {
  if (password.length < 8) {
    return setError('New password must be at least 8 characters.');
  }

  if (password !== confirmPassword) {
    return setError('Passwords do not match.');
  }

  const userIndex = users.findIndex(
    user => user.email === cleanEmail
  );

  if (userIndex === -1) {
    return setError('No account found with this email address.');
  }

  // Hash the new password using the existing helper.
  const newPasswordHash = await hashPassword(password);

  // Update only the password.
  // The user's name and role remain unchanged.
  users[userIndex].passwordHash = newPasswordHash;

  localStorage.setItem('ci_users', JSON.stringify(users));

  // Return the user to login.
  setMode('login');
  setPassword('');
  setConfirmPassword('');
  setError('');
  setSuccess('Password updated successfully! Please log in with your new password.');

  return;
}
      if (mode==='signup') {
        if (!name.trim()) return setError('Please enter your full name.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (users.some(u=>u.email===cleanEmail)) return setError('An account with this email already exists. Please sign in.');
        const passwordHash=await hashPassword(password);
        users.push({name:name.trim(),email:cleanEmail,role,passwordHash,createdAt:new Date().toISOString()});
        localStorage.setItem('ci_users',JSON.stringify(users));
        setMode('login'); setPassword(''); setConfirmPassword(''); setSuccess('Account created successfully. Please log in with your email and password.');
        return;
      }
      const passwordHash=await hashPassword(password);
      const found=users.find(u=>u.email===cleanEmail && u.passwordHash===passwordHash);
      if (!found) return setError('Email or password is incorrect. Create an account first if you are new.');
      const sessionUser={name:found.name,email:found.email,role:found.role||'creator'};
      const serialized=JSON.stringify(sessionUser);
      localStorage.removeItem('ci_session'); sessionStorage.removeItem('ci_session');
      if (rememberMe) localStorage.setItem('ci_session',serialized); else sessionStorage.setItem('ci_session',serialized);
      onLogin(sessionUser);
    } catch (err) { setError('Could not complete authentication. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell"><div className="auth-art"><div className="brand brand-light"><span className="brand-mark"><Activity size={21}/></span><span>Creator<span className="brand-accent">Hub</span></span></div><div className="art-copy"><span className="eyebrow"><Sparkles size={14}/> CONTENT INTELLIGENCE</span><h1>Make your content<br/>work <span>smarter.</span></h1><p>Understand performance, grow your audience, and make better decisions with a workspace tailored to your role.</p><div className="art-stats"><div><strong>4 roles</strong><small>Role-based workspaces</small></div><div><strong>360°</strong><small>Content insights</small></div><div><strong>1 place</strong><small>For smarter growth</small></div></div></div><div className="floating-card"><div className="floating-icon"><TrendingUp size={19}/></div><div><strong>Your workspace, your goals</strong><small>Insights designed for your team and role.</small></div><span className="up-pill">✦ Insights</span></div><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/></div><div className="auth-form-wrap"><div className="auth-top"><span>Content intelligence workspace</span><span className="secure"><ShieldCheck size={14}/> Secure access</span></div><form className="auth-form" onSubmit={submit}><div className="welcome-icon"><Activity size={24}/></div><h2>
  {mode === 'login'
    ? 'Welcome back'
    : mode === 'signup'
    ? 'Create your account'
    : 'Reset your password'}
</h2><p>
  {mode === 'login'
    ? 'Sign in to open the dashboard assigned to your account role.'
    : mode === 'signup'
    ? 'Choose your role to create a personalized workspace.'
    : 'Enter your registered email and choose a new password.'}
</p>
  {mode==='signup'&&<><label>Full name<div className="input-wrap"><UserRound size={17}/><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required/></div></label><label>Account role<div className="input-wrap"><Users size={17}/><select value={role} onChange={e=>setRole(e.target.value)} aria-label="Account role">{roleOptions.map(r=><option value={r.value} key={r.value}>{r.label}</option>)}</select></div></label></>}
  <label>Email address<div className="input-wrap"><span className="at-sign">@</span><input autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div></label>
<label>
  {mode === 'forgot' ? 'New password' : 'Password'}

  <div className="input-wrap">
    <ShieldCheck size={17} />

    <input
      autoComplete={
        mode === 'login'
          ? 'current-password'
          : 'new-password'
      }
      type="password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder={
        mode === 'forgot'
          ? 'Enter your new password'
          : 'At least 8 characters'
      }
      required
    />
  </div>
</label>  {mode !== 'login'&&<label>Confirm password<div className="input-wrap"><ShieldCheck size={17}/><input autoComplete="new-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={mode==='forgot' ? 'Re-enter your new password' : 'Re-enter your password'} required/></div></label>}
  {mode==='login'&&<div className="form-options"><label className="remember"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/> Remember me</label><button type="button" className="text-btn" onClick={()=>{setMode('forgot');setPassword('');setConfirmPassword('');setError('');setSuccess('')}}>Forgot password?</button><span className="remember-hint">{rememberMe?'Stay signed in on this device':'Sign out when this tab session ends'}</span></div>}
  {error&&<div className="error-box" role="alert">{error}</div>}{success&&<div className="success-box" role="status">{success}</div>}
  <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in to dashboard':mode==='signup'?'Create account':'Reset password'} <ArrowUpRight size={17}/></button>
  <div className="auth-switch">{mode==='login'?<>Don't have an account? <button type="button" className="text-btn" onClick={()=>{setMode('signup');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Sign up</button></>:mode==='signup'?<>Already have an account? <button type="button" className="text-btn" onClick={()=>{setMode('login');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Back to login</button></>:<>Remembered your password? <button type="button" className="text-btn" onClick={()=>{setMode('login');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Back to login</button></>}</div><div className="demo-note"><Sparkles size={15}/> Demo mode · dashboard analytics use sample data</div></form><footer>© 2026 CreatorHub <span>·</span> Content Intelligence Platform</footer></div></div>
}
function Sidebar({active,setActive,collapsed,setCollapsed,user,onLogout}){const roleNav = {creator:navGroups, agency:[{title:'AGENCY WORKSPACE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Creators',icon:Users},{label:'Campaigns',icon:CalendarDays},{label:'Analytics',icon:BarChart3},{label:'Reports',icon:FileText},{label:'Settings',icon:Settings}] }], marketing:[{title:'MARKETING WORKSPACE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Campaigns',icon:CalendarDays},{label:'Content Library',icon:Video},{label:'Analytics',icon:BarChart3},{label:'Brand Deals',icon:Wallet},{label:'Reports',icon:FileText},{label:'Settings',icon:Settings}]}], admin:[{title:'ADMIN CONSOLE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'User Management',icon:Users},{label:'Platform Monitoring',icon:Activity},{label:'Analytics',icon:BarChart3},{label:'Activity Logs',icon:FileText},{label:'Settings',icon:Settings}]}]};const currentNav=roleNav[user.role]||roleNav.creator;return <aside className={`sidebar ${collapsed?'collapsed':''}`}><div className="brand"><span className="brand-mark"><Activity size={21}/></span>{!collapsed&&<span>Creator<span className="brand-accent">Hub</span></span>}<button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)} title="Toggle sidebar">{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button></div><div className="workspace-chip"><div className="avatar">{(user.name||'C').slice(0,1).toUpperCase()}</div>{!collapsed&&<div><strong>{roleLabel(user.role)} workspace</strong><small>Role-based account</small></div>} {!collapsed&&<ChevronDown size={15}/>}</div><nav>{currentNav.map(g=><div className="nav-group" key={g.title}>{!collapsed&&<div className="nav-heading">{g.title}</div>}{g.items.map(item=><button key={item.label} title={collapsed?item.label:''} className={`nav-item ${active===item.label?'active':''}`} onClick={()=>setActive(item.label)}><item.icon size={18}/>{!collapsed&&<><span>{item.label}</span>{item.badge&&<i className="nav-badge">{item.badge}</i>}{item.expand&&<ChevronDown className="nav-chevron" size={14}/>}</>}</button>)}</div>)}</nav>{!collapsed&&<div className="upgrade-card"><div className="upgrade-icon"><Crown size={18}/></div><strong>Make more of your data</strong><p>Unlock deeper insights and advanced reports.</p><button onClick={()=>setActive('Settings')}>Explore features <ArrowUpRight size={14}/></button></div>}<div className="sidebar-bottom"><button className="nav-item" onClick={()=>setActive('Help & Support')}><CircleHelp size={18}/>{!collapsed&&<span>Help & Support</span>}</button><div className="user-mini"><div className="avatar avatar-photo">{(user.name||'C').slice(0,1).toUpperCase()}</div>{!collapsed&&<><div className="user-mini-info"><strong>{user.name||'Creator'}</strong><small>{roleLabel(user.role)} account</small></div><button className="logout-icon" title="Log out" onClick={onLogout}><LogOut size={16}/></button></>}</div></div></aside>}
function Header({user,active,onLogout}){const [search,setSearch]=useState('');return <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="topbar-actions"><div className="global-search"><Search size={16}/><input placeholder="Search content, analytics, reports..." value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="date-select"><CalendarDays size={15}/> Last 30 days <ChevronDown size={14}/></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-user"><div className="avatar">{(user.name||'C').slice(0,1).toUpperCase()}</div><div><strong>{user.name||'Creator'}</strong><small>{roleLabel(user.role)}</small></div><button className="logout-icon" title="Log out" onClick={onLogout}><LogOut size={16}/></button></div></div></header>}
function MetricCard({item}){return <article className="metric-card"><div className={`metric-icon ${item.tone}`}><IconMetric name={item.icon}/></div><span className="metric-label">{item.label}</span><button className="metric-more"><MoreHorizontal size={17}/></button><div className="metric-value">{item.value}</div><div className="metric-bottom"><span className="positive"><TrendingUp size={12}/>{item.change}</span><span>{item.note}</span></div></article>}
function PanelTitle({title,subtitle,action}){return <div className="panel-title"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action&&<button className="panel-action">{action}<ArrowUpRight size={14}/></button>}</div>}
function Dashboard({user,setActive}){const [platform,setPlatform]=useState('All platforms');const [contentMetric,setContentMetric]=useState('Views');const filteredPosts=useMemo(()=>posts.filter(p=>platform==='All platforms'||p.platformName.toLowerCase()===platform.toLowerCase()),[platform]);return <><div className="page-heading"><div><div className="eyebrow">MONDAY, OCTOBER 16, 2026 <span className="heading-dot"/></div><h1>Good afternoon, {user.name?.split(' ')[0]||'Creator'} <span className="wave">✦</span></h1><p>Here's what's happening with your content across platforms.</p></div><div className="heading-actions"><button className="secondary-btn" onClick={()=>setActive('Reports')}><Download size={16}/> Export report</button><button className="primary-btn" onClick={()=>setActive('Social Accounts')}><Plus size={17}/> Connect platform</button></div></div><div className="platform-filter"><span>Performance overview</span><div className="filter-pills">{['All platforms','YouTube','Instagram','TikTok'].map(p=><button key={p} onClick={()=>setPlatform(p)} className={platform===p?'selected':''}>{p==='YouTube'?<Youtube size={14}/>:p==='Instagram'?<Instagram size={14}/>:p==='TikTok'?<Music2 size={14}/>:<Globe2 size={14}/>} {p}</button>)}</div></div><section className="metrics-grid">{metrics.map(m=><MetricCard item={m} key={m.label}/>)}</section><section className="analytics-grid"><article className="panel growth-panel"><PanelTitle title="Audience growth" subtitle="Follower growth over the last 30 days" action="View analytics"/><div className="chart-legend"><span><i className="legend-dot yt"/> YouTube</span><span><i className="legend-dot insta"/> Instagram</span><span><i className="legend-dot tt"/> TikTok</span><span><i className="legend-dot linked"/> LinkedIn</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf0f6"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}} tickFormatter={v=>`${v}K`}/><Tooltip contentStyle={{border:'1px solid #eaedf5',borderRadius:12,fontSize:12}}/><Line type="monotone" dataKey="youtube" name="YouTube" stroke="#f04452" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="instagram" name="Instagram" stroke="#c451d9" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="tiktok" name="TikTok" stroke="#252a3b" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="linkedin" name="LinkedIn" stroke="#4a91f2" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div><div className="chart-footer"><span><span className="status-dot"/> Audience is growing steadily</span><strong>+12.4% <ArrowUpRight size={14}/></strong></div></article><article className="panel content-panel"><PanelTitle title="Content performance" subtitle="Views by day of the week"/><div className="tab-row">{['Views','Likes','Comments','Shares'].map(t=><button className={contentMetric===t?'active':''} onClick={()=>setContentMetric(t)} key={t}>{t}</button>)}</div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{top:8,right:0,left:-24,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf0f6"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:10}}/><Tooltip contentStyle={{borderRadius:10,fontSize:12}}/><Bar dataKey="views" name={contentMetric} fill="#8065ed" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div><div className="content-summary"><span>Best day <strong>Friday</strong></span><span>Peak {contentMetric.toLowerCase()} <strong>190K</strong></span></div></article></section><section className="lower-grid"><article className="panel posts-panel"><PanelTitle title="Top-performing content" subtitle="Your content ranked by recent performance" action="View content"/><div className="table-wrap"><table><thead><tr><th>CONTENT</th><th>PLATFORM</th><th>VIEWS</th><th>LIKES</th><th>ENGAGEMENT</th><th>PUBLISHED</th></tr></thead><tbody>{filteredPosts.map(p=><tr key={p.title}><td><div className="post-cell"><div className="post-thumb">{p.image}</div><div><strong>{p.title}</strong><small>{p.type}</small></div></div></td><td><span className={`platform-logo ${p.platformName.toLowerCase()}`}>{p.platform}</span></td><td className="table-number">{p.views}</td><td className="table-number">{p.likes}</td><td><span className="engagement-pill">{p.engagement}</span></td><td className="muted-cell">{p.date}</td></tr>)}</tbody></table>{filteredPosts.length===0&&<div className="empty-state">No sample posts for this platform yet.</div>}</div></article><div className="right-stack"><article className="panel audience-panel"><PanelTitle title="Audience insights" action="View all"/><div className="audience-body"><div className="donut"><div className="donut-center"><strong>125.4K</strong><small>Followers</small></div></div><div className="audience-legend"><div><i className="age1"/>18–24 <strong>48%</strong></div><div><i className="age2"/>25–34 <strong>32%</strong></div><div><i className="age3"/>13–17 <strong>12%</strong></div><div><i className="age4"/>35–44 <strong>6%</strong></div><div><i className="age5"/>45+ <strong>2%</strong></div></div></div><div className="insight-note"><Sparkles size={14}/> Your largest audience segment is 18–24.</div></article><article className="panel revenue-panel"><PanelTitle title="Revenue overview" action="View details"/><div className="revenue-content"><div><span className="muted-cell">Total estimated revenue</span><strong className="revenue-value">₹48,250</strong><span className="positive"><TrendingUp size={12}/> 20.6% <span className="muted-cell">vs last month</span></span></div><div className="mini-bars">{[25,38,30,49,41,55,47,68,82].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div></article></div></section><div className="demo-disclaimer"><ShieldCheck size={15}/> Dashboard figures are sample data for demonstration. Connect a platform to use real analytics.</div></>}
function RoleDashboard({user,setActive}) {
  const role=user.role||'creator';
  if(role==='creator') return <Dashboard user={user} setActive={setActive}/>;
  const configs={
    agency:{eyebrow:'AGENCY OVERVIEW',title:'Agency performance at a glance',description:'Manage creator partnerships, campaigns, and portfolio-wide results.',cards:[['Active creators','24','4 added this month'],['Total followers','2.4M','Across managed creators'],['Campaign reach','18.7M','+22.1% this month'],['Active campaigns','8','3 need review'],['Total revenue','₹3,48,600','+17.2% this month'],['Avg. engagement','7.4%','Across your portfolio']],sections:[['Creator management','Review creator growth, account health, and partnership status.','Creators'],['Campaign tracker','Monitor deliverables, deadlines, and campaign performance.','Campaigns'],['Portfolio analytics','Compare reach, engagement, and revenue across creators.','Analytics']]},
    marketing:{eyebrow:'MARKETING OVERVIEW',title:'Campaigns that move the needle',description:'Track content distribution, audience reach, conversions, and campaign ROI.',cards:[['Active campaigns','8','2 launching soon'],['Total reach','12.4M','+25.3% this month'],['Engagements','986K','+18.7% this month'],['Campaign spend','₹4,20,000','Within planned budget'],['Conversions','24.8K','+11.6% this month'],['Average ROI','3.2×','+12.5% this month']],sections:[['Campaign performance','Review reach, engagement, conversions, and spend.','Campaigns'],['Content calendar','Coordinate planned content across platforms and campaigns.','Content Library'],['Brand partnerships','Track sponsored content and brand deliverables.','Brand Deals']]},
    admin:{eyebrow:'ADMIN CONTROL CENTER',title:'Platform health and activity',description:'Monitor user accounts, platform usage, permissions, and system activity.',cards:[['Total users','148','12 joined this month'],['Creators','120','Across all workspaces'],['Agencies','18','Active organizations'],['Marketing teams','7','Registered teams'],['Active users','132','89% of total users'],['System status','Healthy','No critical alerts']],sections:[['User management','Review accounts, roles, and account status.','User Management'],['Platform monitoring','Review usage trends and platform health indicators.','Platform Monitoring'],['Activity logs','Audit recent sign-ins and important workspace events.','Activity Logs']]}
  };
  const c=configs[role]||configs.creator;
  return <div className="role-dashboard"><div className="page-heading"><div><div className="eyebrow">{c.eyebrow}</div><h1>Welcome, {user.name?.split(' ')[0]||roleLabel(role)} <span className="wave">✦</span></h1><p>{c.description}</p></div><div className="heading-actions"><button className="secondary-btn" onClick={()=>setActive('Reports')}><Download size={16}/> Export report</button><button className="primary-btn" onClick={()=>setActive(c.sections[0][2])}><Plus size={17}/> {role==='agency'?'Add creator':role==='marketing'?'New campaign':'Manage users'}</button></div></div><section className="metrics-grid role-metrics">{c.cards.map((m,i)=><article className="metric-card" key={m[0]}><div className={`metric-icon ${['violet','blue','rose','green','amber','violet'][i]}`}><IconMetric name={['users','eye','heart','message','crown','share'][i]}/></div><span className="metric-label">{m[0]}</span><div className="metric-value">{m[1]}</div><div className="metric-bottom"><span className="positive"><TrendingUp size={12}/></span><span>{m[2]}</span></div></article>)}</section><div className="role-banner panel"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>{roleLabel(role)} insights</h2><p>Use these quick links to explore the tools available to your role. Metrics are sample data for the prototype.</p></div><div className="role-banner-mark"><Activity size={32}/></div></div><section className="role-feature-grid">{c.sections.map((item,i)=><article className="panel role-feature" key={item[0]}><div className={`generic-icon ${i===1?'blue':i===2?'amber':''}`}>{i===0?<Users size={19}/>:i===1?<BarChart3 size={19}/>:<FileText size={19}/>}</div><h3>{item[0]}</h3><p>{item[1]}</p><button className="secondary-btn" onClick={()=>setActive(item[2])}>Open section <ArrowUpRight size={14}/></button></article>)}</section><div className="demo-disclaimer"><ShieldCheck size={15}/> This role-specific dashboard uses static demonstration data. Database and live integrations can be connected next.</div></div>;
}
function GenericPage({active,setActive,user}){const descriptions={'Creators':['Creator management','Review creator profiles, growth, and partnership status.'],'Campaigns':['Campaign management','Plan campaigns, track deliverables, and measure performance.'],'Brand Deals':['Brand partnerships','Track sponsored content, brand agreements, and deliverables.'],'User Management':['User management','Review registered users, roles, and account status.'],'Platform Monitoring':['Platform monitoring','Review platform usage, integration health, and alerts.'],'Activity Logs':['Activity logs','Review recent account and workspace activity.'],'My Profile':['Your creator identity','Manage your public profile and creator details.'],'Social Accounts':['Connected platforms','Connect and manage your social media accounts.'],'Content Library':['Your content at a glance','Organize posts and review publishing performance.'],'Analytics':['Performance analytics','Explore reach, views, engagement and growth trends.'],'Audience':['Know your audience','Understand demographics, active hours and audience growth.'],'Revenue':['Creator earnings','Track sponsorships, brand deals and estimated revenue.'],'Reports':['Reports & exports','Create downloadable summaries of your creator performance.'],'Notifications':['Your notifications','Stay up to date with account activity and insights.'],'Saved Reports':['Saved report views','Keep frequently used analytics filters close at hand.'],'Settings':['Workspace settings','Manage your account preferences and security.'],'Help & Support':['How can we help?','Find answers and get help with your workspace.']};const [connected,setConnected]=useState([]);const [saved,setSaved]=useState(false);const [name,setName]=useState('Creator');const d=descriptions[active]||descriptions.Analytics;return <div className="generic-page"><div className="page-heading"><div><div className="eyebrow">{roleLabel(user?.role).toUpperCase()} WORKSPACE</div><h1>{d[0]}</h1><p>{d[1]}</p></div><button className="secondary-btn" onClick={()=>setActive('Dashboard')}><LayoutDashboard size={16}/> Back to dashboard</button></div>{active==='Social Accounts'?<div className="platform-cards">{[{name:'Instagram',icon:Instagram,color:'insta',desc:'Photos, reels and stories'},{name:'YouTube',icon:Youtube,color:'yt',desc:'Videos and channel analytics'},{name:'TikTok',icon:Music2,color:'tt',desc:'Short-form video insights'},{name:'LinkedIn',icon:Globe2,color:'linked',desc:'Professional content analytics'}].map(p=><div className="panel platform-card" key={p.name}><div className={`platform-large ${p.color}`}><p.icon size={25}/></div><h3>{p.name}</h3><p>{p.desc}</p><button className={connected.includes(p.name)?'connected-btn':'secondary-btn'} onClick={()=>setConnected(a=>a.includes(p.name)?a.filter(x=>x!==p.name):[...a,p.name])}>{connected.includes(p.name)?<><Check size={15}/> Connected (demo)</>:<><Plus size={15}/> Connect account</>}</button></div>)}</div>:active==='My Profile'?<div className="panel settings-panel"><div className="profile-cover"><div className="profile-avatar">{name[0]?.toUpperCase()}</div><div><h2>{name}</h2><p>{roleLabel(user?.role)} · Personal workspace</p></div></div><div className="settings-fields"><label>Creator display name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Bio<textarea defaultValue="Creating content, sharing ideas, and learning every day."/></label><label>Primary platform<select defaultValue="Instagram"><option>Instagram</option><option>YouTube</option><option>TikTok</option><option>LinkedIn</option></select></label><button className="primary-btn" onClick={()=>setSaved(true)}>{saved?<><Check size={16}/> Saved locally</>:'Save profile'}</button></div></div>:<><div className="generic-stats"><div className="panel"><span className="generic-icon"><Activity/></span><small>Performance status</small><strong>Looking good</strong><span className="positive">+12.4% this month</span></div><div className="panel"><span className="generic-icon blue"><BarChart3/></span><small>Recent activity</small><strong>24 updates</strong><span className="muted-cell">In the last 30 days</span></div><div className="panel"><span className="generic-icon amber"><Sparkles/></span><small>Suggested next step</small><strong>Review insights</strong><button className="text-btn" onClick={()=>setActive('Analytics')}>Open analytics <ArrowUpRight size={14}/></button></div></div><div className="panel generic-empty"><div className="empty-illustration"><Activity size={28}/></div><h2>{active==='Reports'?'Create your first report':active==='Notifications'?'You’re all caught up':active==='Revenue'?'Your revenue workspace':active==='Audience'?'Audience insights are waiting':active==='Settings'?'Personalize your workspace':active==='Content Library'?'Your content library':'Explore your performance'}</h2><p>This section is ready to expand. For now, it uses demo data while the database and platform integrations are being developed.</p><button className="primary-btn" onClick={()=>setActive(active==='Reports'?'Analytics':'Dashboard')}>{active==='Reports'?<><Plus size={16}/> Start a report</>:<>Explore dashboard <ArrowUpRight size={15}/></>}</button></div></>}</div>}
export default function App(){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ci_session')||sessionStorage.getItem('ci_session')||'null')}catch{return null}});const [active,setActive]=useState('Dashboard');const [collapsed,setCollapsed]=useState(false);const [mobileOpen,setMobileOpen]=useState(false);function logout(){localStorage.removeItem('ci_session');sessionStorage.removeItem('ci_session');setUser(null);setActive('Dashboard')}if(!user)return <Auth onLogin={setUser}/>;return <div className="app-shell"><div className={`mobile-overlay ${mobileOpen?'show':''}`} onClick={()=>setMobileOpen(false)}/><div className={mobileOpen?'mobile-sidebar open':'mobile-sidebar'}><Sidebar active={active} setActive={x=>{setActive(x);setMobileOpen(false)}} collapsed={false} setCollapsed={()=>setMobileOpen(false)} user={user} onLogout={logout}/></div><div className="desktop-sidebar"><Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={logout}/></div><main className={`main-area ${collapsed?'sidebar-collapsed':''}`}><Header user={user} active={active} onLogout={logout}/><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="page-content">{active==='Dashboard'?<RoleDashboard user={user} setActive={setActive}/>:<GenericPage active={active} setActive={setActive} user={user}/>}<footer className="app-footer"><span>© 2026 CreatorHub</span><span>Content intelligence for creators <span className="footer-dot">✦</span></span></footer></div></main></div>}

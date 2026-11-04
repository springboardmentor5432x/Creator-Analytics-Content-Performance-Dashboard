import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Crown, Download, Eye, EyeOff, FileText, Heart, Home, Instagram, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings, Share2, ShieldCheck, Sparkles, Users, Video, Wallet, X, Youtube, Music2, UserRound, Globe2, Bookmark, TrendingUp, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchOverview, apiRequest, startYouTubeOAuth, fetchSocialAccounts } from './services/analyticsApi.js';

const navGroups = [
  { title: 'WORKSPACE', items: [{label:'Dashboard',icon:LayoutDashboard},{label:'My Profile',icon:UserRound},{label:'Social Accounts',icon:Globe2},{label:'Content Library',icon:Video},{label:'Analytics',icon:BarChart3,expand:true},{label:'Audience',icon:Users,expand:true},{label:'Revenue',icon:Wallet,expand:true},{label:'Agency Requests',icon:Users}] },
  { title: 'MANAGE', items: [{label:'Reports',icon:FileText},{label:'Notifications',icon:Bell,badge:'3'},{label:'Saved Reports',icon:Bookmark},{label:'Settings',icon:Settings}] }
];
const IconMetric = ({name}) => { const map={users:Users,eye:Eye,heart:Heart,message:MessageCircle,share:Share2,crown:Crown}; const C=map[name]||Activity; return <C size={19}/>; };
const roleOptions = [
  { value: 'creator', label: 'Creator' },
  { value: 'agency', label: 'Agency' },
  { value: 'marketing', label: 'Marketing Team' },
  { value: 'admin', label: 'Admin' },
];
const signupRoleOptions = roleOptions.filter(option => option.value !== 'admin');
const roleLabel = role => roleOptions.find(r => r.value === role)?.label || 'Creator';
async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function Auth({onLogin}) {
  const resetToken = new URLSearchParams(window.location.search).get('token') || '';
  const [mode,setMode]=useState(()=>window.location.pathname.endsWith('/reset-password') && resetToken ? 'reset' : 'login');
  const [name,setName]=useState(''); const [email,setEmail]=useState('');
  const [role,setRole]=useState('creator'); const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState(''); const [rememberMe,setRememberMe]=useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const googleButtonRef = React.useRef(null);
  const [error,setError]=useState(''); const [success,setSuccess]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(() => {
    if (!['login', 'signup'].includes(mode)) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current) return;
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response?.credential) {
            setError('Google did not return an authentication credential. Please try again.');
            return;
          }
          setError(''); setSuccess(''); setBusy(true);
          try {
            const result = await apiRequest('/api/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential })
            });
            const serialized = JSON.stringify(result.user);
            localStorage.removeItem('ci_session'); sessionStorage.removeItem('ci_session');
            localStorage.removeItem('ci_token'); sessionStorage.removeItem('ci_token');
            if (rememberMe) {
              localStorage.setItem('ci_session', serialized);
              localStorage.setItem('ci_token', result.access_token);
            } else {
              sessionStorage.setItem('ci_session', serialized);
              sessionStorage.setItem('ci_token', result.access_token);
            }
            onLogin(result.user);
          } catch (err) {
            setError(err.message || 'Google sign-in failed. Please try again.');
          } finally { setBusy(false); }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', width: 320, logo_alignment: 'left'
      });
    };
    if (window.google?.accounts?.id) renderGoogleButton();
    else {
      let script = document.querySelector('script[data-google-identity]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton);
      if (script.dataset.loaded === 'true') renderGoogleButton();
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; });
    }
    return () => { cancelled = true; };
  }, [mode, rememberMe, onLogin]);
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess('');
    const cleanEmail=email.trim().toLowerCase();
    if(mode !== 'reset' && (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail))) return setError('Enter a valid email address.');
    if((mode==='login' || mode==='signup' || mode==='reset') && password.length<8) return setError('Password must be at least 8 characters.');
    if(mode==='signup' && !name.trim()) return setError('Please enter your full name.');
    if((mode==='signup' || mode==='reset') && password!==confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try {
      if(mode==='signup') {
        await apiRequest('/api/auth/signup',{method:'POST',body:JSON.stringify({name:name.trim(),email:cleanEmail,role,password})});
        setMode('login');setPassword('');setConfirmPassword('');setSuccess('Account created successfully. Please log in with your email and password.');return;
      }
      if(mode==='forgot') {
        const result=await apiRequest('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email:cleanEmail})});
        setPassword('');setConfirmPassword('');setSuccess(result.message || 'If an account exists for that email, a password-reset link will be sent.');return;
      }
      if(mode==='reset') {
        if(!resetToken) throw new Error('The password-reset link is missing its token. Request a new reset email.');
        await apiRequest('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token:resetToken,new_password:password})});
        window.history.replaceState({},'',window.location.pathname);
        setMode('login');setPassword('');setConfirmPassword('');setSuccess('Password reset successfully. Please sign in with your new password.');return;
      }
      const result=await apiRequest('/api/auth/login',{method:'POST',body:JSON.stringify({email:cleanEmail,password})});
      const serialized=JSON.stringify(result.user);
      localStorage.removeItem('ci_session');sessionStorage.removeItem('ci_session');localStorage.removeItem('ci_token');sessionStorage.removeItem('ci_token');
      if(rememberMe){localStorage.setItem('ci_session',serialized);localStorage.setItem('ci_token',result.access_token);}else{sessionStorage.setItem('ci_session',serialized);sessionStorage.setItem('ci_token',result.access_token);}
      onLogin(result.user);
    } catch(err) { setError(err.message || 'Could not complete authentication. Check that the FastAPI backend is running.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell"><style>{`
.auth-art{background:linear-gradient(145deg,#263B2A 0%,#3D5B3D 55%,#718765 100%)!important}
.auth-art .brand-mark{background:#78916D!important;color:#fff!important;box-shadow:0 8px 20px rgba(20,35,20,.2)}
.auth-art .brand-accent,.auth-art .art-copy h1 span{color:#DCE8CF!important}
.auth-art .eyebrow,.auth-art .floating-card{background:rgba(236,242,226,.13)!important;border-color:rgba(236,242,226,.22)!important;color:#F2F4EA!important}
.auth-art .floating-icon{background:rgba(236,242,226,.16)!important;color:#E4EDD9!important}
.auth-art .up-pill{background:#DDE9D2!important;color:#3F5A3B!important}
.welcome-icon{background:#E2EBDD!important;color:#536F4D!important}
.auth-form .text-btn{color:#587451!important}
.auth-form button[type=submit]{background:#587451!important;border-color:#587451!important}
.auth-form button[type=submit]:hover{background:#435D3F!important}
.secure{color:#587451!important}
`}</style><div className="auth-art"><div className="brand brand-light"><span className="brand-mark"><Activity size={21}/></span><span>Creator<span className="brand-accent">Hub</span></span></div><div className="art-copy"><span className="eyebrow"><Sparkles size={14}/> CONTENT INTELLIGENCE</span><h1>Make your content<br/>work <span>smarter.</span></h1><p>Understand performance, grow your audience, and make better decisions with a workspace tailored to your role.</p><div className="art-stats"><div><strong>4 roles</strong><small>Role-based workspaces</small></div><div><strong>360°</strong><small>Content insights</small></div><div><strong>1 place</strong><small>For smarter growth</small></div></div></div><div className="floating-card"><div className="floating-icon"><TrendingUp size={19}/></div><div><strong>Your workspace, your goals</strong><small>Insights designed for your team and role.</small></div><span className="up-pill">✦ Insights</span></div><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/></div><div className="auth-form-wrap"><div className="auth-top"><span>Content intelligence workspace</span><span className="secure"><ShieldCheck size={14}/> Secure access</span></div><form className="auth-form" onSubmit={submit}><div className="welcome-icon"><Activity size={24}/></div><h2>
  {mode === 'login'
    ? 'Welcome back'
    : mode === 'signup'
    ? 'Create your account'
    : mode === 'reset' ? 'Choose a new password' : 'Reset your password'}
</h2><p>
  {mode === 'login'
    ? 'Sign in to open the dashboard assigned to your account role.'
    : mode === 'signup'
    ? 'Choose your role to create a personalized workspace.'
    : mode === 'reset' ? 'Enter a new password for your account.' : 'Enter your registered email. We will send you a secure, one-time reset link.'}
</p>
  {mode==='signup'&&<><label>Full name<div className="input-wrap"><UserRound size={17}/><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required/></div></label><label>Account role<div className="input-wrap"><Users size={17}/><select value={role} onChange={e=>setRole(e.target.value)} aria-label="Account role">{signupRoleOptions.map(r=><option value={r.value} key={r.value}>{r.label}</option>)}</select></div></label></>}
  {mode !== 'reset' && <label>Email address<div className="input-wrap"><span className="at-sign">@</span><input autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div></label>}
{mode !== 'forgot' && <label>
  {mode === 'reset' ? 'New password' : 'Password'}

  <div className="input-wrap">
    <ShieldCheck size={17} />

    <input
      autoComplete={
        mode === 'login'
          ? 'current-password'
          : 'new-password'
      }
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder={mode === 'reset' ? 'Enter your new password' : 'At least 8 characters'}
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword(value => !value)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      title={showPassword ? "Hide password" : "Show password"}
      style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", color: "inherit" }}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</label>}
{(mode === 'signup' || mode === 'reset') && (
  <label>
    Confirm password
    <div className="input-wrap">
      <ShieldCheck size={17} />
      <input
        autoComplete="new-password"
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        placeholder={mode === 'reset' ? 'Re-enter your new password' : 'Re-enter your password'}
        required
      />
      <button
        type="button"
        onClick={() => setShowConfirmPassword(value => !value)}
        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
        title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
        style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", color: "inherit" }}
      >
        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </label>
)}
  {mode==='login'&&<div className="form-options"><label className="remember"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/> Remember me</label><button type="button" className="text-btn" onClick={()=>{setMode('forgot');setPassword('');setConfirmPassword('');setError('');setSuccess('')}}>Forgot password?</button><span className="remember-hint">{rememberMe?'Stay signed in on this device':'Sign out when this tab session ends'}</span></div>}
  {error&&<div className="error-box" role="alert">{error}</div>}{success&&<div className="success-box" role="status">{success}</div>}
  <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in to dashboard':mode==='signup'?'Create account':mode==='forgot'?'Send reset link':'Update password'} <ArrowUpRight size={17}/></button>
  {(mode === 'login' || mode === 'signup') && <>
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0 14px',color:'var(--muted,#777)',fontSize:12}}><span style={{height:1,background:'var(--border,#ddd)',flex:1}}/><span>OR CONTINUE WITH</span><span style={{height:1,background:'var(--border,#ddd)',flex:1}}/></div>
    <div ref={googleButtonRef} style={{display:'flex',justifyContent:'center',minHeight:42}} />
    {!import.meta.env.VITE_GOOGLE_CLIENT_ID && <small style={{display:'block',textAlign:'center',color:'var(--muted,#777)',marginTop:6}}>Configure VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</small>}
  </>}
  <div className="auth-switch">{mode==='login'?<>Don't have an account? <button type="button" className="text-btn" onClick={()=>{setMode('signup');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Sign up</button></>:mode==='signup'?<>Already have an account? <button type="button" className="text-btn" onClick={()=>{setMode('login');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Back to login</button></>:<>Remembered your password? <button type="button" className="text-btn" onClick={()=>{setMode('login');setError('');setSuccess('');setPassword('');setConfirmPassword('')}}>Back to login</button></>}</div><div className="demo-note"><Sparkles size={15}/> Social analytics appear after you connect and authorize a platform</div></form><footer>© {new Date().getFullYear()} CreatorHub <span>·</span> Content Intelligence Platform</footer></div></div>
}
function Sidebar({active,setActive,collapsed,setCollapsed,user,onLogout}){const roleNav = {creator:navGroups, agency:[{title:'AGENCY WORKSPACE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Creators',icon:Users},{label:'Campaigns',icon:CalendarDays},{label:'Analytics',icon:BarChart3},{label:'Reports',icon:FileText},{label:'Notifications',icon:Bell},{label:'Settings',icon:Settings}] }], marketing:[{title:'MARKETING WORKSPACE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Creators',icon:Users},{label:'Campaigns',icon:CalendarDays},{label:'Content Library',icon:Video},{label:'Analytics',icon:BarChart3},{label:'Brand Deals',icon:Wallet},{label:'Reports',icon:FileText},{label:'Notifications',icon:Bell},{label:'Settings',icon:Settings}]}], admin:[{title:'ADMIN CONSOLE',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'User Management',icon:Users},{label:'Platform Monitoring',icon:Activity},{label:'Analytics',icon:BarChart3},{label:'Activity Logs',icon:FileText},{label:'Settings',icon:Settings}]}]};const currentNav=roleNav[user.role]||roleNav.creator;return <aside className={`sidebar ${collapsed?'collapsed':''}`}><div className="brand"><span className="brand-mark"><Activity size={21}/></span>{!collapsed&&<span>Creator<span className="brand-accent">Hub</span></span>}<button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)} title="Toggle sidebar">{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button></div><div className="workspace-chip"><div className="avatar">{(user.name||'C').slice(0,1).toUpperCase()}</div>{!collapsed&&<div><strong>{roleLabel(user.role)} workspace</strong><small>Role-based account</small></div>} {!collapsed&&<ChevronDown size={15}/>}</div><nav>{currentNav.map(g=><div className="nav-group" key={g.title}>{!collapsed&&<div className="nav-heading">{g.title}</div>}{g.items.map(item=><button key={item.label} title={collapsed?item.label:''} className={`nav-item ${active===item.label?'active':''}`} onClick={()=>setActive(item.label)}><item.icon size={18}/>{!collapsed&&<><span>{item.label}</span>{item.badge&&<i className="nav-badge">{item.badge}</i>}{item.expand&&<ChevronDown className="nav-chevron" size={14}/>}</>}</button>)}</div>)}</nav>{!collapsed&&<div className="upgrade-card"><div className="upgrade-icon"><Crown size={18}/></div><strong>Make more of your data</strong><p>Unlock deeper insights and advanced reports.</p><button onClick={()=>setActive('Settings')}>Explore features <ArrowUpRight size={14}/></button></div>}<div className="sidebar-bottom"><button className="nav-item" onClick={()=>setActive('Help & Support')}><CircleHelp size={18}/>{!collapsed&&<span>Help & Support</span>}</button><div className="user-mini"><div className="avatar avatar-photo">{(user.name||'C').slice(0,1).toUpperCase()}</div>{!collapsed&&<><div className="user-mini-info"><strong>{user.name||'Creator'}</strong><small>{roleLabel(user.role)} account</small></div><button className="logout-icon" title="Log out" onClick={onLogout}><LogOut size={16}/></button></>}</div></div></aside>}
function Header({user,active,onLogout,theme,onToggleTheme,setActive}) {
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [dateMenuOpen,setDateMenuOpen]=useState(false);
  const [dateRange,setDateRange]=useState(()=>localStorage.getItem('ci_date_range')||'Last 30 days');
  const searchRef=React.useRef(null);
  const profileTarget = user.role === 'creator' ? 'My Profile' : 'Settings';
  const notificationTarget = user.role === 'admin' ? 'Activity Logs' : 'Notifications';
  const available = user.role === 'admin'
    ? ['Dashboard','User Management','Platform Monitoring','Analytics','Activity Logs','Settings']
    : user.role === 'agency'
    ? ['Dashboard','Creators','Campaigns','Analytics','Reports','Notifications','Settings']
    : user.role === 'marketing'
    ? ['Dashboard','Campaigns','Content Library','Analytics','Brand Deals','Reports','Notifications','Settings']
    : ['Dashboard','My Profile','Social Accounts','Content Library','Analytics','Audience','Revenue','Reports','Notifications','Saved Reports','Settings'];
  const descriptions = {
    Dashboard:'overview home metrics performance',
    'My Profile':'account creator profile personal details',
    'Social Accounts':'connect youtube instagram spotify linkedin platforms',
    'Content Library':'posts videos content published search content',
    Analytics:'views likes comments shares engagement performance compare posts',
    Audience:'followers growth demographics age gender location',
    Revenue:'earnings monetization income',
    Reports:'export download report csv',
    Notifications:'alerts updates',
    'Saved Reports':'saved exports reports',
    Settings:'preferences theme account security',
    Creators:'creator directory members',
    Campaigns:'campaigns budget status',
    'Brand Deals':'brands partnerships deals',
    'User Management':'users accounts roles',
    'Platform Monitoring':'platform connections monitoring',
    'Activity Logs':'audit history events'
  };
  const q=search.trim().toLowerCase();
  const results=q ? available.map(label=>({label,description:descriptions[label]||''}))
    .filter(x=>`${x.label} ${x.description}`.toLowerCase().includes(q))
    .slice(0,6) : [];
  function choose(label){setActive(label);setSearch('');setOpen(false);searchRef.current?.blur();}
  function chooseDateRange(label){setDateRange(label);localStorage.setItem('ci_date_range',label);setDateMenuOpen(false);}
  useEffect(()=>{
    function onKey(e){
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchRef.current?.focus();setOpen(true);}
      if(e.key==='Escape'){setOpen(false);setDateMenuOpen(false);searchRef.current?.blur();}
    }
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  function submit(e){e?.preventDefault();if(results.length)choose(results[0].label);else if(q){setOpen(true);}}
  return <header className="topbar"><style>{`.breadcrumb-workspace{border:0;background:transparent;padding:0;color:var(--ch-muted);font:inherit;cursor:pointer}.breadcrumb-workspace:hover{color:var(--ch-accent);text-decoration:underline}.top-user-button{border:0;background:transparent;text-align:left;cursor:pointer;color:inherit;font:inherit;display:flex;align-items:center;gap:10px;padding:4px 6px;border-radius:10px}.top-user-button:hover{background:var(--ch-accent-soft)}.date-range-menu button:hover{background:var(--ch-accent-soft)!important}`}</style>
    <div className="breadcrumb"><button type="button" className="breadcrumb-workspace" onClick={()=>{setActive('Dashboard');setOpen(false);setDateMenuOpen(false);}} title={`Go to ${roleLabel(user.role)} dashboard`}>Workspace</button><ChevronRight size={14}/><strong>{active}</strong></div>
    <div className="topbar-actions">
      <div className="global-search-wrap" style={{position:'relative'}}>
        <form className="global-search" onSubmit={submit} role="search">
          <Search size={16}/>
          <input ref={searchRef} placeholder="Search content, analytics, reports..." value={search}
            onFocus={()=>setOpen(true)} onChange={e=>{setSearch(e.target.value);setOpen(true);}} aria-label="Search workspace"/>
          <kbd>⌘ K</kbd>
        </form>
        {open&&q&&<div className="global-search-results" role="listbox" style={{position:'absolute',top:'calc(100% + 8px)',left:0,right:0,zIndex:1000,background:'var(--ch-card,#fff)',border:'1px solid var(--ch-border,#ddd)',borderRadius:12,boxShadow:'0 14px 36px rgba(35,45,30,.16)',padding:7,maxHeight:320,overflowY:'auto'}}>
          {results.length ? results.map(item=><button type="button" role="option" key={item.label} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(item.label)} style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:3,width:'100%',padding:'10px 12px',border:0,borderRadius:8,background:'transparent',color:'var(--ch-text,#263326)',cursor:'pointer',textAlign:'left'}}>
            <strong style={{fontSize:13}}>{item.label}</strong><small style={{fontSize:11,color:'var(--ch-muted,#788078)'}}>{item.description}</small>
          </button>) : <div style={{padding:'12px',fontSize:12,color:'var(--ch-muted,#788078)'}}>No matching workspace sections. Try “analytics”, “posts”, “audience” or “reports”.</div>}
        </div>}
      </div>
      <div className="date-range-wrap" style={{position:'relative'}}><button type="button" className="date-select" aria-expanded={dateMenuOpen} onClick={()=>{setDateMenuOpen(v=>!v);setOpen(false);}}><CalendarDays size={15}/> {dateRange} <ChevronDown size={14}/></button>{dateMenuOpen&&<div className="date-range-menu" role="menu" style={{position:'absolute',right:0,top:'calc(100% + 8px)',zIndex:1001,minWidth:160,padding:6,border:'1px solid var(--ch-border)',borderRadius:12,background:'var(--ch-card,var(--ch-surface,#fff))',boxShadow:'0 12px 30px rgba(30,40,25,.14)'}}>{['Last 7 days','Last 30 days','Last 90 days','This month','This year'].map(label=><button type="button" role="menuitem" key={label} onClick={()=>chooseDateRange(label)} style={{display:'block',width:'100%',padding:'9px 11px',textAlign:'left',border:0,borderRadius:8,background:dateRange===label?'var(--ch-accent-soft)':'transparent',color:'var(--ch-text)',cursor:'pointer',font: 'inherit',fontSize:13}}>{label}{dateRange===label?' ✓':''}</button>)}</div>}</div>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} title="Switch appearance">{theme === "light" ? "☾ Dark mode" : "☀ Light mode"}</button>
      <button type="button" className="icon-button notification-button" aria-label="Open notifications" title={user.role==='admin'?'Open activity logs':'Open notifications'} onClick={()=>setActive(notificationTarget)}><Bell size={18}/><i/></button>
      <button type="button" className="top-user top-user-button" onClick={()=>setActive(profileTarget)} title={user.role==='creator'?'Open my profile':'Open settings'}><div className="avatar">{(user.name||'C').slice(0,1).toUpperCase()}</div><div><strong>{user.name||'Creator'}</strong><small>{roleLabel(user.role)}</small></div></button><button type="button" className="logout-icon" title="Log out" onClick={onLogout}><LogOut size={16}/></button>
    </div>
    {open&&!q&&<button aria-label="Close search suggestions" onClick={()=>setOpen(false)} style={{display:'none'}}/>}
  </header>;
}
function MetricCard({item}){return <article className="metric-card"><div className={`metric-icon ${item.tone}`}><IconMetric name={item.icon}/></div><span className="metric-label">{item.label}</span><button className="metric-more"><MoreHorizontal size={17}/></button><div className="metric-value">{item.value}</div><div className="metric-bottom"><span className="positive"><TrendingUp size={12}/>{item.change}</span><span>{item.note}</span></div></article>}
function PanelTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-title">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {action && (
        <button
          type="button"
          className="panel-action"
          onClick={onAction}
        >
          {action}
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}function Dashboard({user,setActive}){
  const [platform,setPlatform]=useState('All platforms');
  const [contentMetric,setContentMetric]=useState('Views');
  // Use the viewer's local device date/time instead of a hard-coded dashboard date.
  const [currentTime,setCurrentTime]=useState(()=>new Date());
  useEffect(()=>{const clock=setInterval(()=>setCurrentTime(new Date()),60000);return ()=>clearInterval(clock);},[]);
  const dateLabel=currentTime.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  const greeting=currentTime.getHours()<12?'Good morning':currentTime.getHours()<17?'Good afternoon':'Good evening';
  const [liveData,setLiveData]=useState(null);
  const [apiState,setApiState]=useState('loading');
  const [apiMessage,setApiMessage]=useState('Checking connected social platforms…');
  const [lastUpdated,setLastUpdated]=useState(null); const [selectedPostIds,setSelectedPostIds]=useState([]); const [comparison,setComparison]=useState(null); const [compareError,setCompareError]=useState('');
  async function refreshAnalytics(){
    setApiState('loading'); setApiMessage('Fetching analytics from the backend…');
    try {
      const result=await fetchOverview();
      if(result && result.connected && result.metrics){
        setLiveData(result); setApiState('live');
        setApiMessage(result.message || 'Data received from connected social platform APIs.');
        setLastUpdated(new Date());
      } else {
        setLiveData(null); setApiState('unconnected');
        setApiMessage(result?.message || 'No social platform is authorized yet.');
      }
    } catch(e) {
      setLiveData(null); setApiState('error');
      setApiMessage('Analytics API unavailable. No sample metrics are being substituted.');
    }
  }
  useEffect(()=>{refreshAnalytics();},[user.email]);
  const metrics=liveData?.metrics || [];
  const posts=liveData?.posts || [];
  const growth=liveData?.growth || [];
  const weekly=liveData?.weekly || [];
  const filteredPosts=useMemo(()=>posts.filter(p=>platform==='All platforms'||(p.platformName||'').toLowerCase()===platform.toLowerCase()),[platform,posts]);
  return <><div className="page-heading"><div><div className="eyebrow">{dateLabel} <span className="heading-dot"/></div><h1>{greeting}, {user.name?.split(' ')[0]||'Creator'}!<span className="wave"></span></h1><p>Here's what's happening with your content across platforms.</p></div><div className="heading-actions"><button className="secondary-btn" onClick={()=>setActive('Reports')}><Download size={16}/> Export report</button><button className="primary-btn" onClick={()=>setActive('Social Accounts')}><Plus size={17}/> Connect platform</button></div></div><div className="platform-filter"><span>Performance overview</span><div className="filter-pills">{['All platforms','YouTube','Instagram','Spotify'].map(p=><button key={p} onClick={()=>setPlatform(p)} className={platform===p?'selected':''}>{p==='YouTube'?<Youtube size={14}/>:p==='Instagram'?<Instagram size={14}/>:p==='Spotify'?<Music2 size={14}/>:<Globe2 size={14}/>} {p}</button>)}</div><div className="api-status-row"><span className={`api-status-dot ${apiState}`}/><span>{apiState==='live'?'Live API data':apiState==='loading'?'Refreshing data':apiState==='error'?'API error':'Not connected'} · {apiMessage}{lastUpdated?` Last updated ${lastUpdated.toLocaleTimeString()}`:''}</span><button className="text-btn" onClick={refreshAnalytics} disabled={apiState==='loading'}>↻ Refresh</button></div></div><section className="metrics-grid">{metrics.length ? metrics.map(m=><MetricCard item={m} key={m.label}/>) : <div className="panel generic-empty" style={{gridColumn:'1 / -1'}}><div className="empty-illustration"><Globe2 size={28}/></div><h2>{apiState==='loading'?'Fetching your analytics…':'No live analytics available yet'}</h2><p>{apiMessage} Connect YouTube in Social Accounts to load authorized channel data. Instagram and Spotify require their own developer app credentials and OAuth approval.</p><button className="primary-btn" onClick={()=>setActive('Social Accounts')}><Plus size={16}/> Connect a platform</button></div>}</section><section className="analytics-grid"><article className="panel growth-panel"><PanelTitle title="Audience growth" subtitle="Follower growth over the last 30 days" action="View analytics"/><div className="chart-legend"><span><i className="legend-dot yt"/> YouTube</span><span><i className="legend-dot insta"/> Instagram</span><span><i className="legend-dot tt"/> Spotify</span><span><i className="legend-dot linked"/> LinkedIn</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf0f6"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}} tickFormatter={v=>`${v}K`}/><Tooltip contentStyle={{border:'1px solid #eaedf5',borderRadius:12,fontSize:12}}/><Line type="monotone" dataKey="youtube" name="YouTube" stroke="#667D5E" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="instagram" name="Instagram" stroke="#9A9B78" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="spotify" name="Spotify" stroke="#455747" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="linkedin" name="LinkedIn" stroke="#87977A" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div><div className="chart-footer"><span><span className="status-dot"/> Audience is growing steadily</span><strong>{growth.length ? 'Live trend' : 'No trend data'}</strong></div></article><article className="panel content-panel"><PanelTitle title="Content performance" subtitle="Views by day of the week"/><div className="tab-row">{['Views','Likes','Comments','Shares'].map(t=><button className={contentMetric===t?'active':''} onClick={()=>setContentMetric(t)} key={t}>{t}</button>)}</div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{top:8,right:0,left:-24,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf0f6"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8a91a5',fontSize:10}}/><Tooltip contentStyle={{borderRadius:10,fontSize:12}}/><Bar dataKey="views" name={contentMetric} fill="#718765" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div><div className="content-summary"><span>Daily trend</span><span><strong>{weekly.length ? `${weekly.length} live data points` : 'No data available'}</strong></span></div></article></section><section className="lower-grid"><article className="panel posts-panel"><PanelTitle title="Top-performing content" subtitle="Your content ranked by recent performance" action="View content"/><div className="table-wrap"><div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 0",flexWrap:"wrap"}}><span className="muted-cell">Select 2–10 posts to compare</span><button className="secondary-btn" disabled={selectedPostIds.length<2||selectedPostIds.length>10} onClick={async()=>{setCompareError('');setComparison(null);try{const r=await apiRequest(`/api/analytics/compare?ids=${selectedPostIds.join(',')}`);setComparison(r.posts)}catch(e){setCompareError(e.message)}}}>Compare selected ({selectedPostIds.length})</button>{compareError&&<span className="muted-cell">{compareError}</span>}</div>{comparison&&<div className="panel" style={{padding:14,marginBottom:12}}><strong>Post comparison</strong><div style={{overflowX:"auto"}}><table><thead><tr><th>POST</th><th>VIEWS</th><th>LIKES</th><th>COMMENTS</th><th>ENGAGEMENT</th></tr></thead><tbody>{comparison.map(p=><tr key={p.id}><td>{p.title}</td><td>{Number(p.views||0).toLocaleString()}</td><td>{Number(p.likes||0).toLocaleString()}</td><td>{Number(p.comments||0).toLocaleString()}</td><td>{p.engagementRate==null?'—':`${p.engagementRate.toFixed(2)}%`}</td></tr>)}</tbody></table></div><button className="text-btn" onClick={()=>setComparison(null)}>Close comparison</button></div>}<table><thead><tr><th>COMPARE</th><th>CONTENT</th><th>PLATFORM</th><th>VIEWS</th><th>LIKES</th><th>ENGAGEMENT</th><th>PUBLISHED</th></tr></thead><tbody>{filteredPosts.map(p=><tr key={p.id||p.title}><td><input type="checkbox" aria-label={`Select ${p.title} for comparison`} disabled={!p.id} checked={selectedPostIds.includes(p.id)} onChange={e=>{setSelectedPostIds(old=>e.target.checked?[...old,p.id].slice(-10):old.filter(id=>id!==p.id));setComparison(null)}}/></td><td><div className="post-cell"><div className="post-thumb">{p.image && String(p.image).startsWith('http') ? <img src={p.image} alt="" loading="lazy" /> : <span aria-label="Video thumbnail unavailable">▶</span>}</div><div className="post-title-wrap"><strong title={p.title}>{p.title}</strong><small>{p.type}</small></div></div></td><td><span className={`platform-logo ${p.platformName.toLowerCase()}`}>{p.platform}</span></td><td className="table-number">{p.views}</td><td className="table-number">{p.likes}</td><td><span className="engagement-pill">{p.engagement}</span></td><td className="muted-cell">{p.date}</td></tr>)}</tbody></table>{filteredPosts.length===0&&<div className="empty-state">No live posts returned by connected platforms yet.</div>}</div></article><div className="right-stack"><article className="panel audience-panel"><PanelTitle
  title="Audience insights"
  action="View all"
  onAction={() => setActive('Audience')}
/><div className="generic-empty"><p>Audience demographics will appear here when a connected platform provides authorized audience insights.</p></div></article><article className="panel revenue-panel"><PanelTitle
  title="Revenue overview"
  action="View details"
  onAction={() => setActive('Revenue')}
/><div className="revenue-content"><div><span className="muted-cell">Revenue data</span><strong className="revenue-value">Unavailable</strong><span className="muted-cell">Connect an eligible monetization data source to view revenue.</span></div></div></article></div></section><div className="demo-disclaimer"><ShieldCheck size={15}/> {apiState==='live'?'Metrics were returned by the connected provider API. Refreshing every 60 seconds.':'No fabricated metrics are displayed. Connect and authorize social accounts, and configure provider credentials in the backend to display live analytics.'}</div></>}

function AdminWorkspace({active,setActive,user}) {
  const [overview,setOverview]=useState(null), [users,setUsers]=useState([]), [accounts,setAccounts]=useState([]), [events,setEvents]=useState([]), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  async function load(){setLoading(true);setError('');try{const [o,u,a,e]=await Promise.all([apiRequest('/api/admin/overview'),apiRequest('/api/admin/users'),apiRequest('/api/admin/platforms'),apiRequest('/api/admin/activity')]);setOverview(o);setUsers(u.users||[]);setAccounts(a.accounts||[]);setEvents(e.events||[])}catch(err){setError(err.message||'Could not load administrator data. Check your backend and sign in again.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[user?.id]);
  const titleMap={'Dashboard':'Admin control center','User Management':'User management','Platform Monitoring':'Platform monitoring','Analytics':'Platform analytics','Activity Logs':'Activity logs','Settings':'Administrator settings'};
  const metricCards=[['Total users',overview?.totalUsers],['Creators',overview?.creators],['Agencies',overview?.agencies],['Marketing teams',overview?.marketingTeams],['Connected creator accounts',overview?.connectedAccounts],['Synchronized posts',overview?.totalPosts]];
  const table=(headers,rows,empty)=> <div className="panel admin-table-panel"><div className="panel-title"><div><h3>{titleMap[active]}</h3><p>Live records from the configured backend database.</p></div><button className="secondary-btn" onClick={load}>{loading?'Refreshing…':'Refresh data'}</button></div><div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows}</tbody></table>{!rows.length&&!loading&&<div className="empty-state">{empty}</div>}</div></div>;
  let body;
  if(active==='Dashboard') body=<><section className="metrics-grid role-metrics">{metricCards.map(([label,value],i)=><article className="metric-card" key={label}><div className={`metric-icon ${['sage','olive','rose','green','amber','sage'][i]}`}><IconMetric name={i===0||i===1||i===2?'users':i===5?'eye':'share'}/></div><span className="metric-label">{label}</span><div className="metric-value">{loading?'…':value??0}</div><div className="metric-bottom"><span>{label==='Connected creator accounts'?'Across all creator workspaces':label==='Synchronized posts'?'Stored post records':'Database count'}</span></div></article>)}</section><div className="role-banner panel"><div><span className="eyebrow">ADMIN WORKSPACE</span><h2>Monitor creator workspaces</h2><p>Review registered users, the social platforms connected by creators, and synchronized content. Administrators do not connect personal social accounts from this workspace.</p></div><div className="role-banner-mark"><Activity size={32}/></div></div><section className="role-feature-grid">{[['User Management','View registered users, roles, account status, and connected platforms.'],['Platform Monitoring','Review connected YouTube, Instagram, Spotify, and LinkedIn accounts.'],['Analytics','Review account and post totals collected across creator workspaces.'],['Activity Logs','Review recorded registrations and social-account connections.']].map(([name,desc])=><article className="panel role-feature" key={name}><div className="generic-icon"><Activity size={19}/></div><h3>{name}</h3><p>{desc}</p><button className="secondary-btn" onClick={()=>setActive(name)}>Open section <ArrowUpRight size={14}/></button></article>)}</section></>;
  else if(active==='User Management') body=table(['Name','Email','Role','Status','Connected accounts','Platforms','Joined','Actions'],users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive?'Active':'Inactive'}</td><td>{u.connectedAccounts}</td><td>{u.platforms?.join(', ')||'—'}</td><td>{u.createdAt?new Date(u.createdAt).toLocaleDateString():'—'}</td><td><div style={{display:'flex',gap:7,flexWrap:'wrap'}}><button className="secondary-btn" onClick={async()=>{const name=window.prompt('Update user name:',u.name);if(name===null)return;const role=window.prompt('Role: creator, agency, marketing, or admin',u.role);if(role===null)return;try{await apiRequest(`/api/admin/users/${u.id}`,{method:'PATCH',body:JSON.stringify({name,role})});await load()}catch(e){setError(e.message)}}}>Edit</button><button className="secondary-btn" disabled={u.id===user.id} onClick={async()=>{try{await apiRequest(`/api/admin/users/${u.id}`,{method:'PATCH',body:JSON.stringify({is_active:!u.isActive})});await load()}catch(e){setError(e.message)}}}>{u.isActive?'Deactivate':'Activate'}</button><button className="danger-btn" disabled={u.id===user.id} onClick={async()=>{if(!window.confirm(`Permanently delete ${u.name}?`))return;try{await apiRequest(`/api/admin/users/${u.id}`,{method:'DELETE'});await load()}catch(e){setError(e.message)}}}>Delete</button></div></td></tr>),'No registered users found.');
  else if(active==='Platform Monitoring') body=<>{overview&&<section className="section-metrics-grid">{Object.entries(overview.platforms||{}).map(([k,v])=><article className="admin-stat-card" key={k}><span className="admin-stat-label">{k[0].toUpperCase()+k.slice(1)} connections</span><strong className="admin-stat-value">{Number(v??0).toLocaleString()}</strong><span className="admin-stat-note">Authorized accounts</span></article>)}</section>}{table(['Platform','Account','Creator','Creator email','Followers','Views','Posts','Connected'],accounts.map(a=><tr key={a.id}><td>{a.platform}</td><td>{a.username}</td><td>{a.creatorName}</td><td>{a.creatorEmail}</td><td>{Number(a.followers||0).toLocaleString()}</td><td>{Number(a.views||0).toLocaleString()}</td><td>{Number(a.posts||0).toLocaleString()}</td><td>{a.connectedAt?new Date(a.connectedAt).toLocaleDateString():'—'}</td></tr>),'No creator social accounts have been connected yet.')}</>;
  else if(active==='Analytics') body=<>{overview&&<section className="section-metrics-grid">{[['Total users',overview.totalUsers],['Connected accounts',overview.connectedAccounts],['Connected creators',overview.connectedCreators],['Stored posts',overview.totalPosts]].map(([k,v])=><article className="admin-stat-card" key={k}><span className="admin-stat-label">{k}</span><strong className="admin-stat-value">{Number(v??0).toLocaleString()}</strong><span className="admin-stat-note">Current database total</span></article>)}</section>}{table(['Platform','Connected accounts'],Object.entries(overview?.platforms||{}).map(([k,v])=><tr key={k}><td>{k[0].toUpperCase()+k.slice(1)}</td><td>{v}</td></tr>),'No analytics data available.')}</>;
  else if(active==='Activity Logs') body=<div className="panel"><div className="panel-title"><div><h3>Recorded activity</h3><p>Registration and social account connection events. Login auditing is not recorded yet.</p></div><button className="secondary-btn" onClick={load}>Refresh data</button></div>{events.length?events.map((e,i)=><div className="security-row" key={`${e.type}-${i}`}><div><strong>{e.type}</strong><small>{e.actor} · {e.detail}</small></div><span className="muted-cell">{e.timestamp?new Date(e.timestamp).toLocaleString():'—'}</span></div>):<div className="empty-state">No recorded events yet.</div>}</div>;
  else body=<div className="panel setup-panel"><h3>Administrator settings</h3><p>Database: <strong>{overview?.database||'Checking…'}</strong></p><p>Connected accounts are owned and managed by creator workspaces. Use this administrator area to monitor them; do not connect a personal account here.</p></div>;
  return <div className="generic-page"><div className="page-heading"><div><div className="eyebrow">ADMIN CONSOLE</div><h1>{titleMap[active]||active}</h1><p>{active==='Dashboard'?'Monitor users, creator-connected platforms, and platform usage.':`Review ${active.toLowerCase()} using current database records.`}</p></div><button className="secondary-btn" onClick={load}>{loading?'Loading…':'↻ Refresh'}</button></div>{error&&<div className="error-box">{error}</div>}{body}</div>;
}

function RoleDashboard({user,setActive}) {
  const role=user.role||'creator';
  const configs={
    agency:{eyebrow:'AGENCY OVERVIEW',title:'Agency performance at a glance',description:'Manage creator partnerships, campaigns, and portfolio-wide results.',cards:[['Registered creators','—','Creator accounts on the platform'],['Total followers','—','Across authorized creator accounts'],['Post views','—','From synchronized creator content'],['Active campaigns','—','In this agency workspace'],['Brand deal value','—','Saved partnership records'],['Connected accounts','—','Across creator accounts']],sections:[['Creator management','Review creator growth, account health, and partnership status.','Creators'],['Campaign tracker','Monitor deliverables, deadlines, and campaign performance.','Campaigns'],['Portfolio analytics','Compare reach, engagement, and revenue across creators.','Analytics']]},
    marketing:{eyebrow:'MARKETING OVERVIEW',title:'Campaigns that move the needle',description:'Track content distribution, audience reach, conversions, and campaign ROI.',cards:[['Active campaigns','—','In this marketing workspace'],['Post views','—','From synchronized creator content'],['Synchronized posts','—','Available creator content'],['Campaign budget','—','Total planned budget'],['Brand partnerships','—','Saved brand deal records'],['Brand deal value','—','Declared partnership value']],sections:[['Creator access','Request creator approval to view shared content and analytics.','Creators'],['Campaign performance','Review reach, engagement, conversions, and spend.','Campaigns'],['Content calendar','Coordinate planned content across platforms and campaigns.','Content Library'],['Brand partnerships','Track sponsored content and brand deliverables.','Brand Deals']]},
    admin:{eyebrow:'ADMIN CONTROL CENTER',title:'Platform health and activity',description:'Monitor user accounts, platform usage, permissions, and system activity.',cards:[['Total users','148','12 joined this month'],['Creators','120','Across all workspaces'],['Agencies','18','Active organizations'],['Marketing teams','7','Registered teams'],['Active users','132','89% of total users'],['System status','Healthy','No critical alerts']],sections:[['User management','Review accounts, roles, and account status.','User Management'],['Platform monitoring','Review usage trends and platform health indicators.','Platform Monitoring'],['Activity logs','Audit recent sign-ins and important workspace events.','Activity Logs']]}
  };
  const c=configs[role]||configs.creator;
  const [workspaceSummary,setWorkspaceSummary]=useState(null);
  useEffect(()=>{if(!['agency','marketing'].includes(role))return;apiRequest('/api/workspace/summary').then(setWorkspaceSummary).catch(()=>setWorkspaceSummary(null));},[role]);
  const dynamicCards=role==='agency' ? [
    workspaceSummary?.creators ?? '—',
    workspaceSummary?.followers?.toLocaleString?.('en-IN') ?? '—',
    workspaceSummary?.post_views?.toLocaleString?.('en-IN') ?? '—',
    workspaceSummary?.campaigns_active ?? '—',
    `₹${Number(workspaceSummary?.deal_value||0).toLocaleString('en-IN')}`,
    workspaceSummary?.connected_accounts ?? '—'
  ] : [
    workspaceSummary?.campaigns_active ?? '—',
    workspaceSummary?.post_views?.toLocaleString?.('en-IN') ?? '—',
    workspaceSummary?.posts ?? '—',
    `₹${Number(workspaceSummary?.campaign_budget||0).toLocaleString('en-IN')}`,
    workspaceSummary?.brand_deals ?? '—',
    `₹${Number(workspaceSummary?.deal_value||0).toLocaleString('en-IN')}`
  ];
  return <div className="role-dashboard"><div className="page-heading"><div><div className="eyebrow">{c.eyebrow}</div><h1>Welcome, {user.name?.split(' ')[0]||roleLabel(role)}! <span className="wave"></span></h1><p>{c.description}</p></div><div className="heading-actions"><button className="secondary-btn" onClick={()=>setActive('Reports')}><Download size={16}/> Export report</button><button className="primary-btn" onClick={()=>setActive(c.sections[0][2])}><Plus size={17}/> {role==='agency'?'Find creators':role==='marketing'?'Find creators':'Manage users'}</button></div></div><section className="metrics-grid role-metrics">{c.cards.map((m,i)=><article className="metric-card" key={m[0]}><div className={`metric-icon ${['sage','olive','rose','green','amber','sage'][i]}`}><IconMetric name={['users','eye','heart','message','crown','share'][i]}/></div><span className="metric-label">{m[0]}</span><div className="metric-value">{dynamicCards[i]??'—'}</div><div className="metric-bottom"><span>{workspaceSummary?'From workspace records':'Connect data or add workspace records'}</span></div></article>)}</section><div className="role-banner panel"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>{roleLabel(role)} insights</h2><p>Use these quick links to explore the tools available to your role. Creator metrics populate after creators approve access and their social accounts have synchronized data.</p></div><div className="role-banner-mark"><Activity size={32}/></div></div><section className="role-feature-grid">{c.sections.map((item,i)=><article className="panel role-feature" key={item[0]}><div className={`generic-icon ${i===1?'olive':i===2?'amber':''}`}>{i===0?<Users size={19}/>:i===1?<BarChart3 size={19}/>:<FileText size={19}/>}</div><h3>{item[0]}</h3><p>{item[1]}</p><button className="secondary-btn" onClick={()=>setActive(item[2])}>Open section <ArrowUpRight size={14}/></button></article>)}</section><div className="demo-disclaimer"><ShieldCheck size={15}/> No fabricated metrics are shown. Agency and marketing creator metrics populate only after creators approve workspace access; campaign and deal totals come from saved workspace records.</div></div>;
}
function GenericPage({active,setActive,user}) {
  const descriptions={
    'Creators':['Creator management','Review creator profiles, growth, and partnership status.'],'Campaigns':['Campaign management','Plan campaigns, track deliverables, and measure performance.'],'Brand Deals':['Brand partnerships','Track sponsored content, brand agreements, and deliverables.'],'User Management':['User management','Review registered users, roles, and account status.'],'Platform Monitoring':['Platform monitoring','Review platform usage, integration health, and alerts.'],'Activity Logs':['Activity logs','Review recent account and workspace activity.'],'My Profile':['Your profile','Manage your profile details and creator identity.'],'Social Accounts':['Social accounts','Connect and manage your authorized social media accounts.'],'Content Library':['Content library','Review videos and posts fetched from connected accounts.'],'Analytics':['Performance analytics','Explore real platform metrics and compare posts.'],'Audience':['Audience insights','Track followers and audience growth from connected accounts.'],'Revenue':['Revenue & earnings','Track brand deals, sponsorships, payouts, and collections.'],'Reports':['Reports & exports','Prepare and export summaries from available account data.'],'Notifications':['Notifications','Review platform, account, and workspace alerts.'],'Saved Reports':['Saved reports','Save and revisit frequently used report configurations.'],'Settings':['Workspace settings','Manage profile preferences, notifications, privacy, and security.'],'Help & Support':['Help & support','Get help with account connections and workspace features.']
  };
  const [connected,setConnected]=useState([]); const [accountError,setAccountError]=useState(''); const [busyProvider,setBusyProvider]=useState('');
  const [profile,setProfile]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ci_profile_${user?.id}`)||'{}')}catch{return {}}});
  const [photoError,setPhotoError]=useState('');
  function handleProfilePhoto(event){
    const file=event.target.files?.[0];
    if(!file)return;
    setPhotoError('');
    if(!['image/jpeg','image/png'].includes(file.type)){
      setPhotoError('Please choose a JPG or PNG image.');event.target.value='';return;
    }
    if(file.size>2*1024*1024){
      setPhotoError('Please choose an image smaller than 2 MB.');event.target.value='';return;
    }
    const reader=new FileReader();
    reader.onload=()=>setProfile(current=>({...current,photoData:reader.result,photoName:file.name}));
    reader.onerror=()=>setPhotoError('The image could not be read. Please try another file.');
    reader.readAsDataURL(file);
    event.target.value='';
  }
  const [settings,setSettings]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ci_settings_${user?.id}`)||'{}')}catch{return {}}});
  const [savedNotice,setSavedNotice]=useState('');
  const [showDeleteAccount,setShowDeleteAccount]=useState(false);
  const [deletePassword,setDeletePassword]=useState('');
  const [deleteError,setDeleteError]=useState('');
  const [deletingAccount,setDeletingAccount]=useState(false);
  const [revenue,setRevenue]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ci_revenue_${user?.id}`)||'[]')}catch{return []}});
  const [revForm,setRevForm]=useState({source:'Brand deal',description:'',amount:'',date:new Date().toISOString().slice(0,10),status:'Pending'});
  const [reportName,setReportName]=useState('Last 30 days performance');
  const [savedReports,setSavedReports]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ci_saved_reports_${user?.id}`)||'[]')}catch{return []}});
  const [live,setLive]=useState(null); const [loadError,setLoadError]=useState(''); const [loading,setLoading]=useState(false); const [syncing,setSyncing]=useState(false);
  const [workspaceData,setWorkspaceData]=useState({campaigns:[],deals:[],creators:[],posts:[],summary:null,analytics:null,assignmentRequests:[]});
  const [workspaceError,setWorkspaceError]=useState('');
  const [campaignForm,setCampaignForm]=useState({name:'',platform:'Multi-platform',status:'Planned',budget:'0',start_date:'',end_date:'',notes:''});
  const [dealForm,setDealForm]=useState({brand_name:'',creator_name:'',amount:'0',status:'Negotiating',due_date:'',notes:''});
  const [workspaceSaving,setWorkspaceSaving]=useState(false);
  async function loadWorkspace(){
    setWorkspaceError('');
    try{
      const role=user?.role;
      const updates={};
      if(['Campaigns','Dashboard'].includes(active) && ['agency','marketing'].includes(role)){
        const r=await apiRequest('/api/workspace/campaigns'); updates.campaigns=r.campaigns||[];
        const sm=await apiRequest('/api/workspace/summary'); updates.summary=sm;
      }
      if(active==='Brand Deals'){const r=await apiRequest('/api/workspace/brand-deals');updates.deals=r.deals||[];}
      if(active==='Creators'){const r=await apiRequest('/api/workspace/creators');updates.creators=r.creators||[];}
      if(active==='Agency Requests' && role==='creator'){const r=await apiRequest('/api/workspace/assignment-requests');updates.assignmentRequests=r.requests||[];}
      if(active==='Content Library'){const r=await apiRequest('/api/workspace/content');updates.posts=r.posts||[];updates.contentSummary=r;}
      if(active==='Analytics'){const r=await apiRequest('/api/workspace/analytics');updates.analytics=r;}
      if(active==='Reports'){
        const [ar,cr]=await Promise.all([apiRequest('/api/workspace/analytics'),apiRequest('/api/workspace/content')]);
        updates.analytics=ar;updates.posts=cr.posts||[];
      }
      setWorkspaceData(prev=>({...prev,...updates}));
    }catch(e){setWorkspaceError(e.message||'Could not load workspace data. Check that the updated backend is running.');}
  }
  async function createWorkspaceRecord(kind){
    setWorkspaceSaving(true);setWorkspaceError('');
    try{
      if(kind==='campaign'){
        await apiRequest('/api/workspace/campaigns',{method:'POST',body:JSON.stringify({...campaignForm,budget:Number(campaignForm.budget||0),start_date:campaignForm.start_date||null,end_date:campaignForm.end_date||null})});
        setCampaignForm({name:'',platform:'Multi-platform',status:'Planned',budget:'0',start_date:'',end_date:'',notes:''});
        const r=await apiRequest('/api/workspace/campaigns');setWorkspaceData(prev=>({...prev,campaigns:r.campaigns||[]}));
      }else{
        await apiRequest('/api/workspace/brand-deals',{method:'POST',body:JSON.stringify({...dealForm,amount:Number(dealForm.amount||0),due_date:dealForm.due_date||null})});
        setDealForm({brand_name:'',creator_name:'',amount:'0',status:'Negotiating',due_date:'',notes:''});
        const r=await apiRequest('/api/workspace/brand-deals');setWorkspaceData(prev=>({...prev,deals:r.deals||[]}));
      }
      setSavedNotice(kind==='campaign'?'Campaign saved.':'Brand deal saved.');
    }catch(e){setWorkspaceError(e.message||'Could not save record.');}
    finally{setWorkspaceSaving(false);}
  }

  const d=descriptions[active]||descriptions.Analytics;
  async function loadAccounts(){setAccountError('');try{const r=await fetchSocialAccounts();setConnected(r.accounts||[])}catch(e){setAccountError(e.message||'Could not load account connections. Please sign in again.')}}
  async function disconnectAccount(account){
    const provider=account.provider||'this social account';
    if(!window.confirm(`Disconnect ${provider}${account.username?` (${account.username})`:''}? You can connect it again later.`)) return;
    setAccountError('');
    try{
      await apiRequest(`/api/social-accounts/${encodeURIComponent(account.id)}`,{method:'DELETE'});
      await loadAccounts();
      setSavedNotice(`${provider} disconnected successfully.`);
      window.setTimeout(()=>setSavedNotice(''),3000);
    }catch(e){
      setAccountError(e.message||'Could not disconnect this account. The backend must support account deletion.');
    }
  }
  async function deleteAccount(){
    if(!deletePassword){setDeleteError('Enter your password to confirm account deletion.');return;}
    setDeleteError('');setDeletingAccount(true);
    try{
      await apiRequest('/api/auth/delete-account',{method:'DELETE',body:JSON.stringify({password:deletePassword})});
      ['ci_session','ci_token'].forEach(key=>{localStorage.removeItem(key);sessionStorage.removeItem(key);});
      Object.keys(localStorage).filter(key=>key.startsWith('ci_profile_')||key.startsWith('ci_settings_')||key.startsWith('ci_revenue_')||key.startsWith('ci_saved_reports_')).forEach(key=>localStorage.removeItem(key));
      window.location.reload();
    }catch(e){
      setDeleteError(e.message||'Account deletion failed. The backend must provide DELETE /api/auth/delete-account.');
    }finally{setDeletingAccount(false);}
  }
  async function loadAnalytics(){
    setLoading(true);setLoadError('');
    try{const r=await fetchOverview();setLive(r);}
    catch(e){setLoadError(e.message||'Unable to load saved analytics.');}
    finally{setLoading(false);}
  }
  async function syncAnalyticsNow(){
    setSyncing(true);setLoadError('');
    try{
      await apiRequest('/api/analytics/sync',{method:'POST'});
      // The backend queues provider calls in the background. Poll only lightweight job status.
      let finalJob=null;
      for(let attempt=0;attempt<180;attempt++){
        const job=await apiRequest('/api/analytics/sync/status');
        if(job.status==='completed'||job.status==='partial'||job.status==='failed'){finalJob=job;break;}
        await new Promise(resolve=>window.setTimeout(resolve,1500));
      }
      if(!finalJob) throw new Error('Synchronization is still running. Your saved data remains available; check again shortly.');
      const fresh=await fetchOverview();setLive(fresh);
      if(finalJob.status==='failed') throw new Error(finalJob.message||'YouTube synchronization failed.');
      const note=finalJob.status==='partial'?(finalJob.errors||[]).join(' · ')||finalJob.message:finalJob.message;
      setSavedNotice(note||'YouTube content and analytics synchronized.');
      window.setTimeout(()=>setSavedNotice(''),5000);
    }catch(e){setLoadError(e.message||'Synchronization failed. Your previously saved analytics are still available.');}
    finally{setSyncing(false);}
  }
  useEffect(()=>{if(active==='Social Accounts')loadAccounts();if(['Audience','Content Library','Analytics','Reports'].includes(active))loadAnalytics();if((['Campaigns','Creators','Brand Deals','Content Library','Analytics','Reports','Dashboard'].includes(active)&&['agency','marketing'].includes(user?.role))||(active==='Agency Requests'&&user?.role==='creator'))loadWorkspace();},[active,user?.role]);
  async function connect(provider){setBusyProvider(provider);setAccountError('');try{if(provider==='YouTube'){await startYouTubeOAuth();return;}const result=await apiRequest(`/api/oauth/${provider.toLowerCase()}/start`);if(result.authorization_url)window.location.href=result.authorization_url;else setAccountError(result.message||`${provider} connection is not configured.`)}catch(e){setAccountError(e.message||`${provider} connection could not start. Configure provider credentials in backend/.env.`)}finally{setBusyProvider('')}}
  function saveLocal(key,value,message){localStorage.setItem(`${key}_${user?.id}`,JSON.stringify(value));setSavedNotice(message);setTimeout(()=>setSavedNotice(''),2500)}
  const providerCards=[{name:'YouTube',icon:Youtube,color:'yt',desc:'Channel profile, videos, views, likes and comments',note:'Google OAuth · YouTube Data API + Analytics API'},{name:'Instagram',icon:Instagram,color:'insta',desc:'Professional profile, media and available insights',note:'Meta app · Instagram professional account required'},{name:'Spotify',icon:Music2,color:'tt',desc:'Public music profile and authorized Spotify account details',note:'Spotify developer app · OAuth profile access'},{name:'LinkedIn',icon:Globe2,color:'linked',desc:'Authorized profile and supported organization/content insights',note:'LinkedIn developer app · permissions vary by product'}];
  const sectionHeader=<div className="page-heading"><div><div className="eyebrow">{roleLabel(user?.role).toUpperCase()} WORKSPACE</div><h1>{d[0]}</h1><p>{d[1]}</p></div><button className="secondary-btn" onClick={()=>setActive('Dashboard')}><LayoutDashboard size={16}/> Back to dashboard</button></div>;
  const metric=(label,value,note='From available records')=><div className="panel section-metric" key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
  let body;
  if(active==='Social Accounts') body=<>
    {accountError&&<div className="error-box" role="alert">{accountError}</div>}
    {savedNotice&&<div className="success-box" role="status">{savedNotice}</div>}
    <div className="integration-notice"><ShieldCheck size={18}/><div><strong>Real account connections only</strong><p>Accounts are marked connected only after provider authorization succeeds. Each provider needs its own developer app credentials; no simulated connections are displayed.</p></div><button className="secondary-btn" onClick={loadAccounts}>Refresh status</button></div>
    <div className="platform-cards">{providerCards.map(p=>{const account=connected.find(a=>(a.provider||'').toLowerCase()===p.name.toLowerCase()&&a.connected);return <div className="panel platform-card" key={p.name}><div className={`platform-large ${p.color}`}><p.icon size={25}/></div><h3>{p.name}</h3><p>{p.desc}</p><div className={`connection-state ${account?'is-connected':'is-disconnected'}`}><span/>{account?`Connected${account.username?` · ${account.username}`:''}`:'Not connected'}</div><small className="provider-note">{p.note}</small> {account?<div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><span className="connected-btn"><Check size={15}/> Authorized</span><button type="button" className="danger-btn" onClick={()=>disconnectAccount(account)}><X size={15}/> Disconnect</button></div>:<button className="secondary-btn" disabled={busyProvider===p.name} onClick={()=>connect(p.name)}>{busyProvider===p.name?'Opening authorization…':<><Plus size={15}/> Connect account</>}</button>}{account&&<div className="account-detail">Followers: {account.followers?.toLocaleString?.()??'Not provided'}<br/>Connected: {account.connectedAt?new Date(account.connectedAt).toLocaleDateString():'Verified by API'}{account.profileUrl&&<><br/><a href={account.profileUrl} target="_blank" rel="noreferrer">Open public profile</a></>}</div>}</div>})}</div>
    <div className="panel setup-panel"><h3>Before connecting</h3><ol><li>Register the application in the provider's official developer portal.</li><li>Add the callback URL documented in <code>backend/README.md</code> to the provider app.</li><li>Place the client ID, secret, and redirect URL in <code>backend/.env</code>; restart FastAPI.</li><li>Authorize the account and grant only the requested scopes.</li></ol><p>Instagram and LinkedIn will report a setup error until their OAuth flows and provider credentials are configured. Spotify requires Spotify developer credentials. This page does not pretend that a button click is a successful connection.</p></div>
  </>;
  else if(active==='Agency Requests' && user?.role==='creator') body=<div className="panel data-table-panel"><div className="panel-title"><div><h3>Workspace access requests</h3><p>Approve a workspace to share your creator analytics. You can revoke access at any time.</p></div><button className="secondary-btn" onClick={loadWorkspace}>Refresh</button></div>{workspaceError&&<div className="error-box">{workspaceError}</div>}{workspaceData.assignmentRequests?.length?workspaceData.assignmentRequests.map(request=><div className="security-row" key={request.id}><div><strong>{request.workspaceName||request.agencyName}</strong><small>{request.workspaceRole?`${request.workspaceRole} · `:''}{request.workspaceEmail||request.agencyEmail} · {request.status==='accepted'?'Access approved':`Requested ${request.createdAt?new Date(request.createdAt).toLocaleString():'recently'}`}</small></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{request.status==='pending'?<><button className="primary-btn" onClick={async()=>{try{await apiRequest(`/api/workspace/creator-assignments/${request.id}`,{method:'PATCH',body:JSON.stringify({status:'accepted'})});await loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}>Approve</button><button className="danger-btn" onClick={async()=>{try{await apiRequest(`/api/workspace/creator-assignments/${request.id}`,{method:'PATCH',body:JSON.stringify({status:'rejected'})});await loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}>Reject</button></>:<button className="danger-btn" onClick={async()=>{if(!window.confirm(`Revoke ${request.workspaceName||request.agencyName}'s access to your creator analytics?`))return;try{await apiRequest(`/api/workspace/creator-assignments/${request.id}`,{method:'DELETE'});setSavedNotice('Workspace access revoked.');await loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}>Revoke access</button>}</div></div>):<div className="empty-state">No pending requests or active workspace connections.</div>}</div>;
  else if(active==='Settings') body=<div className="settings-layout"><section className="panel settings-section"><div className="settings-section-title"><span className="generic-icon"><UserRound/></span><div><h3>Profile preferences</h3><p>How your name and workspace appear in CreatorHub.</p></div></div><div className="settings-fields"><label>Display name<input value={settings.displayName??user?.name??''} onChange={e=>setSettings({...settings,displayName:e.target.value})}/></label><label>Workspace role<input value={roleLabel(user?.role)} disabled/></label><label>Timezone<select value={settings.timezone||'Asia/Kolkata'} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">UTC</option><option value="America/Los_Angeles">Pacific Time</option><option value="Europe/London">London</option></select></label><label>Language<select value={settings.language||'English'} onChange={e=>setSettings({...settings,language:e.target.value})}><option>English</option><option>Hindi</option><option>Telugu</option></select></label></div></section><section className="panel settings-section"><div className="settings-section-title"><span className="generic-icon olive"><Bell/></span><div><h3>Notifications</h3><p>Choose what updates you want to see.</p></div></div>{[['emailAlerts','Email notifications','Receive important account and security updates.'],['weeklyDigest','Weekly analytics digest','Summarize new performance data when available.'],['connectionAlerts','Connection alerts','Notify me when a platform connection needs attention.']].map(([k,title,sub])=><label className="toggle-row" key={k}><span><strong>{title}</strong><small>{sub}</small></span><input type="checkbox" checked={settings[k]??(k!=='weeklyDigest')} onChange={e=>setSettings({...settings,[k]:e.target.checked})}/></label>)}</section><section className="panel settings-section"><div className="settings-section-title"><span className="generic-icon amber"><ShieldCheck/></span><div><h3>Privacy & security</h3><p>Session and connected-account controls.</p></div></div><div className="security-row"><div><strong>Signed-in account</strong><small>{user?.email}</small></div><span className="status-pill">Active session</span></div><div className="security-row"><div><strong>Social access</strong><small>Provider tokens are managed by the backend.</small></div><button className="secondary-btn" onClick={()=>setActive('Social Accounts')}>Manage connections</button></div><div className="security-row"><div><strong>Password</strong><small>Change your password through the account reset flow.</small></div><button className="secondary-btn" onClick={()=>{localStorage.removeItem('ci_session');sessionStorage.removeItem('ci_session');localStorage.removeItem('ci_token');sessionStorage.removeItem('ci_token');window.location.reload()}}>Sign out</button></div><div className="security-row" style={{marginTop:18,paddingTop:18,borderTop:'1px solid #fee2e2',alignItems:'center'}}><div><strong style={{color:'#b91c1c'}}>Delete my account</strong><small style={{display:'block',maxWidth:430,marginTop:5,color:'#737b8c',lineHeight:1.5}}>Permanently delete your account and associated data. This action cannot be undone.</small></div><button type="button" className="danger-btn" onClick={()=>{setDeleteError('');setDeletePassword('');setShowDeleteAccount(true)}}>Delete account</button></div></section><div className="settings-save-row">{savedNotice&&<span className="success-box">{savedNotice}</span>}<button className="primary-btn" onClick={()=>saveLocal('ci_settings',settings,'Settings saved on this device.')}>Save settings</button></div></div>;
  else if(active==='My Profile') body=<div className="panel settings-panel"><div className="profile-cover"><div className="profile-avatar" style={{overflow:'hidden',position:'relative'}}>{profile.photoData?<img src={profile.photoData} alt="Profile" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:(profile.displayName||user?.name||'C')[0]?.toUpperCase()}</div><div><h2>{profile.displayName||user?.name}</h2><p>{roleLabel(user?.role)} · {user?.email}</p><div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:12,alignItems:'center'}}><label className="secondary-btn" style={{display:'inline-flex',alignItems:'center',gap:7,cursor:'pointer'}}> <UserRound size={15}/> {profile.photoData?'Change photo':'Upload photo'}<input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handleProfilePhoto} style={{display:'none'}}/></label>{profile.photoData&&<button type="button" className="text-btn" onClick={()=>setProfile(current=>({...current,photoData:'',photoName:''}))}>Remove photo</button>}<small style={{color:'var(--ch-muted,#788274)'}}>JPG or PNG · Max 2 MB</small></div>{photoError&&<div className="error-box" role="alert" style={{marginTop:9}}>{photoError}</div>}</div></div><div className="settings-fields"><label>Display name<input value={profile.displayName??user?.name??''} onChange={e=>setProfile({...profile,displayName:e.target.value})}/></label><label>Primary platform<select value={profile.primaryPlatform||'YouTube'} onChange={e=>setProfile({...profile,primaryPlatform:e.target.value})}><option>YouTube</option><option>Instagram</option><option>Spotify</option><option>LinkedIn</option></select></label><label>Bio<textarea value={profile.bio||''} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Tell your audience what you create."/></label><label>Website<input value={profile.website||''} onChange={e=>setProfile({...profile,website:e.target.value})} placeholder="https://…"/></label></div><div className="settings-save-row"><button className="primary-btn" onClick={()=>saveLocal('ci_profile',profile,'Profile saved on this device.')}>Save profile</button>{savedNotice&&<span className="success-box">{savedNotice}</span>}</div></div>;
  else if(active==='Revenue') {
    const total=revenue.reduce((n,r)=>n+Number(r.amount||0),0);const collected=revenue.filter(r=>r.status==='Collected').reduce((n,r)=>n+Number(r.amount||0),0);const pending=total-collected;
    body=<><div className="section-metrics-grid">{metric('Total tracked revenue',`₹${total.toLocaleString('en-IN')}`,'Manually tracked entries')}{metric('Collected',`₹${collected.toLocaleString('en-IN')}`,'Marked as received')}{metric('Pending collection',`₹${pending.toLocaleString('en-IN')}`,'Awaiting payment')}</div><div className="revenue-layout"><section className="panel"><div className="panel-title"><div><h3>Revenue collection</h3><p>Track sponsorships, brand deals, affiliate income and payouts.</p></div></div>{revenue.length?<div className="table-wrap"><table><thead><tr><th>Source</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>{revenue.map(r=><tr key={r.id}><td>{r.source}</td><td>{r.description||'—'}</td><td>{r.date}</td><td>₹{Number(r.amount).toLocaleString('en-IN')}</td><td><span className={`status-pill ${r.status==='Collected'?'status-good':'status-pending'}`}>{r.status}</span></td><td><button className="text-btn" onClick={()=>{const next=revenue.filter(x=>x.id!==r.id);setRevenue(next);saveLocal('ci_revenue',next,'Revenue entry removed.')}}>Remove</button></td></tr>)}</tbody></table></div>:<div className="empty-state">No revenue entries yet. Add a sponsorship or payment below to start tracking collections.</div>}</section><section className="panel revenue-form"><h3>Add revenue entry</h3><p>These are records you enter manually; platform earnings are not automatically available from every social API.</p><form onSubmit={e=>{e.preventDefault();const next=[{...revForm,id:crypto.randomUUID()} ,...revenue];setRevenue(next);saveLocal('ci_revenue',next,'Revenue entry saved on this device.');setRevForm({...revForm,description:'',amount:''})}}><label>Revenue type<select value={revForm.source} onChange={e=>setRevForm({...revForm,source:e.target.value})}><option>Brand deal</option><option>Sponsorship</option><option>Affiliate income</option><option>Platform payout</option><option>Other</option></select></label><label>Description<input required value={revForm.description} onChange={e=>setRevForm({...revForm,description:e.target.value})} placeholder="Campaign or payment name"/></label><label>Amount (INR)<input required type="number" min="0.01" step="0.01" value={revForm.amount} onChange={e=>setRevForm({...revForm,amount:e.target.value})} placeholder="0.00"/></label><label>Date<input required type="date" value={revForm.date} onChange={e=>setRevForm({...revForm,date:e.target.value})}/></label><label>Collection status<select value={revForm.status} onChange={e=>setRevForm({...revForm,status:e.target.value})}><option>Pending</option><option>Collected</option></select></label><button className="primary-btn" type="submit"><Plus size={15}/> Add entry</button></form></section></div>{savedNotice&&<div className="success-box">{savedNotice}</div>}</>;
  }
  else if(active==='Creators' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="section-metrics-grid">{metric('Creator directory',workspaceData.creators.length,'Available creator profiles')}{metric('Approved creators',workspaceData.creators.filter(c=>c.relationship==='accepted').length,'Creators who shared workspace access')}{metric('Visible followers',workspaceData.creators.filter(c=>c.relationship==='accepted').reduce((n,c)=>n+Number(c.followers||0),0).toLocaleString('en-IN'),'Only from approved creator accounts')}</div>
    <div className="panel data-table-panel"><h3>Creator portfolio</h3><p>Browse creator workspaces. Request access to a creator; their connected accounts and analytics become visible only after they approve.</p>
    {workspaceData.creators.length?<div className="table-scroll"><table><thead><tr>{['Creator','Email','Platforms','Followers','Accounts','Relationship','Action'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{workspaceData.creators.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.email||'Hidden until approved'}</td><td>{c.platforms?.length?c.platforms.join(', '):(c.relationship==='accepted'?'None connected':'Hidden until approved')}</td><td>{c.followers==null?'Hidden':Number(c.followers).toLocaleString('en-IN')}</td><td>{c.connected_accounts??'—'}</td><td>{c.relationship==='accepted'?'Approved':c.relationship==='pending'?'Pending approval':c.relationship==='rejected'?'Request declined':'Not connected'}</td><td>{c.relationship==='accepted'?<button className="danger-btn" onClick={async()=>{if(!window.confirm(`Remove ${c.name} from your workspace? This ends your access but does not delete the creator account.`))return;try{await apiRequest(`/api/workspace/creator-assignments/${c.assignment_id}`,{method:'DELETE'});setWorkspaceError('');setSavedNotice('Creator removed from this workspace.');await loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}>Remove creator</button>:<button className="secondary-btn" disabled={!c.canRequest} onClick={async()=>{try{const r=await apiRequest(`/api/workspace/creator-assignments/${c.id}`,{method:'POST'});setWorkspaceError('');setSavedNotice(r.message||'Access request sent.');await loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}>{c.relationship==='pending'?'Awaiting approval':'Request access'}</button>}</td></tr>)}</tbody></table></div>:<div className="empty-state"><Users/><p>No creator accounts found yet.</p></div>}</div>
  </>;
  else if(active==='Campaigns' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="panel workspace-form-panel"><h3>Create a campaign</h3><form className="workspace-form" onSubmit={e=>{e.preventDefault();createWorkspaceRecord('campaign')}}>
      <label>Campaign name<input required value={campaignForm.name} onChange={e=>setCampaignForm({...campaignForm,name:e.target.value})} placeholder="Summer launch campaign"/></label>
      <label>Platform<select value={campaignForm.platform} onChange={e=>setCampaignForm({...campaignForm,platform:e.target.value})}>{['Multi-platform','YouTube','Instagram','Spotify','LinkedIn'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Status<select value={campaignForm.status} onChange={e=>setCampaignForm({...campaignForm,status:e.target.value})}>{['Planned','Active','In Progress','Completed','Paused'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Budget (INR)<input type="number" min="0" value={campaignForm.budget} onChange={e=>setCampaignForm({...campaignForm,budget:e.target.value})}/></label>
      <label>Start date<input type="date" value={campaignForm.start_date} onChange={e=>setCampaignForm({...campaignForm,start_date:e.target.value})}/></label>
      <label>End date<input type="date" value={campaignForm.end_date} onChange={e=>setCampaignForm({...campaignForm,end_date:e.target.value})}/></label>
      <label className="wide-field">Notes<input value={campaignForm.notes} onChange={e=>setCampaignForm({...campaignForm,notes:e.target.value})} placeholder="Campaign goals or deliverables"/></label>
      <button className="primary-btn" disabled={workspaceSaving}><Plus size={15}/>{workspaceSaving?'Saving…':'Save campaign'}</button>
    </form></div>
    <div className="section-metrics-grid">{metric('Total campaigns',workspaceData.campaigns.length,'Saved in this workspace')}{metric('Active campaigns',workspaceData.campaigns.filter(c=>['active','in progress','running'].includes((c.status||'').toLowerCase())).length,'Current active status')}{metric('Total budget',`₹${workspaceData.campaigns.reduce((n,c)=>n+Number(c.budget||0),0).toLocaleString('en-IN')}`,'Declared campaign budgets')}</div>
    <div className="panel data-table-panel"><h3>Campaign tracker</h3>{workspaceData.campaigns.length?<div className="table-scroll"><table><thead><tr>{['Campaign','Platform','Status','Budget','Dates','Notes',''].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{workspaceData.campaigns.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.platform}</td><td>{c.status}</td><td>₹{Number(c.budget||0).toLocaleString('en-IN')}</td><td>{c.start_date||'—'} – {c.end_date||'—'}</td><td>{c.notes||'—'}</td><td><button className="danger-btn" onClick={async()=>{if(confirm('Delete this campaign?')){try{await apiRequest(`/api/workspace/campaigns/${c.id}`,{method:'DELETE'});loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}}>Delete</button></td></tr>)}</tbody></table></div>:<div className="empty-state"><CalendarDays/><p>No campaigns yet. Create your first campaign above.</p></div>}</div>
  </>;
  else if(active==='Brand Deals' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="panel workspace-form-panel"><h3>Add a brand partnership</h3><form className="workspace-form" onSubmit={e=>{e.preventDefault();createWorkspaceRecord('deal')}}>
      <label>Brand name<input required value={dealForm.brand_name} onChange={e=>setDealForm({...dealForm,brand_name:e.target.value})} placeholder="Brand or company"/></label>
      <label>Creator name<input value={dealForm.creator_name} onChange={e=>setDealForm({...dealForm,creator_name:e.target.value})} placeholder="Creator (optional)"/></label>
      <label>Deal value (INR)<input type="number" min="0" value={dealForm.amount} onChange={e=>setDealForm({...dealForm,amount:e.target.value})}/></label>
      <label>Status<select value={dealForm.status} onChange={e=>setDealForm({...dealForm,status:e.target.value})}>{['Negotiating','Pending','Active','Completed','Cancelled'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Due date<input type="date" value={dealForm.due_date} onChange={e=>setDealForm({...dealForm,due_date:e.target.value})}/></label>
      <label>Notes<input value={dealForm.notes} onChange={e=>setDealForm({...dealForm,notes:e.target.value})} placeholder="Deliverables / terms"/></label>
      <button className="primary-btn" disabled={workspaceSaving}><Plus size={15}/>{workspaceSaving?'Saving…':'Save brand deal'}</button>
    </form></div>
    <div className="section-metrics-grid">{metric('Brand partnerships',workspaceData.deals.length,'Saved in this workspace')}{metric('Total deal value',`₹${workspaceData.deals.reduce((n,d)=>n+Number(d.amount||0),0).toLocaleString('en-IN')}`,'Declared deal values')}{metric('Active / pending',workspaceData.deals.filter(d=>['active','pending','negotiating'].includes((d.status||'').toLowerCase())).length,'Not cancelled or completed')}</div>
    <div className="panel data-table-panel"><h3>Brand partnerships</h3>{workspaceData.deals.length?<div className="table-scroll"><table><thead><tr>{['Brand','Creator','Value','Status','Due date','Notes',''].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{workspaceData.deals.map(d=><tr key={d.id}><td>{d.brand_name}</td><td>{d.creator_name||'—'}</td><td>₹{Number(d.amount||0).toLocaleString('en-IN')}</td><td>{d.status}</td><td>{d.due_date||'—'}</td><td>{d.notes||'—'}</td><td><button className="danger-btn" onClick={async()=>{if(confirm('Delete this brand deal?')){try{await apiRequest(`/api/workspace/brand-deals/${d.id}`,{method:'DELETE'});loadWorkspace()}catch(e){setWorkspaceError(e.message)}}}}>Delete</button></td></tr>)}</tbody></table></div>:<div className="empty-state"><FileText/><p>No brand deals yet. Add a partnership above.</p></div>}</div>
  </>;
  else if(active==='Content Library' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="section-metrics-grid">{metric('Fetched posts',workspaceData.posts.length,'Across creator accounts')}{metric('Total views',workspaceData.posts.reduce((n,p)=>n+Number(p.views||0),0).toLocaleString('en-IN'),'Stored API metrics')}{metric('Creators represented',[...new Set(workspaceData.posts.map(p=>p.creator))].length,'Creators with fetched posts')}</div>
    <div className="panel data-table-panel"><h3>Creator content library</h3><p>Posts synchronized from creator-owned authorized accounts.</p>{workspaceData.posts.length?<div className="table-scroll"><table><thead><tr>{['Post','Creator','Platform','Views','Likes','Comments','Link'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{workspaceData.posts.map(p=><tr key={p.id}><td>{p.title}</td><td>{p.creator}</td><td>{p.platform}</td><td>{Number(p.views||0).toLocaleString('en-IN')}</td><td>{Number(p.likes||0).toLocaleString('en-IN')}</td><td>{Number(p.comments||0).toLocaleString('en-IN')}</td><td>{p.url?<a href={p.url} target="_blank" rel="noreferrer">Open</a>:'—'}</td></tr>)}</tbody></table></div>:<div className="empty-state"><FileText/><p>No synchronized creator posts are available yet.</p></div>}</div>
  </>;
  else if(active==='Analytics' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="section-metrics-grid">{metric('Creators',workspaceData.analytics?.creator_count??'—','Registered creator accounts')}{metric('Connected accounts',workspaceData.analytics?.connected_accounts??'—','Creator-owned connections')}{metric('Stored posts',workspaceData.analytics?.posts??'—','Synchronized posts')}{metric('Followers',Number(workspaceData.analytics?.followers||0).toLocaleString('en-IN'),'Authorized account totals')}{metric('Post views',Number(workspaceData.analytics?.post_views||0).toLocaleString('en-IN'),'Stored post-level views')}{metric('Likes',Number(workspaceData.analytics?.likes||0).toLocaleString('en-IN'),'Stored post-level likes')}</div>
    <div className="panel data-table-panel"><h3>Platform coverage</h3><div className="section-metrics-grid">{Object.entries(workspaceData.analytics?.platforms||{}).map(([k,v])=>metric(k[0].toUpperCase()+k.slice(1),v,'Connected creator accounts'))}</div></div>
  </>;
  else if(active==='Reports' && ['agency','marketing'].includes(user?.role)) body=<>
    {workspaceError&&<div className="error-box">{workspaceError}</div>}
    <div className="panel report-builder"><h3>Workspace performance report</h3><p>Export a CSV of synchronized creator posts available to this workspace view.</p><label>Report name<input value={reportName} onChange={e=>setReportName(e.target.value)}/></label><div className="report-summary"><span>Posts included<strong>{workspaceData.posts.length}</strong></span><span>Creators<strong>{workspaceData.analytics?.creator_count??0}</strong></span><span>Post views<strong>{workspaceData.posts.reduce((n,p)=>n+Number(p.views||0),0).toLocaleString('en-IN')}</strong></span></div><button className="primary-btn" onClick={()=>{const rows=[['Report',reportName],['Creator','Post','Platform','Views','Likes','Comments'],...workspaceData.posts.map(p=>[p.creator,p.title,p.platform,p.views,p.likes,p.comments])];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='creatorhub-workspace-report.csv';a.click();URL.revokeObjectURL(url)}}><Download size={15}/> Export CSV report</button></div>
  </>;
  else if(active==='Audience') body=<><div className="section-metrics-grid">{metric('Total followers',live?.metrics?.find(m=>m.label==='Followers')?.value||'—','From connected accounts')}{metric('Growth snapshots',live?.growth?.length??0,'Historical records collected')}{metric('Demographics','Unavailable','Shown only when the provider API supplies them')}</div>{loadError&&<div className="error-box">{loadError}</div>}<div className="panel"><div className="panel-title"><div><h3>Audience growth over time</h3><p>Historical snapshots begin accumulating after your account is connected and synced.</p></div><button className="secondary-btn" onClick={loadAnalytics}>{loading?'Loading…':'Refresh data'}</button></div>{live?.growth?.length?<div className="chart-area audience-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={live.growth}><CartesianGrid strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="youtube" name="YouTube followers" stroke="#587451" strokeWidth={2.5}/></LineChart></ResponsiveContainer></div>:<div className="empty-state"><Users size={25}/><p>No audience history has been collected yet. Connect a platform, then refresh analytics periodically to build a real trend.</p><button className="primary-btn" onClick={()=>setActive('Social Accounts')}>Connect a platform</button></div>}<div className="demographics-note"><ShieldCheck size={16}/><span>Age, gender, and location are not fabricated. They appear only when the connected provider and account permissions expose them.</span></div></div></>;
  else if(active==='Content Library') body=<>{loadError&&<div className="error-box">{loadError}</div>}<div className="section-metrics-grid">{metric('Fetched posts',live?.posts?.length??'—','Authorized API records')}{metric('Total views',(live?.posts||[]).reduce((n,p)=>n+Number(p.views||0),0).toLocaleString('en-IN'),'Fetched video statistics')}{metric('Platforms represented',[...new Set((live?.posts||[]).map(p=>p.platformName))].filter(Boolean).length,'Live data sources')}</div><div className="panel"><div className="panel-title"><div><h3>Published content</h3><p>Saved posts from your authorized social accounts.</p></div><div className="content-actions"><button className="secondary-btn" onClick={loadAnalytics} disabled={loading}>{loading?'Loading saved data…':'Refresh saved data'}</button><button className="primary-btn" onClick={syncAnalyticsNow} disabled={syncing}>{syncing?'Syncing YouTube…':'Sync latest content'}</button></div></div>{live?.posts?.length?<div className="table-wrap content-table-wrap"><table className="content-library-table"><thead><tr><th>Content</th><th>Platform</th><th>Published</th><th>Views</th><th>Likes</th><th>Comments</th><th>Engagement</th></tr></thead><tbody>{live.posts.map(p=><tr key={p.id}><td><div className="content-library-cell"><a className="content-thumbnail" href={p.url||undefined} target={p.url?'_blank':undefined} rel="noreferrer">{p.image&&String(p.image).startsWith('http')?<img src={p.image} alt="" loading="lazy"/>:<span>▶</span>}</a><div className="content-library-title"><a href={p.url||undefined} target={p.url?'_blank':undefined} rel="noreferrer" title={p.title}>{p.title}</a><small>{p.type||'Post'}</small></div></div></td><td>{p.platformName||'—'}</td><td>{p.date||'—'}</td><td className="table-number">{Number(p.views||0).toLocaleString('en-IN')}</td><td className="table-number">{Number(p.likes||0).toLocaleString('en-IN')}</td><td className="table-number">{Number(p.comments||0).toLocaleString('en-IN')}</td><td>{p.engagement||'—'}</td></tr>)}</tbody></table></div>:<div className="empty-state">{loading?'Loading saved posts…':live?.connected?'Your YouTube account is connected, but no videos have been synchronized yet. Select “Sync latest content” to fetch your videos.':'No posts returned by a connected provider yet. Connect YouTube in Social Accounts, then synchronize your content.'}</div>}</div></>;
  else if(active==='Analytics') body=<>{loadError&&<div className="error-box">{loadError}</div>}<div className="section-metrics-grid">{metric('Posts available',live?.posts?.length??'—','Authorized platform data')}{metric('Views',live?.metrics?.find(m=>m.label==='Total Views')?.value||'—','Channel total where available')}{metric('Last sync',live?.lastUpdated?new Date(live.lastUpdated).toLocaleString():'Not synced','Backend API status')}</div><div className="panel"><div className="panel-title"><div><h3>Post performance comparison</h3><p>Sort posts by views, likes, comments, and engagement using fetched metrics.</p></div><button className="secondary-btn" onClick={loadAnalytics}>{loading?'Loading…':'Refresh analytics'}</button></div>{live?.posts?.length?<div className="table-wrap"><table><thead><tr><th>Post</th><th>Views</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Engagement</th></tr></thead><tbody>{[...live.posts].sort((a,b)=>Number(b.views||0)-Number(a.views||0)).map(p=><tr key={p.id}><td>{p.title}</td><td>{Number(p.views||0).toLocaleString()}</td><td>{Number(p.likes||0).toLocaleString()}</td><td>{Number(p.comments||0).toLocaleString()}</td><td>{p.shares??'Unavailable'}</td><td>{p.engagement||'—'}</td></tr>)}</tbody></table></div>:<div className="empty-state">No authorized post metrics available. Connect an account to fetch actual post data.</div>}</div></>;
  else if(active==='Reports') body=<div className="panel report-builder"><h3>Create a performance report</h3><p>Build a report from available synchronized data. Exported reports contain only data returned by the backend.</p><label>Report name<input value={reportName} onChange={e=>setReportName(e.target.value)}/></label><div className="report-summary"><span>Posts included<strong>{live?.posts?.length??0}</strong></span><span>Connected data<strong>{live?.connected?'Available':'Not connected'}</strong></span><span>Last refreshed<strong>{live?.lastUpdated?new Date(live.lastUpdated).toLocaleString():'—'}</strong></span></div><button className="primary-btn" onClick={()=>{const csv=[['Title','Platform','Date','Views','Likes','Comments','Shares','Engagement'],...(live?.posts||[]).map(p=>[p.title,p.platformName,p.date,p.views,p.likes,p.comments,p.shares,p.engagement])].map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${(reportName||'creator-report').replace(/[^a-z0-9-_]/gi,'_')}.csv`;a.click();URL.revokeObjectURL(url)}}><Download size={16}/> Export CSV report</button>{loadError&&<div className="error-box">{loadError}</div>}</div>;
  else if(active==='Saved Reports') body=<div className="panel"><div className="panel-title"><div><h3>Saved report configurations</h3><p>Save a name for a reusable report view on this device.</p></div></div><form className="inline-form" onSubmit={e=>{e.preventDefault();if(!reportName.trim())return;const next=[{id:crypto.randomUUID(),name:reportName.trim(),createdAt:new Date().toISOString()},...savedReports];setSavedReports(next);saveLocal('ci_saved_reports',next,'Report view saved.')}}><input value={reportName} onChange={e=>setReportName(e.target.value)} aria-label="Saved report name"/><button className="primary-btn" type="submit"><Bookmark size={15}/> Save view</button></form>{savedReports.length?<div className="saved-report-list">{savedReports.map(r=><div className="security-row" key={r.id}><div><strong>{r.name}</strong><small>Saved {new Date(r.createdAt).toLocaleString()}</small></div><button className="text-btn" onClick={()=>{const next=savedReports.filter(x=>x.id!==r.id);setSavedReports(next);saveLocal('ci_saved_reports',next,'Saved report removed.')}}>Remove</button></div>)}</div>:<div className="empty-state">No saved report views yet.</div>}{savedNotice&&<div className="success-box">{savedNotice}</div>}</div>;
  else if(active==='Notifications') body=<div className="panel"><div className="panel-title"><div><h3>Notification center</h3><p>Connection and analytics messages from this session.</p></div></div><div className="notification-list"><div><span className="generic-icon olive"><ShieldCheck/></span><section><strong>Account privacy</strong><p>Only provider-authorized data should be shown as live analytics.</p><small>Workspace guidance</small></section></div><div><span className="generic-icon"><Activity/></span><section><strong>Analytics sync</strong><p>{live?.message||'Connect a social account to start receiving actual analytics updates.'}</p><small>{live?.lastUpdated?new Date(live.lastUpdated).toLocaleString():'Waiting for a live sync'}</small></section></div>{accountError&&<div className="error-box">{accountError}</div>}</div><button className="secondary-btn" onClick={()=>{loadAnalytics();loadAccounts()}}>Refresh status</button></div>;
  else if(active==='Help & Support') body=<div className="panel setup-panel"><h3>Connection troubleshooting</h3><ol><li>Keep FastAPI running on port 8000 and Vite on port 5173.</li><li>Verify <code>http://127.0.0.1:8000/docs</code> opens.</li><li>Configure provider credentials and exact callback URLs in <code>backend/.env</code>.</li><li>Check the backend terminal for OAuth or API errors; missing metrics should remain unavailable rather than guessed.</li></ol></div>;
  else body=<div className="panel generic-empty"><div className="empty-illustration"><Activity size={28}/></div><h2>{d[0]}</h2><p>This workspace module is prepared for role-specific data. Records will appear when the relevant backend module and authorized data source are available.</p><button className="primary-btn" onClick={()=>setActive('Social Accounts')}>Open social accounts <ArrowUpRight size={15}/></button></div>;
  return <div className="generic-page"><style>{`
.workspace-form-panel,.data-table-panel{padding:22px;margin-bottom:20px}.workspace-form-panel h3,.data-table-panel h3{margin:0 0 8px}.workspace-form-panel p,.data-table-panel p{color:#8792aa;margin:0 0 18px}.workspace-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.workspace-form label{display:flex;flex-direction:column;gap:7px;font-size:13px;color:#65718b}.workspace-form input,.workspace-form select{width:100%;box-sizing:border-box;border:1px solid #e1e6f0;border-radius:9px;padding:11px 12px;background:#fff;color:#17233f;font:inherit}.workspace-form .wide-field{grid-column:span 2}.workspace-form button{align-self:end;justify-self:start}.table-scroll{width:100%;overflow:auto}.data-table-panel table{width:100%;border-collapse:collapse;min-width:700px}.data-table-panel th,.data-table-panel td{text-align:left;padding:13px 12px;border-bottom:1px solid #edf0f6;font-size:13px;white-space:nowrap}.data-table-panel th{color:#77839b;font-weight:600;background:#fafbfe}.data-table-panel td{color:#26334e}.data-table-panel a{color:#587451;text-decoration:none}.data-table-panel .empty-state{padding:32px;text-align:center;color:#8994aa}.section-metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:18px 0}.section-metric{padding:18px;display:flex;flex-direction:column;gap:8px}.section-metric small{color:#8290a9}.section-metric strong{font-size:24px;color:#1d2944}.section-metric span{font-size:12px;color:#8994aa}@media(max-width:900px){.workspace-form{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.workspace-form{grid-template-columns:1fr}.workspace-form .wide-field{grid-column:auto}}
.danger-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border:1px solid #ef4444;border-radius:9px;background:#fff;color:#dc2626;font:inherit;font-weight:600;cursor:pointer}.danger-btn:hover{background:#fef2f2}.danger-btn:disabled{opacity:.55;cursor:not-allowed}`}</style>{sectionHeader}{body}
    {showDeleteAccount&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!deletingAccount)setShowDeleteAccount(false)}} style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(15,23,42,.58)'}}>
      <section className="panel" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{width:'min(100%,460px)',padding:26,background:'#fff',borderRadius:16,boxShadow:'0 20px 70px rgba(0,0,0,.25)'}}>
        <h2 id="delete-account-title" style={{marginTop:0,color:'#b91c1c'}}>Delete your account?</h2>
        <p style={{lineHeight:1.6,color:'#64748b'}}>This permanently deletes your CreatorHub account and associated server-side information. You will need to register again to use CreatorHub.</p>
        <label style={{display:'grid',gap:8,marginTop:18}}>Enter your password to confirm
          <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} autoComplete="current-password" placeholder="Your current password" style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #d1d5db',borderRadius:8}}/>
        </label>
        {deleteError&&<div className="error-box" role="alert" style={{marginTop:12}}>{deleteError}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',flexWrap:'wrap',gap:10,marginTop:22}}>
          <button type="button" className="secondary-btn" disabled={deletingAccount} onClick={()=>{setShowDeleteAccount(false);setDeletePassword('');setDeleteError('')}}>Cancel</button>
          <button type="button" className="danger-btn" disabled={deletingAccount||!deletePassword} onClick={deleteAccount}>{deletingAccount?'Deleting…':'Permanently delete'}</button>
        </div>
      </section>
    </div>}
  </div>;
}
export default function App(){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ci_session')||sessionStorage.getItem('ci_session')||'null')}catch{return null}});const [theme,setTheme]=useState(()=>localStorage.getItem('ci_theme')||'light');useEffect(()=>{localStorage.setItem('ci_theme',theme);document.documentElement.dataset.creatorhubTheme=theme;},[theme]);const [active,setActive]=useState('Dashboard');const [collapsed,setCollapsed]=useState(false);const [mobileOpen,setMobileOpen]=useState(false);function logout(){localStorage.removeItem('ci_session');sessionStorage.removeItem('ci_session');localStorage.removeItem('ci_token');sessionStorage.removeItem('ci_token');setUser(null);setActive('Dashboard')}if(!user)return <Auth onLogin={setUser}/>;return <div className={`app-shell creatorhub-theme-${theme}`} data-theme={theme}><style>{`
.creatorhub-theme-light{
  --ch-bg:#F2F1E8;--ch-surface:#FBFAF4;--ch-surface-soft:#E6E8DC;--ch-text:#29352B;--ch-muted:#788274;--ch-border:#DCE1D4;--ch-accent:#587451;--ch-accent-hover:#435D3F;--ch-accent-soft:#E1E9DC;--ch-olive:#849477;--ch-shadow:0 10px 30px rgba(43,61,39,.07);
  background:var(--ch-bg);color:var(--ch-text);color-scheme:light
}
.creatorhub-theme-light .main-area,.creatorhub-theme-light .page-content{background:var(--ch-bg)!important;color:var(--ch-text)}
.creatorhub-theme-light .topbar,.creatorhub-theme-light .panel,.creatorhub-theme-light .metric-card,.creatorhub-theme-light .admin-stat-card,.creatorhub-theme-light .sidebar,.creatorhub-theme-light .role-banner,.creatorhub-theme-light .generic-page .panel{background:var(--ch-surface)!important;border-color:var(--ch-border)!important;color:var(--ch-text)!important}
.creatorhub-theme-light .panel,.creatorhub-theme-light .metric-card,.creatorhub-theme-light .admin-stat-card{border-radius:18px;box-shadow:var(--ch-shadow)}
.creatorhub-theme-light h1,.creatorhub-theme-light h2,.creatorhub-theme-light h3,.creatorhub-theme-light strong,.creatorhub-theme-light .admin-stat-value{color:var(--ch-text)!important}
.creatorhub-theme-light p,.creatorhub-theme-light small,.creatorhub-theme-light .muted-cell,.creatorhub-theme-light .admin-stat-note{color:var(--ch-muted)!important}
.creatorhub-theme-light .primary-btn{background:var(--ch-accent)!important;border-color:var(--ch-accent)!important;color:#fffaf4!important;box-shadow:0 5px 14px rgba(166,95,69,.16)}
.creatorhub-theme-light .primary-btn:hover{background:var(--ch-accent-hover)!important}
.creatorhub-theme-light .secondary-btn,.creatorhub-theme-light .theme-toggle,.creatorhub-theme-light .date-select,.creatorhub-theme-light .icon-button{background:var(--ch-surface)!important;border-color:var(--ch-border)!important;color:var(--ch-text)!important}
.creatorhub-theme-light .nav-item.active{background:var(--ch-accent-soft)!important;color:var(--ch-accent-hover)!important}
.creatorhub-theme-light .nav-item:hover{background:var(--ch-surface-soft)!important;color:var(--ch-text)!important}
.creatorhub-theme-light .theme-toggle:hover,.creatorhub-theme-light .secondary-btn:hover{background:var(--ch-accent-soft)!important}
.creatorhub-theme-light a,.creatorhub-theme-light .text-btn,.creatorhub-theme-light .panel-title-action{color:var(--ch-accent)!important}

.global-search-wrap{min-width:280px;max-width:380px;flex:1}
.global-search{display:flex;align-items:center;gap:10px;width:100%}
.global-search input{min-width:0;flex:1;outline:none}
.global-search-results button:hover{background:var(--ch-soft,#edf2e9)!important}
.global-search-results button:focus-visible{outline:2px solid var(--ch-accent,#587451);outline-offset:-2px}
.creatorhub-theme-light input,.creatorhub-theme-light select,.creatorhub-theme-light textarea,.creatorhub-theme-light .global-search{background:#FFFCF6!important;border-color:var(--ch-border)!important;color:var(--ch-text)!important}
.creatorhub-theme-light .admin-stat-card{padding:23px 25px;min-height:132px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:9px;border:1px solid var(--ch-border);border-radius:18px}
.admin-stat-label{font-size:13px;font-weight:650;letter-spacing:.015em}
.admin-stat-value{font-size:32px;line-height:1.15;font-weight:750}
.admin-stat-note{font-size:12px}
.creatorhub-theme-light .admin-stat-label{color:var(--ch-muted)}.creatorhub-theme-light .admin-stat-value{color:var(--ch-text)}.creatorhub-theme-light .admin-stat-note{color:var(--ch-muted)}
.creatorhub-theme-light .section-metrics-grid,.creatorhub-theme-dark .section-metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:17px;margin:20px 0 24px}
.admin-table-panel{padding:24px;margin-top:8px}
.admin-table-panel .table-wrap{width:100%;overflow-x:auto}
.admin-table-panel table{width:100%;border-collapse:separate;border-spacing:0;min-width:760px}
.creatorhub-theme-light .admin-table-panel th{background:#E8EADF!important;color:#5F7058!important;font-size:11px!important;font-weight:700!important;letter-spacing:.07em;text-transform:uppercase;padding:15px 14px!important}
.creatorhub-theme-light .admin-table-panel td{padding:15px 14px!important;border-bottom:1px solid var(--ch-border)!important;color:#493B30}
.creatorhub-theme-light .admin-table-panel tbody tr:hover{background:#F0F2E9}
.theme-toggle{padding:10px 14px;border:1px solid var(--ch-border);border-radius:11px;background:var(--ch-surface);color:var(--ch-text);font:inherit;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.creatorhub-theme-dark{--ch-bg:#111315;--ch-surface:#191C1F;--ch-surface-soft:#22262A;--ch-text:#F1F2EE;--ch-muted:#B5BAB4;--ch-border:#343A3F;--ch-accent:#A8B99A;--ch-accent-hover:#C0CEB5;--ch-accent-soft:#29312B;--ch-olive:#8F9E84;--ch-shadow:0 12px 30px rgba(0,0,0,.32);background:var(--ch-bg);color:var(--ch-text);color-scheme:dark}
.creatorhub-theme-dark .main-area,.creatorhub-theme-dark .page-content,.creatorhub-theme-dark .topbar{background:var(--ch-bg)!important;color:var(--ch-text)!important}
.creatorhub-theme-dark .topbar,.creatorhub-theme-dark .panel,.creatorhub-theme-dark .metric-card,.creatorhub-theme-dark .admin-stat-card,.creatorhub-theme-dark .sidebar,.creatorhub-theme-dark .role-banner,.creatorhub-theme-dark .generic-page .panel{background:var(--ch-surface)!important;color:var(--ch-text)!important;border-color:var(--ch-border)!important;box-shadow:var(--ch-shadow)}
.creatorhub-theme-dark h1,.creatorhub-theme-dark h2,.creatorhub-theme-dark h3,.creatorhub-theme-dark strong,.creatorhub-theme-dark .admin-stat-value,.creatorhub-theme-dark .admin-stat-label{color:var(--ch-text)!important}
.creatorhub-theme-dark p,.creatorhub-theme-dark small,.creatorhub-theme-dark .muted-cell,.creatorhub-theme-dark .admin-stat-note{color:var(--ch-muted)!important}
.creatorhub-theme-dark .admin-stat-value{font-size:32px;line-height:1.15;font-weight:750}
.creatorhub-theme-dark .admin-table-panel th{background:#354435!important;color:#DDE6D5!important;padding:15px 14px!important}
.creatorhub-theme-dark .admin-table-panel td{color:#F0E4D6!important;border-bottom:1px solid var(--ch-border)!important;padding:15px 14px!important}
.creatorhub-theme-dark .admin-table-panel tbody tr:hover{background:#393027}
.creatorhub-theme-dark .primary-btn{background:var(--ch-accent)!important;border-color:var(--ch-accent)!important;color:#241B16!important}
.creatorhub-theme-dark .secondary-btn,.creatorhub-theme-dark .theme-toggle,.creatorhub-theme-dark input,.creatorhub-theme-dark select,.creatorhub-theme-dark textarea,.creatorhub-theme-dark .global-search,.creatorhub-theme-dark .date-select{background:#354435!important;color:var(--ch-text)!important;border-color:var(--ch-border)!important}
.creatorhub-theme-dark .nav-item.active{background:#394B39!important;color:#DCE8D4!important}
.creatorhub-theme-dark .nav-item:hover{background:#354435!important;color:var(--ch-text)!important}
.creatorhub-theme-dark a,.creatorhub-theme-dark .text-btn,.creatorhub-theme-dark .panel-title-action{color:var(--ch-accent)!important}
.creatorhub-theme-dark .empty-state,.creatorhub-theme-dark .generic-empty{color:var(--ch-muted)!important}
/* Keep charts within the same restrained clay-and-stone palette. */
.creatorhub-theme-light .recharts-cartesian-grid line,.creatorhub-theme-dark .recharts-cartesian-grid line{stroke:var(--ch-border)!important}
.creatorhub-theme-light .recharts-text{fill:var(--ch-muted)!important}.creatorhub-theme-dark .recharts-text{fill:var(--ch-muted)!important}
.creatorhub-theme-light .recharts-line-curve{stroke:var(--ch-accent)!important}.creatorhub-theme-dark .recharts-line-curve{stroke:var(--ch-accent)!important}
.creatorhub-theme-light .recharts-bar-rectangle path{fill:var(--ch-olive)!important}.creatorhub-theme-dark .recharts-bar-rectangle path{fill:var(--ch-olive)!important}
@media(max-width:700px){.theme-toggle{font-size:0}.theme-toggle:after{content:"◐";font-size:16px}.section-metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-stat-card{padding:16px;min-height:112px}.admin-stat-value{font-size:26px}}
/* Unified sage / forest identity across every authenticated role and workspace. */
.creatorhub-theme-light .brand-mark,.creatorhub-theme-light .avatar,.creatorhub-theme-light .floating-icon,.creatorhub-theme-light .welcome-icon,.creatorhub-theme-light .generic-icon,.creatorhub-theme-light .metric-icon{background:#E2EBDD!important;color:#536F4D!important;border-color:#D2DDCB!important}
.creatorhub-theme-light .brand-accent,.creatorhub-theme-light .nav-item svg,.creatorhub-theme-light .collapse-btn,.creatorhub-theme-light .workspace-chip>svg{color:#587451!important}
.creatorhub-theme-light .nav-item.active{background:#E2EBDD!important;color:#435D3F!important}
.creatorhub-theme-light .selected,.creatorhub-theme-light .tab-row button.active,.creatorhub-theme-light .filter-pills button.selected{background:#587451!important;border-color:#587451!important;color:#fff!important}
.creatorhub-theme-light .auth-art{background:linear-gradient(145deg,#263B2A 0%,#3D5B3D 55%,#718765 100%)!important}
.creatorhub-theme-light .auth-art .brand-mark{background:#78916D!important;color:#fff!important}
.creatorhub-theme-light .auth-art .brand-accent,.creatorhub-theme-light .auth-art .art-copy h1 span{color:#DCE8CF!important}
.creatorhub-theme-light .auth-art .eyebrow,.creatorhub-theme-light .auth-art .floating-card{background:rgba(236,242,226,.13)!important;border-color:rgba(236,242,226,.22)!important;color:#F2F4EA!important}
.creatorhub-theme-light .auth-art .floating-icon{background:rgba(236,242,226,.16)!important;color:#E4EDD9!important}
.creatorhub-theme-light .auth-art .up-pill{background:#DDE9D2!important;color:#3F5A3B!important}
.creatorhub-theme-dark .brand-mark,.creatorhub-theme-dark .avatar,.creatorhub-theme-dark .floating-icon,.creatorhub-theme-dark .welcome-icon,.creatorhub-theme-dark .generic-icon,.creatorhub-theme-dark .metric-icon{background:#394B39!important;color:#C7D7B9!important;border-color:#52664D!important}
.creatorhub-theme-dark .brand-accent,.creatorhub-theme-dark .nav-item svg,.creatorhub-theme-dark .collapse-btn,.creatorhub-theme-dark .workspace-chip>svg{color:#B6C9A5!important}
.creatorhub-theme-dark .selected,.creatorhub-theme-dark .tab-row button.active,.creatorhub-theme-dark .filter-pills button.selected{background:#718765!important;border-color:#718765!important;color:#fff!important}
.creatorhub-theme-dark .auth-art{background:linear-gradient(145deg,#17231A 0%,#263A29 58%,#435B40 100%)!important}
.creatorhub-theme-dark .auth-art .brand-mark{background:#718765!important;color:#fff!important}
.creatorhub-theme-dark .auth-art .brand-accent,.creatorhub-theme-dark .auth-art .art-copy h1 span{color:#DCE8CF!important}
.creatorhub-theme-dark .auth-art .eyebrow,.creatorhub-theme-dark .auth-art .floating-card{background:rgba(236,242,226,.10)!important;border-color:rgba(236,242,226,.18)!important;color:#F2F4EA!important}
.creatorhub-theme-dark .auth-art .floating-icon{background:rgba(236,242,226,.14)!important;color:#E4EDD9!important}
.creatorhub-theme-dark .auth-art .up-pill{background:#DDE9D2!important;color:#3F5A3B!important}
.creatorhub-theme-light .recharts-line-curve,.creatorhub-theme-dark .recharts-line-curve{stroke:#718765!important}
.creatorhub-theme-light .recharts-bar-rectangle path,.creatorhub-theme-dark .recharts-bar-rectangle path{fill:#849477!important}
.creatorhub-theme-light .platform-logo,.creatorhub-theme-dark .platform-logo{border-color:var(--ch-border)!important}
/* Content library layout: thumbnails render as images; long titles never overlap metric columns. */
.content-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.content-table-wrap{width:100%;overflow-x:auto}
.content-library-table{width:100%;min-width:900px;table-layout:fixed;border-collapse:separate;border-spacing:0}
.content-library-table th,.content-library-table td{padding:14px 12px;vertical-align:middle}
.content-library-table th:first-child{width:38%}
.content-library-table th:nth-child(2){width:12%}
.content-library-table th:nth-child(3){width:13%}
.content-library-table th:nth-child(n+4){width:9%}
.content-library-cell{display:flex;align-items:center;gap:12px;min-width:0;max-width:100%}
.content-thumbnail{display:flex;flex:0 0 88px;width:88px;height:56px;overflow:hidden;border-radius:9px;background:var(--ch-surface-soft);align-items:center;justify-content:center;text-decoration:none}
.content-thumbnail img,.post-thumb img{display:block;width:100%;height:100%;object-fit:cover}
.content-library-title,.post-title-wrap{display:flex;flex-direction:column;gap:4px;min-width:0;overflow:hidden}
.content-library-title a,.content-library-title a:visited{color:var(--ch-text);min-width:0;display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none;font-size:13px;font-weight:650}
.content-library-title small,.post-title-wrap small{font-size:11px;color:var(--ch-muted)}
.content-library-table td:not(:first-child){white-space:nowrap}
.post-thumb{width:74px;height:48px;flex:0 0 74px;overflow:hidden;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--ch-surface-soft)}
.post-title-wrap strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}


/* Dark mode: neutral charcoal/near-black surfaces with sage only as an accent. */
.creatorhub-theme-dark .main-area,
.creatorhub-theme-dark .page-content{background:#111315!important;color:#F1F2EE!important}
.creatorhub-theme-dark .topbar,
.creatorhub-theme-dark .sidebar,
.creatorhub-theme-dark .panel,
.creatorhub-theme-dark .metric-card,
.creatorhub-theme-dark .admin-stat-card,
.creatorhub-theme-dark .role-banner,
.creatorhub-theme-dark .generic-page .panel{background:#191C1F!important;border-color:#343A3F!important;color:#F1F2EE!important}
.creatorhub-theme-dark .workspace-chip{background:#202428!important;border:1px solid #343A3F!important;color:#F1F2EE!important;border-radius:14px}
.creatorhub-theme-dark .workspace-chip strong{color:#F4F5F1!important}
.creatorhub-theme-dark .workspace-chip small{color:#C3C9C1!important}
.creatorhub-theme-dark .workspace-chip .avatar{background:#344137!important;color:#DCE8D5!important}
.creatorhub-theme-dark .nav-heading{color:#9FA8A0!important}
.creatorhub-theme-dark .nav-item{color:#C4CAC5!important}
.creatorhub-theme-dark .nav-item span{color:inherit!important}
.creatorhub-theme-dark .nav-item svg{color:#A9B99E!important}
.creatorhub-theme-dark .nav-item.active{background:#29312B!important;color:#F3F5EF!important}
.creatorhub-theme-dark .nav-item.active span{color:#F3F5EF!important}
.creatorhub-theme-dark .nav-item:hover{background:#24292D!important;color:#FFFFFF!important}
.creatorhub-theme-dark .user-mini-info strong,
.creatorhub-theme-dark .user-mini-info small{color:#E8EBE6!important}
.creatorhub-theme-dark .global-search,
.creatorhub-theme-dark .date-select,
.creatorhub-theme-dark .theme-toggle,
.creatorhub-theme-dark input,
.creatorhub-theme-dark select,
.creatorhub-theme-dark textarea{background:#202428!important;color:#F1F2EE!important;border-color:#3A4146!important}
.creatorhub-theme-dark input::placeholder,
.creatorhub-theme-dark textarea::placeholder{color:#AAB2AC!important}
.creatorhub-theme-dark .filter-pills button:not(.selected),
.creatorhub-theme-dark .tab-row button:not(.active){background:#202428!important;color:#D7DDD7!important;border-color:#3A4146!important}
.creatorhub-theme-dark .api-status-row,
.creatorhub-theme-dark .api-status-row *{color:#C8CEC8!important}
.creatorhub-theme-dark .metric-label,
.creatorhub-theme-dark .panel-title p,
.creatorhub-theme-dark .page-heading p{color:#B8C0B9!important}
.creatorhub-theme-dark .upgrade-card{background:#202428!important;border-color:#343A3F!important;color:#F1F2EE!important}
.creatorhub-theme-dark .upgrade-card p{color:#B8C0B9!important}
.creatorhub-theme-dark .nav-badge{color:#252A25!important}
`}</style><div className={`mobile-overlay ${mobileOpen?'show':''}`} onClick={()=>setMobileOpen(false)}/><div className={mobileOpen?'mobile-sidebar open':'mobile-sidebar'}><Sidebar active={active} setActive={x=>{setActive(x);setMobileOpen(false)}} collapsed={false} setCollapsed={()=>setMobileOpen(false)} user={user} onLogout={logout}/></div><div className="desktop-sidebar"><Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={logout}/></div><main className={`main-area ${collapsed?'sidebar-collapsed':''}`}><Header user={user} active={active} setActive={setActive} onLogout={logout} theme={theme} onToggleTheme={()=>setTheme(t=>t==="light"?"dark":"light")}/><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="page-content">{user.role==='admin'?<AdminWorkspace active={active} setActive={setActive} user={user}/>:active==='Dashboard'&&user.role==='creator'?<Dashboard user={user} setActive={setActive}/>:active==='Dashboard'?<RoleDashboard user={user} setActive={setActive}/>:<GenericPage active={active} setActive={setActive} user={user}/>}<footer className="app-footer"><span>© {new Date().getFullYear()} CreatorHub</span><span>Content intelligence for creators <span className="footer-dot">✦</span></span></footer></div></main></div>}

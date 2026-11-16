/* App shell: auth gate, sidebar, global filters, routing */
const NAV = [
  ['dashboard', 'Dashboard', 'home', Dashboard], ['content', 'Content', 'film', ContentPage], ['audience', 'Audience', 'users', AudiencePage],
  ['growth', 'Growth & Trends', 'trend', GrowthPage], ['revenue', 'Revenue', 'dollar', RevenuePage], ['integrations', 'Integrations', 'link', IntegrationsPage],
  ['reports', 'Reports', 'file', ReportsPage], ['notifications', 'Notifications', 'bell', NotificationsPage], ['settings', 'Settings', 'gear', SettingsPage],
];
const MANAGERS = ['agency', 'marketing', 'admin'];

function App() {
  const [user, setUser] = useState(null); const [booting, setBooting] = useState(!!API.token);
  const [page, setPage] = useState(location.hash.slice(1) || 'dashboard');
  const [days, setDays] = useState(30); const [creatorId, setCreatorId] = useState(null); const [tick, setTick] = useState(0);
  const [creators, setCreators] = useState([]); const [unread, setUnread] = useState(0); const [t, toast] = useToast();
  const bump = () => setTick(x => x + 1);

  useEffect(() => { API.onLogout = () => setUser(null); if (API.token) API.get('/auth/me').then(u => { setUser(u); if (!location.hash && u.role !== 'creator') setPage('creators'); }).catch(() => API.setToken(null)).finally(() => setBooting(false)); }, []);
  useEffect(() => { location.hash = page; }, [page]);
  useEffect(() => { if (user && MANAGERS.includes(user.role)) API.get('/creators').then(setCreators).catch(() => {}); }, [user]);
  useEffect(() => { if (user) API.get('/notifications').then(n => setUnread(n.filter(x => !x.is_read).length)).catch(() => {}); }, [user, tick, page]);
  useEffect(() => { if (!user) return; const i = setInterval(bump, 60000); return () => clearInterval(i); }, [user]);

  if (booting) return html`<${Loading}/>`;
  if (!user) return html`<${AuthPage} onAuth=${(r) => { API.setToken(r.access_token); setUser(r.user); setPage(r.user.role === 'creator' ? 'dashboard' : 'creators'); }}/>`;

  const isMgr = MANAGERS.includes(user.role);
  let items = [...NAV];
  if (isMgr) items.splice(1, 0, ['creators', 'Creators', 'users', CreatorsPage]);
  if (user.role === 'admin') items.push(['admin', 'Admin', 'shield', AdminPage]);
  const cur = items.find(i => i[0] === page) || items[0]; const Page = cur[3];
  const viewing = creators.find(c => c.id === creatorId);
  const showFilters = ['dashboard', 'content', 'audience', 'growth', 'revenue', 'reports'].includes(cur[0]);
  const logout = () => { API.setToken(null); setUser(null); setCreatorId(null); };
  const ctx = { user, setUser, days, setDays, creatorId, setCreatorId, tick, bump, toast, setPage };

  return html`<${Ctx.Provider} value=${ctx}><div class="app">
    <aside class="side"><div class="brand"><div class="logo"><${Icon} n="zap" c="#fff"/></div>CreatorIQ</div>
      ${items.map(([k, l, i], idx) => html`<${React.Fragment} key=${k}>${k === 'settings' && html`<div class="sep">Account</div>`}${k === 'creators' && html`<div class="sep">Workspace</div>`}
        <button class=${'nav ' + (cur[0] === k ? 'on' : '')} onClick=${() => setPage(k)}><${Icon} n=${i} s=${19}/>${l}${k === 'notifications' && unread > 0 ? html`<span class="dot">${unread}</span>` : ''}</button><//>`)}
      <div class="userbox"><div class="avatar">${user.name[0]}</div><div style=${{ minWidth: 0, flex: 1 }}><div style=${{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>${user.name}</div><div style=${{ color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>${user.role}</div></div>
        <button class="btn ghost sm" title="Sign out" onClick=${logout} style=${{ padding: 8 }}><${Icon} n="out" s=${16}/></button></div></aside>
    <main class="main">
      <div class="mobnav">${items.map(([k, l]) => html`<button key=${k} class=${'nav ' + (cur[0] === k ? 'on' : '')} onClick=${() => setPage(k)}>${l}</button>`)}</div>
      <div class="top"><div><h1>${cur[1]}</h1><div class="sub">${creatorId && viewing ? `Viewing ${viewing.name}'s workspace` : `Hi ${user.name.split(' ')[0]} — here's how your content is performing`}</div></div><div class="spacer"/>
        ${isMgr && creators.length > 0 && html`<select class="inp" style=${{ width: 210 }} value=${creatorId || ''} onChange=${e => setCreatorId(e.target.value ? +e.target.value : null)}><option value="">My workspace</option>${creators.map(c => html`<option key=${c.id} value=${c.id}>👤 ${c.name}</option>`)}</select>`}
        ${showFilters && html`<div class="seg">${[7, 30, 90].map(d => html`<button key=${d} class=${days === d ? 'on' : ''} onClick=${() => setDays(d)}>${d}D</button>`)}</div>`}
        <button class="btn ghost sm" onClick=${bump} title="Refresh"><${Icon} n="refresh" s=${16}/></button></div>
      <${Page} key=${cur[0] + (creatorId || '')}/></main>
    ${t && html`<div class=${'toast ' + (t.err ? 'err' : '')}>${t.err ? '⚠️ ' : '✅ '}${t.msg}</div>`}</div><//>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);

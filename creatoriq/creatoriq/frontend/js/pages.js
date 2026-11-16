/* Pages: Auth, Dashboard, Content, Audience */
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'creator' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e, creds) => {
    e && e.preventDefault(); setErr(''); setBusy(true);
    try { const body = creds || f; const r = mode === 'login' || creds ? await API.post('/auth/login', { email: body.email, password: body.password }) : await API.post('/auth/register', body); onAuth(r); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return html`<div class="auth">
    <div class="hero">
      <div class="orb" style=${{ width: 320, height: 320, background: '#8b5cf6', top: -60, left: -60 }}/><div class="orb" style=${{ width: 260, height: 260, background: '#ec4899', bottom: -40, right: 40, animationDelay: '-4s' }}/>
      <div class="brand" style=${{ padding: 0, position: 'relative' }}><div class="logo"><${Icon} n="zap" c="#fff"/></div>CreatorIQ</div>
      <h1 style=${{ position: 'relative' }}>Know what <span>works.</span><br/>Grow what <span>pays.</span></h1>
      <p style=${{ position: 'relative' }}>One dashboard for every platform. Track performance, understand your audience, forecast growth and monetise smarter — built for creators, agencies and marketing teams.</p>
      <div class="feat" style=${{ position: 'relative' }}>${['📊 Live content analytics', '👥 Audience insights', '🔮 Growth forecasting', '💰 Revenue tracking', '🔗 6 platform integrations', '📄 PDF & Excel reports'].map(x => html`<div key=${x}>${x}</div>`)}</div>
    </div>
    <div class="formwrap"><form class="formcard" onSubmit=${submit}>
      <h2>${mode === 'login' ? 'Welcome back 👋' : 'Create your account'}</h2>
      <p style=${{ color: 'var(--muted)', marginBottom: 22, fontSize: 14 }}>${mode === 'login' ? 'Sign in to your analytics workspace.' : 'Start tracking your content in under a minute.'}</p>
      ${mode === 'register' && html`<div class="field"><label>Full name</label><input class="inp" value=${f.name} onInput=${set('name')} required placeholder="Alex Rivera"/></div>`}
      <div class="field"><label>Email</label><input class="inp" type="email" value=${f.email} onInput=${set('email')} required placeholder="you@example.com"/></div>
      <div class="field"><label>Password</label><input class="inp" type="password" value=${f.password} onInput=${set('password')} required minLength="6" placeholder="••••••••"/></div>
      ${mode === 'register' && html`<div class="field"><label>I am a…</label><select class="inp" value=${f.role} onChange=${set('role')}><option value="creator">Creator</option><option value="agency">Agency</option><option value="marketing">Marketing Team</option></select></div>`}
      ${err && html`<div class="tag red" style=${{ display: 'block', marginBottom: 12, padding: 10, borderRadius: 10 }}>${err}</div>`}
      <button class="btn" style=${{ width: '100%', justifyContent: 'center' }} disabled=${busy}>${busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p style=${{ textAlign: 'center', marginTop: 18, color: 'var(--muted)', fontSize: 14 }}>${mode === 'login' ? 'New here? ' : 'Already registered? '}<span class="link" onClick=${() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>${mode === 'login' ? 'Create an account' : 'Sign in'}</span></p>
      ${mode === 'login' && html`<div class="demo" onClick=${() => submit(null, { email: 'demo@creatoriq.com', password: 'demo123' })}>⚡ <b>Try the demo</b> — one click login as a creator with 90 days of data. Agency: agency@creatoriq.com / demo123 · Admin: admin@creatoriq.com / admin123</div>`}
    </form></div></div>`;
}

function Dashboard() {
  const { data: d, loading, error } = useApi('/dashboard/overview');
  const [liveVals, setLive] = useState(null);
  const { creatorId, tick } = useContext(Ctx);
  useEffect(() => { // real-time polling
    let on = true; const poll = () => API.get('/dashboard/live' + (creatorId ? `?creator_id=${creatorId}` : '')).then(r => on && setLive(r)).catch(() => {});
    poll(); const t = setInterval(poll, 5000); return () => { on = false; clearInterval(t); };
  }, [creatorId]);
  if (loading) return html`<${Loading}/>`; if (error) return html`<${Empty} text=${error}/>`;
  const k = d.kpis; if (!d.series.length) return html`<${Empty}/>`;
  const labels = d.series.map(s => day(s.date));
  return html`<div class="grid" style=${{ gap: 22 }}>
    <div class="grid g4">
      <${Kpi} label="Total followers" value=${fmt(k.followers.value)} change=${k.followers.change} icon="users" color="#8b5cf6"/>
      <${Kpi} label="Content views" value=${fmt(k.views.value)} change=${k.views.change} icon="eye" color="#ec4899"/>
      <${Kpi} label="Engagement rate" value=${k.engagement.value} suffix="%" change=${k.engagement.change} pts=${true} icon="heart" color="#f59e0b"/>
      <${Kpi} label="Revenue" value=${money(k.revenue.value)} change=${k.revenue.change} icon="dollar" color="#22c55e"/>
      <${Kpi} label="Reach" value=${fmt(k.reach.value)} change=${k.reach.change} icon="trend" color="#06b6d4"/>
      <${Kpi} label="Impressions" value=${fmt(k.impressions.value)} icon="bar" color="#3b82f6"/>
      <${Kpi} label="Posts published" value=${k.posts.value} change=${k.posts.change} icon="film" color="#a855f7"/>
      <${Kpi} label="Watch time (hrs)" value=${fmt(k.watch_time.value)} change=${k.watch_time.change} icon="clock" color="#f97316"/>
    </div>
    <div class="grid g21">
      <${Card} title="Audience growth & impressions" hint="Followers (left) vs daily impressions (right)" right=${html`<span class="pill"><span class="live-dot"/> Live</span>`}>
        <${Graph} data=${{ labels, datasets: [lineDs('Followers', d.series.map(s => s.followers), '#8b5cf6'), lineDs('Impressions', d.series.map(s => s.impressions), '#06b6d4', false, { yAxisID: 'y1' })] }}
          options=${{ scales: { x: scalesNoGrid.x, y: { ticks: { callback: fmt } }, y1: { position: 'right', grid: { display: false }, ticks: { callback: fmt } } } }}/><//>
      <${Card} title="Real-time pulse" hint="Last 3 days of posts · updates every 5s">
        ${liveVals ? html`<div class="grid" style=${{ gap: 14, marginTop: 6 }}>${[['Views', liveVals.views, '#ec4899', 'eye'], ['Likes', liveVals.likes, '#f59e0b', 'heart'], ['Comments', liveVals.comments, '#06b6d4', 'film'], ['Shares', liveVals.shares, '#22c55e', 'trend']].map(([l, v, c, i]) => html`
          <div key=${l} class="row" style=${{ justifyContent: 'space-between' }}><div class="row"><div class="ic" style=${{ background: c, width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center' }}><${Icon} n=${i} s=${17} c="#fff"/></div><span style=${{ color: 'var(--muted)' }}>${l}</span></div><b style=${{ fontSize: 22, fontFamily: 'Space Grotesk' }}>${num(v)}</b></div>`)}</div>` : html`<${Loading}/>`}
      <//>
    </div>
    <div class="grid g3">
      <${Card} title="Views by platform"><${Graph} type="doughnut" small=${true} data=${{ labels: d.by_platform.map(p => p.platform), datasets: [{ data: d.by_platform.map(p => p.views), backgroundColor: d.by_platform.map(p => (PLAT[p.platform] || [])[0] || '#8b5cf6'), borderWidth: 0 }] }} options=${{ cutout: '68%', plugins: { legend: { position: 'bottom' } } }}/><//>
      <${Card} title="Revenue by source"><${Graph} type="bar" small=${true} data=${{ labels: d.revenue_by_source.map(r => r.source), datasets: [{ data: d.revenue_by_source.map(r => r.amount), backgroundColor: PALETTE, borderRadius: 8 }] }} options=${{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: money } } } }}/><//>
      <${Card} title="Platform engagement rate"><${Graph} type="bar" small=${true} data=${{ labels: d.by_platform.map(p => p.platform), datasets: [{ data: d.by_platform.map(p => p.er), backgroundColor: d.by_platform.map(p => (PLAT[p.platform] || [])[0]), borderRadius: 8 }] }} options=${{ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { y: { grid: { display: false } }, x: { ticks: { callback: v => v + '%' } } } }}/><//>
    </div>
    <${Card} title="🏆 Top performing content" hint="Best posts in the selected period">
      <${ContentTable} rows=${d.top_content}/><//></div>`;
}

function ContentTable({ rows, selectable, selected, toggle }) {
  if (!rows.length) return html`<${Empty} text="No posts match."/>`;
  return html`<div class="scroll"><table class="tbl"><thead><tr>${selectable && html`<th/>`}<th>#</th><th>Title</th><th>Platform</th><th>Type</th><th>Published</th><th>Views</th><th>Likes</th><th>Comments</th><th>Shares</th><th>ER</th></tr></thead><tbody>
    ${rows.map((r, i) => html`<tr key=${r.id}>${selectable && html`<td><input type="checkbox" checked=${selected.includes(r.id)} onChange=${() => toggle(r.id)}/></td>`}
      <td><div class="rank">${i + 1}</div></td><td style=${{ maxWidth: 280, fontWeight: 600 }}>${r.title}</td>
      <td><span class="row" style=${{ gap: 8 }}><${PlatBadge} p=${r.platform} s=${24}/>${r.platform}</span></td><td><span class="tag">${r.type}</span></td><td>${day(r.published_at)}</td>
      <td><b>${num(r.views)}</b></td><td>${num(r.likes)}</td><td>${num(r.comments)}</td><td>${num(r.shares)}</td>
      <td><span class=${'tag ' + (r.er > 9 ? 'green' : r.er > 6 ? 'amber' : 'pink')}>${r.er}%</span></td></tr>`)}</tbody></table></div>`;
}

function ContentPage() {
  const [f, setF] = useState({ platform: '', type: '', search: '', sort: 'views' });
  const [sel, setSel] = useState([]); const [cmp, setCmp] = useState(null);
  const qs = `/content?platform=${f.platform}&type=${f.type}&search=${encodeURIComponent(f.search)}&sort=${f.sort}`;
  const { data, loading } = useApi(qs); const { data: sm } = useApi('/content/summary');
  const { toast } = useContext(Ctx);
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s);
  const compare = async () => { try { setCmp(await API.get(`/content/compare?ids=${sel.join(',')}`)); } catch (e) { toast(e.message, true); } };
  const metrics = ['views', 'likes', 'comments', 'shares', 'saves', 'reach'];
  return html`<div class="grid" style=${{ gap: 22 }}>
    <div class="grid g2">
      <${Card} title="Weekly views & engagement rate">${sm ? html`<${Graph} small=${true} data=${{ labels: sm.weekly.map(w => w.week), datasets: [{ type: 'bar', label: 'Views', data: sm.weekly.map(w => w.views), backgroundColor: '#8b5cf6aa', borderRadius: 6, yAxisID: 'y' }, lineDs('ER %', sm.weekly.map(w => w.er), '#ec4899', false, { yAxisID: 'y1' })] }} options=${{ scales: { y: { ticks: { callback: fmt } }, y1: { position: 'right', grid: { display: false } }, x: { grid: { display: false } } } }}/>` : html`<${Loading}/>`}<//>
      <${Card} title="Format performance" hint="Average views per post type">${sm ? html`<${Graph} type="bar" small=${true} data=${{ labels: sm.by_type.map(t => t.type), datasets: [{ label: 'Avg views', data: sm.by_type.map(t => t.avg_views), backgroundColor: PALETTE, borderRadius: 8 }] }} options=${{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: fmt } } } }}/>` : html`<${Loading}/>`}<//>
    </div>
    <${Card} title="Content performance" hint="Filter, sort and select up to 5 posts to compare" right=${html`<button class="btn" disabled=${sel.length < 2} onClick=${compare}>Compare ${sel.length || ''} selected</button>`}>
      <div class="row" style=${{ marginBottom: 16 }}>
        <input class="inp" style=${{ maxWidth: 260 }} placeholder="🔍 Search title or #hashtag" value=${f.search} onInput=${e => setF({ ...f, search: e.target.value })}/>
        <select class="inp" style=${{ maxWidth: 160 }} value=${f.platform} onChange=${e => setF({ ...f, platform: e.target.value })}><option value="">All platforms</option>${Object.keys(PLAT).map(p => html`<option key=${p}>${p}</option>`)}</select>
        <select class="inp" style=${{ maxWidth: 160 }} value=${f.type} onChange=${e => setF({ ...f, type: e.target.value })}><option value="">All types</option>${(data?.types || []).map(t => html`<option key=${t}>${t}</option>`)}</select>
        <select class="inp" style=${{ maxWidth: 170 }} value=${f.sort} onChange=${e => setF({ ...f, sort: e.target.value })}>${['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'watch_time', 'date'].map(s => html`<option key=${s} value=${s}>Sort: ${s.replace('_', ' ')}</option>`)}</select></div>
      ${loading ? html`<${Loading}/>` : html`<${ContentTable} rows=${data.items} selectable=${true} selected=${sel} toggle=${toggle}/>`}<//>
    ${cmp && html`<${Card} title="⚖️ Content comparison" right=${html`<button class="btn ghost sm" onClick=${() => setCmp(null)}>Close</button>`}>
      <div class="grid g2"><${Graph} type="bar" small=${true} data=${{ labels: metrics, datasets: cmp.map((c, i) => ({ label: c.title.slice(0, 28), data: metrics.map(m => c[m]), backgroundColor: PALETTE[i], borderRadius: 5 })) }} options=${{ scales: { y: { ticks: { callback: fmt } } } }}/>
      <${Graph} type="radar" small=${true} data=${{ labels: ['Likes/view', 'Comments/view', 'Shares/view', 'Saves/view', 'Reach/view'], datasets: cmp.map((c, i) => ({ label: c.title.slice(0, 28), data: [c.likes / c.views * 100, c.comments / c.views * 1000, c.shares / c.views * 1000, c.saves / c.views * 1000, c.reach / c.views * 100], borderColor: PALETTE[i], backgroundColor: PALETTE[i] + '33' })) }} options=${{ scales: { r: { grid: { color: 'rgba(255,255,255,.08)' }, ticks: { display: false } } } }}/></div><//>`}
  </div>`;
}

function AudiencePage() {
  const { data: g, loading } = useApi('/audience/growth'); const { data: dm } = useApi('/audience/demographics', { range: false });
  if (loading || !dm) return html`<${Loading}/>`; if (!g.daily.length) return html`<${Empty}/>`;
  const plats = [...new Set(g.daily.map(r => r.platform))], dates = [...new Set(g.daily.map(r => r.date))];
  const series = (key) => plats.map(p => lineDs(p, dates.map(d => (g.daily.find(r => r.date === d && r.platform === p) || {})[key]), (PLAT[p] || [])[0], false));
  const pie = (cat, cols = PALETTE) => ({ labels: dm[cat].map(x => x.label), datasets: [{ data: dm[cat].map(x => x.value), backgroundColor: cols, borderWidth: 0 }] });
  const hours = dm.hour || [], max = Math.max(...hours.map(h => h.value));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return html`<div class="grid" style=${{ gap: 22 }}>
    <div class="grid g4">${g.summary.map(s => html`<div class="card" key=${s.platform}><div class="row"><${PlatBadge} p=${s.platform}/><div><div style=${{ color: 'var(--muted)', fontSize: 13 }}>${s.platform}</div><div class="val" style=${{ font: "700 26px 'Space Grotesk'" }}>${fmt(s.followers)}</div></div></div>
      <span class=${'chg ' + (s.gained >= 0 ? 'up' : 'down')} style=${{ marginTop: 14 }}>${s.gained >= 0 ? '▲' : '▼'} ${num(Math.abs(s.gained))} (${s.pct}%)</span></div>`)}</div>
    <div class="grid g2"><${Card} title="Follower growth" hint="By platform"><${Graph} data=${{ labels: dates.map(day), datasets: series('followers') }} options=${{ scales: scalesNoGrid }}/><//>
      <${Card} title="Impressions & reach" hint="Daily audience exposure"><${Graph} data=${{ labels: dates.map(day), datasets: [lineDs('Impressions', dates.map(d => g.daily.filter(r => r.date === d).reduce((a, r) => a + r.impressions, 0)), '#06b6d4'), lineDs('Reach', dates.map(d => g.daily.filter(r => r.date === d).reduce((a, r) => a + r.reach, 0)), '#ec4899')] }} options=${{ scales: scalesNoGrid }}/><//></div>
    <div class="grid g4">
      <${Card} title="Age"><${Graph} type="doughnut" small=${true} data=${pie('age')} options=${{ cutout: '62%', plugins: { legend: { position: 'bottom' } } }}/><//>
      <${Card} title="Gender"><${Graph} type="pie" small=${true} data=${pie('gender', ['#3b82f6', '#ec4899', '#a855f7'])} options=${{ plugins: { legend: { position: 'bottom' } } }}/><//>
      <${Card} title="Top locations"><${Graph} type="bar" small=${true} data=${{ labels: dm.country.map(x => x.label), datasets: [{ data: dm.country.map(x => x.value), backgroundColor: '#8b5cf6', borderRadius: 6 }] }} options=${{ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { y: { grid: { display: false } }, x: { ticks: { callback: v => v + '%' } } } }}/><//>
      <${Card} title="Devices"><${Graph} type="doughnut" small=${true} data=${pie('device', ['#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e'])} options=${{ cutout: '62%', plugins: { legend: { position: 'bottom' } } }}/><//></div>
    <div class="grid g2"><${Card} title="🕒 Active hours" hint="When your audience is online (darker = busier)"><div style=${{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 6 }}>${hours.map(h => html`<div key=${h.label} title=${h.label + ':00 · ' + h.value + '%'} style=${{ padding: '14px 0', textAlign: 'center', fontSize: 11, borderRadius: 8, background: `rgba(139,92,246,${.12 + h.value / max * .88})`, fontWeight: 600 }}>${h.label}</div>`)}</div><//>
      <${Card} title="Engagement by weekday" hint="Average engagement rate of posts"><${Graph} type="bar" small=${true} data=${{ labels: dm.engagement_by_weekday.map(x => DOW[x.dow]), datasets: [{ data: dm.engagement_by_weekday.map(x => x.er), backgroundColor: '#ec4899', borderRadius: 8 }] }} options=${{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => v + '%' } } } }}/><//></div></div>`;
}

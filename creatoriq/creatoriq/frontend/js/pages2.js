/* Pages: Growth, Revenue, Integrations, Notifications, Reports, Settings, Creators, Admin */
function GrowthPage() {
  const { data: fc, loading } = useApi('/growth/forecast', { range: false });
  const { data: tags } = useApi('/growth/hashtags'); const { data: rec } = useApi('/growth/recommendations', { range: false });
  const [horizon, setH] = useState('followers');
  if (loading || !tags || !rec) return html`<${Loading}/>`;
  if (!fc.followers.history.length) return html`<${Empty} text="No data yet — open a creator from the Creators page, or connect a platform."/>`;
  const f = fc[horizon], labels = [...f.history.map(x => day(x.date)), ...f.forecast.map(x => day(x.date))];
  const hist = f.history.map(x => x.v), pad = Array(hist.length - 1).fill(null);
  const trendIcon = { rising: ['▲ Rising', 'green'], falling: ['▼ Falling', 'red'], steady: ['● Steady', 'amber'] };
  const lastV = hist[hist.length - 1], endV = f.forecast.length ? f.forecast[f.forecast.length - 1].v : 0;
  return html`<div class="grid" style=${{ gap: 22 }}>
    <div class="grid g21">
      <${Card} title="🔮 Forecast" hint="Linear-regression projection for the next 30 days" right=${html`<div class="seg">${['followers', 'reach'].map(k => html`<button key=${k} class=${horizon === k ? 'on' : ''} onClick=${() => setH(k)}>${k}</button>`)}</div>`}>
        <${Graph} data=${{ labels, datasets: [lineDs('History', [...hist, ...Array(f.forecast.length).fill(null)], '#8b5cf6'), lineDs('Forecast', [...pad, lastV, ...f.forecast.map(x => x.v)], '#ec4899', false, { borderDash: [7, 6] })] }} options=${{ scales: scalesNoGrid }}/>
        <div class="row" style=${{ marginTop: 12 }}><span class="pill">Now: <b>${fmt(lastV)}</b></span><span class="pill">In 30 days: <b>${fmt(endV)}</b></span><span class=${'tag ' + (endV >= lastV ? 'green' : 'red')}>${endV >= lastV ? '▲' : '▼'} ${lastV ? Math.abs(((endV - lastV) / lastV * 100)).toFixed(1) : 0}%</span></div><//>
      <${Card} title="💡 Smart recommendations" hint="From your own performance data"><div class="grid" style=${{ gap: 12 }}>${rec.tips.map(t => html`<div class="tip" key=${t.title}><div class="ic"><${Icon} n=${t.icon === 'trend' ? 'trend' : t.icon} c="#fff"/></div><div><b>${t.title}</b><div style=${{ color: 'var(--muted)', fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>${t.text}</div></div></div>`)}</div><//>
    </div>
    <${Card} title="# Hashtag analysis" hint="Average views, engagement and momentum (recent half vs earlier half of the period)">
      ${tags.length ? html`<div class="grid g2"><${Graph} type="bar" small=${true} data=${{ labels: tags.slice(0, 8).map(t => t.tag), datasets: [{ data: tags.slice(0, 8).map(t => t.avg_views), backgroundColor: PALETTE, borderRadius: 8 }] }} options=${{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: fmt } } } }}/>
        <div class="scroll" style=${{ maxHeight: 260 }}><table class="tbl"><thead><tr><th>Hashtag</th><th>Uses</th><th>Avg views</th><th>ER</th><th>Trend</th></tr></thead><tbody>${tags.slice(0, 12).map(t => html`<tr key=${t.tag}><td><b>${t.tag}</b></td><td>${t.uses}</td><td>${num(t.avg_views)}</td><td>${t.er}%</td><td><span class=${'tag ' + trendIcon[t.trend][1]}>${trendIcon[t.trend][0]}</span></td></tr>`)}</tbody></table></div></div>` : html`<${Empty}/>`}<//></div>`;
}

function RevenuePage() {
  const { data: s, loading, reload } = useApi('/revenue/summary'); const { data: deals, reload: rd } = useApi('/revenue/deals', { range: false });
  const { user, toast, creatorId } = useContext(Ctx);
  const [f, setF] = useState({ source: 'Sponsorship', brand: '', platform: 'YouTube', amount: '', date: new Date().toISOString().slice(0, 10), status: 'Pending' });
  const own = !creatorId || creatorId === user.id;
  const add = async (e) => { e.preventDefault(); try { await API.post('/revenue/deals', { ...f, amount: +f.amount }); toast('Deal added'); setF({ ...f, brand: '', amount: '' }); reload(); rd(); } catch (x) { toast(x.message, true); } };
  const status = async (id, st) => { await API.put(`/revenue/deals/${id}/status?status=${st}`); rd(); reload(); };
  const del = async (id) => { await API.del(`/revenue/deals/${id}`); rd(); reload(); };
  if (loading || !deals) return html`<${Loading}/>`;
  const stc = { Paid: 'green', Pending: 'amber', Overdue: 'red' };
  return html`<div class="grid" style=${{ gap: 22 }}>
    <div class="grid g4"><${Kpi} label="Revenue (period)" value=${money(s.total)} change=${s.change} icon="dollar" color="#22c55e"/><${Kpi} label="Avg sponsorship" value=${money(s.avg_deal)} icon="zap" color="#8b5cf6"/><${Kpi} label="RPM (per 1k views)" value=${'$' + s.rpm} icon="eye" color="#06b6d4"/><${Kpi} label=${s.pending.n + ' pending payments'} value=${money(s.pending.s)} icon="clock" color="#f59e0b"/></div>
    <div class="grid g21"><${Card} title="Monthly revenue trend"><${Graph} data=${{ labels: s.monthly.map(m => m.month), datasets: [{ type: 'bar', label: 'Revenue', data: s.monthly.map(m => m.amount), backgroundColor: '#22c55eaa', borderRadius: 8 }, lineDs('Trend', s.monthly.map(m => m.amount), '#ec4899', false, { pointRadius: 4 })] }} options=${{ scales: { x: { grid: { display: false } }, y: { ticks: { callback: money } } } }}/><//>
      <${Card} title="💡 Financial insights"><div class="grid" style=${{ gap: 10 }}>${s.insights.map(i => html`<div class="tip" key=${i}><div style=${{ fontSize: 14, lineHeight: 1.5 }}>${i}</div></div>`)}</div><//></div>
    <div class="grid g2"><${Card} title="By source"><${Graph} type="doughnut" small=${true} data=${{ labels: s.by_source.map(x => x.source), datasets: [{ data: s.by_source.map(x => x.amount), backgroundColor: PALETTE, borderWidth: 0 }] }} options=${{ cutout: '62%', plugins: { legend: { position: 'right' } } }}/><//>
      <${Card} title="By platform"><${Graph} type="bar" small=${true} data=${{ labels: s.by_platform.map(x => x.platform), datasets: [{ data: s.by_platform.map(x => x.amount), backgroundColor: s.by_platform.map(x => (PLAT[x.platform] || [])[0]), borderRadius: 8 }] }} options=${{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: money } } } }}/><//></div>
    ${own && html`<${Card} title="➕ Track a sponsorship / payment"><form class="row" onSubmit=${add} style=${{ alignItems: 'flex-end' }}>
      ${[['source', 'Source', ['Sponsorship', 'Ad Revenue', 'Affiliate', 'Brand Collaboration', 'Subscription']], ['platform', 'Platform', Object.keys(PLAT)], ['status', 'Status', ['Pending', 'Paid', 'Overdue']]].map(([k, l, o]) => html`<div class="field" key=${k} style=${{ margin: 0 }}><label>${l}</label><select class="inp" value=${f[k]} onChange=${e => setF({ ...f, [k]: e.target.value })}>${o.map(x => html`<option key=${x}>${x}</option>`)}</select></div>`)}
      <div class="field" style=${{ margin: 0 }}><label>Brand</label><input class="inp" value=${f.brand} onInput=${e => setF({ ...f, brand: e.target.value })} placeholder="Brand name"/></div>
      <div class="field" style=${{ margin: 0 }}><label>Amount ($)</label><input class="inp" type="number" min="1" step="any" required value=${f.amount} onInput=${e => setF({ ...f, amount: e.target.value })}/></div>
      <div class="field" style=${{ margin: 0 }}><label>Date</label><input class="inp" type="date" required value=${f.date} onChange=${e => setF({ ...f, date: e.target.value })}/></div>
      <button class="btn">Add</button></form><//>`}
    <${Card} title="Transactions" hint="Latest earnings, sponsorships and collaborations"><div class="scroll" style=${{ maxHeight: 420 }}><table class="tbl"><thead><tr><th>Date</th><th>Source</th><th>Platform</th><th>Brand</th><th>Amount</th><th>Status</th>${own && html`<th/>`}</tr></thead><tbody>
      ${deals.slice(0, 60).map(d => html`<tr key=${d.id}><td>${day(d.date)}</td><td><span class="tag">${d.source}</span></td><td>${d.platform}</td><td>${d.brand || '—'}</td><td><b>${money(d.amount)}</b></td>
        <td><span class=${'tag ' + stc[d.status]}>${d.status}</span></td>${own && html`<td class="row">${d.status !== 'Paid' && html`<button class="btn ghost sm" onClick=${() => status(d.id, 'Paid')}>Mark paid</button>`}<button class="btn danger sm" onClick=${() => del(d.id)}>✕</button></td>`}</tr>`)}</tbody></table></div><//></div>`;
}

function IntegrationsPage() {
  const { data, loading, reload } = useApi('/integrations', { range: false }); const { toast, bump } = useContext(Ctx);
  const [busy, setBusy] = useState('');
  const run = async (key, fn, msg) => { setBusy(key); try { const r = await fn(); toast(msg(r)); reload(); bump(); } catch (e) { toast(e.message, true); } setBusy(''); };
  if (loading) return html`<${Loading}/>`;
  return html`<div class="grid" style=${{ gap: 22 }}>
    <${Card} title="🔗 Connected platforms" hint="API-based collection runs automatically every few minutes" right=${html`<button class="btn" disabled=${busy === 'all'} onClick=${() => run('all', () => API.post('/integrations/sync'), r => `Sync complete · ${r.new_posts} new posts`)}><${Icon} n="refresh" s=${16}/>${busy === 'all' ? 'Syncing…' : 'Sync all now'}</button>`}>
      <div class="grid g3">${data.map(p => html`<div class="card" key=${p.platform} style=${{ background: 'rgba(255,255,255,.03)' }}>
        <div class="row"><${PlatBadge} p=${p.platform} s=${48}/><div><b style=${{ fontSize: 17 }}>${p.platform}</b><div style=${{ color: 'var(--muted)', fontSize: 13 }}>${p.connected ? p.handle : 'Not connected'}</div></div><div class="spacer"/><span class=${'tag ' + (p.connected ? 'green' : 'amber')}>${p.connected ? '● Live' : 'Offline'}</span></div>
        ${p.connected ? html`<div class="row" style=${{ margin: '16px 0', justifyContent: 'space-between' }}><div><div style=${{ color: 'var(--muted)', fontSize: 12 }}>Followers</div><b style=${{ fontSize: 20 }}>${fmt(p.followers)}</b></div><div><div style=${{ color: 'var(--muted)', fontSize: 12 }}>Posts</div><b style=${{ fontSize: 20 }}>${p.posts}</b></div><div><div style=${{ color: 'var(--muted)', fontSize: 12 }}>Last sync</div><b style=${{ fontSize: 14 }}>${ago(p.last_sync)}</b></div></div>
          <button class="btn danger sm" onClick=${() => confirm('Disconnect ' + p.platform + ' and remove its data?') && run(p.platform, () => API.del('/integrations/' + p.id), () => p.platform + ' disconnected')}>Disconnect</button>`
        : html`<p style=${{ color: 'var(--muted)', fontSize: 13.5, margin: '14px 0' }}>Authorise CreatorIQ to import posts, audience and earnings.</p><button class="btn sm" disabled=${busy === p.platform} onClick=${() => run(p.platform, () => API.post('/integrations/connect', { platform: p.platform, handle: '' }), r => `${p.platform} connected · ${r.imported_posts} posts imported`)}><${Icon} n="plus" s=${15}/>${busy === p.platform ? 'Connecting…' : 'Connect'}</button>`}</div>`)}</div><//>
    <${Card} title="How the pipeline works"><div class="row" style=${{ justifyContent: 'space-between', gap: 8 }}>${['API connectors', 'Validate & transform', 'Store (SQLite)', 'Analytics engine', 'Dashboards & alerts'].map((s, i, a) => html`<div class="row" key=${s} style=${{ gap: 10 }}><span class="pill" style=${{ background: 'var(--grad)', border: 0 }}>${i + 1}. ${s}</span>${i < a.length - 1 && html`<span style=${{ color: 'var(--muted)' }}>→</span>`}</div>`)}</div><//></div>`;
}

function NotificationsPage() {
  const { data, loading, reload } = useApi('/notifications', { range: false }); const { bump } = useContext(Ctx);
  if (loading) return html`<${Loading}/>`;
  const icon = { success: ['🎉', 'green'], warning: ['⚠️', 'amber'], info: ['🔔', ''] };
  const act = async (fn) => { await fn(); reload(); bump(); };
  return html`<${Card} title="Alerts & notifications" hint="Performance alerts, revenue alerts, weekly report reminders" right=${html`<button class="btn ghost sm" onClick=${() => act(() => API.post('/notifications/read-all'))}><${Icon} n="check" s=${15}/> Mark all read</button>`}>
    ${data.length ? data.map(n => html`<div key=${n.id} class=${'note ' + (n.is_read ? '' : 'unread')}><div style=${{ fontSize: 24 }}>${(icon[n.kind] || icon.info)[0]}</div><div style=${{ flex: 1 }}><b>${n.title}</b><div style=${{ color: 'var(--muted)', fontSize: 13.5, marginTop: 3 }}>${n.message}</div><div style=${{ color: '#6b7099', fontSize: 12, marginTop: 6 }}>${ago(n.created_at)}</div></div>
      ${!n.is_read && html`<button class="btn ghost sm" onClick=${() => act(() => API.post(`/notifications/${n.id}/read`))}>Read</button>`}<button class="btn danger sm" onClick=${() => act(() => API.del('/notifications/' + n.id))}>✕</button></div>`) : html`<${Empty} text="You're all caught up 🎉"/>`}<//>`;
}

function ReportsPage() {
  const { days, creatorId, toast } = useContext(Ctx); const [busy, setBusy] = useState('');
  const items = [['analytics', 'Content Analytics', 'Performance summary and top 25 posts', 'film', '#8b5cf6'], ['audience', 'Audience', 'Follower growth and demographics', 'users', '#06b6d4'],
    ['revenue', 'Revenue', 'Earnings by source and transactions', 'dollar', '#22c55e'], ['growth', 'Growth & Trends', 'Weekly trend and format performance', 'trend', '#ec4899'], ['platform', 'Platform Comparison', 'Posts, views, ER and revenue per platform', 'bar', '#f59e0b']];
  const go = async (k, fmt) => { setBusy(k + fmt); try { await API.download(`/reports/${k}?fmt=${fmt}&days=${days}${creatorId ? '&creator_id=' + creatorId : ''}`); toast('Report downloaded'); } catch (e) { toast(e.message, true); } setBusy(''); };
  return html`<div class="grid g3">${items.map(([k, t, d, i, c]) => html`<div class="card kpi" key=${k} style=${{ '--c': c }}><div class="ic"><${Icon} n=${i} c="#fff"/></div><h3 style=${{ marginTop: 14, fontSize: 18 }}>${t}</h3><p style=${{ color: 'var(--muted)', fontSize: 13.5, margin: '4px 0 16px' }}>${d} · last ${days} days</p>
    <div class="row">${[['pdf', 'PDF'], ['xlsx', 'Excel'], ['csv', 'CSV']].map(([f, l]) => html`<button key=${f} class=${'btn sm ' + (f === 'pdf' ? '' : 'ghost')} disabled=${busy === k + f} onClick=${() => go(k, f)}><${Icon} n="down" s=${14}/>${busy === k + f ? '…' : l}</button>`)}</div></div>`)}</div>`;
}

function SettingsPage() {
  const { user, setUser, toast } = useContext(Ctx);
  const [p, setP] = useState({ name: user.name, bio: user.bio || '', niche: user.niche || '', company: user.company || '' });
  const [s, setS] = useState({ weekly_report: true, email_alerts: true, revenue_alerts: true, ...user.settings });
  const [pw, setPw] = useState({ current: '', new: '' });
  const save = async () => { try { setUser(await API.put('/auth/me', { ...p, settings: s })); toast('Profile saved'); } catch (e) { toast(e.message, true); } };
  const pass = async () => { try { await API.post('/auth/password', pw); toast('Password changed'); setPw({ current: '', new: '' }); } catch (e) { toast(e.message, true); } };
  const Tog = ([k, l]) => html`<label key=${k} class="row" style=${{ padding: '10px 0', cursor: 'pointer', justifyContent: 'space-between' }}>${l}<input type="checkbox" checked=${s[k]} onChange=${e => setS({ ...s, [k]: e.target.checked })} style=${{ width: 20, height: 20, accentColor: '#8b5cf6' }}/></label>`;
  return html`<div class="grid g2">
    <${Card} title="Profile" hint=${`Role: ${user.role} · ${user.email}`}>${[['name', 'Name'], ['niche', 'Niche / category'], ['company', 'Company / agency'], ['bio', 'Bio']].map(([k, l]) => html`<div class="field" key=${k}><label>${l}</label><input class="inp" value=${p[k]} onInput=${e => setP({ ...p, [k]: e.target.value })}/></div>`)}<button class="btn" onClick=${save}>Save changes</button><//>
    <div class="grid" style=${{ alignContent: 'start' }}><${Card} title="Notification preferences">${[['weekly_report', 'Weekly analytics report'], ['email_alerts', 'Performance alerts'], ['revenue_alerts', 'Revenue alerts']].map(Tog)}<button class="btn ghost sm" style=${{ marginTop: 8 }} onClick=${save}>Save preferences</button><//>
      <${Card} title="Change password"><div class="field"><label>Current password</label><input class="inp" type="password" value=${pw.current} onInput=${e => setPw({ ...pw, current: e.target.value })}/></div><div class="field"><label>New password</label><input class="inp" type="password" value=${pw.new} onInput=${e => setPw({ ...pw, new: e.target.value })}/></div><button class="btn" onClick=${pass}>Update password</button><//></div></div>`;
}

function CreatorsPage() {
  const { data, loading } = useApi('/creators', { range: false }); const { setCreatorId, setPage } = useContext(Ctx);
  if (loading) return html`<${Loading}/>`;
  return html`<${Card} title="Creator roster" hint="Open any creator's workspace to review their analytics (agency / marketing / admin only)"><div class="grid g3">
    ${data.map(c => html`<div class="card" key=${c.id} style=${{ background: 'rgba(255,255,255,.03)' }}><div class="row"><div class="avatar">${c.name[0]}</div><div><b>${c.name}</b><div style=${{ color: 'var(--muted)', fontSize: 13 }}>${c.niche || c.email}</div></div></div>
      <div class="row" style=${{ margin: '16px 0', justifyContent: 'space-between' }}><div><div style=${{ color: 'var(--muted)', fontSize: 12 }}>Followers</div><b style=${{ fontSize: 22 }}>${fmt(c.followers)}</b></div><div><div style=${{ color: 'var(--muted)', fontSize: 12 }}>Platforms</div><b style=${{ fontSize: 22 }}>${c.platforms}</b></div></div>
      <button class="btn sm" onClick=${() => { setCreatorId(c.id); setPage('dashboard'); }}>Open dashboard →</button></div>`)}</div><//>`;
}

function AdminPage() {
  const { data, loading, reload } = useApi('/admin/users', { range: false }); const { user, toast } = useContext(Ctx);
  if (loading) return html`<${Loading}/>`;
  const role = async (id, r) => { try { await API.put(`/admin/users/${id}/role?role=${r}`); toast('Role updated'); reload(); } catch (e) { toast(e.message, true); } };
  const del = async (id) => { if (confirm('Delete this user and all their data?')) { await API.del('/admin/users/' + id); reload(); } };
  return html`<${Card} title="🛡️ User management" hint="Role-based access control"><div class="scroll"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th/></tr></thead><tbody>
    ${data.map(u => html`<tr key=${u.id}><td>${u.id}</td><td><b>${u.name}</b></td><td>${u.email}</td><td><select class="inp" style=${{ padding: '6px 10px', width: 150 }} value=${u.role} onChange=${e => role(u.id, e.target.value)}>${['creator', 'agency', 'marketing', 'admin'].map(r => html`<option key=${r}>${r}</option>`)}</select></td><td>${day(u.created_at)}</td>
      <td>${u.id !== user.id && html`<button class="btn danger sm" onClick=${() => del(u.id)}>Delete</button>`}</td></tr>`)}</tbody></table></div><//>`;
}

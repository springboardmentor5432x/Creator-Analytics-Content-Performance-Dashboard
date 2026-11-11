import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase, Building2, CalendarClock, Download, FileDown, FileText, Film,
  Megaphone, Plus, RefreshCw, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { api } from '../api.js';

const TEAM_ROLES = [
  { value: 'agency_owner', label: 'Agency Owner' },
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'campaign_manager', label: 'Campaign Manager' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
];
const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const CAMPAIGN_PLATFORMS = ['YouTube', 'Instagram', 'Facebook', 'X', 'LinkedIn'];
const REPORT_TYPES = [
  { value: 'performance', label: 'Creator performance' },
  { value: 'content', label: 'Content performance' },
  { value: 'audience', label: 'Audience insights' },
  { value: 'growth', label: 'Growth report' },
  { value: 'revenue', label: 'Revenue report' },
  { value: 'campaign', label: 'Campaign performance' },
];
const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
];
const PERIODS = [7, 30, 90];

const roleLabel = (value) => TEAM_ROLES.find((role) => role.value === value)?.label || value;
const statusLabel = (value) => String(value || '').replaceAll('_', ' ');
const fmtMoney = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};
const fmtNumber = (value) => new Intl.NumberFormat('en-IN', { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0);

function PageError({ error, onDismiss }) {
  if (!error) return null;
  return <div className="admin-error" role="alert"><X size={15} />{error}<button className="error-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss error">×</button></div>;
}

/* ==========================================
   TEAM MANAGEMENT
========================================== */

export function AgencyTeamPage({ onToast }) {
  const [data, setData] = useState({ roles: [], members: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', role: 'campaign_manager' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await api.get('/agency/team');
      setData(response);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load the agency team.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const invite = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/agency/team', form);
      setForm({ full_name: '', email: '', role: 'campaign_manager' });
      onToast('Team member added. If they already have a CreatorIQ account they now appear as active.');
      await load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not add the team member.'));
    } finally {
      setSaving(false);
    }
  };

  const patchMember = async (member, changes, message) => {
    setBusyId(member.id);
    setError('');
    try {
      await api.patch(`/agency/team/${member.id}`, changes);
      onToast(message);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not update the team member.');
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.full_name} from the agency team? Their CreatorIQ account is not deleted.`)) return;
    setBusyId(member.id);
    setError('');
    try {
      await api.delete(`/agency/team/${member.id}`);
      onToast('Team member removed.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not remove the team member.');
    } finally {
      setBusyId(null);
    }
  };

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">TEAM</div><h1>Team management</h1><p>Invite colleagues to your agency workspace and scope what each person can operate.</p></div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    <PageError error={error} onDismiss={() => setError('')} />
    <div className="agency-layout">
      <section className="card admin-card">
        <div className="card-header"><div><h3><UserPlus size={16} /> Add a team member</h3><p>Members with an existing CreatorIQ account join immediately; others stay invited until they sign up.</p></div></div>
        <form className="admin-form" onSubmit={invite}>
          <label>Full name<input value={form.full_name} onChange={(event) => updateForm('full_name', event.target.value)} minLength={2} maxLength={120} required placeholder="Person's full name" /></label>
          <label>Email address<input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} required placeholder="person@example.com" /></label>
          <label>Workspace role<select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>
            {TEAM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select></label>
          <button className="primary-button admin-create-button" disabled={saving}>{saving ? 'Adding…' : 'Add team member'} <Plus size={16} /></button>
          <p className="admin-help">Team members use their own login. The agency account is never shared.</p>
        </form>
      </section>
      <section className="card admin-card">
        <div className="card-header"><div><h3><Users size={16} /> Team members</h3><p>{data.members.length} member{data.members.length === 1 ? '' : 's'} in this workspace.</p></div><span className="account-count">{data.members.length}</span></div>
        {loading ? <div className="analytics-loading">Loading team…</div>
          : data.members.length ? <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>MEMBER</th><th>ROLE</th><th>STATUS</th><th aria-label="Actions" /></tr></thead>
            <tbody>{data.members.map((member) => (
              <tr key={member.id}>
                <td><div className="admin-user-cell"><span className="admin-avatar">{(member.full_name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{member.full_name}</strong><span>{member.email}</span></div></div></td>
                <td><select aria-label={`Role for ${member.email}`} value={member.role} disabled={busyId === member.id} onChange={(event) => patchMember(member, { role: event.target.value }, `${member.full_name} is now ${roleLabel(event.target.value)}.`)}>
                  {TEAM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select></td>
                <td><span className={`m2-status ${member.status === 'active' ? 'ready' : member.status === 'deactivated' ? 'needs-setup' : ''}`}>{statusLabel(member.status)}</span></td>
                <td><div className="revenue-row-actions">
                  {member.status === 'active'
                    ? <button className="table-icon-button" disabled={busyId === member.id} onClick={() => patchMember(member, { status: 'deactivated' }, `${member.full_name} deactivated.`)} title="Deactivate member"><X size={15} /></button>
                    : <button className="table-icon-button" disabled={busyId === member.id} onClick={() => patchMember(member, { status: 'active' }, `${member.full_name} reactivated.`)} title="Reactivate member"><RefreshCw size={15} /></button>}
                  <button className="table-icon-button danger" disabled={busyId === member.id} onClick={() => removeMember(member)} title="Remove member"><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          : <div className="analytics-empty">No team members yet. Add your first colleague to start delegating.</div>}
      </section>
    </div>
  </section>;
}

/* ==========================================
   CAMPAIGN MANAGEMENT
========================================== */

const emptyCampaignForm = () => ({
  name: '', brand: '', description: '', start_date: '', end_date: '',
  budget: '', currency: 'INR', platforms: [], objectives: '', status: 'draft',
});

export function AgencyCampaignsPage({ onToast }) {
  const [data, setData] = useState({ campaigns: [], totals: { budget_by_currency: [] } });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(emptyCampaignForm());
  const [assignFor, setAssignFor] = useState(null);

  const load = useCallback(async (filter = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const [campaignResponse, clientResponse] = await Promise.all([
        api.get(`/agency/campaigns${filter ? `?status=${filter}` : ''}`),
        api.get('/workspace/clients'),
      ]);
      setData(campaignResponse.data);
      setClients(clientResponse.data.clients || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => { load(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const togglePlatform = (platform) => setForm((current) => ({
    ...current,
    platforms: current.platforms.includes(platform)
      ? current.platforms.filter((item) => item !== platform)
      : [...current.platforms, platform],
  }));

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyCampaignForm()); };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        budget: form.budget === '' ? 0 : Number(form.budget),
        brand: form.brand || null,
        description: form.description || null,
        objectives: form.objectives || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingId) {
        await api.patch(`/agency/campaigns/${editingId}`, payload);
        onToast('Campaign updated.');
      } else {
        await api.post('/agency/campaigns', payload);
        onToast('Campaign created.');
      }
      closeForm();
      await load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(' ') : (detail || 'Could not save the campaign.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (campaign) => {
    setEditingId(campaign.id);
    setForm({
      name: campaign.name,
      brand: campaign.brand || '',
      description: campaign.description || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      budget: campaign.budget ? String(campaign.budget) : '',
      currency: campaign.currency,
      platforms: campaign.platforms || [],
      objectives: campaign.objectives || '',
      status: campaign.status,
    });
    setFormOpen(true);
  };

  const changeStatus = async (campaign, status) => {
    if (campaign.status === status) return;
    setBusyId(campaign.id);
    setError('');
    try {
      await api.patch(`/agency/campaigns/${campaign.id}`, { status });
      onToast(`Campaign marked ${status}.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not update the campaign.');
    } finally {
      setBusyId(null);
    }
  };

  const removeCampaign = async (campaign) => {
    if (!window.confirm(`Delete the campaign "${campaign.name}"? Creator assignments are removed with it.`)) return;
    setBusyId(campaign.id);
    setError('');
    try {
      await api.delete(`/agency/campaigns/${campaign.id}`);
      onToast('Campaign deleted.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not delete the campaign.');
    } finally {
      setBusyId(null);
    }
  };

  const assignCreator = async (campaign, creatorProfileId) => {
    setBusyId(campaign.id);
    setError('');
    try {
      await api.post(`/agency/campaigns/${campaign.id}/creators`, { creator_profile_id: creatorProfileId });
      onToast('Creator assigned to the campaign.');
      setAssignFor(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not assign the creator.');
    } finally {
      setBusyId(null);
    }
  };

  const removeAssignment = async (campaign, assignment) => {
    if (!window.confirm(`Remove ${assignment.creator_name} from "${campaign.name}"?`)) return;
    setBusyId(campaign.id);
    setError('');
    try {
      await api.delete(`/agency/campaigns/${campaign.id}/creators/${assignment.assignment_id}`);
      onToast('Creator removed from the campaign.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not remove the assignment.');
    } finally {
      setBusyId(null);
    }
  };

  const totals = data.totals || {};
  const budgetRows = totals.budget_by_currency || [];

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">CAMPAIGNS</div><h1>Campaigns</h1><p>Organize brand work, assign approved creators, and track real performance where consent allows it.</p></div>
      <div className="m3-actions">
        <select className="m2-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter campaigns by status">
          <option value="">All statuses</option>
          {CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
        <button className="primary-button" onClick={() => { setEditingId(null); setForm(emptyCampaignForm()); setFormOpen(true); }}><Plus size={16} />New campaign</button>
      </div>
    </div>
    <PageError error={error} onDismiss={() => setError('')} />

    {formOpen && <section className="card revenue-form-card">
      <div className="card-header"><div><h3><Megaphone size={17} />{editingId ? 'Edit campaign' : 'New campaign'}</h3><p>Budgets and dates are workspace records; performance figures come only from creator-approved analytics.</p></div>
        <button className="icon-button" onClick={closeForm} aria-label="Close campaign form"><X size={16} /></button></div>
      <form className="revenue-form campaign-form" onSubmit={submit}>
        <label>Campaign name<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} minLength={2} maxLength={160} required placeholder="e.g. Autumn product launch" /></label>
        <label>Brand / client<input value={form.brand} onChange={(event) => updateForm('brand', event.target.value)} maxLength={160} placeholder="e.g. Nova Foods" /></label>
        <label>Budget<input type="number" min="0" step="0.01" value={form.budget} onChange={(event) => updateForm('budget', event.target.value)} placeholder="0.00" /></label>
        <label>Currency<input value={form.currency} maxLength={3} onChange={(event) => updateForm('currency', event.target.value.toUpperCase())} required /></label>
        <label>Start date<input type="date" value={form.start_date} onChange={(event) => updateForm('start_date', event.target.value)} /></label>
        <label>End date<input type="date" value={form.end_date} onChange={(event) => updateForm('end_date', event.target.value)} /></label>
        <label>Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
          {CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select></label>
        <fieldset className="campaign-platforms">
          <legend>Target platforms</legend>
          {CAMPAIGN_PLATFORMS.map((platform) => (
            <label key={platform} className="checkbox-pill">
              <input type="checkbox" checked={form.platforms.includes(platform)} onChange={() => togglePlatform(platform)} />
              <span>{platform}</span>
            </label>
          ))}
        </fieldset>
        <label className="revenue-note">Description<textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} maxLength={2000} rows={3} placeholder="What this campaign delivers" /></label>
        <label className="revenue-note">Objectives<textarea value={form.objectives} onChange={(event) => updateForm('objectives', event.target.value)} maxLength={2000} rows={2} placeholder="e.g. Reach 500K views in the 25-34 segment" /></label>
        <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create campaign'} <Briefcase size={16} /></button>
        {editingId && <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>}
      </form>
    </section>}

    {budgetRows.length > 0 && <div className="revenue-currency-strip" aria-label="Planned budget by currency">
      {budgetRows.map((row) => <span key={row.currency} className="revenue-currency-chip static"><span>{row.currency} planned budget</span><strong>{fmtMoney(row.amount, row.currency)}</strong></span>)}
    </div>}

    {loading ? <div className="analytics-loading">Loading campaigns…</div>
      : data.campaigns.length ? <div className="campaign-list">
        {data.campaigns.map((campaign) => (
          <article className="card campaign-card" key={campaign.id}>
            <div className="campaign-head">
              <div className="campaign-title">
                <strong>{campaign.name}</strong>
                <small>{campaign.brand || 'No brand set'} · {fmtMoney(campaign.budget, campaign.currency)} · {campaign.creator_count} creator{campaign.creator_count === 1 ? '' : 's'}</small>
                {campaign.start_date && <small><CalendarClock size={12} /> {campaign.start_date}{campaign.end_date ? ` → ${campaign.end_date}` : ''}</small>}
              </div>
              <div className="campaign-head-actions">
                <select className={`m2-filter-select campaign-status ${campaign.status}`} value={campaign.status} disabled={busyId === campaign.id} onChange={(event) => changeStatus(campaign, event.target.value)} aria-label={`Status for ${campaign.name}`}>
                  {CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
                <button className="table-icon-button" onClick={() => setAssignFor(assignFor === campaign.id ? null : campaign.id)} disabled={busyId === campaign.id} title="Assign a creator"><UserPlus size={15} /></button>
                <button className="table-icon-button" onClick={() => startEdit(campaign)} title="Edit campaign"><Film size={15} /></button>
                <button className="table-icon-button danger" onClick={() => removeCampaign(campaign)} disabled={busyId === campaign.id} title="Delete campaign"><Trash2 size={15} /></button>
              </div>
            </div>
            {campaign.platforms.length > 0 && <div className="campaign-platform-tags">{campaign.platforms.map((platform) => <span key={platform} className="subtle-pill">{platform}</span>)}</div>}
            {assignFor === campaign.id && <div className="assign-strip">
              {clients.length ? clients.map((client) => (
                <button key={client.access_id} className="checkbox-pill assign-pill" onClick={() => assignCreator(campaign, client.creator_profile_id)} disabled={busyId === campaign.id}>
                  <Users size={14} /><span>{client.name}</span>
                </button>
              )) : <span className="analytics-empty">No approved creator workspaces yet. Request access from Creator access first.</span>}
            </div>}
            {campaign.creators.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>CREATOR</th><th>STATUS</th><th>VIEWS</th><th>ENGAGEMENTS</th><th>ENG. RATE</th><th aria-label="Actions" /></tr></thead>
              <tbody>{campaign.creators.map((assignment) => (
                <tr key={assignment.assignment_id}>
                  <td><strong>{assignment.creator_name}</strong></td>
                  <td>{statusLabel(assignment.status)}</td>
                  {assignment.performance_available ? <>
                    <td>{fmtNumber(assignment.views ?? 0)}</td>
                    <td>{fmtNumber(assignment.engagements ?? 0)}</td>
                    <td>{campaign.performance?.engagement_rate != null ? `${campaign.performance.engagement_rate}%` : 'N/A'}</td>
                  </> : <>
                    <td colSpan={2}><span className="m2-status needs-setup">Consent not granted for content metrics</span></td>
                    <td>N/A</td>
                  </>}
                  <td><div className="revenue-row-actions">
                    <button className="table-icon-button danger" onClick={() => removeAssignment(campaign, assignment)} disabled={busyId === campaign.id} title="Remove assignment"><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>}
            {campaign.creators.length === 0 && <div className="analytics-empty">No creators assigned yet. Use the assign button to add an approved creator workspace.</div>}
          </article>
        ))}
      </div>
      : <div className="card analytics-empty campaign-empty">No campaigns{statusFilter ? ` with status "${statusLabel(statusFilter)}"` : ''} yet. Create your first campaign to organize creator work.</div>}
  </section>;
}

/* ==========================================
   AUTHORIZED CONTENT
========================================== */

export function AgencyContentPage() {
  const [days, setDays] = useState(30);
  const [platform, setPlatform] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('views');
  const [sortDir, setSortDir] = useState('desc');

  const query = `/agency/content?days=${days}` +
    (platform ? `&platform=${encodeURIComponent(platform)}` : '') +
    (creatorId ? `&creator_profile_id=${creatorId}` : '');
  const [data, setData] = useState({ authorized_creators: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await api.get(query);
      setData(response);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load authorized content.');
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((dir) => (dir === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const rows = useMemo(() => {
    let items = [...(data.posts || [])];
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((post) => post.title.toLowerCase().includes(term) || post.creator_name.toLowerCase().includes(term));
    items.sort((a, b) => {
      const left = a[sortKey]; const right = b[sortKey];
      const leftValue = left == null ? -1 : left;
      const rightValue = right == null ? -1 : right;
      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        return sortDir === 'desc'
          ? String(rightValue).localeCompare(String(leftValue))
          : String(leftValue).localeCompare(String(rightValue));
      }
      return sortDir === 'desc' ? rightValue - leftValue : leftValue - rightValue;
    });
    return items;
  }, [data.posts, search, sortKey, sortDir]);

  const columns = [
    { key: 'title', label: 'CONTENT' },
    { key: 'creator_name', label: 'CREATOR' },
    { key: 'platform', label: 'PLATFORM' },
    { key: 'views', label: 'VIEWS' },
    { key: 'engagements', label: 'ENGAGEMENTS' },
    { key: 'engagement_rate', label: 'ENG. RATE' },
  ];

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">CONTENT</div><h1>Content</h1><p>Performance across every creator workspace that granted the content permission.</p></div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    <PageError error={error} onDismiss={() => setError('')} />
    <div className="m2-toolbar">
      <div className="segmented-control">{PERIODS.map((value) => (
        <button key={value} className={days === value ? 'selected' : ''} onClick={() => setDays(value)}>{value} days</button>
      ))}</div>
      <select className="m2-filter-select" value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filter by platform">
        <option value="">All platforms</option>
        {CAMPAIGN_PLATFORMS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select className="m2-filter-select" value={creatorId} onChange={(event) => setCreatorId(event.target.value)} aria-label="Filter by creator">
        <option value="">All authorized creators</option>
        {(data.authorized_creators || []).map((creator) => (
          <option key={creator.creator_profile_id} value={creator.creator_profile_id}>{creator.name}</option>
        ))}
      </select>
      <input className="m2-filter-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content or creators…" aria-label="Search content" />
    </div>
    <section className="card m2-card">
      <div className="card-header"><div><h3>Authorized content performance</h3><p>Only creators with granted content permission are included; unavailable metrics show N/A.</p></div><span className="account-count">{rows.length}</span></div>
      {loading ? <div className="analytics-loading">Loading content…</div>
        : rows.length ? <div className="m2-table-wrap">
          <table className="content-table m2-table">
            <thead><tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button type="button" className={`table-sort ${sortKey === column.key ? 'active' : ''}`} onClick={() => toggleSort(column.key)}>
                    {column.label}{sortKey === column.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
              <th>PUBLISHED</th>
            </tr></thead>
            <tbody>{rows.map((post) => (
              <tr key={post.id}>
                <td><div className="m2-post-title"><strong>{post.title}</strong>{post.post_url && <a href={post.post_url} target="_blank" rel="noreferrer">Open post ↗</a>}</div></td>
                <td>{post.creator_name}</td>
                <td>{post.platform}</td>
                <td>{post.views == null ? 'N/A' : fmtNumber(post.views)}</td>
                <td>{post.engagements == null ? 'N/A' : fmtNumber(post.engagements)}</td>
                <td>{post.engagement_rate == null ? 'N/A' : `${post.engagement_rate}%`}</td>
                <td className="admin-date">{post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        : <div className="analytics-empty">No authorized creator content for this filter. Creators must approve the content permission first.</div>}
    </section>
  </section>;
}

/* ==========================================
   AGENCY REPORTS
========================================== */

export function AgencyReportsPage({ onToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ report_type: 'performance', format: 'pdf', days: 30 });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await api.get('/agency/reports');
      setReports(response.reports || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load agency reports.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const createReport = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { data: report } = await api.post('/agency/reports/generate', form);
      setReports((current) => [report, ...current]);
      onToast('Agency report ready to download.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not generate the report.');
    } finally {
      setCreating(false);
    }
  };

  const download = async (report) => {
    if (!report.download_url) { setError('This report is not available for download yet.'); return; }
    setDownloadingId(report.id);
    setError('');
    try {
      const response = await api.get(report.download_url, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      const disposition = response.headers['content-disposition'] || '';
      anchor.download = disposition.match(/filename="?([^";]+)"?/)?.[1] || `creatoriq-agency-report.${report.format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      onToast('Report download started.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not download the report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteReport = async (report) => {
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/agency/reports/${report.id}`);
      setReports((current) => current.filter((item) => item.id !== report.id));
      onToast('Report deleted.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not delete the report.');
    }
  };

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">REPORTING</div><h1>Reports</h1><p>Aggregate only the creator data your approved collaborations authorize.</p></div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    <PageError error={error} onDismiss={() => setError('')} />
    <div className="agency-layout">
      <section className="card admin-card">
        <div className="card-header"><div><h3><FileDown size={16} /> Generate a report</h3><p>Reports respect each creator's granted permissions; unauthorized sections are excluded.</p></div></div>
        <form className="admin-form" onSubmit={createReport}>
          <label>Report type<select value={form.report_type} onChange={(event) => updateForm('report_type', event.target.value)}>
            {REPORT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select></label>
          <label>File format<select value={form.format} onChange={(event) => updateForm('format', event.target.value)}>
            {FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
          </select></label>
          <label>Time range<select value={form.days} onChange={(event) => updateForm('days', Number(event.target.value))}>
            {PERIODS.map((period) => <option key={period} value={period}>Last {period} days</option>)}
          </select></label>
          <button className="primary-button admin-create-button" disabled={creating}>{creating ? 'Generating…' : 'Generate report'} <FileDown size={16} /></button>
        </form>
      </section>
      <section className="card admin-card">
        <div className="card-header"><div><h3><FileText size={16} /> Generated reports</h3><p>{reports.length} report{reports.length === 1 ? '' : 's'} in this workspace.</p></div><span className="account-count">{reports.length}</span></div>
        {loading ? <div className="analytics-loading">Loading reports…</div>
          : reports.length ? <div className="report-list">
            {reports.map((report) => (
              <article className="report-row" key={report.id}>
                <div className="report-row-title">
                  <span className="report-file-icon"><FileText size={17} /></span>
                  <div><strong>{report.title}</strong><small>{statusLabel(report.report_type)} · last {report.days} days</small></div>
                </div>
                <span className="format-pill">{report.format.toUpperCase()}</span>
                <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleDateString('en-IN')}</time>
                <div className="revenue-row-actions">
                  <button className="report-download-button" onClick={() => download(report)} disabled={!report.download_url || downloadingId === report.id}>
                    {downloadingId === report.id ? 'Preparing…' : 'Download'} <Download size={14} />
                  </button>
                  <button className="table-icon-button danger" onClick={() => deleteReport(report)} title="Delete report"><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
          : <div className="analytics-empty">No agency reports yet. Generate one to export approved creator summaries.</div>}
      </section>
    </div>
  </section>;
}

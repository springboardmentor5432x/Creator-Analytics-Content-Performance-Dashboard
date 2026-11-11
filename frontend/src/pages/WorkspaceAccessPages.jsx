import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, Building2, Check, Clock3, Link2, Plus, RefreshCw, ShieldCheck, Users, X,
} from 'lucide-react';
import { api } from '../api.js';

const statusLabel = (value) => String(value || '').replaceAll('_', ' ');

function AccessStatus({ status }) {
  return <span className={`access-status ${status}`}>{statusLabel(status)}</span>;
}

/* ==========================================
   CREATOR SHARED ACCESS
========================================== */

export function CreatorSharingPage({ onToast }) {
  const [catalog, setCatalog] = useState({ permissions: [], default_permissions: [] });
  const [data, setData] = useState({ requests: [] });
  const [overview, setOverview] = useState({ approved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [approvalFor, setApprovalFor] = useState(null);
  const [approvalSelection, setApprovalSelection] = useState([]);
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [editSelection, setEditSelection] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogResponse, requestsResponse, summaryResponse] = await Promise.all([
        api.get('/workspace/permissions'),
        api.get('/workspace/requests'),
        api.get('/workspace/overview'),
      ]);
      setCatalog(catalogResponse.data);
      setData(requestsResponse.data);
      setOverview(summaryResponse.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load shared access.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSelection = (list, setList, key) => setList(
    list.includes(key) ? list.filter((item) => item !== key) : [...list, key],
  );

  const openApproval = (request) => {
    setApprovalFor(request.id);
    const requested = request.requested_permissions || [];
    setApprovalSelection(requested.length ? requested : catalog.default_permissions || []);
  };

  const approve = async (request) => {
    setBusyId(request.id);
    setError('');
    try {
      await api.post(`/workspace/requests/${request.id}/approve`, { permissions: approvalSelection });
      onToast(approvalSelection.length
        ? `Access approved with ${approvalSelection.length} permission${approvalSelection.length === 1 ? '' : 's'}.`
        : 'Access approved. You can revoke it at any time.');
      setApprovalFor(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not approve the request.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request) => {
    if (!window.confirm(`Decline the access request from ${request.collaborator.name}? They will be notified.`)) return;
    setBusyId(request.id);
    setError('');
    try {
      await api.post(`/workspace/requests/${request.id}/reject`);
      onToast('Access request declined.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not decline the request.');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (request) => {
    if (!window.confirm(`Revoke ${request.collaborator.name}'s access immediately? Their workspace view will stop working on the next request.`)) return;
    setBusyId(request.id);
    setError('');
    try {
      await api.post(`/workspace/requests/${request.id}/revoke`);
      onToast('Access revoked. The collaborator can no longer open your workspace.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not revoke access.');
    } finally {
      setBusyId(null);
    }
  };

  const openPermissionEditor = (request) => {
    setEditingPermissions(request.id);
    setEditSelection(request.granted_permissions || []);
  };

  const savePermissions = async (request) => {
    setBusyId(request.id);
    setError('');
    try {
      await api.patch(`/workspace/requests/${request.id}/permissions`, { permissions: editSelection });
      onToast(editSelection.length
        ? 'Permissions updated. The collaborator sees only the selected summaries.'
        : 'All permissions removed. The collaborator workspace is now empty.');
      setEditingPermissions(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not update permissions.');
    } finally {
      setBusyId(null);
    }
  };

  const requestLabel = (key) => catalog.permissions?.find((item) => item.key === key)?.label || key;

  return <section className="workspace-page">
    <div className="m3-heading">
      <div>
        <div className="m2-eyebrow">CREATOR CONTROL</div>
        <h1>Shared access</h1>
        <p>Decide exactly which agency or marketing workspace can see your high-level creator summary.</p>
      </div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    {error && <div className="admin-error"><X size={15} />{error}</div>}

    <div className="access-kpis">
      <article className="card access-kpi"><span><BadgeCheck size={19} /></span><div><small>Approved collaborations</small><strong>{overview.approved || 0}</strong><em>Active, revocable connections</em></div></article>
      <article className="card access-kpi"><span className="blue"><Clock3 size={19} /></span><div><small>Pending requests</small><strong>{overview.pending || 0}</strong><em>Waiting for your decision</em></div></article>
      <article className="card access-kpi"><span className="green"><ShieldCheck size={19} /></span><div><small>Privacy protection</small><strong>Protected</strong><em>No connection is approved automatically</em></div></article>
    </div>

    <section className="card access-list-card">
      <div className="card-header">
        <div>
          <h3><Link2 size={17} />Collaboration requests</h3>
          <p>Approve only the permissions each workspace needs. You can tighten or revoke them at any time.</p>
        </div>
      </div>
      {loading ? <div className="analytics-loading">Loading access requests…</div>
        : data.requests.length ? <div className="access-list">{data.requests.map((request) => (
          <article className="access-row" key={request.id}>
            <div className="access-avatar">{request.collaborator.name.split(/\s+/).map((name) => name[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="access-details">
              <div><strong>{request.collaborator.name}</strong><AccessStatus status={request.status} /></div>
              <span>{request.collaborator.role.replaceAll('_', ' ')} · {request.collaborator.email}</span>
              {request.note && <p>“{request.note}”</p>}
              <div className="access-permission-tags">
                {request.status === 'pending' && (request.requested_permissions || []).map((key) => (
                  <span key={key} className="subtle-pill">requested: {requestLabel(key)}</span>
                ))}
                {request.status === 'approved' && (request.granted_permissions || []).map((key) => (
                  <span key={key} className="subtle-pill">{requestLabel(key)}</span>
                ))}
                {request.status === 'approved' && !request.granted_permissions?.length && (
                  <span className="subtle-pill">legacy summary access</span>
                )}
              </div>
              {request.status === 'approved' && (
                <div className="access-review">
                  <span>Approved {request.decided_at ? new Date(request.decided_at).toLocaleDateString('en-IN') : '—'}</span>
                  {request.last_accessed_at && <span> · Last opened {new Date(request.last_accessed_at).toLocaleString('en-IN')} ({request.access_count} view{request.access_count === 1 ? '' : 's'})</span>}
                  {!request.last_accessed_at && <span> · Never opened by the collaborator</span>}
                </div>
              )}
            </div>
            <div className="access-actions">
              {request.status === 'pending' && approvalFor !== request.id && <>
                <button className="secondary-button" onClick={() => reject(request)} disabled={busyId === request.id}>Decline</button>
                <button className="secondary-button" onClick={() => openApproval(request)}>Review permissions</button>
                <button className="primary-button" onClick={openApproval}><Check size={15} />Approve</button>
              </>}
              {request.status === 'approved' && editingPermissions !== request.id && <>
                <button className="secondary-button" onClick={() => openPermissionEditor(request)}>Edit permissions</button>
                <button className="secondary-button" onClick={() => revoke(request)} disabled={busyId === request.id}>Revoke access</button>
              </>}
              {['rejected', 'revoked', 'cancelled'].includes(request.status) && <span className="access-muted">No active access</span>}
            </div>
            {request.status === 'pending' && approvalFor === request.id && (
              <div className="permission-editor">
                <p>Choose the summaries this workspace may open. You can change this later for an approved collaboration.</p>
                <div className="permission-grid">
                  {catalog.permissions.map((permission) => (
                    <label key={permission.key} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={approvalSelection.includes(permission.key)}
                        onChange={() => toggleSelection(approvalSelection, setApprovalSelection, permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
                <div className="permission-editor-actions">
                  <button className="text-action" onClick={() => setApprovalFor(null)}>Cancel</button>
                  <button className="primary-button" disabled={busyId === request.id} onClick={() => approve(request)}>
                    <Check size={15} />Approve with {approvalSelection.length} permission{approvalSelection.length === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
            )}
            {request.status === 'approved' && editingPermissions === request.id && (
              <div className="permission-editor">
                <p>Update what {request.collaborator.name} can see. Changes take effect on their next request.</p>
                <div className="permission-grid">
                  {catalog.permissions.map((permission) => (
                    <label key={permission.key} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={editSelection.includes(permission.key)}
                        onChange={() => toggleSelection(editSelection, setEditSelection, permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
                <div className="permission-editor-actions">
                  <button className="text-action" onClick={() => setEditingPermissions(null)}>Cancel</button>
                  <button className="primary-button" disabled={busyId === request.id} onClick={() => savePermissions(request)}>
                    <Check size={15} />Save permissions
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}</div>
        : <div className="analytics-empty">No agency or marketing workspace has requested access.</div>}
    </section>
  </section>;
}

/* ==========================================
   COLLABORATOR (AGENCY / MARKETING TEAM) ACCESS
========================================== */

export function CollaboratorWorkspacePage({ role, onToast }) {
  const roleLabel = role === 'agency' ? 'Agency' : 'Marketing team';
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overview, setOverview] = useState({ approved: 0, pending: 0 });
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientData, requestData, summary] = await Promise.all([
        api.get('/workspace/clients'),
        api.get('/workspace/requests'),
        api.get('/workspace/overview'),
      ]);
      setClients(clientData.data.clients || []);
      setRequests(requestData.data.requests || []);
      setOverview(summary.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load creator access.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const requestAccess = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/workspace/requests', { creator_email: email, note: note || null });
      setEmail('');
      setNote('');
      onToast('Access request sent to the Creator.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send access request.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (request) => {
    if (!window.confirm(request.status === 'approved'
      ? `Revoke your approved access to ${request.creator.name}'s workspace?`
      : `Withdraw the pending request to ${request.creator.name}?`)) return;
    try {
      await api.post(`/workspace/requests/${request.id}/revoke`);
      onToast('Access request withdrawn.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not withdraw request.');
    }
  };

  return <section className="workspace-page">
    <div className="m3-heading">
      <div>
        <div className="m2-eyebrow">{roleLabel.toUpperCase()} WORKSPACE</div>
        <h1>Creator access</h1>
        <p>Request consent from creators, then review only the workspace summaries they approve.</p>
      </div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    {error && <div className="admin-error"><X size={15} />{error}</div>}

    <div className="access-kpis">
      <article className="card access-kpi"><span><Users size={19} /></span><div><small>Approved creators</small><strong>{overview.approved || 0}</strong><em>Creator-approved summaries</em></div></article>
      <article className="card access-kpi"><span className="blue"><Clock3 size={19} /></span><div><small>Open requests</small><strong>{overview.pending || 0}</strong><em>Awaiting a Creator decision</em></div></article>
      <article className="card access-kpi"><span className="green"><ShieldCheck size={19} /></span><div><small>Sharing model</small><strong>Consent based</strong><em>Private analytics stay creator-owned</em></div></article>
    </div>

    <div className="collaborator-layout">
      <section className="card access-request-card">
        <div className="card-header"><div><h3><Plus size={17} />Request creator access</h3><p>Use the CreatorIQ email of the creator you want to work with.</p></div></div>
        <form onSubmit={requestAccess} className="access-request-form">
          <label>Creator email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="creator@example.com" required /></label>
          <label>Message (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Explain how you plan to use the approved summary." /></label>
          <button className="primary-button" disabled={saving}>{saving ? 'Sending…' : 'Send request'}<Link2 size={16} /></button>
        </form>
      </section>
      <section className="card access-pending-card">
        <div className="card-header"><div><h3><Clock3 size={17} />Request status</h3><p>Only the Creator can approve access.</p></div></div>
        {loading ? <div className="analytics-loading">Loading requests…</div>
          : requests.length ? <div className="pending-list">{requests.map((request) => (
            <div className="pending-row" key={request.id}>
              <div><strong>{request.creator.name}</strong><span>{request.creator.email}</span></div>
              <AccessStatus status={request.status} />
              {['pending', 'approved'].includes(request.status) && (
                <button className="table-icon-button" onClick={() => revoke(request)} title="Withdraw or revoke" aria-label="Withdraw or revoke request"><X size={15} /></button>
              )}
            </div>
          ))}</div>
          : <div className="analytics-empty">No access requests yet.</div>}
      </section>
    </div>

    <section className="card client-list-card">
      <div className="card-header"><div><h3><Building2 size={17} />Approved creator workspaces</h3><p>These high-level summaries are visible because their owners approved your request.</p></div></div>
      {loading ? <div className="analytics-loading">Loading approved creators…</div>
        : clients.length ? <div className="client-cards">{clients.map((client) => (
          <article className="client-card" key={client.access_id}>
            <div className="client-card-top">
              <span className="client-avatar">{client.name.split(/\s+/).map((name) => name[0]).join('').slice(0, 2).toUpperCase()}</span>
              <div><strong>{client.name}</strong><span>{client.niche}</span></div>
              <AccessStatus status="approved" />
            </div>
            <div className="client-stats">
              <span><strong>{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(client.followers || 0)}</strong>followers</span>
              <span><strong>{client.platforms}</strong>platforms</span>
              <span><strong>{client.content_items}</strong>content items</span>
            </div>
          </article>
        ))}</div>
        : <div className="analytics-empty">Approved creator workspaces will appear here.</div>}
    </section>
  </section>;
}

/* ==========================================
   ADMINISTRATOR ACCESS GOVERNANCE
========================================== */

export function AccessGovernancePage() {
  const [data, setData] = useState({ status_counts: {}, recent_requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response } = await api.get('/workspace/governance');
      setData(response);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load access governance.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const counts = data.status_counts || {};

  return <section className="workspace-page">
    <div className="m3-heading">
      <div>
        <div className="m2-eyebrow">ADMINISTRATION</div>
        <h1>Access governance</h1>
        <p>Review collaboration state without viewing private creator analytics.</p>
      </div>
      <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
    </div>
    {error && <div className="admin-error"><X size={15} />{error}</div>}

    <div className="access-kpis">
      <article className="card access-kpi"><span><BadgeCheck size={19} /></span><div><small>Approved links</small><strong>{counts.approved || 0}</strong><em>Creator-controlled connections</em></div></article>
      <article className="card access-kpi"><span className="blue"><Clock3 size={19} /></span><div><small>Pending links</small><strong>{counts.pending || 0}</strong><em>Waiting for Creator approval</em></div></article>
      <article className="card access-kpi"><span className="green"><ShieldCheck size={19} /></span><div><small>Admin boundary</small><strong>Protected</strong><em>Governance never reveals private metrics</em></div></article>
    </div>

    <section className="card governance-card">
      <div className="card-header"><div><h3><ShieldCheck size={17} />Recent collaboration activity</h3><p>Creator consent remains the only way a collaborator can access a workspace summary.</p></div></div>
      {loading ? <div className="analytics-loading">Loading governance records…</div>
        : data.recent_requests.length ? <div className="admin-table-wrap">
          <table className="admin-table governance-table">
            <thead><tr><th>CREATOR</th><th>COLLABORATOR</th><th>ROLE</th><th>STATUS</th><th>UPDATED</th></tr></thead>
            <tbody>{data.recent_requests.map((request) => (
              <tr key={request.id}>
                <td><strong>{request.creator.name}</strong></td>
                <td>{request.collaborator.name}</td>
                <td>{request.collaborator.role.replaceAll('_', ' ')}</td>
                <td><AccessStatus status={request.status} /></td>
                <td className="admin-date">{new Date(request.updated_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        : <div className="analytics-empty">No collaboration requests have been created.</div>}
    </section>
  </section>;
}

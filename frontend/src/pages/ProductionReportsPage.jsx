import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, CheckCheck, Download, FileCheck2, FileDown, FileText, Pause, Play, Plus, RefreshCw, X } from 'lucide-react';
import { api } from '../api.js';

const types = [
  { value: 'performance', label: 'Performance report' },
  { value: 'revenue', label: 'Revenue report' },
  { value: 'audience', label: 'Audience report' },
];
const formats = [{ value: 'pdf', label: 'PDF' }, { value: 'xlsx', label: 'Excel' }, { value: 'csv', label: 'CSV' }];
const periods = [7, 30, 90];

function selectOption(items, value) { return items.find((item) => item.value === value)?.label || value; }
function periodLabel(days) { return `Last ${days || 30} days`; }
function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-IN', options);
}

export function NotificationsMenu({ onClose, onUnreadChange }) {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/notifications'); setData(response.data); onUnreadChange(response.data.unread_count || 0); }
    catch (err) { setError(err?.response?.data?.detail || 'Could not load notifications.'); }
    finally { setLoading(false); }
  }, [onUnreadChange]);
  useEffect(() => { load(); }, [load]);
  const markAll = async () => { try { await api.post('/notifications/read-all'); await load(); } catch (err) { setError(err?.response?.data?.detail || 'Could not update notifications.'); } };
  const markRead = async (notification) => { if (!notification.is_read) { try { await api.post(`/notifications/${notification.id}/read`); await load(); } catch (err) { setError(err?.response?.data?.detail || 'Could not update this notification.'); } } };
  return (
    <section className="notification-menu" aria-label="Notifications">
      <div className="notification-menu-header">
        <div><strong>Notifications</strong><span>{data.unread_count ? `${data.unread_count} unread` : 'All caught up'}</span></div>
        <button className="icon-button" onClick={onClose} aria-label="Close notifications"><X size={16} /></button>
      </div>
      {error && <div className="notification-error" role="alert">{error}</div>}
      {!loading && data.unread_count > 0 && <button className="mark-all-button" onClick={markAll}><CheckCheck size={15} />Mark all as read</button>}
      <div className="notification-list">
        {loading ? <div className="analytics-loading">Loading alerts…</div>
          : data.notifications.length ? data.notifications.map((notification) => (
            <button key={notification.id} onClick={() => markRead(notification)} className={`notification-item ${notification.is_read ? 'read' : ''}`}>
              <i />
              <span><strong>{notification.title}</strong><small>{notification.message}</small><em>{formatDate(notification.created_at, { month: 'short', day: 'numeric' })}</em></span>
            </button>
          )) : <div className="analytics-empty">No notifications yet.</div>}
      </div>
    </section>
  );
}

export default function ProductionReportsPage({ onToast }) {
  const [reports, setReports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [scheduleAction, setScheduleAction] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [error, setError] = useState('');
  const [reportForm, setReportForm] = useState({ report_type: 'performance', format: 'pdf', days: 30 });
  const [scheduleForm, setScheduleForm] = useState({ report_type: 'performance', format: 'pdf', days: 30, cadence: 'weekly' });

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true); setError('');
    try {
      const [reportResponse, scheduleResponse] = await Promise.all([api.get('/reports'), api.get('/reports/schedules')]);
      setReports(reportResponse.data.reports || []);
      setSchedules(scheduleResponse.data.schedules || []);
    } catch (err) { setError(err?.response?.data?.detail || 'Could not load reports.'); }
    finally { if (!quiet) setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const reportSummary = useMemo(() => `${selectOption(types, reportForm.report_type)} · ${periodLabel(reportForm.days)} · ${selectOption(formats, reportForm.format)}`, [reportForm]);
  const scheduleSummary = useMemo(() => `${selectOption(types, scheduleForm.report_type)} · ${periodLabel(scheduleForm.days)} · ${scheduleForm.cadence}`, [scheduleForm]);
  const updateReport = (field, value) => setReportForm((current) => ({ ...current, [field]: value }));
  const updateSchedule = (field, value) => setScheduleForm((current) => ({ ...current, [field]: value }));

  const createReport = async (event) => {
    event.preventDefault(); setCreating(true); setError('');
    try {
      const { data } = await api.post('/reports/generate', reportForm);
      setReports((current) => [data, ...current]);
      setSelectedReportId(data.id);
      onToast('Report ready to download.');
    } catch (err) { setError(err?.response?.data?.detail || 'Could not create report.'); }
    finally { setCreating(false); }
  };

  const download = async (report) => {
    if (!report.download_url) { setError('This report is not available for download yet.'); return; }
    setDownloadingId(report.id); setError('');
    try {
      const response = await api.get(report.download_url, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      const disposition = response.headers['content-disposition'] || '';
      anchor.download = disposition.match(/filename="?([^";]+)"?/)?.[1] || `creatoriq-report.${report.format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.URL.revokeObjectURL(url);
      onToast('Report download started.');
    } catch (err) { setError(err?.response?.data?.detail || 'Could not download report.'); }
    finally { setDownloadingId(null); }
  };

  const createSchedule = async (event) => {
    event.preventDefault(); setSavingSchedule(true); setError('');
    try {
      const { data } = await api.post('/reports/schedules', scheduleForm);
      setSchedules((current) => [data, ...current]);
      onToast('Report schedule saved.');
    } catch (err) { setError(err?.response?.data?.detail || 'Could not save report schedule.'); }
    finally { setSavingSchedule(false); }
  };

  const toggleSchedule = async (schedule) => {
    setScheduleAction(`toggle-${schedule.id}`); setError('');
    try {
      const { data } = await api.patch(`/reports/schedules/${schedule.id}`, { is_active: !schedule.is_active });
      setSchedules((current) => current.map((item) => item.id === schedule.id ? data : item));
      onToast(data.is_active ? 'Report schedule resumed.' : 'Report schedule paused.');
    } catch (err) { setError(err?.response?.data?.detail || 'Could not update report schedule.'); }
    finally { setScheduleAction(null); }
  };

  const runSchedule = async (schedule) => {
    setScheduleAction(`run-${schedule.id}`); setError('');
    try {
      const { data } = await api.post(`/reports/schedules/${schedule.id}/run`);
      setReports((current) => [data, ...current]);
      setSelectedReportId(data.id);
      await load({ quiet: true });
      onToast('Scheduled report ready to download.');
    } catch (err) { setError(err?.response?.data?.detail || 'Could not run report schedule.'); }
    finally { setScheduleAction(null); }
  };

  const selectedReport = reports.find((report) => report.id === selectedReportId) || reports[0] || null;

  return (
    <section className="m3-page reports-page">
      <div className="m3-heading">
        <div>
          <div className="m2-eyebrow">REPORTING</div>
          <h1>Reports</h1>
          <p>Create export-ready snapshots and keep scheduled deliverables on track.</p>
        </div>
        <button className="secondary-button" onClick={() => load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh
        </button>
      </div>

      {error && <div className="admin-error" role="alert"><X size={15} />{error}</div>}

      <div className="reports-layout">
        <section className="card report-builder">
          <div className="card-header">
            <div>
              <h3><FileDown size={17} />Create a report</h3>
              <p>Choose the coverage and file format for this export.</p>
            </div>
          </div>
          <form className="report-form" onSubmit={createReport} aria-busy={creating}>
            <label>Report type
              <select value={reportForm.report_type} onChange={(event) => updateReport('report_type', event.target.value)}>
                {types.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label>File format
              <select value={reportForm.format} onChange={(event) => updateReport('format', event.target.value)}>
                {formats.map((format) => <option value={format.value} key={format.value}>{format.label}</option>)}
              </select>
            </label>
            <label>Time range
              <select value={reportForm.days} onChange={(event) => updateReport('days', Number(event.target.value))}>
                {periods.map((days) => <option value={days} key={days}>{periodLabel(days)}</option>)}
              </select>
            </label>
            <div className="report-selection" aria-live="polite"><FileCheck2 size={15} /><span>{reportSummary}</span></div>
            <button className="primary-button report-submit" disabled={creating}>
              {creating ? 'Preparing report…' : 'Create report'}<FileDown size={16} />
            </button>
          </form>
        </section>

        <section className="card report-schedule-builder">
          <div className="card-header">
            <div>
              <h3><CalendarClock size={17} />Schedule a report</h3>
              <p>Save a repeatable delivery using the same report settings.</p>
            </div>
          </div>
          <form className="report-form schedule-form" onSubmit={createSchedule} aria-busy={savingSchedule}>
            <label>Report type
              <select value={scheduleForm.report_type} onChange={(event) => updateSchedule('report_type', event.target.value)}>
                {types.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label>File format
              <select value={scheduleForm.format} onChange={(event) => updateSchedule('format', event.target.value)}>
                {formats.map((format) => <option value={format.value} key={format.value}>{format.label}</option>)}
              </select>
            </label>
            <label>Time range
              <select value={scheduleForm.days} onChange={(event) => updateSchedule('days', Number(event.target.value))}>
                {periods.map((days) => <option value={days} key={days}>{periodLabel(days)}</option>)}
              </select>
            </label>
            <label>Frequency
              <select value={scheduleForm.cadence} onChange={(event) => updateSchedule('cadence', event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <div className="report-selection"><CalendarClock size={15} /><span>{scheduleSummary}</span></div>
            <button className="secondary-button schedule-submit" type="submit" disabled={savingSchedule}>
              {savingSchedule ? 'Saving schedule…' : 'Save schedule'}<Plus size={16} />
            </button>
          </form>
        </section>
      </div>

      {selectedReport && (
        <section className="card report-preview">
          <div className="card-header">
            <div>
              <h3><FileText size={17} />Latest report</h3>
              <p>Review the generated snapshot before downloading.</p>
            </div>
            <span className="format-pill">{selectedReport.format.toUpperCase()}</span>
          </div>
          <div className="report-preview-grid">
            <div>
              <strong>{selectedReport.title}</strong>
              <span>{selectOption(types, selectedReport.report_type)} · {periodLabel(selectedReport.days)}</span>
              <time dateTime={selectedReport.created_at}>{formatDate(selectedReport.created_at)}</time>
            </div>
            <button className="report-download-button" onClick={() => download(selectedReport)} disabled={!selectedReport.download_url || downloadingId === selectedReport.id} aria-label={`Download ${selectedReport.title}`}>
              {downloadingId === selectedReport.id ? 'Preparing…' : 'Download'}<Download size={15} />
            </button>
          </div>
        </section>
      )}

      <section className="card reports-table">
        <div className="card-header">
          <div>
            <h3><FileText size={17} />Generated reports</h3>
            <p>Each report retains its selected time range and data snapshot.</p>
          </div>
          <span className="account-count">{reports.length}</span>
        </div>
        {loading ? <div className="analytics-loading">Loading reports…</div>
          : reports.length ? (
            <div className="report-list">
              {reports.map((report) => (
                <article className={`report-row ${selectedReportId === report.id ? 'is-selected' : ''}`} key={report.id} onClick={() => setSelectedReportId(report.id)} style={{ cursor: 'pointer' }}>
                  <div className="report-row-title">
                    <span className="report-file-icon"><FileText size={17} /></span>
                    <div>
                      <strong>{report.title}</strong>
                      <small>{selectOption(types, report.report_type)} · {periodLabel(report.days)}</small>
                    </div>
                  </div>
                  <span className="format-pill">{report.format.toUpperCase()}</span>
                  <time dateTime={report.created_at}>{formatDate(report.created_at)}</time>
                  <span className={`report-ready ${report.status === 'sample' ? 'report-sample' : ''}`}>{report.status}</span>
                  <button className="report-download-button" onClick={(event) => { event.stopPropagation(); download(report); }} disabled={!report.download_url || downloadingId === report.id} aria-label={`Download ${report.title}`}>
                    {downloadingId === report.id ? 'Preparing…' : 'Download'}<Download size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : <div className="analytics-empty report-empty">No reports yet. Create an export when you are ready.</div>}
      </section>

      <section className="card schedules-list">
        <div className="card-header">
          <div>
            <h3><CalendarClock size={17} />Scheduled reports</h3>
            <p>Review delivery timing and run a report whenever you need one.</p>
          </div>
          <span className="account-count">{schedules.length}</span>
        </div>
        {loading ? <div className="analytics-loading">Loading schedules…</div>
          : schedules.length ? (
            <div className="schedule-items">
              {schedules.map((schedule) => (
                <article className={`schedule-item ${schedule.is_active ? '' : 'is-paused'}`} key={schedule.id}>
                  <div className="schedule-main">
                    <strong>{selectOption(types, schedule.report_type)} <span>· {schedule.format.toUpperCase()}</span></strong>
                    <small>{periodLabel(schedule.days)} · {schedule.cadence} · next run {formatDate(`${schedule.next_run_on}T00:00:00`)}</small>
                  </div>
                  <span className={`schedule-state ${schedule.is_active ? 'is-active' : ''}`}>{schedule.is_active ? 'Active' : 'Paused'}</span>
                  <div className="schedule-actions">
                    <button className="table-icon-button" onClick={() => runSchedule(schedule)} disabled={scheduleAction === `run-${schedule.id}`} aria-label={`Run ${schedule.report_type} schedule now`} title="Run now">
                      {scheduleAction === `run-${schedule.id}` ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                    </button>
                    <button className="table-icon-button" onClick={() => toggleSchedule(schedule)} disabled={scheduleAction === `toggle-${schedule.id}`} aria-label={schedule.is_active ? 'Pause schedule' : 'Resume schedule'} title={schedule.is_active ? 'Pause schedule' : 'Resume schedule'}>
                      {scheduleAction === `toggle-${schedule.id}` ? <RefreshCw size={14} className="spin" /> : schedule.is_active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="analytics-empty report-empty">No report schedules yet.</div>}
      </section>
    </section>
  );
}
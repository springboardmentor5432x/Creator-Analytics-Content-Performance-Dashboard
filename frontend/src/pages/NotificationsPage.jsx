import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { api } from '../api.js';

export default function NotificationsPage({ onToast, onUnreadChange, onNavigate }) {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/notifications?limit=100');
      setData(response.data);
      onUnreadChange?.(response.data.unread_count || 0);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      onToast?.('All notifications marked as read.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not update notifications.');
    }
  };

  const markRead = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.post(`/notifications/${notification.id}/read`);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Could not update the notification.');
        return;
      }
    }
    const target = notification.link;
    if (target && target !== 'Notifications' && onNavigate) onNavigate(target);
    else await load();
  };

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">INBOX</div><h1>Notifications</h1><p>Workspace, revenue, report, and access updates from your CreatorIQ activity.</p></div>
      <div className="m3-actions">
        {data.unread_count > 0 && <button className="secondary-button" onClick={markAll}><CheckCheck size={15} />Mark all as read</button>}
        <button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
      </div>
    </div>
    {error && <div className="admin-error" role="alert"><X size={15} />{error}</div>}
    <section className="card notifications-card">
      <div className="card-header">
        <div><h3><Bell size={17} />Your notifications</h3><p>{data.unread_count ? `${data.unread_count} unread notification${data.unread_count === 1 ? '' : 's'}.` : 'You are all caught up.'}</p></div>
        <span className="account-count">{data.notifications.length}</span>
      </div>
      {loading ? <div className="analytics-loading">Loading notifications…</div> : data.notifications.length ? <div className="notification-list notifications-page-list">{data.notifications.map((notification) => <button key={notification.id} onClick={() => markRead(notification)} className={`notification-item ${notification.is_read ? 'read' : ''}`}><i /><span><strong>{notification.title}</strong><small>{notification.message}</small><em>{new Date(notification.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}{notification.link && notification.link !== 'Notifications' ? ` · Open ${notification.link}` : ''}</em></span></button>)}</div> : <div className="analytics-empty">No notifications yet. Access requests, revenue entries, reports, and scheduled exports will appear here.</div>}
    </section>
  </section>;
}

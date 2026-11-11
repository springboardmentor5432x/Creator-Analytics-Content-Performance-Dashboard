import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertCircle, ExternalLink, Facebook, Instagram,
  Linkedin, RefreshCw, ShieldCheck, Unplug, Users, Youtube, AtSign,
} from 'lucide-react';
import { api } from '../api.js';

const icons = { YouTube: Youtube, Instagram, Facebook, LinkedIn: Linkedin, X: AtSign };
const syncPath = { YouTube: 'youtube', Instagram: 'instagram', Facebook: 'facebook', X: 'x', LinkedIn: 'linkedin' };
const fmt = (value) => new Intl.NumberFormat('en-IN', { notation: Number(value || 0) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0);

const providerDetails = {
  youtube: {
    description: 'Sign in with Google to import channel, video, and eligible YouTube Analytics reports.',
    requirements: ['Google OAuth credentials and the YouTube Data API / Analytics API enabled.', 'A Google account added as a test user while the consent screen is in Testing.', 'A YouTube channel that the selected Google account can access.'],
  },
  instagram: {
    description: 'Use Instagram API with Unified Login to import available media and Insights metrics. A Facebook Page is not required.',
    requirements: ['A Meta app owned by a business portfolio, with the Instagram product and an “API setup with Unified login” configuration.', 'A configuration labelled “Instagram Login Compatible”, stored in INSTAGRAM_CONFIG_ID together with INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.', 'An Instagram professional (Creator/Business) account in the same business portfolio that is logging in.', 'The exact Instagram callback URL configured on the backend, saved in the Meta app configuration.'],
  },
  facebook: {
    description: 'Connect a managed Facebook Page to import available Page-post and Insights metrics.',
    requirements: ['A Meta app with Facebook Login enabled. FACEBOOK_OAUTH_CONFIG_ID is optional; if omitted, CreatorIQ requests pages_show_list and pages_read_engagement directly.', 'A Page that the authorising Facebook user manages, using an app Admin/Developer/Tester account during development.', 'The exact Facebook callback URL configured on the backend, registered in the Meta app settings.'],
  },
  x: {
    description: 'Connect with OAuth 2.0 PKCE to import post metrics provided by your X API plan.',
    requirements: ['An X Developer app with OAuth 2.0 and PKCE enabled.', 'Approved users.read, tweet.read, and offline.access scopes.', 'An API plan that permits the requested endpoints and usage.'],
  },
  linkedin: {
    description: 'Connect LinkedIn to import approved member-post and follower analytics.',
    requirements: ['A LinkedIn app with the needed member analytics products approved.', 'The scopes required by the app’s approved products.', 'The exact callback URL registered in LinkedIn Developer settings.'],
  },
};

export default function IntegrationsPage({ onToast }) {
  const [accounts, setAccounts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/integrations/accounts');
      setAccounts((data.accounts || []).filter(
        (account) => account.platform.toLowerCase() !== 'tiktok'
      ));
      setProviders((data.providers || []).filter(
        (provider) => provider.id !== 'tiktok'
      ));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load social accounts. Check that you are signed in.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const connect = async (provider) => {
    setBusy(`connect-${provider.id}`);
    setError('');
    try {
      const { data } = await api.get(`/integrations/${provider.id}/connect`);
      if (!data.authorization_url) throw new Error('Provider did not return an authorization URL.');
      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || `${provider.name} connection could not start.`);
      setBusy('');
    }
  };

  const sync = async (account) => {
    const providerId = syncPath[account.platform];
    if (!providerId) return;
    setBusy(`sync-${account.id}`);
    setError('');
    try {
      const { data } = await api.post(`/integrations/${providerId}/sync/${account.id}`);
      const title = `${account.platform} sync complete: ${data.posts_synced ?? data.videos_synced ?? 0} posts processed.`;
      const warning = data.warnings?.length ? ` Note: ${data.warnings[0]}` : '';
      onToast?.(`${title}${warning}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || `${account.platform} sync failed. Reconnect the account or retry later.`);
    } finally {
      setBusy('');
    }
  };

  const disconnect = async (account) => {
    if (!window.confirm(`Disconnect ${account.platform} account ${account.handle}? Historical metrics will be kept.`)) return;
    setBusy(`disconnect-${account.id}`);
    setError('');
    try {
      await api.delete(`/integrations/accounts/${account.id}`);
      onToast?.('Account disconnected. Historical analytics have been retained.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not disconnect this account.');
    } finally {
      setBusy('');
    }
  };

  const connectedAccounts = accounts.filter((account) => account.is_connected);
  const readyProviderCount = providers.filter(
    (provider) => provider.configured && provider.implementation === 'available'
  ).length;
  const totalFollowers = connectedAccounts.reduce(
    (total, account) => total + Number(account.followers_count || 0),
    0
  );

  return <section className="m2-page">
    <div className="m2-page-heading m2-integrations-heading">
      <div><div className="m2-eyebrow">SOCIAL DATA</div><h1>Connected accounts</h1><p>Manage your connected profiles and the analytics they share with this workspace.</p></div>
      <button className="secondary-button" onClick={load} disabled={loading || Boolean(busy)} aria-label="Refresh connected accounts">
        <RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>

    {error && <div className="m2-error" role="alert"><AlertCircle size={16}/><span>{error}</span></div>}

    <div className="m2-integration-stats" aria-label="Connected account summary">
      <article className="m2-integration-stat">
        <span className="m2-stat-icon connected"><Activity size={17}/></span>
        <div><span>Connected profiles</span><strong>{loading ? '—' : connectedAccounts.length}</strong></div>
      </article>
      <article className="m2-integration-stat">
        <span className="m2-stat-icon available"><ExternalLink size={17}/></span>
        <div><span>Ready to connect</span><strong>{loading ? '—' : readyProviderCount}</strong></div>
      </article>
      <article className="m2-integration-stat">
        <span className="m2-stat-icon audience"><Users size={17}/></span>
        <div><span>Followers across connected profiles</span><strong>{loading ? '—' : fmt(totalFollowers)}</strong></div>
      </article>
    </div>

    <div className="m2-notice"><ShieldCheck size={18}/><div><strong>Your accounts stay in your control</strong><span>OAuth credentials are encrypted and stored by the backend. Disconnecting an account does not remove its historical analytics.</span></div></div>

    <section className="card m2-card m2-connected-card">
      <div className="card-header">
        <div><h3>Your social profiles</h3><p>Connection health and the latest available sync for each profile.</p></div>
        <span className="account-count">{loading ? '—' : accounts.length}</span>
      </div>
      {loading ? <div className="m2-empty" role="status" aria-live="polite"><RefreshCw size={16} className="spin"/>Loading social accounts…</div>
        : accounts.length === 0
          ? <div className="m2-empty m2-empty-action"><div><strong>No social profiles yet</strong><span>Connect a platform below to start importing its available analytics.</span></div><a className="secondary-button" href="#integration-providers">Browse platforms <ExternalLink size={14}/></a></div>
          : <div className="m2-accounts-list">{accounts.map((account) => {
            const Icon = icons[account.platform] || Activity;
            const canSync = Boolean(syncPath[account.platform]) && account.is_connected;
            return <div className="m2-account-row" key={account.id}>
              <span className={`m2-platform-logo ${account.platform.toLowerCase()}-logo`} aria-hidden="true"><Icon size={20}/></span>
              <div className="m2-account-meta">
                <strong>{account.platform}<span className="m2-account-handle">{account.handle}</span></strong>
                <span>{fmt(account.followers_count)} followers <i/> {fmt(account.post_count)} posts</span>
                <small>{account.is_connected
                  ? `Last sync: ${account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : 'Not synced yet'}`
                  : 'Connection unavailable — reconnect this profile to sync again.'}</small>
              </div>
              <span className={`m2-status ${account.is_connected ? 'ready' : 'needs-setup'}`}>{account.is_connected ? 'Connected' : 'Unavailable'}</span>
              <div className="m2-account-actions">
                {canSync && <button className="secondary-button m2-small-button" onClick={() => sync(account)} disabled={Boolean(busy)}>{busy === `sync-${account.id}` ? <><RefreshCw size={14} className="spin"/> Syncing…</> : <><RefreshCw size={14}/> Sync</>}</button>}
                {account.is_connected && <button className="icon-button m2-disconnect" onClick={() => disconnect(account)} disabled={Boolean(busy)} title="Disconnect account" aria-label={`Disconnect ${account.platform}`}><Unplug size={16}/></button>}
              </div>
            </div>;
          })}</div>}
    </section>

    <section className="m2-provider-section" id="integration-providers">
      <div className="m2-subheading m2-provider-heading">
        <div><h2>Connect a platform</h2><p>Choose an account to bring its available insights into your workspace.</p></div>
        <span className="m2-provider-count">{loading ? 'Loading' : `${providers.length} platforms`}</span>
      </div>
      <div className="m2-provider-grid">
      {loading ? <div className="m2-provider-empty" role="status"><RefreshCw size={15} className="spin"/>Loading platforms…</div>
        : providers.length === 0 ? <div className="m2-provider-empty">No platforms are available right now.</div>
        : providers.map((provider) => {
        const Icon = icons[provider.name] || Activity;
        const implemented = provider.implementation === 'available';
        const details = providerDetails[provider.id] || { description: provider.message, requirements: [] };
        return <article className={`m2-provider-card ${provider.id === 'youtube' ? 'm2-provider-primary' : ''}`} key={provider.id}>
          <div className="m2-provider-top">
            <span className={`m2-platform-logo ${provider.id}-logo`} aria-hidden="true"><Icon size={22}/></span>
            <span className={`m2-status ${provider.configured && implemented ? 'ready' : 'needs-setup'}`}>{provider.configured && implemented ? 'Ready to connect' : implemented ? 'Setup required' : 'Not enabled'}</span>
          </div>
          <h2>{provider.name}</h2>
          <p>{details.description}</p>
          {!provider.configured && implemented && <div className="m2-setup-note">{provider.message || 'Provider setup is needed before accounts can be connected.'}</div>}
          {details.requirements.length > 0 && <details className="m2-provider-requirements">
            <summary>View setup requirements</summary>
            <ul>{details.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
          </details>}
          <div className="m2-provider-action">
            {implemented
              ? <button className="primary-button" onClick={() => connect(provider)} disabled={!provider.configured || Boolean(busy)}>{busy === `connect-${provider.id}` ? 'Opening provider…' : `Connect ${provider.name}`} <ExternalLink size={15}/></button>
              : <button className="secondary-button" disabled title="This provider needs a separate connector and approved API access">Not available in this build</button>}
          </div>
        </article>;
        })}
      </div>
    </section>

    <div className="m2-footnote"><strong>Metric availability:</strong> Connectors store provider-returned values only. Daily deltas begin after the first successful sync.</div>
  </section>;
}

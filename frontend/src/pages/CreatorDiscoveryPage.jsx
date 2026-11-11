import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ExternalLink, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { api } from '../api.js';

const fmt = (value) => new Intl.NumberFormat('en-IN', {
  notation: Number(value || 0) >= 100000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(value || 0);

const publicNumber = (value) => value === null || value === undefined ? 'Not public' : fmt(value);

function apiError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).filter(Boolean).join(' ');
  return detail || fallback;
}

function observationLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function CreatorDiscoveryPage({ onToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingTracked, setLoadingTracked] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trackedError, setTrackedError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionError, setActionError] = useState('');
  const trackedRevision = useRef(0);

  const trackedChannelIds = useMemo(() => new Set(tracked.map((creator) => creator.channel_id)), [tracked]);

  const loadTracked = useCallback(async () => {
    const revision = trackedRevision.current;
    setLoadingTracked(true);
    setTrackedError('');
    try {
      const { data } = await api.get('/creators/youtube/tracked');
      const creators = data.creators || [];
      if (revision === trackedRevision.current) setTracked(creators);
      return creators;
    } catch (err) {
      setTrackedError(apiError(err, 'Could not load tracked public creators.'));
      return null;
    } finally {
      setLoadingTracked(false);
    }
  }, []);

  useEffect(() => { loadTracked(); }, [loadTracked]);

  const showDetail = async (creatorId) => {
    if (busy) return;
    setBusy(`detail-${creatorId}`);
    setLoadingDetail(true);
    setDetailError('');
    setActionError('');
    setSelected(null);
    setDetail(null);
    try {
      const { data } = await api.get(`/creators/youtube/tracked/${creatorId}`);
      setDetail(data);
      setSelected(null);
    } catch (err) {
      setDetailError(apiError(err, 'Could not load public creator analytics.'));
    } finally {
      setLoadingDetail(false);
      setBusy('');
    }
  };

  const search = async (event) => {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSelected(null);
      setHasSearched(false);
      setSearchError('Enter at least two characters, a channel handle, or a YouTube channel URL.');
      return;
    }
    setBusy('search');
    setSearchError('');
    setActionError('');
    setHasSearched(true);
    setResults([]);
    setSelected(null);
    setDetail(null);
    try {
      const { data } = await api.get('/creators/youtube/search', { params: { query: term, max_results: 10 } });
      setResults(data.channels || []);
    } catch (err) {
      setSearchError(apiError(err, 'Public YouTube channel search failed.'));
      setResults([]);
    } finally {
      setBusy('');
    }
  };

  const trackCreator = async (channel) => {
    setBusy(`track-${channel.channel_id}`);
    setActionError('');
    try {
      const { data } = await api.post('/creators/youtube/tracked', { channel_id: channel.channel_id });
      trackedRevision.current += 1;
      setTracked((current) => [data, ...current.filter((item) => item.channel_id !== data.channel_id)]);
      setSelected(null);
      setDetail(data);
      setDetailError('');
      onToast?.('Public YouTube creator tracked. The first sync is a baseline snapshot.');
    } catch (err) {
      setActionError(apiError(err, 'Could not track this public creator.'));
    } finally {
      setBusy('');
    }
  };

  const syncCreator = async (creatorId, loadOlder = false) => {
    setBusy(`${loadOlder ? 'more' : 'sync'}-${creatorId}`);
    setActionError('');
    try {
      const path = `/creators/youtube/tracked/${creatorId}/${loadOlder ? 'load-more' : 'sync'}`;
      const { data } = await api.post(path);
      setDetail(data);
      setDetailError('');
      trackedRevision.current += 1;
      setTracked((current) => current.map((creator) => creator.id === creatorId ? { ...creator, ...data } : creator));
      onToast?.(loadOlder ? 'Older public videos loaded.' : 'Public creator refreshed and snapshot recorded.');
    } catch (err) {
      setActionError(apiError(err, 'Public creator sync failed. Retry later.'));
    } finally {
      setBusy('');
    }
  };

  const untrackCreator = async (creator) => {
    if (!window.confirm(`Stop tracking ${creator.title}? Its saved public snapshots and videos will be removed.`)) return;
    setBusy(`remove-${creator.id}`);
    setActionError('');
    try {
      await api.delete(`/creators/youtube/tracked/${creator.id}`);
      trackedRevision.current += 1;
      setTracked((current) => current.filter((item) => item.id !== creator.id));
      if (detail?.id === creator.id) {
        setDetail(null);
        setDetailError('');
      }
      onToast?.('Public creator untracked.');
    } catch (err) {
      setActionError(apiError(err, 'Could not untrack this public creator.'));
    } finally {
      setBusy('');
    }
  };

  const history = (detail?.channel_snapshots || []).map((snapshot) => ({
    ...snapshot,
    label: new Date(snapshot.observed_at).toLocaleDateString(),
  }));

  return <section className="m2-page">
    <div className="m2-page-heading">
      <div><div className="m2-eyebrow">PUBLIC CREATOR TRACKING</div><h1>Creator discovery</h1><p>Find public YouTube channels and compare their public statistics over time.</p></div>
      <button className="secondary-button" onClick={loadTracked} disabled={loadingTracked || Boolean(busy)}><RefreshCw size={15} className={loadingTracked ? 'spin' : ''}/> Refresh list</button>
    </div>

    <div className="m2-notice"><Users size={18}/><div><strong>Public data only</strong><span>Public tracking uses YouTube counters. Private analytics require owner authorization.</span></div></div>

    <section className="card m2-card">
      <div className="card-header"><div><h3>Search public YouTube channels</h3><p>Enter a creator name, @handle, channel URL, or channel ID.</p></div></div>
      <form className="m2-toolbar discovery-search-toolbar" onSubmit={search}>
        <label className="m2-discovery-search">
          <Search size={17} aria-hidden="true"/>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchError(''); setHasSearched(false); setResults([]); setSelected(null); }} maxLength={200} placeholder="Search channels or paste a YouTube channel URL" aria-label="Search public YouTube channels" disabled={Boolean(busy)}/>
        </label>
        <button className="primary-button" type="submit" disabled={Boolean(busy)}>{busy === 'search' ? <><RefreshCw size={15} className="spin"/> Searching…</> : <><Search size={15}/> Search channels</>}</button>
      </form>
      {searchError && <div className="m2-error" role="alert">{searchError}</div>}
      {busy === 'search' && <div className="m2-empty" role="status">Searching public YouTube channels…</div>}
      {!busy && !searchError && hasSearched && results.length === 0 && <div className="m2-empty">No matching public YouTube channels were found. Try a channel name, @handle, URL, or channel ID.</div>}
      {results.length > 0 && <><div className="m2-subheading discovery-results-heading"><h2>Search results</h2><span>{results.length} public channel{results.length === 1 ? '' : 's'}</span></div><div className="m2-accounts-list">{results.map((channel) => {
        const alreadyTracked = trackedChannelIds.has(channel.channel_id);
        const isSelected = selected?.channel_id === channel.channel_id;
        const trackedCreator = tracked.find((creator) => creator.channel_id === channel.channel_id);
        return <article className={`m2-account-row ${isSelected ? 'discovery-result-selected' : ''}`} key={channel.channel_id}>
          {channel.thumbnail_url ? <img className="m2-platform-logo discovery-avatar" src={channel.thumbnail_url} alt="" width="44" height="44" loading="lazy" referrerPolicy="no-referrer"/> : <span className="m2-platform-logo discovery-avatar"><Activity size={20}/></span>}
          <div className="m2-account-meta"><strong>{channel.title}</strong><span>{channel.custom_url || channel.channel_id} · {publicNumber(channel.subscriber_count)} subscribers · {publicNumber(channel.video_count)} public videos</span></div>
          <a className="secondary-button m2-small-button" href={channel.channel_url} target="_blank" rel="noreferrer" aria-label={`Open ${channel.title} on YouTube`}><ExternalLink size={14}/></a>
          {alreadyTracked
            ? <button className="secondary-button m2-small-button" type="button" onClick={() => showDetail(trackedCreator.id)} disabled={Boolean(busy)}>View tracked</button>
            : <button className={isSelected ? 'secondary-button m2-small-button' : 'primary-button m2-small-button'} type="button" onClick={() => { setSelected(isSelected ? null : channel); setDetail(null); setDetailError(''); setActionError(''); }} disabled={Boolean(busy)}>{isSelected ? 'Cancel selection' : 'Select creator'}</button>}
        </article>;
      })}</div></>}
      {selected && <div className="m2-selected-creator">
        <strong>Track {selected.title}?</strong>
        <span>Tracking fetches public channel details and paginated uploads, then stores a timestamped baseline snapshot. It does not grant private analytics access.</span>
        {actionError && <div className="m2-error" role="alert">{actionError}</div>}
        <button className="primary-button" type="button" onClick={() => trackCreator(selected)} disabled={Boolean(busy)}>{busy === `track-${selected.channel_id}` ? <><RefreshCw size={15} className="spin"/> Tracking…</> : <><Users size={15}/> Track creator</>}</button>
      </div>}
      {!selected && actionError && <div className="m2-error" role="alert">{actionError}</div>}
    </section>

    <section className="card m2-card">
      <div className="card-header"><div><h3>Tracked public creators</h3><p>Public YouTube channel data is kept separate from private creator analytics.</p></div><span className="account-count">{tracked.length}</span></div>
      {trackedError && <div className="m2-error" role="alert">{trackedError}</div>}
      {loadingTracked ? <div className="m2-empty" role="status">Loading tracked creators…</div>
        : tracked.length === 0 ? <div className="m2-empty">No public creators are tracked yet. Search for a channel above to begin.</div>
          : <div className="m2-accounts-list">{tracked.map((creator) => <div className="m2-account-row" key={creator.id}>
            {creator.thumbnail_url ? <img className="m2-platform-logo discovery-avatar" src={creator.thumbnail_url} alt="" width="44" height="44" loading="lazy" referrerPolicy="no-referrer"/> : <span className="m2-platform-logo discovery-avatar"><Activity size={20}/></span>}
            <div className="m2-account-meta"><strong>{creator.title}</strong><span>{publicNumber(creator.view_count)} public views · {creator.hidden_subscriber_count ? 'Hidden' : publicNumber(creator.subscriber_count)} subscribers · {creator.last_synced_at ? `Last sync: ${observationLabel(creator.last_synced_at)}` : 'Not synced'}</span></div>
            <span className="m2-status ready">Public data</span>
            <button className="secondary-button m2-small-button" type="button" onClick={() => showDetail(creator.id)} disabled={Boolean(busy)}>{busy === `detail-${creator.id}` ? <><RefreshCw size={14} className="spin"/> Loading…</> : 'Analytics'}</button>
            <button className="secondary-button m2-small-button" type="button" onClick={() => syncCreator(creator.id)} disabled={Boolean(busy)} aria-label={`Sync ${creator.title}`}>{busy === `sync-${creator.id}` ? <><RefreshCw size={14} className="spin"/> Syncing…</> : <><RefreshCw size={14}/> Sync</>}</button>
            <button className="icon-button m2-disconnect" type="button" onClick={() => untrackCreator(creator)} disabled={Boolean(busy)} title="Untrack creator" aria-label={`Untrack ${creator.title}`}><Trash2 size={16}/></button>
          </div>)}</div>}
    </section>

    {loadingDetail && !detail && <div className="card m2-empty" role="status">Loading public creator details…</div>}
    {detailError && !detail && <div className="m2-error" role="alert">{detailError}</div>}

    {detail && <section className="m2-audience-account">
      <div className="m2-subheading">
        <div><h2>{detail.title}</h2><p>{detail.custom_url || detail.channel_id} · Public YouTube data · Last successful sync: {detail.last_synced_at ? observationLabel(detail.last_synced_at) : 'not synced'}</p></div>
        <div className="discovery-detail-actions">
          <button className="secondary-button" type="button" onClick={() => syncCreator(detail.id)} disabled={Boolean(busy)}>{busy === `sync-${detail.id}` ? <><RefreshCw size={14} className="spin"/> Refreshing…</> : <><RefreshCw size={14}/> Refresh public data</>}</button>
          <a className="secondary-button" href={detail.channel_url} target="_blank" rel="noreferrer">Open channel <ExternalLink size={14}/></a>
        </div>
      </div>
      {detailError && <div className="m2-error" role="alert">{detailError}</div>}
      {actionError && <div className="m2-error" role="alert">{actionError}</div>}
      {loadingDetail && <div className="m2-empty" role="status">Loading public creator details…</div>}
      <div className="m2-kpi-grid">
        <article className="m2-kpi"><span>Public channel views</span><strong>{publicNumber(detail.view_count)}</strong><small>Current cumulative counter</small></article>
        <article className="m2-kpi"><span>Subscribers</span><strong>{detail.hidden_subscriber_count ? 'Hidden' : publicNumber(detail.subscriber_count)}</strong><small>Public counter only; hidden values are not estimated</small></article>
        <article className="m2-kpi"><span>Public videos</span><strong>{publicNumber(detail.video_count)}</strong><small>{fmt(detail.videos?.length || 0)} videos stored locally</small></article>
        <article className="m2-kpi"><span>Private analytics</span><strong>Unavailable</strong><small>Owner OAuth analytics are a separate workflow</small></article>
      </div>

      <div className="card m2-card m2-growth-card">
        <div className="card-header"><div><h3>Observed channel snapshots</h3><p>Cumulative public counters at actual sync times; change is not assigned to a specific day.</p></div><span className="subtle-pill">{history.length} observations</span></div>
        {history.length < 2 ? <div className="m2-empty">A second successful sync is required before historical change can be compared.</div>
          : <div className="m2-growth-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
            <defs><linearGradient id="publicViewsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7667f8" stopOpacity={0.2}/><stop offset="100%" stopColor="#7667f8" stopOpacity={0.02}/></linearGradient></defs>
            <CartesianGrid stroke="#edf0f5" vertical={false} strokeDasharray="3 5"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }}/>
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9299a8', fontSize: 11 }} tickFormatter={fmt}/>
            <Tooltip labelFormatter={(_label, items) => items?.[0]?.payload?.observed_at ? observationLabel(items[0].payload.observed_at) : ''} formatter={(value, name) => [publicNumber(value), name === 'view_count' ? 'Channel views' : 'Subscribers']}/>
            <Area type="monotone" dataKey="view_count" name="view_count" stroke="#7667f8" strokeWidth={2.5} fill="url(#publicViewsFill)" connectNulls={false} dot={{ r: 3 }}/>
            {history.some((snapshot) => snapshot.subscriber_count !== null) && <Area type="monotone" dataKey="subscriber_count" name="subscriber_count" stroke="#22c55e" strokeWidth={2} fill="transparent" connectNulls={false} dot={{ r: 3 }}/>}
          </AreaChart></ResponsiveContainer></div>}
        {detail.growth_intervals?.length > 0 && <div className="m2-data-note">{detail.growth_intervals.map((interval) => <div key={`${interval.from_observed_at}-${interval.to_observed_at}`}>{observationLabel(interval.from_observed_at)} → {observationLabel(interval.to_observed_at)}: {interval.view_count_change === null ? 'view change unavailable or counter reset' : `+${fmt(interval.view_count_change)} views`}; {interval.subscriber_count_change === null ? 'subscriber change unavailable or counter reset' : `${interval.subscriber_count_change >= 0 ? '+' : ''}${fmt(interval.subscriber_count_change)} subscribers`}. These are changes between observations, not daily totals.</div>)}</div>}
      </div>

      <div className="card m2-card">
        <div className="card-header"><div><h3>Public videos</h3><p>Public statistics only. Engagement is a proxy: (public likes + comments) ÷ public views.</p></div><div className="discovery-video-actions"><span className="account-count">{detail.videos?.length || 0}</span>{detail.more_videos_available && <button className="secondary-button m2-small-button" type="button" onClick={() => syncCreator(detail.id, true)} disabled={Boolean(busy)}>{busy === `more-${detail.id}` ? <><RefreshCw size={14} className="spin"/> Loading…</> : 'Load older videos'}</button>}</div></div>
        <div className="m2-table-wrap"><table className="content-table m2-table"><thead><tr><th>VIDEO</th><th>PUBLISHED</th><th>VIEWS</th><th>LIKES</th><th>COMMENTS</th><th>PUBLIC ENGAGEMENT PROXY</th></tr></thead><tbody>{(detail.videos || []).map((video) => <tr key={video.video_id}><td><div className="m2-post-title"><strong>{video.title}</strong><a href={video.video_url} target="_blank" rel="noreferrer">Open video ↗</a></div></td><td>{video.published_at ? new Date(video.published_at).toLocaleDateString() : 'N/A'}</td><td>{video.available_metrics?.includes('views') ? publicNumber(video.view_count) : 'N/A'}</td><td>{video.available_metrics?.includes('likes') ? publicNumber(video.like_count) : 'N/A'}</td><td>{video.available_metrics?.includes('comments') ? publicNumber(video.comment_count) : 'N/A'}</td><td>{video.public_engagement_proxy_rate == null ? 'N/A' : `${video.public_engagement_proxy_rate.toFixed(2)}%`}</td></tr>)}</tbody></table>{!detail.videos?.length && <div className="m2-empty">No public videos were available in the uploads playlist.</div>}</div>
        <p className="m2-data-note">Public counters are cumulative snapshots. Watch time, impressions, reach, shares, saves, and demographics require owner-authorized analytics.</p>
      </div>
    </section>}
  </section>;
}

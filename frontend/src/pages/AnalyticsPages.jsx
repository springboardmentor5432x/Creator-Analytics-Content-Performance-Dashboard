
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from '../api.js';
import {
  YouTubePublicContentPanel,
  YouTubePublicAudience,
  YouTubePublicGrowth,
} from './YouTubePublicAnalytics.jsx';

const fmt = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: Number(value || 0) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value || 0);

const fmtTime = (value) => {
  const seconds = Number(value || 0);

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  const minutes = Math.floor(seconds / 60);

  return `${minutes} min${
    seconds % 60 ? ` ${Math.round(seconds % 60)} sec` : ''
  }`;
};

function useLoad(url, reloadKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(url);
      setData(response.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((item) => item.msg).join(' ')
          : detail || 'Could not load analytics. Check the backend and retry.'
      );
    } finally {
      setLoading(false);
    }
  }, [url, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

function PageHeading({
  eyebrow,
  title,
  description,
  onRefresh,
  loading,
}) {
  return (
    <div className="m2-page-heading">
      <div>
        <div className="m2-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <button
        className="secondary-button"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw
          size={15}
          className={loading ? 'spin' : ''}
        />
        Refresh
      </button>
    </div>
  );
}

function StateMessages({ loading, error, data }) {
  if (loading) {
    return <div className="m2-empty">Loading analytics…</div>;
  }

  if (error) {
    return <div className="m2-error">{error}</div>;
  }

  if (!data) {
    return <div className="m2-empty">No response data.</div>;
  }

  return null;
}

const PLATFORM_OPTIONS = [
  'YouTube',
  'Instagram',
  'Facebook',
  'X',
  'LinkedIn',
];

function PlatformFilter({ value, onChange }) {
  return (
    <label
      className="m2-platform-filter"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <span>Platform</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All platforms</option>

        {PLATFORM_OPTIONS.map((platform) => (
          <option key={platform} value={platform}>
            {platform}
          </option>
        ))}
      </select>
    </label>
  );
}

function DataSourceBadge({ data }) {
  const hasConnectedData =
    data?.data_source === 'live' ||
    data?.data_source === 'mixed';

  const hasPublicYouTube = Number(
    data?.public_youtube?.creator_count ||
      data?.public_youtube?.creators?.length ||
      0
  ) > 0;

  const hasLiveData = hasConnectedData || hasPublicYouTube;

  const label = hasPublicYouTube && !hasConnectedData
    ? 'Public YouTube data'
    : hasPublicYouTube
      ? 'Connected + public data'
      : hasConnectedData
        ? 'Live data'
        : 'No live data';

  return (
    <span
      className={`m2-status ${
        hasLiveData ? 'ready' : 'needs-setup'
      }`}
    >
      {label}
    </span>
  );
}

/* ==========================================
   CONTENT ANALYTICS
========================================== */

export function ContentAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const query =
    `/analytics/content?days=${days}&mode=live` +
    (platform
      ? `&platform=${encodeURIComponent(platform)}`
      : '');

  const { data, loading, error, reload } = useLoad(query);

  const totals = data?.totals || {};
  const publicYouTube = data?.public_youtube || {};
  const hasConnectedContent = Boolean(data?.posts?.length);
  const hasPublicYouTube = Number(publicYouTube.creator_count || 0) > 0;

  const postColumns = [
    { key: 'title', label: 'CONTENT' },
    { key: 'platform', label: 'PLATFORM' },
    { key: 'views_period', label: `VIEWS · ${days}D` },
    { key: 'likes_period', label: 'LIKES' },
    { key: 'comments_period', label: 'COMMENTS' },
    { key: 'shares_period', label: 'SHARES' },
    { key: 'saves_period', label: 'SAVES' },
    { key: 'reach_period', label: 'REACH' },
    { key: 'impressions_period', label: 'IMPRESSIONS' },
    { key: 'watch_time_seconds_period', label: 'WATCH TIME' },
    { key: 'engagement_rate', label: 'ENGAGEMENT' },
    { key: 'source', label: 'SOURCE' },
  ];

  const visiblePosts = (() => {
    let posts = [...(data?.posts || [])];
    const term = search.trim().toLowerCase();
    if (term) {
      posts = posts.filter((post) => post.title.toLowerCase().includes(term));
    }
    if (sortKey) {
      posts.sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        if (sortKey === 'title' || sortKey === 'platform' || sortKey === 'source') {
          return sortDir === 'desc'
            ? String(right || '').localeCompare(String(left || ''))
            : String(left || '').localeCompare(String(right || ''));
        }
        const leftValue = left == null ? -1 : Number(left);
        const rightValue = right == null ? -1 : Number(right);
        return sortDir === 'desc' ? rightValue - leftValue : leftValue - rightValue;
      });
    }
    return posts;
  })();

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <section className="m2-page">
      <PageHeading
        eyebrow="CONTENT PERFORMANCE"
        title="Content analytics"
        description="Compare posts and measure actual views, engagement, shares and watch time."
        onRefresh={reload}
        loading={loading}
      />

      <div className="m2-toolbar">
        <div className="segmented-control">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              className={days === value ? 'selected' : ''}
              onClick={() => setDays(value)}
            >
              {value} days
            </button>
          ))}
        </div>

        <PlatformFilter
          value={platform}
          onChange={setPlatform}
        />

        <input
          className="m2-filter-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search content…"
          aria-label="Search content by title"
        />

        <DataSourceBadge data={data} />
      </div>

      <StateMessages
        loading={loading}
        error={error}
        data={data}
      />

      {!loading && !error && data && (
        <>
          {hasConnectedContent && (
            <>
          <div className="m2-kpi-grid">
            <article className="m2-kpi">
              <span>Total views</span>
              <strong>
                {data.metric_availability?.views
                  ? fmt(totals.views)
                  : 'N/A'}
              </strong>
              <small>Selected period</small>
            </article>

            <article className="m2-kpi">
              <span>Likes + comments</span>
              <strong>
                {data.metric_availability?.likes ||
                data.metric_availability?.comments
                  ? fmt(
                      (data.metric_availability?.likes
                        ? totals.likes || 0
                        : 0) +
                      (data.metric_availability?.comments
                        ? totals.comments || 0
                        : 0)
                    )
                  : 'N/A'}
              </strong>
              <small>Reported interactions</small>
            </article>

            <article className="m2-kpi">
              <span>Weighted engagement rate</span>
              <strong>
                {data.metric_availability?.engagement_rate &&
                totals.average_engagement_rate != null
                  ? `${Number(
                      totals.average_engagement_rate
                    ).toFixed(2)}%`
                  : 'N/A'}
              </strong>
              <small>Calculated from available provider metrics</small>
            </article>

            <article className="m2-kpi">
              <span>Watch time</span>
              <strong>
                {data.metric_availability?.watch_time_seconds
                  ? fmtTime(totals.watch_time_seconds)
                  : 'N/A'}
              </strong>
              <small>Available provider data only</small>
            </article>
          </div>

          <div className="card m2-card">
            <div className="card-header">
              <div>
                <h3>Content performance</h3>
                <p>
                  Actual performance for the selected period.
                </p>
              </div>

              <span className="account-count">
                {data.posts?.length || 0}
              </span>
            </div>

            <div className="m2-table-wrap">
              <table className="content-table m2-table">
                <thead>
                  <tr>
                    {postColumns.map((column) => (
                      <th key={column.key}>
                        <button
                          type="button"
                          className={`table-sort ${sortKey === column.key ? 'active' : ''}`}
                          onClick={() => toggleSort(column.key)}
                          aria-label={`Sort by ${column.label}`}
                        >
                          {column.label}
                          {sortKey === column.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visiblePosts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div className="m2-post-title">
                          <strong>{post.title}</strong>

                          {post.post_url && (
                            <a
                              href={post.post_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open post ↗
                            </a>
                          )}
                        </div>
                      </td>

                      <td>{post.platform}</td>

                      <td>
                        {post.metric_availability?.views
                          ? fmt(post.views_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.likes
                          ? fmt(post.likes_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.comments
                          ? fmt(post.comments_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.shares
                          ? fmt(post.shares_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.saves
                          ? fmt(post.saves_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.reach
                          ? fmt(post.reach_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.impressions
                          ? fmt(post.impressions_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.watch_time_seconds
                          ? fmtTime(post.watch_time_seconds_period)
                          : 'N/A'}
                      </td>

                      <td>
                        {post.metric_availability?.engagement_rate &&
                        post.engagement_rate != null
                          ? `${Number(
                              post.engagement_rate
                            ).toFixed(2)}%`
                          : 'N/A'}
                      </td>

                      <td>
                        <span
                          className={`m2-status ${
                            post.source === 'live'
                              ? 'ready'
                              : 'needs-setup'
                          }`}
                        >
                          {post.source === 'live'
                            ? 'Live'
                            : 'Not live'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!data.posts?.length && (
                <div className="m2-empty">
                  No live content is available for this platform yet.
                </div>
              )}

              {data.posts?.length > 0 && !visiblePosts.length && (
                <div className="m2-empty">
                  No content matches “{search}”.
                </div>
              )}
            </div>

            <p className="m2-data-note">
              Unsupported metrics are marked N/A.
              Weighted engagement uses available provider-reported
              interactions and denominators.
            </p>
          </div>
            </>
          )}

          {!hasConnectedContent && !hasPublicYouTube && (
            <div className="card m2-empty">
              No live content is available for this platform yet.
            </div>
          )}

          {hasPublicYouTube && (
            <YouTubePublicContentPanel
              data={publicYouTube}
              onRefresh={reload}
            />
          )}
        </>
      )}
    </section>
  );
}

/* ==========================================
   AUDIENCE ANALYTICS
========================================== */

function Distribution({ title, items, type = 'count' }) {
  const rows = Object.entries(items || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );

  const max = Math.max(
    ...rows.map((row) => Number(row[1] || 0)),
    1
  );

  return (
    <article className="card m2-distribution">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p>
            {type === 'percent'
              ? 'Provider-reported viewer percentage'
              : 'Provider-reported counts'}
          </p>
        </div>
      </div>

      {rows.length ? (
        <div className="m2-bars">
          {rows.slice(0, 10).map(([name, value]) => {
            const numeric = Number(value || 0);

            return (
              <div className="m2-bar-row" key={name}>
                <div>
                  <span>{name}</span>
                  <strong>
                    {type === 'percent'
                      ? `${numeric.toFixed(1)}%`
                      : fmt(numeric)}
                  </strong>
                </div>

                <span className="m2-bar-track">
                  <i
                    style={{
                      width: `${Math.max(
                        2,
                        (numeric / max) * 100
                      )}%`,
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="m2-empty m2-empty-small">
          No live metric available for this account.
        </div>
      )}
    </article>
  );
}

export function AudienceInsightsPage() {
  const [platform, setPlatform] = useState('');

  const query =
    `/analytics/audience?mode=live` +
    (platform
      ? `&platform=${encodeURIComponent(platform)}`
      : '');

  const { data, loading, error, reload } = useLoad(query);

  const accounts = data?.accounts || [];

  return (
    <section className="m2-page">
      <PageHeading
        eyebrow="AUDIENCE"
        title="Audience insights"
        description="Review real follower totals, audience demographics, geography and device insights."
        onRefresh={reload}
        loading={loading}
      />

      <div className="m2-toolbar">
        <PlatformFilter
          value={platform}
          onChange={setPlatform}
        />

        <DataSourceBadge data={data} />
      </div>

      <StateMessages
        loading={loading}
        error={error}
        data={data}
      />

      {!loading && !error && data && (
        <>
          <div className="m2-notice">
            <Users size={18} />

            <div>
              <strong>Provider-specific data availability</strong>
              <span>
                Only actual metrics returned by authorized
                live provider connections are displayed.
                Unsupported metrics are not estimated.
              </span>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="card m2-empty">
              No connected live social accounts were found.
            </div>
          ) : (
            accounts.map((account) => (
              <section
                className="m2-audience-account"
                key={account.account_id}
              >
                <div className="m2-subheading">
                  <div>
                    <h2>
                      {account.platform} · {account.handle}
                    </h2>

                    <p>
                      {fmt(account.followers_count)} followers ·
                      {' '}
                      {account.last_synced_at
                        ? `Last sync: ${new Date(
                            account.last_synced_at
                          ).toLocaleString()}`
                        : 'Not synchronized yet'}
                    </p>
                  </div>

                  <span
                    className={`m2-status ${
                      account.source === 'live'
                        ? 'ready'
                        : 'needs-setup'
                    }`}
                  >
                    {account.source === 'live'
                      ? 'Live'
                      : 'Not connected'}
                  </span>
                </div>

                <div className="m2-distribution-grid">
                  <Distribution
                    title="Age distribution"
                    items={
                      account.available_metrics?.age_distribution
                        ? account.age_distribution
                        : {}
                    }
                    type="percent"
                  />

                  <Distribution
                    title="Gender distribution"
                    items={
                      account.available_metrics?.gender_distribution
                        ? account.gender_distribution
                        : {}
                    }
                    type="percent"
                  />

                  <Distribution
                    title="Geographic location"
                    items={
                      account.available_metrics?.geographic_distribution
                        ? account.geographic_distribution
                        : {}
                    }
                  />

                  <Distribution
                    title="Device usage"
                    items={
                      account.available_metrics?.device_distribution
                        ? account.device_distribution
                        : {}
                    }
                  />

                  <Distribution
                    title="Active hours"
                    items={
                      account.available_metrics?.active_hours
                        ? account.active_hours
                        : {}
                    }
                  />
                </div>

                <div className="m2-availability-row">
                  <span>
                    <strong>Reach:</strong>{' '}
                    {account.available_metrics?.reach
                      ? fmt(account.reach)
                      : 'Not available'}
                  </span>

                  <span>
                    <strong>Impressions:</strong>{' '}
                    {account.available_metrics?.impressions
                      ? fmt(account.impressions)
                      : 'Not available'}
                  </span>

                  <span>
                    <strong>Active hours:</strong>{' '}
                    {account.available_metrics?.active_hours
                      ? 'Available'
                      : 'Not available'}
                  </span>
                </div>
              </section>
            ))
          )}
        </>
      )}

      {/* YouTube public audience information */}
      <YouTubePublicAudience />
    </section>
  );
}

/* ==========================================
   GROWTH & TREND ANALYSIS
========================================== */

function TrendChartCard({
  title,
  description,
  children,
  hasData = true,
}) {
  return (
    <div className="card m2-card m2-growth-card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="m2-growth-chart">
        {hasData
          ? children
          : (
            <div className="m2-empty m2-empty-small">
              No historical live data is available yet.
            </div>
          )}
      </div>
    </div>
  );
}

export function GrowthTrendsPage() {
  const [days, setDays] = useState(30);
  const [platform, setPlatform] = useState('');

  const query =
    `/analytics/growth?days=${days}&mode=live` +
    (platform
      ? `&platform=${encodeURIComponent(platform)}`
      : '');

  const { data, loading, error, reload } = useLoad(query);

  const daily = data?.days || [];

  const totalViews = daily.reduce(
    (sum, day) => sum + Number(day.views ?? 0),
    0
  );

  const netFollowers = daily.reduce(
    (sum, day) =>
      sum +
      Number(day.net_followers ?? 0) +
      Number(day.net_subscribers ?? 0),
    0
  );

  const totalWatchTime = daily.reduce(
    (sum, day) => sum + Number(day.watch_time_seconds ?? 0),
    0
  );

  const hasViews = Boolean(data?.metric_availability?.views);

  const hasFollowerGrowth = Boolean(
    data?.metric_availability?.net_followers ||
    data?.metric_availability?.net_subscribers
  );

  const hasEngagement = Boolean(
    data?.metric_availability?.engagement_rate
  );

  const hasWatchTime = Boolean(
    data?.metric_availability?.watch_time_seconds
  );

  return (
    <section className="m2-page">
      <PageHeading
        eyebrow="GROWTH"
        title="Growth & trends"
        description="Track real content activity, engagement, watch time and follower growth."
        onRefresh={reload}
        loading={loading}
      />

      <div className="m2-toolbar">
        <div className="segmented-control">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              className={days === value ? 'selected' : ''}
              onClick={() => setDays(value)}
            >
              {value} days
            </button>
          ))}
        </div>

        <PlatformFilter
          value={platform}
          onChange={setPlatform}
        />

        <DataSourceBadge data={data} />
      </div>

      <StateMessages
        loading={loading}
        error={error}
        data={data}
      />

      {!loading && !error && data && (
        <>
          <div className="m2-kpi-grid m2-kpi-grid-3">
            <article className="m2-kpi">
              <span>Views in period</span>
              <strong>
                {hasViews ? fmt(totalViews) : 'N/A'}
              </strong>
              <small>Recorded live daily metrics</small>
            </article>

            <article className="m2-kpi">
              <span>Net followers / subscribers</span>
              <strong>
                {hasFollowerGrowth
                  ? `${netFollowers > 0 ? '+' : ''}${fmt(netFollowers)}`
                  : 'N/A'}
              </strong>
              <small>Actual reported gains minus losses</small>
            </article>

            <article className="m2-kpi">
              <span>Watch time</span>
              <strong>
                {hasWatchTime
                  ? fmtTime(totalWatchTime)
                  : 'N/A'}
              </strong>
              <small>Provider-reported history</small>
            </article>
          </div>

          <TrendChartCard
            title="Daily views"
            description="Stored daily views for the selected period."
            hasData={hasViews}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <CartesianGrid
                  stroke="#edf0f5"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={fmt} />
                <Tooltip
                  formatter={(value) => [
                    fmt(value),
                    'Views',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#7667f8"
                  fill="#7667f8"
                  fillOpacity={0.16}
                  strokeWidth={2.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TrendChartCard>

          <TrendChartCard
            title="Follower and subscriber growth"
            description="Actual net follower and subscriber changes."
            hasData={hasFollowerGrowth}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <CartesianGrid
                  stroke="#edf0f5"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={fmt} />
                <Tooltip
                  formatter={(value, name) => [
                    fmt(value),
                    name === 'net_followers'
                      ? 'Followers'
                      : 'Subscribers',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="net_followers"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="net_subscribers"
                  stroke="#06b6d4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TrendChartCard>

          <TrendChartCard
            title="Engagement trend"
            description="Weighted engagement rates from actual metrics."
            hasData={hasEngagement}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <CartesianGrid
                  stroke="#edf0f5"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis dataKey="label" />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value || 0).toFixed(2)}%`,
                    'Engagement rate',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="engagement_rate"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TrendChartCard>

          <TrendChartCard
            title="Watch time"
            description="Daily watch time reported by connected providers."
            hasData={hasWatchTime}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <CartesianGrid
                  stroke="#edf0f5"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={fmtTime} />
                <Tooltip
                  formatter={(value) => [
                    fmtTime(value),
                    'Watch time',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="watch_time_seconds"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.14}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TrendChartCard>

          <div className="m2-insight-grid">
            {(data.insights || []).map((item) => (
              <article className="m2-kpi" key={item.kind}>
                <span>
                  {item.kind === 'top_day'
                    ? 'Top performing day'
                    : 'Views change'}
                </span>

                <strong>
                  {item.kind === 'top_day'
                    ? fmt(item.value)
                    : `${item.value_percent > 0 ? '+' : ''}${item.value_percent}%`}
                </strong>

                <small>{item.label}</small>
              </article>
            ))}

            {!data.insights?.length && (
              <div className="card m2-empty">
                Trend insights will appear after live metrics
                have been synchronized.
              </div>
            )}
          </div>

          <div className="m2-data-note">
            Trends are calculated from stored observations.
            A first snapshot is a baseline, not historical growth.
          </div>
        </>
      )}

      {/* YouTube public historical growth */}
      <YouTubePublicGrowth days={days} />
    </section>
  );
}

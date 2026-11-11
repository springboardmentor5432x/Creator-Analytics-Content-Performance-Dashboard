
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Eye, ThumbsUp, MessageCircle, Users } from 'lucide-react';
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

const formatNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    notation: Number(value) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
};

function useYouTubeData(url) {
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
      setError(
        err?.response?.data?.detail ||
        'Unable to load YouTube analytics. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

function PanelHeading({ title, description, loading, onRefresh }) {
  return (
    <div className="card-header">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw
          size={14}
          className={loading ? 'spin' : ''}
        />
        Refresh
      </button>
    </div>
  );
}

function PanelState({ loading, error, empty, children }) {
  if (loading) {
    return <div className="m2-empty">Loading real YouTube data…</div>;
  }

  if (error) {
    return <div className="m2-error">{error}</div>;
  }

  if (empty) {
    return (
      <div className="m2-empty">
        No tracked YouTube creator data available.
        Track a creator from Creator Discovery first.
      </div>
    );
  }

  return children;
}

/* ------------------------------------------
   YOUTUBE CONTENT ANALYTICS
------------------------------------------ */

export function YouTubePublicContentPanel({
  data,
  loading = false,
  error = '',
  onRefresh,
}) {
  const totals = data?.totals || {};
  const videos = data?.top_videos || [];

  const empty = Boolean(data && data.creator_count === 0);

  return (
    <div className="card m2-card">
      <PanelHeading
        title="YouTube Public Content Analytics"
        description="Actual public channel and video statistics from YouTube Data API."
        loading={loading}
        onRefresh={onRefresh}
      />

      <PanelState
        loading={loading}
        error={error}
        empty={empty}
      >
        {data && (
          <>
              <div className="m2-kpi-grid">
                <article className="m2-kpi">
                  <span>Tracked creators</span>
                  <strong>{formatNumber(data.creator_count)}</strong>
                  <small>Live tracked channels</small>
                </article>

                <article className="m2-kpi">
                  <span>Total public views</span>
                  <strong>
                    {data.metric_availability?.views
                      ? formatNumber(totals.views)
                      : 'N/A'}
                  </strong>
                  <small>Latest cumulative video counters</small>
                </article>

                <article className="m2-kpi">
                  <span>Total likes</span>
                  <strong>
                    {data.metric_availability?.likes
                      ? formatNumber(totals.likes)
                      : 'N/A'}
                  </strong>
                  <small>Publicly available likes</small>
                </article>

                <article className="m2-kpi">
                  <span>Engagement proxy</span>
                  <strong>
                    {totals.average_engagement_rate != null
                      ? `${totals.average_engagement_rate}%`
                      : 'N/A'}
                  </strong>
                  <small>
                    (Likes + comments) / views
                  </small>
                </article>
              </div>

              <div className="card-header">
                <div>
                  <h3>Top-performing YouTube videos</h3>
                  <p>Ranked using actual public lifetime views.</p>
                </div>
                <span className="account-count">
                  {videos.length}
                </span>
              </div>

              <div className="m2-table-wrap">
                <table className="content-table m2-table">
                  <thead>
                    <tr>
                      <th>VIDEO</th>
                      <th>VIEWS</th>
                      <th>LIKES</th>
                      <th>COMMENTS</th>
                      <th>ENGAGEMENT</th>
                    </tr>
                  </thead>

                  <tbody>
                    {videos.map((video) => (
                      <tr key={video.video_id}>
                        <td>
                          <div className="m2-post-title">
                            {video.thumbnail_url && (
                              <img
                                src={video.thumbnail_url}
                                alt=""
                                width="64"
                                loading="lazy"
                              />
                            )}

                            <div>
                              <strong>{video.title}</strong>
                              <a
                                href={video.video_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open video ↗
                              </a>
                            </div>
                          </div>
                        </td>

                        <td>
                          {formatNumber(video.views)}
                        </td>

                        <td>
                          {formatNumber(video.likes)}
                        </td>

                        <td>
                          {formatNumber(video.comments)}
                        </td>

                        <td>
                          {video.engagement_rate != null
                            ? `${video.engagement_rate}%`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!videos.length && (
                  <div className="m2-empty">
                    No public video statistics available.
                  </div>
                )}
              </div>

              <div className="card-header">
                <div>
                  <h3>Hashtag analysis</h3>
                  <p>
                    Hashtag frequency calculated from actual
                    tracked video titles and descriptions.
                  </p>
                </div>
              </div>

              <div className="m2-toolbar">
                {data.hashtags?.length ? (
                  data.hashtags.map((tag) => (
                    <span
                      className="engagement-badge"
                      key={tag.tag}
                    >
                      #{tag.tag} ({tag.content_count})
                    </span>
                  ))
                ) : (
                  <span className="m2-empty">
                    No hashtags found in tracked content.
                  </span>
                )}
              </div>

              <p className="m2-data-note">
                Source: YouTube Data API public statistics.
                Views are cumulative lifetime counters.
                This engagement proxy is not complete owner analytics.
                Shares, saves, reach, and watch time are not obtained
                through this public data endpoint.
              </p>
          </>
        )}
      </PanelState>
    </div>
  );
}

export function YouTubePublicContent() {
  const { data, loading, error, reload } = useYouTubeData(
    '/analytics/youtube-public/content'
  );

  return (
    <section className="m2-page">
      <YouTubePublicContentPanel
        data={data}
        loading={loading}
        error={error}
        onRefresh={reload}
      />
    </section>
  );
}

/* ------------------------------------------
   YOUTUBE AUDIENCE INSIGHTS
------------------------------------------ */

export function YouTubePublicAudience() {
  const { data, loading, error, reload } = useYouTubeData(
    '/analytics/youtube-public/audience'
  );

  const creators = data?.creators || [];

  return (
    <section className="m2-page">
      <div className="card m2-card">
        <PanelHeading
          title="YouTube Public Audience Overview"
          description="Public channel audience size and actual available statistics."
          loading={loading}
          onRefresh={reload}
        />

        <PanelState
          loading={loading}
          error={error}
          empty={Boolean(data && creators.length === 0)}
        >
          {creators.map((creator) => (
            <div
              className="m2-audience-account"
              key={creator.id}
            >
              <div className="m2-subheading">
                <div>
                  <h2>{creator.title}</h2>
                  <p>{creator.channel_id}</p>
                </div>

                <span className="m2-status ready">
                  Public API
                </span>
              </div>

              <div className="m2-kpi-grid">
                <article className="m2-kpi">
                  <span>Subscribers</span>
                  <strong>
                    {formatNumber(creator.subscriber_count)}
                  </strong>
                </article>

                <article className="m2-kpi">
                  <span>Channel views</span>
                  <strong>
                    {formatNumber(creator.channel_view_count)}
                  </strong>
                </article>

                <article className="m2-kpi">
                  <span>Public videos</span>
                  <strong>
                    {formatNumber(creator.video_count)}
                  </strong>
                </article>
              </div>

              <div className="m2-notice">
                <Users size={18} />

                <div>
                  <strong>Private audience analytics</strong>
                  <span>
                    Age, gender, geographic demographics, device
                    usage, and active hours require eligible
                    owner-authorized YouTube Analytics access.
                    Public API data does not expose these metrics.
                  </span>
                </div>
              </div>

              <div className="m2-availability-row">
                <span><strong>Age distribution:</strong> N/A</span>
                <span><strong>Gender:</strong> N/A</span>
                <span><strong>Device usage:</strong> N/A</span>
                <span><strong>Active hours:</strong> N/A</span>
                <span><strong>Reach:</strong> N/A</span>
                <span><strong>Impressions:</strong> N/A</span>
              </div>

              <p className="m2-data-note">
                Last sync: {
                  creator.last_synced_at
                    ? new Date(creator.last_synced_at).toLocaleString()
                    : 'Not synchronized'
                }
              </p>
            </div>
          ))}
        </PanelState>
      </div>
    </section>
  );
}

/* ------------------------------------------
   YOUTUBE GROWTH & TRENDS
------------------------------------------ */

export function YouTubePublicGrowth({ days = 30 }) {
  const [creatorId, setCreatorId] = useState('');

  const { data, loading, error, reload } = useYouTubeData(
    `/analytics/youtube-public/growth?days=${days}`
  );

  const creators = data?.creators || [];

  useEffect(() => {
    if (
      creators.length &&
      !creators.some((creator) => String(creator.id) === creatorId)
    ) {
      setCreatorId(String(creators[0].id));
    }
  }, [creators, creatorId]);

  const selectedCreator = creators.find(
    (creator) => String(creator.id) === creatorId
  );

  const points = selectedCreator?.points || [];
  const canShowTrend = points.length >= 2;

  return (
    <section className="m2-page">
      <div className="card m2-card">
        <PanelHeading
          title={`YouTube Growth & Trends · ${days} days`}
          description="Historical channel snapshots and actual changes between syncs."
          loading={loading}
          onRefresh={reload}
        />

        <PanelState
          loading={loading}
          error={error}
          empty={Boolean(data && creators.length === 0)}
        >
          {creators.length > 0 && (
            <>
              <label className="m2-platform-filter">
                Select tracked creator
                <select
                  value={creatorId}
                  onChange={(event) => setCreatorId(event.target.value)}
                >
                  {creators.map((creator) => (
                    <option
                      key={creator.id}
                      value={String(creator.id)}
                    >
                      {creator.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="m2-data-note">
                {selectedCreator?.observation_count || 0}
                {' '}historical observations in this period.
                {selectedCreator?.last_synced_at && (
                  <> Last sync: {
                    new Date(selectedCreator.last_synced_at).toLocaleString()
                  }</>
                )}
              </div>

              {!canShowTrend ? (
                <div className="m2-notice">
                  <Eye size={18} />
                  <div>
                    <strong>Initial snapshot available</strong>
                    <span>
                      The first sync is the baseline.
                      Run another creator sync later to calculate
                      genuine growth. No historical data is fabricated.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-header">
                    <div>
                      <h3>Channel views over time</h3>
                      <p>Actual cumulative public view counters.</p>
                    </div>
                  </div>

                  <div className="m2-growth-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={points}>
                        <CartesianGrid
                          stroke="#edf0f5"
                          vertical={false}
                          strokeDasharray="3 5"
                        />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={formatNumber} />
                        <Tooltip
                          formatter={(value) => [
                            formatNumber(value),
                            'Channel views',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="channel_view_count"
                          stroke="#7667f8"
                          fill="#7667f8"
                          fillOpacity={0.16}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card-header">
                    <div>
                      <h3>Subscriber count over time</h3>
                      <p>Only publicly visible subscriber counters.</p>
                    </div>
                  </div>

                  <div className="m2-growth-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={points}>
                        <CartesianGrid
                          stroke="#edf0f5"
                          vertical={false}
                          strokeDasharray="3 5"
                        />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={formatNumber} />
                        <Tooltip
                          formatter={(value) => [
                            formatNumber(value),
                            'Subscribers',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="subscriber_count"
                          stroke="#16a34a"
                          fill="#16a34a"
                          fillOpacity={0.14}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              <div className="card-header">
                <div>
                  <h3>Top video trends</h3>
                  <p>Latest stored public video observations.</p>
                </div>
              </div>

              <div className="m2-table-wrap">
                <table className="content-table m2-table">
                  <thead>
                    <tr>
                      <th>VIDEO</th>
                      <th>LATEST VIEWS</th>
                      <th>OBSERVATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCreator?.top_video_trends || []).map((video) => (
                      <tr key={video.video_id}>
                        <td>{video.title}</td>
                        <td>{formatNumber(video.latest_views)}</td>
                        <td>{video.observation_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelState>

        <p className="m2-data-note">
          Growth is calculated only from actual saved observations.
          Lifetime counter values are not treated as daily views.
        </p>
      </div>
    </section>
  );
}

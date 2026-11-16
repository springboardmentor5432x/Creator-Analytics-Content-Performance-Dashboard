import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Users,
  Radio,
  Hash,
  Activity,
  Calendar,
  Filter,
  Search,
  Info,
  CheckCircle2,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Award,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useApi,
  Spinner,
  ErrorState,
  EmptyState,
  StatCard,
  PageHeader,
  DemoBanner,
  DemoBadge,
  ChartCard,
  LoadDemoButton,
  Alert,
} from "../components/ui";
import {
  PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  num,
  compact,
  pct,
  shortDate,
} from "../utils/format";

const HORIZON_LABELS = {
  30: "30-Day Outlook",
  60: "60-Day Outlook",
  90: "90-Day Outlook",
};

export default function GrowthAnalytics() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState("");
  const [days, setDays] = useState(60);
  const [horizon, setHorizon] = useState(90);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Authorized creators for Agency/Marketing/Admin switching
  const creatorsApi = useApi("/api/trends/creators");

  // Hashtag table state
  const [tagPlatform, setTagPlatform] = useState("");
  const [tagSort, setTagSort] = useState("reach");
  const [tagSortDir, setTagSortDir] = useState("desc");
  const [tagSearch, setTagSearch] = useState("");

  const targetId = selectedUserId ? Number(selectedUserId) : undefined;

  // API calls
  const predApi = useApi("/api/trends/growth-prediction", {
    platform: platform || undefined,
    days,
    horizon,
    user_id: targetId,
  });

  const tagApi = useApi("/api/trends/hashtags", {
    platform: tagPlatform || (platform || undefined),
    sort_by: tagSort,
    sort_dir: tagSortDir,
    user_id: targetId,
  });

  const engApi = useApi("/api/trends/engagement", {
    platform: platform || undefined,
    days,
    user_id: targetId,
  });

  const reloadAll = () => {
    creatorsApi.reload();
    predApi.reload();
    tagApi.reload();
    engApi.reload();
  };

  const predData = predApi.data;
  const tagData = tagApi.data;
  const engData = engApi.data;

  const isLoading = predApi.loading && !predData;
  const hasError = predApi.error || tagApi.error || engApi.error;
  const isDemo = predData?.has_demo || tagData?.has_demo || engData?.has_demo;

  // Selected horizon prediction
  const horizonKey = `day_${horizon}`;
  const selectedPrediction = predData?.predictions?.[horizonKey] || predData?.predictions?.day_90;

  // Filtered hashtags
  const filteredHashtags = useMemo(() => {
    if (!tagData?.hashtags) return [];
    if (!tagSearch.trim()) return tagData.hashtags;
    const q = tagSearch.toLowerCase().trim();
    return tagData.hashtags.filter(
      (h) => h.tag.toLowerCase().includes(q) || h.platform.toLowerCase().includes(q)
    );
  }, [tagData?.hashtags, tagSearch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Growth & Trend Forecasting"
          subtitle="Statistical follower predictions, engagement velocity, and hashtag discovery."
        />
        <Spinner label="Calculating statistical regression models…" />
      </div>
    );
  }

  if (hasError && !predData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Growth & Trend Forecasting"
          subtitle="Statistical follower predictions, engagement velocity, and hashtag discovery."
        />
        <ErrorState message={predApi.error || "Unable to load forecasting analytics."} onRetry={reloadAll} />
      </div>
    );
  }

  const isCompletelyEmpty = predData?.status === "empty" && (!tagData?.hashtags || tagData.hashtags.length === 0);

  if (isCompletelyEmpty) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Growth & Trend Forecasting"
          subtitle="Statistical follower predictions, engagement velocity, and hashtag discovery."
        />
        <EmptyState
          title="No historical data available for trend forecasting"
          text="Connect social media platforms or load demo sample data to view predictive regression curves, hashtag rankings, and engagement trends."
          action={<LoadDemoButton onDone={reloadAll} label="Load Sample Data" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Growth & Trend Forecasting"
        subtitle="Ordinary Least Squares (OLS) regression models, 30/60/90-day trajectory forecasts, and content growth indicators."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Creator Selector for Multi-Account Roles */}
          {creatorsApi.data && creatorsApi.data.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-signal-dark/20 bg-signal-soft/40 px-2.5 py-1">
              <span className="text-[11px] font-bold text-signal-dark">Target:</span>
              <select
                aria-label="Select Target Creator"
                className="bg-transparent text-xs font-semibold text-ink-950 outline-none"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {creatorsApi.data.map((c) => (
                  <option key={c.id} value={c.id === user?.id ? "" : c.id} className="text-ink-950">
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Platform Filter */}
          <select
            aria-label="Filter Platform"
            className="input w-auto text-xs font-medium"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All Channels</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>

          {/* Historical Lookback */}
          <select
            aria-label="Historical Lookback Window"
            className="input w-auto text-xs font-medium"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={30}>Past 30 Days Baseline</option>
            <option value={60}>Past 60 Days Baseline</option>
            <option value={90}>Past 90 Days Baseline</option>
            <option value={120}>Past 120 Days Baseline</option>
          </select>

          <button
            onClick={reloadAll}
            className="btn-ghost text-xs"
            title="Refresh forecasting models"
          >
            Recalculate
          </button>
        </div>
      </PageHeader>

      {/* Demo Data Notice */}
      {isDemo && <DemoBanner />}

      {/* Insufficient Data Warning (if less than 2 points) */}
      {predData?.status === "insufficient_data" && (
        <Alert kind="error">
          <b>Insufficient Historical Observations:</b> {predData.message} Showing available raw data points.
        </Alert>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Current Followers"
          value={num(predData?.metrics?.current_followers || 0)}
          icon={Users}
          hint={
            predData?.metrics?.historical_net_growth !== undefined
              ? `${predData.metrics.historical_net_growth >= 0 ? "+" : ""}${num(
                  predData.metrics.historical_net_growth
                )} in past ${predData.metrics.analysis_window_days}d`
              : "Active follower base"
          }
        />

        <StatCard
          label="Historical Growth Rate"
          value={pct(predData?.metrics?.historical_growth_rate_pct || 0)}
          icon={
            (predData?.metrics?.historical_growth_rate_pct || 0) >= 0
              ? TrendingUp
              : TrendingDown
          }
          hint={`Velocity: ~${predData?.metrics?.daily_growth_velocity || 0} followers/day`}
        />

        <div className="card relative overflow-hidden border-2 border-signal/40 bg-white">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-bold uppercase tracking-wider text-signal-dark">
              {horizon}-Day Projected
            </span>
            <Sparkles className="h-4 w-4 text-signal-dark" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            {selectedPrediction ? num(selectedPrediction.predicted_followers) : "N/A"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
            {selectedPrediction && (
              <>
                <span
                  className={`inline-flex items-center font-bold ${
                    selectedPrediction.net_growth >= 0 ? "text-moss" : "text-coral"
                  }`}
                >
                  {selectedPrediction.net_growth >= 0 ? "+" : ""}
                  {num(selectedPrediction.net_growth)} ({pct(selectedPrediction.growth_rate_pct)})
                </span>
                <span className="text-[10px] text-ink-400">gain</span>
              </>
            )}
          </div>
        </div>

        <StatCard
          label="Engagement Velocity"
          value={
            engData?.growth_indicators?.engagement_velocity_pct !== undefined
              ? `${engData.growth_indicators.engagement_velocity_pct >= 0 ? "+" : ""}${
                  engData.growth_indicators.engagement_velocity_pct
                }%`
              : "0.0%"
          }
          icon={Activity}
          hint={
            engData?.growth_indicators?.recent_engagement_rate !== undefined
              ? `Recent: ${pct(engData.growth_indicators.recent_engagement_rate)} avg`
              : "Engagement momentum"
          }
        />

        <StatCard
          label="Model Confidence (R²)"
          value={
            predData?.metrics?.confidence_score !== undefined
              ? `${predData.metrics.confidence_score}% Fit`
              : "N/A"
          }
          icon={CheckCircle2}
          hint={
            predData?.metrics?.r_squared !== undefined
              ? `R² = ${predData.metrics.r_squared} · OLS Linear`
              : "Statistical correlation"
          }
        />
      </div>

      {/* Main Forecast Chart Card */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-950">
              Follower Trajectory: Historical vs Statistical Forecast
            </h2>
            <p className="text-xs text-ink-500">
              Continuous timeline displaying verified actuals alongside forward regression projections and 95% confidence bounds.
            </p>
          </div>

          {/* Horizon Selector Toggle Buttons */}
          <div className="flex items-center rounded-xl border border-ink-200 bg-ink-50 p-1 text-xs">
            {[30, 60, 90].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  horizon === h
                    ? "bg-white text-ink-950 shadow-sm border border-ink-200/80"
                    : "text-ink-500 hover:text-ink-950"
                }`}
              >
                {h} Days Ahead
              </button>
            ))}
          </div>
        </div>

        {/* 30/60/90 Projections Summary Ribbon */}
        {predData?.predictions && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[30, 60, 90].map((h) => {
              const p = predData.predictions[`day_${h}`];
              const isSelected = horizon === h;
              return (
                <div
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-signal bg-signal-soft/40 shadow-sm"
                      : "border-ink-100 bg-ink-50/50 hover:border-ink-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
                      {HORIZON_LABELS[h]}
                    </span>
                    <span className="text-[11px] font-medium text-ink-400">
                      Target: {shortDate(p.target_date)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-display text-xl font-extrabold text-ink-950">
                      {num(p.predicted_followers)}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        p.net_growth >= 0 ? "text-moss" : "text-coral"
                      }`}
                    >
                      {p.net_growth >= 0 ? "+" : ""}
                      {num(p.net_growth)} ({pct(p.growth_rate_pct)})
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-ink-500">
                    <span>95% Confidence Band:</span>
                    <span className="font-medium text-ink-700">
                      [{compact(p.lower_bound)} – {compact(p.upper_bound)}]
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recharts Composed Chart */}
        <div style={{ height: 360 }} className="pt-2">
          {predData?.combined_series?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={predData.combined_series}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E8B6A" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2E8B6A" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: "#6B7C80" }}
                  minTickGap={30}
                />
                <YAxis
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: "#6B7C80" }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    const isFc = d?.is_forecast;
                    return (
                      <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-1">
                          <span className="font-bold text-ink-950">{shortDate(label)}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isFc
                                ? "bg-signal-soft text-signal-dark"
                                : "bg-ink-100 text-ink-700"
                            }`}
                          >
                            {isFc ? "STATISTICAL FORECAST" : "ACTUAL DATA"}
                          </span>
                        </div>
                        {d?.actual_followers !== undefined && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-ink-500">Actual Followers:</span>
                            <b className="font-bold text-ink-950">{num(d.actual_followers)}</b>
                          </div>
                        )}
                        {d?.forecast_followers !== undefined && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-moss font-medium">Projected Follower Count:</span>
                            <b className="font-bold text-moss">{num(d.forecast_followers)}</b>
                          </div>
                        )}
                        {d?.lower_bound !== undefined && isFc && (
                          <div className="flex items-center justify-between gap-4 text-ink-400">
                            <span>95% Confidence Interval:</span>
                            <span>
                              [{num(d.lower_bound)} – {num(d.upper_bound)}]
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => <span className="text-xs font-medium text-ink-700">{value}</span>}
                />
                {/* 95% Confidence Area */}
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  name="95% Confidence Interval"
                  stroke="none"
                  fill="url(#forecastFill)"
                  isAnimationActive={false}
                />
                {/* Historical Actuals Line */}
                <Line
                  type="monotone"
                  dataKey="actual_followers"
                  name="Historical Actual Followers"
                  stroke="#143A41"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#143A41" }}
                />
                {/* Projected Line */}
                <Line
                  type="monotone"
                  dataKey="forecast_followers"
                  name="Statistical Forecast (OLS)"
                  stroke="#2E8B6A"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 5, fill: "#2E8B6A" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-xs text-ink-400">
              No historical points available to plot.
            </div>
          )}
        </div>

        {/* Statistical Methodology & Limitations Callout */}
        <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-3.5 text-xs text-ink-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-ink-800">
            <Info className="h-4 w-4 text-signal-dark" />
            <span>Forecasting Methodology & Confidence Constraints</span>
          </div>
          <p className="leading-relaxed">
            <b>Method:</b> {predData?.methodology}
          </p>
          <p className="leading-relaxed text-ink-500">
            <b>Limitations:</b> {predData?.confidence_limitations}
          </p>
        </div>
      </div>

      {/* Engagement Trends & Velocity Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Engagement Monthly Bar / Area Chart */}
        <div className="card space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-ink-950">
                Content Engagement Velocity & Reach Over Time
              </h3>
              <p className="text-xs text-ink-500">
                Monthly average engagement rate (%) alongside audience impressions reach.
              </p>
            </div>
            {engData?.growth_indicators?.best_platform && (
              <span className="rounded-lg border border-moss/30 bg-moss/10 px-2.5 py-1 text-xs font-bold text-moss">
                Top Channel: {PLATFORM_LABEL[engData.growth_indicators.best_platform] || engData.growth_indicators.best_platform}
              </span>
            )}
          </div>

          <div style={{ height: 260 }} className="pt-2">
            {engData?.monthly_trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engData.monthly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7C80" }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#6B7C80" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={compact}
                    tick={{ fontSize: 11, fill: "#6B7C80" }}
                  />
                  <Tooltip
                    formatter={(val, name) =>
                      name.includes("Rate") ? pct(val) : num(val)
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="right"
                    dataKey="total_reach"
                    name="Audience Reach"
                    fill="#143A41"
                    opacity={0.35}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="avg_engagement_rate"
                    name="Avg Engagement Rate (%)"
                    fill="#E8A317"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-ink-400">
                No content items published in this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Top Post & Interactions Breakdown Card */}
        <div className="card space-y-4">
          <h3 className="font-display text-base font-bold text-ink-950">
            Growth Drivers & Top Content
          </h3>

          {/* Top Post Callout */}
          {engData?.growth_indicators?.top_post ? (
            <div className="rounded-xl border border-signal/50 bg-signal-soft/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-signal-dark uppercase tracking-wider">
                  <Award className="h-3.5 w-3.5" /> High Engagement Post
                </span>
                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-ink-700 shadow-sm">
                  {PLATFORM_LABEL[engData.growth_indicators.top_post.platform] ||
                    engData.growth_indicators.top_post.platform}
                </span>
              </div>
              <p className="font-semibold text-xs text-ink-900 line-clamp-2">
                {engData.growth_indicators.top_post.title}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-signal/20">
                <span className="text-ink-600">Engagement:</span>
                <b className="font-bold text-moss">
                  {pct(engData.growth_indicators.top_post.engagement_rate)}
                </b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600">Verified Reach:</span>
                <b className="font-bold text-ink-900">
                  {num(engData.growth_indicators.top_post.reach)}
                </b>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-400">No top post available.</p>
          )}

          {/* Interaction Breakdown */}
          <div className="space-y-2 pt-1 border-t border-ink-100">
            <span className="text-xs font-bold text-ink-700 uppercase tracking-wider block">
              Interactions Breakdown
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-ink-50 p-2">
                <span className="text-[10px] text-ink-500 block">Likes</span>
                <b className="font-bold text-ink-900">
                  {num(engData?.interaction_breakdown?.likes || 0)}
                </b>
              </div>
              <div className="rounded-lg bg-ink-50 p-2">
                <span className="text-[10px] text-ink-500 block">Comments</span>
                <b className="font-bold text-ink-900">
                  {num(engData?.interaction_breakdown?.comments || 0)}
                </b>
              </div>
              <div className="rounded-lg bg-ink-50 p-2">
                <span className="text-[10px] text-ink-500 block">Shares</span>
                <b className="font-bold text-ink-900">
                  {num(engData?.interaction_breakdown?.shares || 0)}
                </b>
              </div>
              <div className="rounded-lg bg-ink-50 p-2">
                <span className="text-[10px] text-ink-500 block">Saves</span>
                <b className="font-bold text-ink-900">
                  {num(engData?.interaction_breakdown?.saves || 0)}
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hashtag Performance Analysis Table */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-signal-dark" />
              <h2 className="font-display text-lg font-bold text-ink-950">
                Hashtag Performance & Reach Ranking
              </h2>
            </div>
            <p className="text-xs text-ink-500">
              Identify top-converting hashtag tags ranked by cumulative audience reach and engagement return.
            </p>
          </div>

          {/* Hashtag Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-400" />
              <input
                type="text"
                placeholder="Search tags…"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="input pl-8 py-1 text-xs w-40"
              />
            </div>

            <select
              aria-label="Filter Hashtag Platform"
              className="input w-auto text-xs py-1"
              value={tagPlatform}
              onChange={(e) => setTagPlatform(e.target.value)}
            >
              <option value="">All Channels</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort Hashtags"
              className="input w-auto text-xs py-1"
              value={tagSort}
              onChange={(e) => setTagSort(e.target.value)}
            >
              <option value="reach">Sort: Highest Reach</option>
              <option value="avg_engagement">Sort: Avg Engagement</option>
              <option value="post_count">Sort: Post Frequency</option>
            </select>
          </div>
        </div>

        {/* Hashtag Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-100 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Hashtag</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3 text-right">Post Volume</th>
                <th className="py-2.5 px-3 text-right">Cumulative Reach</th>
                <th className="py-2.5 px-3 text-right">Avg Engagement</th>
                <th className="py-2.5 px-3 text-center">Impact Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredHashtags.length > 0 ? (
                filteredHashtags.map((h, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr key={h.id || idx} className="hover:bg-ink-50/50 transition-colors">
                      <td className="py-3 px-3 font-bold">
                        <span
                          className={`inline-grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                              ? "bg-amber-50 text-amber-700 border border-amber-300"
                              : "text-ink-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-ink-950">
                        <span className="font-mono text-signal-dark font-bold hover:underline cursor-pointer">
                          {h.tag}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: PLATFORM_COLOR[h.platform] || "#6B7C80" }}
                        >
                          {PLATFORM_LABEL[h.platform] || h.platform}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-ink-700">
                        {num(h.post_count)} posts
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-ink-950">
                        {num(h.total_reach)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold">
                        <span
                          className={
                            h.avg_engagement >= 8.0
                              ? "text-moss"
                              : h.avg_engagement >= 5.0
                              ? "text-signal-dark"
                              : "text-ink-600"
                          }
                        >
                          {pct(h.avg_engagement)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            h.avg_engagement >= 9.0
                              ? "bg-moss/10 text-moss border border-moss/30"
                              : h.total_reach >= 100000
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {h.avg_engagement >= 9.0
                            ? "High Engagement"
                            : h.total_reach >= 100000
                            ? "High Reach"
                            : "Consistent"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-400">
                    No hashtags matched your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


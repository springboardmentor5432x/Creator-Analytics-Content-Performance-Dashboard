import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Trophy,
  Layers,
  Sparkles,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Radio,
  Percent,
  Clock,
  CheckSquare,
  Square,
  HelpCircle,
  Filter,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import api, { parseError } from "../api/client";
import {
  useApi,
  Spinner,
  ErrorState,
  EmptyState,
  StatCard,
  PageHeader,
  Filters,
  DemoBanner,
  DemoBadge,
  ChartCard,
  LoadDemoButton,
  Alert,
} from "../components/ui";
import ContentForm from "../components/ContentForm";
import ContentComparison from "../components/ContentComparison";
import {
  PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  num,
  compact,
  pct,
  shortDate,
  rangeParams,
  isoDate,
} from "../utils/format";

const COLUMNS = [
  ["title", "Title"],
  ["platform", "Platform"],
  ["published_at", "Date"],
  ["views", "Views"],
  ["likes", "Likes"],
  ["comments", "Comments"],
  ["shares", "Shares"],
  ["saves", "Saves"],
  ["reach", "Reach"],
  ["watch_time_minutes", "Watch Time"],
  ["engagement_rate", "Eng. Rate"],
];

const NUMS = ["views", "likes", "comments", "shares", "saves", "reach", "watch_time_minutes"];

export default function ContentAnalytics() {
  const [days, setDays] = useState(90);
  const [custom, setCustom] = useState({
    start: isoDate(new Date(Date.now() - 89 * 864e5)),
    end: isoDate(new Date()),
  });
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ by: "published_at", order: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(null);
  const [toast, setToast] = useState(null);

  // Content Comparison State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Top-performing posts ranking metric
  const [topBy, setTopBy] = useState("engagement_rate");

  // Engagement Formula Explanation Drawer / Toggle
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const end = days === "custom" ? custom.end : isoDate(new Date());
  const start = days === "custom" ? custom.start : isoDate(new Date(Date.now() - (days - 1) * 864e5));
  const filter = { platform: platform || undefined, start_date: start, end_date: end };

  const list = useApi("/api/content", {
    ...filter,
    search: search || undefined,
    sort_by: sort.by,
    order: sort.order,
    page,
    page_size: pageSize,
  });

  const summary = useApi("/api/content/summary", { ...filter, top_by: topBy });

  const refresh = () => {
    list.reload();
    summary.reload();
  };

  const saved = (msg) => {
    setForm(null);
    setToast({ kind: "success", text: msg });
    refresh();
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/content/${c.id}`);
      setToast({ kind: "success", text: "Content deleted successfully." });
      setSelectedIds((prev) => prev.filter((id) => id !== c.id));
      refresh();
    } catch (e) {
      setToast({ kind: "error", text: parseError(e).message });
    }
  };

  const toggleSort = (by) => {
    setSort((s) => ({
      by,
      order: s.by === by && s.order === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  };

  const resetPage = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  // Selection handlers for Content Comparison
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageItemIds = list.data?.items?.map((item) => item.id) || [];
    const allSelected = pageItemIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageItemIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageItemIds]));
      setSelectedIds(merged);
    }
  };

  const handleCompareTopPosts = (count = 3) => {
    if (!summary.data?.top_posts?.length) return;
    const topIds = summary.data.top_posts.slice(0, count).map((p) => p.id);
    setSelectedIds(topIds);
    setShowComparisonModal(true);
  };

  const t = summary.data?.totals;
  const noData =
    summary.data &&
    t.posts === 0 &&
    !platform &&
    !search &&
    days !== "custom" &&
    list.data?.total === 0;

  return (
    <>
      <PageHeader
        title="Content Analytics & Performance"
        subtitle="Track multi-platform content metrics, monitor engagement, compare posts, and identify top-performing content."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Filters
            days={days}
            setDays={resetPage(setDays)}
            custom={custom}
            setCustom={resetPage(setCustom)}
            platform={platform}
            setPlatform={resetPage(setPlatform)}
            showPlatform
          />
          <button
            onClick={() => {
              if (selectedIds.length >= 2) {
                setShowComparisonModal(true);
              } else if (list.data?.items?.length >= 2) {
                setSelectedIds(list.data.items.slice(0, 2).map((i) => i.id));
                setShowComparisonModal(true);
              } else {
                setToast({
                  kind: "info",
                  text: "You need at least 2 content posts to perform a comparison.",
                });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-900 shadow-sm transition hover:border-signal hover:bg-ink-50"
          >
            <Layers className="h-4 w-4 text-signal-dark" />
            <span>Compare Content</span>
            {selectedIds.length > 0 && (
              <span className="ml-1 rounded-full bg-signal px-2 py-0.5 text-[10px] font-extrabold text-ink-950">
                {selectedIds.length}
              </span>
            )}
          </button>
          <button className="btn-primary" onClick={() => setForm({})}>
            <Plus className="h-4 w-4" /> Add content
          </button>
        </div>
      </PageHeader>

      {toast && (
        <div className="mb-4">
          <Alert kind={toast.kind} onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        </div>
      )}

      {summary.loading && !summary.data ? (
        <Spinner label="Loading Content Analytics data..." />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={refresh} />
      ) : (
        <div className="space-y-6">
          {summary.data.has_demo && <DemoBanner />}

          {/* SECTION A: CONTENT OVERVIEW CARDS */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-950">
                  Content Overview
                </h2>
                <p className="text-xs text-ink-500">
                  Aggregated performance metrics across published content in the selected timeframe
                </p>
              </div>
              <button
                onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                className="flex items-center gap-1 text-xs font-semibold text-signal-dark hover:underline"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{showFormulaInfo ? "Hide Formula" : "Engagement Rate Formula"}</span>
              </button>
            </div>

            {/* Formula Explainer Banner (Toggable & Clear) */}
            {showFormulaInfo && (
              <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-ink-900 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">
                    📐 Formula: Engagement Rate (%)
                  </span>
                  <span className="rounded bg-teal-100 px-2 py-0.5 font-mono font-bold text-teal-900">
                    (Likes + Comments + Shares + Saves) ÷ Reach × 100
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-4 text-[11px] text-ink-600">
                  <div className="rounded-lg bg-white/80 p-2 border border-teal-100">
                    <b className="text-ink-900">Likes:</b> Active endorsement & positive sentiment.
                  </div>
                  <div className="rounded-lg bg-white/80 p-2 border border-teal-100">
                    <b className="text-ink-900">Comments:</b> Direct conversation & community engagement.
                  </div>
                  <div className="rounded-lg bg-white/80 p-2 border border-teal-100">
                    <b className="text-ink-900">Shares:</b> Content virality & organic audience expansion.
                  </div>
                  <div className="rounded-lg bg-white/80 p-2 border border-teal-100">
                    <b className="text-ink-900">Saves:</b> High-intent bookmarking & long-term retention.
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-ink-500 italic">
                  Note: If reach is 0, engagement rate returns 0.0% to avoid division by zero.
                </p>
              </div>
            )}

            {/* 6 Core Required Metrics Cards + Watch Time & Posts */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Total Views"
                value={num(t.views)}
                icon={Eye}
                hint="Total post & video views"
              />
              <StatCard
                label="Total Reach"
                value={compact(t.reach)}
                icon={Radio}
                hint="Unique audience exposed"
              />
              <StatCard
                label="Total Likes"
                value={num(t.likes)}
                icon={Heart}
                hint="Audience endorsements"
              />
              <StatCard
                label="Total Comments"
                value={num(t.comments)}
                icon={MessageSquare}
                hint="Conversations & feedback"
              />
              <StatCard
                label="Total Shares"
                value={num(t.shares)}
                icon={Share2}
                hint="Organic virality"
              />
              <StatCard
                label="Avg Engagement Rate"
                value={pct(t.engagement_rate)}
                icon={Percent}
                hint="Interactions ÷ Reach"
              />
            </div>

            {/* Secondary supportive metrics */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-ink-500">Total Posts</span>
                  <p className="font-display font-bold text-sm text-ink-950">{num(t.posts)} posts</p>
                </div>
                <BarChart3 className="h-5 w-5 text-ink-300" />
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-ink-500">Total Saves</span>
                  <p className="font-display font-bold text-sm text-ink-950">{num(t.saves)} bookmarks</p>
                </div>
                <Bookmark className="h-5 w-5 text-ink-300" />
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-ink-500">Total Watch Time</span>
                  <p className="font-display font-bold text-sm text-ink-950">
                    {t.watch_time_minutes ? `${t.watch_time_minutes.toLocaleString()} min` : "0 min"}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-ink-300" />
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-ink-500">Total Interactions</span>
                  <p className="font-display font-bold text-sm text-signal-dark">
                    {num(t.engagement)} actions
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-signal" />
              </div>
            </div>
          </div>

          {/* SECTION E: PERFORMANCE TRENDS & REACH ANALYSIS CHARTS */}
          {t.posts > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard
                title="Reach & Views Performance Trends"
                subtitle="Daily views vs. unique reach trajectory over time"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={summary.data.trend}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#143A41" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#143A41" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E8B6A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2E8B6A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      minTickGap={24}
                    />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={shortDate} formatter={(v) => num(v)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#143A41"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#viewsGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      name="Reach"
                      stroke="#2E8B6A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#reachGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Engagement Monitoring Over Time"
                subtitle="Interaction volume trajectory (likes, comments, shares, saves)"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={summary.data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      minTickGap={24}
                    />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={shortDate} formatter={(v) => num(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#143A41"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      name="Total Engagement"
                      stroke="#E8A317"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* SECTION D: TOP-PERFORMING CONTENT REPORTS */}
          {t.posts > 0 && (
            <div className="card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-ink-950">
                      Top-Performing Content Reports
                    </h2>
                    <p className="text-xs text-ink-500">
                      Ranked performance leaderboards with multi-metric sorting
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-ink-500">Rank by:</span>
                    <select
                      aria-label="Rank top posts by metric"
                      className="input py-1 text-xs"
                      value={topBy}
                      onChange={(e) => setTopBy(e.target.value)}
                    >
                      <option value="engagement_rate">Engagement Rate (%)</option>
                      <option value="views">Total Views</option>
                      <option value="reach">Total Reach</option>
                      <option value="likes">Total Likes</option>
                      <option value="comments">Total Comments</option>
                      <option value="shares">Total Shares</option>
                      <option value="saves">Total Saves</option>
                      <option value="watch_time_minutes">Watch Time</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleCompareTopPosts(3)}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-ink-100"
                  >
                    <Layers className="h-3.5 w-3.5 text-signal-dark" />
                    <span>Compare Top 3</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(summary.data.top_posts || []).map((p, idx) => (
                  <div
                    key={p.id}
                    className={`relative flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition hover:shadow-md ${
                      idx === 0
                        ? "border-amber-300 bg-amber-50/30"
                        : idx === 1
                        ? "border-slate-300 bg-slate-50/30"
                        : idx === 2
                        ? "border-orange-200 bg-orange-50/20"
                        : "border-ink-100 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black shadow-sm ${
                            idx === 0
                              ? "bg-amber-400 text-ink-950"
                              : idx === 1
                              ? "bg-slate-300 text-ink-900"
                              : idx === 2
                              ? "bg-orange-300 text-ink-950"
                              : "bg-ink-100 text-ink-700"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: `${PLATFORM_COLOR[p.platform]}15`,
                            color: PLATFORM_COLOR[p.platform],
                          }}
                        >
                          {PLATFORM_LABEL[p.platform]}
                        </span>
                      </div>

                      <h3
                        className="mt-2 text-xs font-bold text-ink-950 line-clamp-2"
                        title={p.title}
                      >
                        {p.title}
                      </h3>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {shortDate(p.published_at)}
                      </p>
                    </div>

                    <div className="mt-3 border-t border-ink-100 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-500">Eng. Rate:</span>
                        <b className="text-teal-700 font-bold tabular-nums">
                          {pct(p.engagement_rate)}
                        </b>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-600">
                        <span>Views:</span>
                        <span className="font-semibold tabular-nums">{compact(p.views)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-600">
                        <span>Reach:</span>
                        <span className="font-semibold tabular-nums">{compact(p.reach)}</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedIds((prev) =>
                            prev.includes(p.id) ? prev : [...prev, p.id]
                          );
                          if (selectedIds.length >= 1 && !selectedIds.includes(p.id)) {
                            setShowComparisonModal(true);
                          }
                        }}
                        className="mt-2.5 w-full rounded border border-ink-200 bg-white py-1 text-[11px] font-bold text-ink-800 transition hover:bg-ink-50"
                      >
                        {selectedIds.includes(p.id) ? "Selected ✓" : "+ Compare"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: CONTENT PERFORMANCE TABLE */}
          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-950">
                  All content
                </h2>
                <p className="text-xs text-ink-500">
                  Content Performance Table — Detailed breakdown with sortable columns, multi-item comparison, and post management
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Search titles"
                  placeholder="Search titles…"
                  className="input w-full sm:w-64"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* SELECTION ACTION BAR (Appears when items are selected) */}
            {selectedIds.length > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-signal/40 bg-signal-soft/50 px-4 py-2 text-xs font-semibold text-ink-950 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-signal-dark" />
                  <span>
                    <b>{selectedIds.length}</b> posts selected for comparison
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowComparisonModal(true)}
                    disabled={selectedIds.length < 2}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                      selectedIds.length >= 2
                        ? "bg-signal text-ink-950 hover:bg-signal-dark hover:text-white"
                        : "bg-ink-200 text-ink-400 cursor-not-allowed"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Compare Selected ({selectedIds.length})</span>
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-ink-600 hover:text-coral hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} />
            ) : !list.data ? (
              <Spinner />
            ) : list.data.total === 0 ? (
              noData ? (
                <EmptyState
                  title="No content yet"
                  text="Add a post manually or load demo data (clearly labelled) to see every chart and filter working."
                  action={
                    <div className="flex gap-2">
                      <button className="btn-primary" onClick={() => setForm({})}>
                        Add content
                      </button>
                      <LoadDemoButton onDone={refresh} label="Load demo data" />
                    </div>
                  }
                />
              ) : (
                <p className="py-8 text-center text-sm text-ink-500">
                  No content matches these filters. Try a wider date range or a different platform.
                </p>
              )
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-xs">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-ink-500 font-semibold uppercase tracking-wider">
                        {/* Checkbox column */}
                        <th className="w-10 py-2.5 pr-2 pl-1">
                          <button
                            onClick={handleSelectAllOnPage}
                            title="Select / Deselect all on this page"
                            className="text-ink-400 hover:text-ink-900"
                          >
                            {list.data.items?.every((item) => selectedIds.includes(item.id)) ? (
                              <CheckSquare className="h-4 w-4 text-signal-dark" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        {COLUMNS.map(([k, l]) => (
                          <th
                            key={k}
                            className={`py-2.5 pr-3 font-semibold ${
                              NUMS.includes(k) || k === "engagement_rate" ? "text-right" : ""
                            }`}
                            aria-sort={
                              sort.by === k
                                ? sort.order === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <button
                              className="inline-flex items-center gap-1 hover:text-ink-950"
                              onClick={() => toggleSort(k)}
                            >
                              {l}
                              {sort.by === k &&
                                (sort.order === "asc" ? (
                                  <ArrowUp className="h-3 w-3 text-signal-dark" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-signal-dark" />
                                ))}
                            </button>
                          </th>
                        ))}
                        <th className="w-20 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {list.data.items.map((c) => {
                        const isChecked = selectedIds.includes(c.id);
                        return (
                          <tr
                            key={c.id}
                            className={`border-b border-ink-50 transition ${
                              isChecked ? "bg-signal-soft/30" : "hover:bg-ink-50/60"
                            }`}
                          >
                            <td className="py-2.5 pr-2 pl-1">
                              <input
                                type="checkbox"
                                aria-label={`Select ${c.title}`}
                                checked={isChecked}
                                onChange={() => handleToggleSelect(c.id)}
                                className="h-3.5 w-3.5 rounded border-ink-300 text-signal focus:ring-signal"
                              />
                            </td>
                            <td className="max-w-[220px] truncate py-2.5 pr-3 font-medium text-ink-950" title={c.title}>
                              {c.title} {c.is_demo && <DemoBadge />}
                            </td>
                            <td className="pr-3">
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${PLATFORM_COLOR[c.platform]}15`,
                                  color: PLATFORM_COLOR[c.platform],
                                }}
                              >
                                {PLATFORM_LABEL[c.platform]}
                              </span>
                            </td>
                            <td className="pr-3 text-ink-600">{shortDate(c.published_at)}</td>
                            <td className="pr-3 text-right tabular-nums font-semibold text-ink-900">{num(c.views)}</td>
                            <td className="pr-3 text-right tabular-nums text-ink-700">{num(c.likes)}</td>
                            <td className="pr-3 text-right tabular-nums text-ink-700">{num(c.comments)}</td>
                            <td className="pr-3 text-right tabular-nums text-ink-700">{num(c.shares)}</td>
                            <td className="pr-3 text-right tabular-nums text-ink-700">{num(c.saves)}</td>
                            <td className="pr-3 text-right tabular-nums font-semibold text-ink-800">{compact(c.reach)}</td>
                            <td className="pr-3 text-right tabular-nums text-ink-600">{c.watch_time_minutes.toLocaleString()}</td>
                            <td className="pr-3 text-right font-bold tabular-nums text-teal-700">{pct(c.engagement_rate)}</td>
                            <td className="text-right pr-2 whitespace-nowrap">
                              <button
                                aria-label={`Edit ${c.title}`}
                                className="p-1.5 text-ink-400 hover:text-ink-950 transition"
                                onClick={() => setForm(c)}
                                title="Edit post"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                aria-label={`Delete ${c.title}`}
                                className="p-1.5 text-ink-400 hover:text-coral transition"
                                onClick={() => remove(c)}
                                title="Delete post"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing {list.data.items?.length || 0} of {list.data.total} posts · page {list.data.page} of {list.data.pages}
                    </span>
                    <select
                      aria-label="Items per page"
                      className="input py-1 px-2 text-xs"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn-ghost py-1 text-xs"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-ghost py-1 text-xs"
                      disabled={page >= list.data.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Content Form Modal */}
      {form && (
        <ContentForm
          initial={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}

      {/* Side-by-Side Content Comparison Modal */}
      {showComparisonModal && (
        <ContentComparison
          selectedIds={selectedIds}
          onClose={() => setShowComparisonModal(false)}
          allAvailablePosts={list.data?.items || []}
          onUpdateSelection={(newIds) => setSelectedIds(newIds)}
        />
      )}
    </>
  );
}

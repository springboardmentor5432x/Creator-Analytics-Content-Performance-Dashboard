import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  ArrowRight,
  BarChart2,
  Sparkles,
  Layers,
  CheckCircle2,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Clock,
  Radio,
  Percent,
  Plus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { parseError } from "../api/client";
import { Spinner, ErrorState, DemoBadge } from "./ui";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  num,
  compact,
  pct,
  shortDate,
} from "../utils/format";

const METRIC_DEFS = [
  { key: "views", label: "Views", icon: Eye, unit: "" },
  { key: "reach", label: "Reach", icon: Radio, unit: "" },
  { key: "likes", label: "Likes", icon: Heart, unit: "" },
  { key: "comments", label: "Comments", icon: MessageSquare, unit: "" },
  { key: "shares", label: "Shares", icon: Share2, unit: "" },
  { key: "saves", label: "Saves", icon: Bookmark, unit: "" },
  { key: "watch_time_minutes", label: "Watch Time", icon: Clock, unit: " min" },
  { key: "engagement_rate", label: "Engagement Rate", icon: Percent, unit: "%" },
];

const ITEM_COLORS = ["#143A41", "#E8A317", "#2E8B6A", "#D4553E", "#9333EA", "#0284C7"];

export default function ContentComparison({
  selectedIds,
  onClose,
  allAvailablePosts = [],
  onUpdateSelection,
}) {
  const [ids, setIds] = useState(selectedIds || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [chartMetricGroup, setChartMetricGroup] = useState("engagement"); // 'engagement' | 'reach_views'

  useEffect(() => {
    if (ids.length < 2) {
      setLoading(false);
      setComparison(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .post("/api/content/compare", { ids })
      .then((res) => {
        if (isMounted) {
          setComparison(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(parseError(err).message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ids]);

  const handleRemoveId = (idToRemove) => {
    const next = ids.filter((id) => id !== idToRemove);
    setIds(next);
    if (onUpdateSelection) onUpdateSelection(next);
  };

  const handleAddId = (idToAdd) => {
    if (!idToAdd || ids.includes(Number(idToAdd))) return;
    const next = [...ids, Number(idToAdd)];
    setIds(next);
    if (onUpdateSelection) onUpdateSelection(next);
  };

  // Prepare chart data based on selected group
  const engagementKeys = ["likes", "comments", "shares", "saves"];
  const reachKeys = ["views", "reach"];

  const activeKeys = chartMetricGroup === "engagement" ? engagementKeys : reachKeys;
  const chartData = activeKeys.map((k) => {
    const def = METRIC_DEFS.find((m) => m.key === k);
    const row = { metric: def?.label || k };
    comparison?.items?.forEach((item) => {
      row[`item_${item.id}`] = item[k];
    });
    return row;
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Content Comparison Dashboard"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-ink-100 bg-ink-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-signal text-ink-950 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">Content Comparison Dashboard</h2>
                <span className="rounded-full bg-signal/20 px-2 py-0.5 text-xs font-bold text-signal">
                  Module 2
                </span>
              </div>
              <p className="text-xs text-ink-300">
                Side-by-side performance comparison across views, reach, and engagement metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="rounded-lg p-2 text-ink-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Controls bar: Add more posts, current count */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
              <Sparkles className="h-4 w-4 text-signal-dark" />
              <span>
                Comparing <b className="text-ink-950">{ids.length}</b> content items (max 10)
              </span>
            </div>

            {allAvailablePosts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">Add to compare:</span>
                <select
                  aria-label="Add content item to comparison"
                  className="input py-1 text-xs"
                  defaultValue=""
                  onChange={(e) => {
                    handleAddId(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    + Select another post...
                  </option>
                  {allAvailablePosts
                    .filter((p) => !ids.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({PLATFORM_LABEL[p.platform] || p.platform})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <Spinner label="Calculating side-by-side performance metrics..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setIds([...ids])} />
          ) : ids.length < 2 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-ink-300" />
              <h3 className="mt-3 font-display text-base font-bold text-ink-900">
                Select at least 2 content items
              </h3>
              <p className="mt-1 text-xs text-ink-500">
                Check 2 or more posts in your Content Performance table to generate a side-by-side report.
              </p>
            </div>
          ) : !comparison ? (
            <p className="text-center text-sm text-ink-500">No comparison data available.</p>
          ) : (
            <>
              {/* Formula & Explainer Callout */}
              <div className="rounded-xl border border-signal/30 bg-signal-soft/40 p-3.5 text-xs text-ink-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-950">
                    📐 Engagement Rate Formula Selected:
                  </span>
                  <span className="font-mono font-bold text-signal-dark">
                    (Likes + Comments + Shares + Saves) ÷ Reach × 100
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-600">
                  Winning metrics below are highlighted with gold badges. Highest overall engagement rate indicates higher audience resonance relative to total viewers reached.
                </p>
              </div>

              {/* Side-by-Side Metric Comparison Table */}
              <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-xs">
                  {/* Table Header: Post Cards */}
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/50">
                      <th className="w-44 p-3 text-left font-bold text-ink-500 uppercase tracking-wider">
                        Metric
                      </th>
                      {comparison.items.map((item, idx) => (
                        <th key={item.id} className="p-3 text-left">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length] }}
                                />
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{
                                    backgroundColor: `${PLATFORM_COLOR[item.platform]}15`,
                                    color: PLATFORM_COLOR[item.platform],
                                  }}
                                >
                                  {PLATFORM_LABEL[item.platform] || item.platform}
                                </span>
                                {item.is_demo && <DemoBadge />}
                              </div>
                              <p
                                className="mt-1 truncate font-display font-bold text-ink-950 text-sm"
                                title={item.title}
                              >
                                {item.title}
                              </p>
                              <span className="text-[11px] text-ink-400">
                                {shortDate(item.published_at)}
                              </span>
                            </div>
                            {ids.length > 2 && (
                              <button
                                onClick={() => handleRemoveId(item.id)}
                                title="Remove from comparison"
                                className="text-ink-400 hover:text-coral"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Table Body: Side by Side Metrics */}
                  <tbody className="divide-y divide-ink-50">
                    {METRIC_DEFS.map(({ key, label, icon: Icon, unit }) => {
                      const m = comparison.metrics[key];
                      return (
                        <tr key={key} className="transition hover:bg-ink-50/40">
                          <td className="p-3 font-semibold text-ink-700">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-ink-400" />
                              <span>{label}</span>
                            </div>
                          </td>
                          {comparison.items.map((item) => {
                            const val = item[key];
                            const isWinner = m && m.best_item_id === item.id && m.max > 0;
                            return (
                              <td
                                key={item.id}
                                className={`p-3 tabular-nums ${
                                  isWinner
                                    ? "bg-amber-50/70 font-bold text-ink-950"
                                    : "text-ink-700"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span>
                                    {key === "engagement_rate"
                                      ? pct(val)
                                      : key === "watch_time_minutes"
                                      ? `${val.toLocaleString()}${unit}`
                                      : `${num(val)}${unit}`}
                                  </span>
                                  {isWinner && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                                      <Trophy className="h-3 w-3 text-amber-600" /> Best
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Comparison Visualizations Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Metric Bar Chart */}
                <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-950">
                        Visual Performance Comparison
                      </h3>
                      <p className="text-[11px] text-ink-400">
                        Side-by-side metric comparison by item
                      </p>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-ink-100 p-0.5 text-[11px]">
                      <button
                        onClick={() => setChartMetricGroup("engagement")}
                        className={`rounded px-2 py-1 font-semibold transition ${
                          chartMetricGroup === "engagement"
                            ? "bg-white text-ink-950 shadow-sm"
                            : "text-ink-600 hover:text-ink-950"
                        }`}
                      >
                        Engagement
                      </button>
                      <button
                        onClick={() => setChartMetricGroup("reach_views")}
                        className={`rounded px-2 py-1 font-semibold transition ${
                          chartMetricGroup === "reach_views"
                            ? "bg-white text-ink-950 shadow-sm"
                            : "text-ink-600 hover:text-ink-950"
                        }`}
                      >
                        Views & Reach
                      </button>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => num(v)} />
                      <Legend
                        formatter={(val) => {
                          const itemId = Number(val.replace("item_", ""));
                          const item = comparison.items.find((i) => i.id === itemId);
                          return item?.title ? `${item.title.slice(0, 18)}...` : val;
                        }}
                      />
                      {comparison.items.map((item, idx) => (
                        <Bar
                          key={item.id}
                          dataKey={`item_${item.id}`}
                          fill={ITEM_COLORS[idx % ITEM_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement Rate Comparison Bar */}
                <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink-950">
                      Engagement Rate Differential (%)
                    </h3>
                    <p className="text-[11px] text-ink-400">
                      Calculated as (Likes + Comments + Shares + Saves) ÷ Reach × 100
                    </p>

                    <div className="mt-4 space-y-4">
                      {comparison.items.map((item, idx) => {
                        const isWinner =
                          comparison.metrics.engagement_rate?.best_item_id === item.id;
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-ink-900 truncate max-w-[240px]">
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold tabular-nums text-teal-700">
                                  {pct(item.engagement_rate)}
                                </span>
                                {isWinner && (
                                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (item.engagement_rate / Math.max(1, comparison.metrics.engagement_rate?.max || 1)) * 100)}%`,
                                  backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metric Win Summary */}
                  <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-xs">
                    <span className="font-bold text-ink-900">Key Takeaway: </span>
                    <span className="text-ink-600">
                      “{comparison.metrics.engagement_rate?.best_item_title}” is leading in audience interaction efficiency at{" "}
                      <b>{pct(comparison.metrics.engagement_rate?.max)}</b> engagement rate.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-6 py-3">
          <span className="text-xs text-ink-500">
            CreatorIQ Content Analytics — Comparison Report
          </span>
          <button onClick={onClose} className="btn-primary py-1.5 text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

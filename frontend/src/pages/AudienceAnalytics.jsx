import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Eye,
  Radio,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Award,
  Activity,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
  Filters,
  DemoBanner,
  ChartCard,
  LoadDemoButton,
} from "../components/ui";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  PLATFORMS,
  num,
  compact,
  pct,
  shortDate,
  rangeParams,
  isoDate,
  normalizeRole,
  ROLE_LABEL,
} from "../utils/format";
import { useAuth } from "../context/AuthContext";

const PIE = ["#143A41", "#E8A317", "#2E8B6A", "#D4553E", "#5E8087", "#B5479B", "#A9BFC3"];
const DEVICE_COLORS = {
  Mobile: "#143A41",
  Desktop: "#E8A317",
  Tablet: "#2E8B6A",
};

function Donut({ data, unit = "%" }) {
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-xs text-ink-400">No distribution data available</div>;
  }
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={88}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name || i}
              fill={DEVICE_COLORS[entry.name] || PIE[i % PIE.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `${v}${unit}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function AudienceAnalytics() {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const canSwitchCreator = ["agency", "marketing", "admin"].includes(userRole);

  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState({
    start: isoDate(new Date(Date.now() - 29 * 864e5)),
    end: isoDate(new Date()),
  });
  const [platform, setPlatform] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState("");

  // Multi-role creator selector options
  const creatorsApi = useApi(
    canSwitchCreator ? "/api/audience/creators" : null,
    null,
    canSwitchCreator
  );
  const creatorOptions = creatorsApi.data || [];

  const params = {
    ...rangeParams(days, custom),
    platform: platform || undefined,
    user_id: selectedCreatorId ? Number(selectedCreatorId) : undefined,
  };

  const simpleParams = {
    platform: platform || undefined,
    user_id: selectedCreatorId ? Number(selectedCreatorId) : undefined,
  };

  const sum = useApi("/api/audience/summary", params);
  const growth = useApi("/api/audience/growth", params);
  const demographicsApi = useApi("/api/audience/demographics", simpleParams);
  const devicesApi = useApi("/api/audience/devices", simpleParams);
  const activeHoursApi = useApi("/api/audience/active-hours", {
    ...simpleParams,
    days: days === "custom" ? 30 : days,
  });
  const comparisonApi = useApi("/api/audience/platform-comparison", {
    ...rangeParams(days, custom),
    user_id: selectedCreatorId ? Number(selectedCreatorId) : undefined,
  });
  const insightsApi = useApi("/api/audience/insights", params);

  const reloadAll = () => {
    sum.reload();
    growth.reload();
    demographicsApi.reload();
    devicesApi.reload();
    activeHoursApi.reload();
    comparisonApi.reload();
    insightsApi.reload();
  };

  const d = sum.data;
  const demoData = demographicsApi.data;
  const devData = devicesApi.data;
  const activeData = activeHoursApi.data;
  const compData = comparisonApi.data;
  const insData = insightsApi.data;

  const hasAnyDemo =
    d?.has_demo ||
    demoData?.has_demo ||
    devData?.has_demo ||
    compData?.has_demo;

  const selectedCreatorLabel = useMemo(() => {
    if (!selectedCreatorId) return null;
    const found = creatorOptions.find((c) => String(c.id) === String(selectedCreatorId));
    return found ? found.full_name : null;
  }, [selectedCreatorId, creatorOptions]);

  return (
    <>
      <PageHeader
        title="Audience Demographics & Deep Insights"
        subtitle="Deep dive into who follows you, where they watch, device preferences, and optimal engagement windows."
      >
        <div className="flex flex-wrap items-center gap-3">
          {canSwitchCreator && creatorOptions.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 shadow-sm">
              <span className="text-xs font-semibold text-ink-500 whitespace-nowrap">
                {userRole === "agency"
                  ? "Roster Creator:"
                  : userRole === "marketing"
                  ? "Target Creator:"
                  : "Inspect Account:"}
              </span>
              <select
                value={selectedCreatorId}
                onChange={(e) => setSelectedCreatorId(e.target.value)}
                className="rounded-lg border-0 bg-transparent py-0.5 pl-1 pr-6 text-xs font-bold text-ink-900 focus:ring-0 cursor-pointer"
                aria-label="Select creator for audience analytics"
              >
                <option value="">{user?.full_name} (Self / Primary)</option>
                {creatorOptions
                  .filter((c) => c.id !== user?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({ROLE_LABEL[c.role] || c.role})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <Filters
            days={days}
            setDays={setDays}
            custom={custom}
            setCustom={setCustom}
            platform={platform}
            setPlatform={setPlatform}
            showPlatform
          />
        </div>
      </PageHeader>

      {/* Selected Creator Banner for Agency / Marketing / Admin */}
      {selectedCreatorLabel && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-signal/40 bg-signal-soft/30 px-4 py-2.5 text-xs text-ink-800">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-signal text-[10px] font-bold text-ink-950">
              ✓
            </span>
            <span>
              Viewing Audience Analytics for: <b className="font-bold text-ink-950">{selectedCreatorLabel}</b>
            </span>
          </div>
          <button
            onClick={() => setSelectedCreatorId("")}
            className="text-[11px] font-semibold text-signal-dark hover:underline"
          >
            Reset to Self
          </button>
        </div>
      )}

      {sum.loading && !d ? (
        <Spinner label="Loading audience analytics..." />
      ) : sum.error ? (
        <ErrorState message={sum.error} onRetry={reloadAll} />
      ) : d?.empty ? (
        <EmptyState
          title="No audience data for this selection"
          text="Load demo data to preview multi-platform audience demographics, device distributions, and active hours."
          action={<LoadDemoButton onDone={reloadAll} />}
        />
      ) : (
        <div className="space-y-6">
          {hasAnyDemo && <DemoBanner />}

          {/* Top Level KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <StatCard label="Total followers" value={num(d.cards.total_followers)} icon={Users} />
            <StatCard label="New followers" value={num(d.cards.new_followers)} icon={UserPlus} hint="Net in range" />
            <StatCard
              label="Follower growth"
              value={pct(d.cards.growth_pct)}
              icon={d.cards.growth_pct >= 0 ? TrendingUp : TrendingDown}
            />
            <StatCard label="Total Reach" value={num(d.cards.reach)} icon={Radio} />
            <StatCard label="Impressions" value={num(d.cards.impressions)} icon={Eye} />
            <StatCard
              label="Audience Health"
              value={`${insData?.audience_health_score ?? 88}/100`}
              icon={Award}
              hint={insData?.growth_indicators?.direction || "Stable"}
            />
          </div>

          {/* Audience Health & Growth Momentum Banner */}
          {insData && !insData.is_empty && (
            <div className="card border-l-4 border-l-signal">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-signal-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-signal-dark">
                      Audience Intelligence
                    </span>
                    <h3 className="font-display text-sm font-bold text-ink-950">Growth trend analysis</h3>
                    <span className="text-xs font-semibold text-ink-500">
                      (Trajectory: <b className="capitalize text-ink-950">{insData.growth_indicators.direction}</b>)
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink-800">{insData.summary}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className="block text-[11px] font-semibold text-ink-400 uppercase">Optimal Posting Window</span>
                  <span className="font-display text-sm font-bold text-signal-dark">
                    {activeData?.best_time_to_post || "18:00 - 21:00"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Historical Follower Trajectory Area Chart */}
          <ChartCard title="Follower Growth Trajectory" subtitle="Aggregated daily followers across connected channels" height={290}>
            {growth.loading && !growth.data ? (
              <Spinner />
            ) : growth.error ? (
              <ErrorState message={growth.error} onRetry={growth.reload} />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={growth.data.series}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8A317" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#E8A317" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} domain={["dataMin", "dataMax"]} />
                  <Tooltip labelFormatter={shortDate} formatter={(v) => [num(v), "Followers"]} />
                  <Area type="monotone" dataKey="total" name="Total Followers" stroke="#143A41" strokeWidth={2.5} fill="url(#growthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Demographics Suite: Age, Gender, Geography, Devices */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-950">Audience Demographics & Technology</h2>
                <p className="text-xs text-ink-500">Breakdown of age groups, gender balance, top locations, and client devices.</p>
              </div>
              {demoData?.insights && (
                <span className="hidden sm:inline-block rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600">
                  Top Market: <b className="text-ink-950">{demoData.insights.top_country}</b>
                </span>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Age Distribution */}
              <ChartCard title="Age Distribution" subtitle="% of follower base" height={240}>
                {demoData?.age_distribution?.length ? (
                  <ResponsiveContainer>
                    <BarChart data={demoData.age_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis unit="%" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="value" name="Share" fill="#143A41" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-xs text-ink-400">No age data</div>
                )}
              </ChartCard>

              {/* 2. Gender Distribution */}
              <ChartCard title="Gender Distribution" subtitle="Audience identity ratio" height={240}>
                <Donut data={demoData?.gender_distribution || d.gender} />
              </ChartCard>

              {/* 3. Geographic Locations */}
              <ChartCard title="Top Geographic Markets" subtitle="% by country/region" height={240}>
                <Donut data={demoData?.geographic_distribution || d.geo} />
              </ChartCard>

              {/* 4. Device Distribution */}
              <ChartCard title="Device Breakdown" subtitle="Mobile vs Desktop vs Tablet" height={240}>
                <Donut data={devData?.device_distribution || d.device} />
              </ChartCard>
            </div>

            {/* Device Insight Callout Banner */}
            {devData?.insights && (
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink-200/80 bg-white p-3.5 text-xs text-ink-700 shadow-sm">
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-900">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <b className="font-bold text-ink-950">{devData.insights.headline}</b>
                    <span className="rounded bg-signal-soft px-1.5 py-0.2 text-[10px] font-bold text-signal-dark">
                      RECOMMENDATION
                    </span>
                  </div>
                  <p className="mt-0.5 text-ink-600">{devData.insights.recommendation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Hours & Day-of-Week Scheduling */}
          <div>
            <div className="mb-3">
              <h2 className="font-display text-base font-bold text-ink-950">Active Hours & Best Posting Windows</h2>
              <p className="text-xs text-ink-500">Hourly audience presence index (0–100) and day-of-week engagement velocity.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* 24-Hour Activity Chart */}
              <ChartCard
                title="Hourly Follower Activity"
                subtitle={`Peak window: ${activeData?.best_time_to_post || "18:00 - 21:00"}`}
                height={260}
              >
                <ResponsiveContainer>
                  <BarChart data={activeData?.hourly_activity || d.active_hours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} index`, "Activity"]} />
                    <Bar
                      dataKey="activity"
                      name="Activity Index"
                      radius={[3, 3, 0, 0]}
                    >
                      {(activeData?.hourly_activity || d.active_hours).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.is_peak || (index >= 18 && index <= 21) ? "#E8A317" : "#143A41"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Day-of-Week Activity Trends */}
              <ChartCard
                title="Day-of-Week Growth Velocity"
                subtitle={`Strongest day: ${activeData?.best_day_of_week || "Friday"}`}
                height={260}
              >
                {activeData?.day_patterns?.length ? (
                  <ResponsiveContainer>
                    <BarChart data={activeData.day_patterns}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                      <XAxis dataKey="short_day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                      <Tooltip formatter={(v) => [num(v), "Avg New Followers"]} />
                      <Bar
                        dataKey="avg_new_followers"
                        name="Avg Daily Gain"
                        radius={[4, 4, 0, 0]}
                      >
                        {activeData.day_patterns.map((entry, idx) => (
                          <Cell
                            key={`day-${idx}`}
                            fill={entry.day === activeData.best_day_of_week ? "#E8A317" : "#2E8B6A"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-16 text-center text-xs text-ink-400">No day-pattern telemetry</div>
                )}
              </ChartCard>
            </div>
          </div>

          {/* Cross-Platform Comparison */}
          <div>
            <div className="mb-3">
              <h2 className="font-display text-base font-bold text-ink-950">Cross-Platform Comparison</h2>
              <p className="text-xs text-ink-500">Benchmarking followers, reach, impressions, and engagement rates across connected networks.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Platform Comparison Bar Chart */}
              <div className="lg:col-span-2">
                <ChartCard title="Audience Size vs Content Reach" subtitle="Followers and reach by platform" height={280}>
                  <ResponsiveContainer>
                    <BarChart
                      data={(compData?.platforms || d.platforms).map((p) => ({
                        ...p,
                        name: PLATFORM_LABEL[p.platform] || p.platform,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => num(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="followers" name="Followers" fill="#143A41" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reach" name="Total Reach" fill="#E8A317" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Share of Cross-Platform Audience Pie */}
              <ChartCard title="Audience Share" subtitle="% distribution by network" height={280}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={(compData?.platforms || d.platforms).map((p) => ({
                        name: PLATFORM_LABEL[p.platform] || p.platform,
                        value: p.follower_share_pct || p.followers,
                        platform: p.platform,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {(compData?.platforms || d.platforms).map((p) => (
                        <Cell
                          key={p.platform}
                          fill={PLATFORM_COLOR[p.platform] || "#143A41"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Platform Comparison Detail Table */}
            <div className="card mt-4 overflow-x-auto">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-ink-950">Detailed Platform Breakdown</h3>
                <span className="text-xs text-ink-500">
                  {compData?.totals?.connected_platforms_count || d.platforms.length} connected channels
                </span>
              </div>
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    <th className="py-2.5">Platform</th>
                    <th className="text-right">Total Followers</th>
                    <th className="text-right">Audience Share</th>
                    <th className="text-right">New Followers</th>
                    <th className="text-right">Growth %</th>
                    <th className="text-right">Total Reach</th>
                    <th className="text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {(compData?.platforms || d.platforms).map((p) => (
                    <tr key={p.platform} className="hover:bg-ink-50/50 transition">
                      <td className="py-3 font-medium flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: PLATFORM_COLOR[p.platform] || "#143A41" }}
                        />
                        <span className="text-ink-950">{PLATFORM_LABEL[p.platform] || p.platform}</span>
                      </td>
                      <td className="text-right tabular-nums font-semibold text-ink-950">{num(p.followers)}</td>
                      <td className="text-right tabular-nums text-xs font-medium text-ink-600">
                        {p.follower_share_pct ? pct(p.follower_share_pct) : "-"}
                      </td>
                      <td className="text-right tabular-nums text-emerald-700 font-medium">+{num(p.new_followers)}</td>
                      <td className="text-right tabular-nums font-medium">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                          p.growth_pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {pct(p.growth_pct)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums text-ink-700">{num(p.reach)}</td>
                      <td className="text-right tabular-nums text-ink-500">{num(p.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Audience Insights & Strategy Recommendations */}
          {insData?.key_recommendations && insData.key_recommendations.length > 0 && (
            <div className="card border-t-4 border-t-ink-950">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-signal" />
                <h2 className="font-display text-base font-bold text-ink-950">Audience Growth & Strategic Playbook</h2>
              </div>
              <p className="text-xs text-ink-600 mb-4">
                Algorithmic and demographic recommendations derived from your live audience telemetry:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {insData.key_recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/50 p-3.5 text-xs text-ink-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-dark mt-0.5" />
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

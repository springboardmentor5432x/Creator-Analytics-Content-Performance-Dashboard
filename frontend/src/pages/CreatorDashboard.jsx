import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Eye,
  Heart,
  TrendingUp,
  FilePlus2,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  UserCog,
  Link2,
  FlaskConical,
  Sparkles,
  BarChart2,
  Compass,
  ArrowUpRight,
  PlusCircle,
  Clock,
  Globe,
  Radio,
  Percent,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  useApi,
  Spinner,
  ErrorState,
  EmptyState,
  StatCard,
  Filters,
  DemoBanner,
  DemoBadge,
  ChartCard,
  LoadDemoButton,
  Alert,
} from "../components/ui";
import ContentForm from "../components/ContentForm";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  num,
  compact,
  pct,
  shortDate,
  rangeParams,
  isoDate,
} from "../utils/format";

const ACTION_ICON = {
  content_add: FilePlus2,
  content_edit: Pencil,
  content_delete: Trash2,
  login: LogIn,
  logout: LogOut,
  register: UserCog,
  profile: UserCog,
  connection: Link2,
  demo: FlaskConical,
};

const PIE_COLORS = ["#143A41", "#E8A317", "#2E8B6A", "#D4553E", "#5E8087", "#B5479B"];

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const today = isoDate(new Date());
  const [custom, setCustom] = useState({ start: isoDate(new Date(Date.now() - 29 * 864e5)), end: today });
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const params = rangeParams(days, custom);
  const { data, loading, error, reload } = useApi("/api/dashboard/overview", params);
  const contentSummary = useApi("/api/content/summary", params);
  const audienceSummary = useApi("/api/audience/summary", params);
  const connectionsApi = useApi("/api/connections");

  const handleSaved = (msg) => {
    setToastMsg(msg);
    reload();
    contentSummary.reload();
    audienceSummary.reload();
  };

  const firstName = user?.full_name?.split(" ")[0] || "Creator";

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-r from-ink-950 via-ink-900 to-ink-950 p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/20 px-3 py-1 text-xs font-bold text-signal">
                <Sparkles className="h-3.5 w-3.5" /> Content Creator Portal
              </span>
              {data?.has_demo && <DemoBadge />}
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              Welcome back, {firstName}! 🚀
            </h1>
            <p className="mt-1 max-w-xl text-sm text-ink-300">
              Here is your multi-platform content analytics, audience growth trajectory, and top-performing posts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 font-display text-sm font-bold text-ink-950 shadow-md transition hover:bg-signal-dark hover:text-white"
            >
              <PlusCircle className="h-4 w-4" /> Add Content
            </button>
            <Filters days={days} setDays={setDays} custom={custom} setCustom={setCustom} />
          </div>
        </div>
      </div>

      {toastMsg && (
        <Alert kind="success" onClose={() => setToastMsg("")}>
          {toastMsg}
        </Alert>
      )}

      {loading && !data ? (
        <Spinner label="Loading Creator analytics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data?.empty ? (
        <EmptyState
          title="No analytics yet for this creator"
          text="Add your first content record, or load realistic demo data to explore your creator performance."
          action={
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                Add Content
              </button>
              <LoadDemoButton onDone={reload} />
            </div>
          }
        />
      ) : (
        <>
          {data?.has_demo && <DemoBanner />}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total Posts"
              value={num(contentSummary.data?.totals?.posts ?? data?.recent_content?.length ?? 0)}
              icon={FilePlus2}
              hint="In selected timeframe"
            />
            <StatCard
              label="Total Views"
              value={num(data?.cards?.total_views)}
              icon={Eye}
              hint="Video & post views"
            />
            <StatCard
              label="Total Engagement"
              value={num(data?.cards?.total_engagement)}
              icon={Heart}
              hint="Likes, comments, shares"
            />
            <StatCard
              label="Audience Growth"
              value={pct(audienceSummary.data?.cards?.growth_pct ?? 12.4)}
              icon={TrendingUp}
              hint="Net growth rate"
            />
            <StatCard
              label="Total followers"
              value={num(data?.cards?.total_followers)}
              icon={Users}
              hint="Latest across platforms"
            />
            <StatCard
              label="Engagement rate"
              value={pct(data?.cards?.engagement_rate)}
              icon={Percent}
              hint="Engagement ÷ reach"
            />
          </div>

          {/* Performance Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Platform Content Performance" subtitle="Views vs. Engagement across active platforms">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(data?.platforms || []).map((p) => ({ ...p, name: PLATFORM_LABEL[p.platform] || p.platform }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => num(v)} />
                    <Bar dataKey="views" name="Views" fill="#143A41" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Engagement" fill="#E8A317" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Audience Demographics Snapshot */}
            <div className="card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-ink-950">Audience Snapshot</h2>
                  <Link to="/audience" className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline">
                    Full Analytics <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">Demographic breakdown of your top platform</p>

                {audienceSummary.data?.age?.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Age Distribution</p>
                    <div className="mt-2 space-y-2">
                      {audienceSummary.data.age.slice(0, 4).map((a) => (
                        <div key={a.name}>
                          <div className="flex justify-between text-xs font-medium">
                            <span>{a.name} yrs</span>
                            <span>{a.value}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                            <div className="h-full rounded-full bg-signal" style={{ width: `${a.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-ink-500">
                    <p>Load demo data to see age & geo demographics.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/70 p-3 text-xs">
                <span className="font-semibold text-ink-900">Total Followers: </span>
                <span className="font-bold text-signal-dark">{num(data.cards.total_followers)}</span>
              </div>
            </div>
          </div>

          {/* Top Performing Posts & Recent Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top Performing Posts */}
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between pb-3">
                <div>
                  <h2 className="font-display text-base font-bold text-ink-950">Top Performing Posts</h2>
                  <p className="text-xs text-ink-500">Ranked by engagement rate</p>
                </div>
                <Link to="/content" className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline">
                  All Content <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {contentSummary.data?.top_posts?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-xs font-semibold text-ink-400 uppercase">
                        <th className="py-2.5 pr-3">Rank & Title</th>
                        <th className="pr-3">Platform</th>
                        <th className="pr-3 text-right">Views</th>
                        <th className="text-right">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {contentSummary.data.top_posts.slice(0, 5).map((p, idx) => (
                        <tr key={p.id} className="transition hover:bg-ink-50/50">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                                  idx === 0
                                    ? "bg-amber-100 text-amber-800"
                                    : idx === 1
                                    ? "bg-slate-200 text-slate-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-ink-900 line-clamp-1">{p.title}</p>
                                <span className="text-[11px] text-ink-400">{shortDate(p.published_at)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="pr-3">
                            <span
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${PLATFORM_COLOR[p.platform]}15`,
                                color: PLATFORM_COLOR[p.platform],
                              }}
                            >
                              {PLATFORM_LABEL[p.platform]}
                            </span>
                          </td>
                          <td className="pr-3 text-right font-medium tabular-nums text-ink-700">{num(p.views)}</td>
                          <td className="text-right font-bold tabular-nums text-teal-700">{pct(p.engagement_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-ink-500">No content records found for this range.</p>
              )}
            </div>

            {/* Social Media Connections Status */}
            <div className="card">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-display text-base font-bold text-ink-950">Platform Status</h2>
                <Link to="/connections" className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline">
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {connectionsApi.data?.length ? (
                  connectionsApi.data.map((c) => (
                    <div
                      key={c.platform}
                      className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 text-xs transition hover:bg-ink-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLOR[c.platform] }} />
                        <span className="font-semibold text-ink-900">{c.name}</span>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          c.status === "demo"
                            ? "bg-signal-soft text-signal-dark"
                            : "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {c.status === "demo" ? "DEMO MODE" : "DISCONNECTED"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-500">Checking connections...</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Content and Activity */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="mb-3 font-display text-base font-bold text-ink-950">Recent Content Published</h2>
              {data.recent_content.length === 0 ? (
                <p className="text-sm text-ink-500">No recent posts found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-xs font-semibold text-ink-400 uppercase">
                        <th className="py-2 pr-3">Post Title</th>
                        <th className="pr-3">Platform</th>
                        <th className="pr-3 text-right">Views</th>
                        <th className="text-right">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {(data?.recent_content || []).map((c) => (
                        <tr key={c.id}>
                          <td className="py-2 pr-3">
                            <span className="font-medium text-ink-900">{c.title}</span>
                            {c.is_demo && <DemoBadge className="ml-1.5" />}
                            <div className="text-xs text-ink-400">{shortDate(c.published_at)}</div>
                          </td>
                          <td className="pr-3">{PLATFORM_LABEL[c.platform] || c.platform}</td>
                          <td className="pr-3 text-right tabular-nums font-medium text-ink-700">{num(c.views)}</td>
                          <td className="text-right tabular-nums font-bold text-ink-900">{pct(c.engagement_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity Stream */}
            <div className="card">
              <h2 className="mb-3 font-display text-base font-bold text-ink-950">Recent Activity</h2>
              {(!data?.recent_activity || data.recent_activity.length === 0) ? (
                <p className="text-sm text-ink-500">No recent activity recorded.</p>
              ) : (
                <ul className="space-y-3">
                  {(data.recent_activity || []).map((a) => {
                    const Icon = ACTION_ICON[a.action] || LogIn;
                    return (
                      <li key={a.id} className="flex gap-3 text-xs">
                        <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">{a.detail || a.action}</p>
                          <p className="text-[11px] text-ink-400">{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Add Content Modal */}
      {showAddModal && (
        <ContentForm
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

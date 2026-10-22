import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Target,
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  Calendar,
  DollarSign,
  PlusCircle,
  Eye,
  Heart,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
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
  Cell,
  Legend,
} from "recharts";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  useApi,
  Spinner,
  ErrorState,
  StatCard,
  DemoBanner,
  DemoBadge,
  ChartCard,
  Alert,
  Field,
} from "../components/ui";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  num,
  compact,
  pct,
  currency,
  shortDate,
} from "../utils/format";

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [searchCreator, setSearchCreator] = useState("");
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: "",
    client_name: "",
    platform: "all",
    budget: 20000,
    target_reach: 500000,
    status: "active",
    description: "",
  });
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { data, loading, error, reload } = useApi("/api/agency/overview", { days });

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.client_name) return;
    setCampaignBusy(true);
    try {
      await api.post("/api/agency/campaigns", {
        ...campaignForm,
        budget: Number(campaignForm.budget),
        target_reach: Number(campaignForm.target_reach),
      });
      setToastMsg("Brand campaign launched successfully!");
      setShowCampaignModal(false);
      reload();
    } catch (err) {
      setToastMsg(parseError(err).message);
    } finally {
      setCampaignBusy(false);
    }
  };

  const filteredCreators = (data?.creators_ranking || []).filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchCreator.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchCreator.toLowerCase()) ||
      c.primary_platform?.toLowerCase().includes(searchCreator.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Agency Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-900/30 bg-gradient-to-r from-ink-950 via-purple-950/80 to-ink-950 p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
                <Briefcase className="h-3.5 w-3.5" /> Talent Agency Console
              </span>
              {data?.has_demo && <DemoBadge />}
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              {user?.full_name} Agency Hub 🌟
            </h1>
            <p className="mt-1 max-w-xl text-sm text-purple-200/80">
              Manage your creator roster, track combined reach and engagement, and optimize brand campaign deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCampaignModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 font-display text-sm font-bold text-white shadow-md transition hover:bg-purple-600"
            >
              <PlusCircle className="h-4 w-4" /> Launch Campaign
            </button>
            <select
              aria-label="Filter timeframe"
              className="input w-auto bg-white/10 text-white border-white/20"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7} className="text-ink-950">Last 7 days</option>
              <option value={30} className="text-ink-950">Last 30 days</option>
              <option value={90} className="text-ink-950">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {toastMsg && (
        <Alert kind="success" onClose={() => setToastMsg("")}>
          {toastMsg}
        </Alert>
      )}

      {loading && !data ? (
        <Spinner label="Loading Agency insights..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {data?.has_demo && <DemoBanner />}

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Creators Managed"
              value={num(data.cards.total_creators)}
              icon={Users}
              hint="Active talent roster"
            />
            <StatCard
              label="Active Campaigns"
              value={num(data.cards.active_campaigns)}
              icon={Target}
              hint="Current brand partnerships"
            />
            <StatCard
              label="Total Content Published"
              value={num(data.cards.total_content)}
              icon={Layers}
              hint="Across all creators in range"
            />
            <StatCard
              label="Combined Views"
              value={num(data.cards.combined_views)}
              icon={Eye}
              hint="Total agency views"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Combined Reach"
              value={compact(data.cards.combined_reach)}
              icon={Award}
              hint="Total unique audience touched"
            />
            <StatCard
              label="Combined Engagement"
              value={num(data.cards.combined_engagement)}
              icon={Heart}
              hint="Total interactions generated"
            />
            <StatCard
              label="Average Engagement Rate"
              value={pct(data.cards.average_engagement_rate)}
              icon={Percent}
              hint="Weighted across all creator posts"
            />
          </div>

          {/* Top Performing Creators Podium */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-950">Top Performing Creators</h2>
                <p className="text-xs text-ink-500">Talent generating highest engagement and viewership</p>
              </div>
              <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                Top Tier
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(data?.top_creators || []).map((c, idx) => (
                <div
                  key={c.id}
                  className="relative flex flex-col justify-between rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold shadow-sm ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : idx === 1
                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                          : idx === 2
                          ? "bg-orange-100 text-orange-800 border border-orange-300"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-ink-950">{c.full_name}</p>
                      <span className="text-xs text-ink-500">{c.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-50 pt-3 text-xs">
                    <div>
                      <p className="text-ink-400">Views</p>
                      <p className="font-bold tabular-nums text-ink-950">{compact(c.views)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Eng. Rate</p>
                      <p className="font-bold tabular-nums text-teal-700">{pct(c.engagement_rate)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Followers</p>
                      <p className="font-bold tabular-nums text-ink-700">{compact(c.followers)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Posts</p>
                      <p className="font-bold tabular-nums text-ink-700">{c.posts_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Combined Content Performance & Platform Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Combined Platform Performance" subtitle="Total agency views and engagement distribution">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(data?.platforms || []).map((p) => ({ ...p, name: PLATFORM_LABEL[p.platform] || p.platform }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => num(v)} />
                    <Bar dataKey="views" name="Views" fill="#143A41" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Engagement" fill="#9333EA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Campaign Overview Snapshot */}
            <div id="campaigns" className="card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2">
                  <h2 className="font-display text-base font-bold text-ink-950">Active Brand Campaigns</h2>
                  <button
                    onClick={() => setShowCampaignModal(true)}
                    className="text-xs font-bold text-purple-700 hover:underline"
                  >
                    + New
                  </button>
                </div>
                <p className="mb-3 text-xs text-ink-500">Live deliverables for agency clients</p>

                <div className="space-y-3">
                  {(data?.campaigns || []).slice(0, 4).map((cmp) => (
                    <div key={cmp.id} className="rounded-xl border border-ink-100 p-3 text-xs transition hover:bg-ink-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink-900">{cmp.title}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            cmp.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {cmp.status}
                        </span>
                      </div>
                      <p className="mt-1 text-ink-500">Client: <b className="text-ink-800">{cmp.client_name}</b></p>
                      <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-600">
                        <span>Budget: {currency(cmp.budget)}</span>
                        <span>Reach: {compact(cmp.actual_reach)} / {compact(cmp.target_reach)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-ink-100 pt-3 text-center">
                <span className="text-xs text-ink-500">Total Active Campaigns: <b>{data.cards.active_campaigns}</b></span>
              </div>
            </div>
          </div>

          {/* Creator Management Table & Ranking */}
          <div id="creators" className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-950">Creator Roster Management</h2>
                <p className="text-xs text-ink-500">Performance rankings and talent catalog</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search creators or platform..."
                  className="input pl-9"
                  value={searchCreator}
                  onChange={(e) => setSearchCreator(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="py-3 pr-4">Creator</th>
                    <th className="pr-4">Primary Channel</th>
                    <th className="pr-4 text-right">Posts</th>
                    <th className="pr-4 text-right">Total Views</th>
                    <th className="pr-4 text-right">Engagement</th>
                    <th className="pr-4 text-right">Eng. Rate</th>
                    <th className="pr-4 text-right">Followers</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {filteredCreators?.map((c, i) => (
                    <tr key={c.id} className="transition hover:bg-ink-50/60">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-100 font-display text-xs font-extrabold text-purple-900">
                            {c.full_name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold text-ink-950">{c.full_name}</p>
                            <p className="text-xs text-ink-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="pr-4">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${PLATFORM_COLOR[c.primary_platform] || "#143A41"}15`,
                            color: PLATFORM_COLOR[c.primary_platform] || "#143A41",
                          }}
                        >
                          {PLATFORM_LABEL[c.primary_platform] || c.primary_platform}
                        </span>
                      </td>
                      <td className="pr-4 text-right tabular-nums font-medium text-ink-700">{c.posts_count}</td>
                      <td className="pr-4 text-right tabular-nums font-medium text-ink-900">{num(c.views)}</td>
                      <td className="pr-4 text-right tabular-nums font-medium text-ink-700">{compact(c.engagement)}</td>
                      <td className="pr-4 text-right tabular-nums font-bold text-teal-700">{pct(c.engagement_rate)}</td>
                      <td className="pr-4 text-right tabular-nums font-semibold text-ink-900">{compact(c.followers)}</td>
                      <td className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                            c.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Agency Activities & Reports */}
          <div id="reports" className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-display text-base font-bold text-ink-950">Recent Agency Activities</h2>
              <div className="space-y-3">
                {(!data?.recent_activities || data.recent_activities.length === 0) ? (
                  <p className="text-xs text-ink-500">No activities logged yet.</p>
                ) : (
                  (data.recent_activities || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg border border-ink-50 p-2.5 text-xs">
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-purple-100 text-purple-700">
                        <Award className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">{a.detail || a.action}</p>
                        <p className="text-[11px] text-ink-400">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reports and Analytics Summary */}
            <div className="card">
              <h2 className="mb-2 font-display text-base font-bold text-ink-950">Agency Reports & ROI</h2>
              <p className="mb-4 text-xs text-ink-500">Executive talent management overview</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Standard Agency Commission</span>
                  <span className="font-bold text-ink-900">15.0%</span>
                </div>
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Combined Active Audience</span>
                  <span className="font-bold text-purple-700">{compact(data?.cards?.combined_reach)} creators reach</span>
                </div>
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Top Performing Platform</span>
                  <span className="font-bold text-teal-700">
                    {data?.platforms?.[0] ? PLATFORM_LABEL[data.platforms[0].platform] || data.platforms[0].platform : "YouTube"}
                  </span>
                </div>
                <div className="rounded-lg bg-ink-50 p-3 text-ink-600">
                  <p className="font-semibold text-ink-900">Talent Retention:</p>
                  <p className="mt-1">100% active roster engagement across all managed creators in the selected period.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Launch Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateCampaign}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h2 className="font-display text-lg font-bold text-ink-950">Launch Agency Campaign</h2>
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="text-ink-400 hover:text-ink-950"
              >
                ✕
              </button>
            </div>

            <Field label="Campaign Title">
              <input
                className="input"
                required
                placeholder="e.g. Summer Creator Showcase"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
              />
            </Field>

            <Field label="Client / Brand Name">
              <input
                className="input"
                required
                placeholder="e.g. Nike, Sony, Gymshark"
                value={campaignForm.client_name}
                onChange={(e) => setCampaignForm({ ...campaignForm, client_name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget ($)">
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                />
              </Field>
              <Field label="Target Reach">
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={campaignForm.target_reach}
                  onChange={(e) => setCampaignForm({ ...campaignForm, target_reach: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowCampaignModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" disabled={campaignBusy}>
                {campaignBusy ? "Launching..." : "Launch Campaign"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

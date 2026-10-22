import { useState } from "react";
import {
  Megaphone,
  Target,
  Users,
  TrendingUp,
  DollarSign,
  Layers,
  PlusCircle,
  Eye,
  CheckCircle2,
  Clock,
  BarChart2,
  PieChart,
  Search,
  Filter,
  Trash2,
  Sparkles,
  ArrowUpRight,
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

export default function MarketingDashboard() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    platform: "instagram",
    budget: 25000,
    spent: 5000,
    target_reach: 500000,
    actual_reach: 120000,
    target_engagement: 30000,
    actual_engagement: 8500,
    status: "active",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { data, loading, error, reload } = useApi("/api/marketing/overview");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.client_name) return;
    setBusy(true);
    try {
      await api.post("/api/marketing/campaigns", {
        ...form,
        budget: Number(form.budget),
        spent: Number(form.spent),
        target_reach: Number(form.target_reach),
        actual_reach: Number(form.actual_reach),
        target_engagement: Number(form.target_engagement),
        actual_engagement: Number(form.actual_engagement),
      });
      setToastMsg("Campaign launched successfully!");
      setShowModal(false);
      reload();
    } catch (err) {
      setToastMsg(parseError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${title}"?`)) return;
    try {
      await api.delete(`/api/marketing/campaigns/${id}`);
      setToastMsg("Campaign removed.");
      reload();
    } catch (err) {
      setToastMsg(parseError(err).message);
    }
  };

  const filteredCampaigns = (data?.campaigns_list || []).filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch =
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Marketing Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-900/30 bg-gradient-to-r from-ink-950 via-rose-950/80 to-ink-950 p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300">
                <Megaphone className="h-3.5 w-3.5" /> Marketing Intelligence Suite
              </span>
              {data?.has_demo && <DemoBadge />}
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              Marketing Campaign Dashboard 🎯
            </h1>
            <p className="mt-1 max-w-xl text-sm text-rose-200/80">
              Measure campaign reach vs targets, content engagement, demographic targeting, and return on investment.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 font-display text-sm font-bold text-white shadow-md transition hover:bg-rose-600"
            >
              <PlusCircle className="h-4 w-4" /> Launch Campaign
            </button>
          </div>
        </div>
      </div>

      {toastMsg && (
        <Alert kind="success" onClose={() => setToastMsg("")}>
          {toastMsg}
        </Alert>
      )}

      {loading && !data ? (
        <Spinner label="Loading Marketing performance..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {data?.has_demo && <DemoBanner />}

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Campaigns"
              value={num(data.cards.total_campaigns)}
              icon={Target}
              hint={`${data.cards.active_campaigns} currently active`}
            />
            <StatCard
              label="Total Reach Achieved"
              value={compact(data.cards.total_reach)}
              icon={Users}
              hint={`Goal: ${compact(data.cards.target_reach)}`}
            />
            <StatCard
              label="Reach Completion"
              value={pct(data.cards.reach_completion_pct)}
              icon={TrendingUp}
              hint="Actual vs target reach"
            />
            <StatCard
              label="Content Engagement"
              value={compact(data.cards.total_engagement)}
              icon={Megaphone}
              hint="Interactions generated"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Total Campaign Budget"
              value={currency(data.cards.total_budget)}
              icon={DollarSign}
              hint="Allocated brand spend"
            />
            <StatCard
              label="Total Spend"
              value={currency(data.cards.total_spent)}
              icon={DollarSign}
              hint={`Utilization: ${pct(data.cards.budget_utilization_pct)}`}
            />
            <StatCard
              label="Completed Campaigns"
              value={num(data.cards.completed_campaigns)}
              icon={CheckCircle2}
              hint="Delivered milestones"
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Campaign Reach Performance" subtitle="Actual reach vs Target reach by campaign">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(data?.campaigns_list || []).slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => num(v)} />
                    <Legend />
                    <Bar dataKey="actual_reach" name="Actual Reach" fill="#E11D48" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target_reach" name="Target Reach" fill="#143A41" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Audience Insights Card */}
            <div id="audience" className="card flex flex-col justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-950">Target Audience Insights</h2>
                <p className="mb-4 text-xs text-ink-500">Demographic reach across active campaigns</p>

                <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Core Age Brackets</p>
                <div className="mt-2 space-y-2">
                  {(data?.audience_demographics?.age || []).slice(0, 4).map((a) => (
                    <div key={a.name}>
                      <div className="flex justify-between text-xs font-medium">
                        <span>{a.name} yrs</span>
                        <span className="font-bold text-rose-700">{a.value}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${a.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-ink-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Top Geographic Markets</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(data?.audience_demographics?.geo || []).slice(0, 4).map((g) => (
                      <span key={g.name} className="rounded-md border border-ink-100 bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-800">
                        {g.name} ({g.value}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 p-2.5 text-center text-xs text-rose-800">
                ✨ High conversion among 18-34 tech & lifestyle demographics.
              </div>
            </div>
          </div>

          {/* Top Performing Campaigns Showcase */}
          <div className="card">
            <h2 className="mb-3 font-display text-base font-bold text-ink-950">Top Performing Campaigns</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.top_campaigns || []).map((c, i) => (
                <div key={c.id} className="relative rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-950 line-clamp-1">{c.title}</span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">Client: <b className="text-ink-800">{c.client_name}</b></p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-50 pt-2 text-xs">
                    <div>
                      <p className="text-ink-400">Actual Reach</p>
                      <p className="font-bold text-ink-900">{compact(c.actual_reach)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Engagement</p>
                      <p className="font-bold text-rose-600">{compact(c.actual_engagement)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Budget Spent</p>
                      <p className="font-bold text-ink-700">{currency(c.spent)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">ROI Gain</p>
                      <p className="font-bold text-teal-600">+{c.roi_pct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Management Table */}
          <div id="campaigns" className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-950">Campaign Management</h2>
                <p className="text-xs text-ink-500">Live backend campaign records with tracking and controls</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search campaign or client..."
                    className="input pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter status"
                  className="input w-auto"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-semibold uppercase text-ink-400">
                    <th className="py-3 pr-3">Campaign & Client</th>
                    <th className="pr-3">Platform</th>
                    <th className="pr-3 text-right">Budget</th>
                    <th className="pr-3 text-right">Spent</th>
                    <th className="pr-3 text-right">Reach Progress</th>
                    <th className="pr-3 text-right">Engagements</th>
                    <th className="pr-3 text-center">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {filteredCampaigns?.map((c) => (
                    <tr key={c.id} className="transition hover:bg-ink-50/60">
                      <td className="py-3 pr-3">
                        <span className="font-bold text-ink-950">{c.title}</span>
                        {c.is_demo && <DemoBadge className="ml-1.5" />}
                        <div className="text-xs text-ink-500">Brand: {c.client_name}</div>
                      </td>
                      <td className="pr-3">
                        <span
                          className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${PLATFORM_COLOR[c.platform] || "#143A41"}15`,
                            color: PLATFORM_COLOR[c.platform] || "#143A41",
                          }}
                        >
                          {PLATFORM_LABEL[c.platform] || c.platform}
                        </span>
                      </td>
                      <td className="pr-3 text-right tabular-nums font-medium text-ink-700">{currency(c.budget)}</td>
                      <td className="pr-3 text-right tabular-nums font-medium text-ink-900">{currency(c.spent)}</td>
                      <td className="pr-3 text-right tabular-nums">
                        <span className="font-bold text-ink-950">{compact(c.actual_reach)}</span>
                        <span className="text-ink-400"> / {compact(c.target_reach)}</span>
                      </td>
                      <td className="pr-3 text-right tabular-nums font-semibold text-rose-600">{num(c.actual_engagement)}</td>
                      <td className="pr-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : c.status === "planning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(c.id, c.title)}
                          className="p-1 text-ink-400 hover:text-coral"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Marketing Activities & Reports */}
          <div id="reports" className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-display text-base font-bold text-ink-950">Recent Marketing Activities</h2>
              <div className="space-y-3">
                {(!data?.recent_activities || data.recent_activities.length === 0) ? (
                  <p className="text-xs text-ink-500">No marketing activity recorded yet.</p>
                ) : (
                  (data.recent_activities || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg border border-ink-50 p-2.5 text-xs">
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700">
                        <Target className="h-3.5 w-3.5" />
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

            <div className="card">
              <h2 className="mb-2 font-display text-base font-bold text-ink-950">Marketing Analytics & ROI Summary</h2>
              <p className="mb-4 text-xs text-ink-500">Key metrics for marketing stakeholders</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Average Cost Per Impression (estimated)</span>
                  <span className="font-bold text-ink-900">$0.024</span>
                </div>
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Goal Completion Rate</span>
                  <span className="font-bold text-rose-600">{pct(data.cards.reach_completion_pct)}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-ink-100 p-3">
                  <span className="text-ink-600">Active Channel Focus</span>
                  <span className="font-bold text-ink-900">Instagram, YouTube & TikTok</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Launch Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h2 className="font-display text-lg font-bold text-ink-950">Launch Marketing Campaign</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-950">
                ✕
              </button>
            </div>

            <Field label="Campaign Title">
              <input
                className="input"
                required
                placeholder="e.g. Q4 Cloud Product Buzz"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>

            <Field label="Brand / Client">
              <input
                className="input"
                required
                placeholder="e.g. Acme Corp, Google, Notion"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform">
                <select
                  className="input"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                >
                  <option value="all">All Channels</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="x">X</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </Field>

              <Field label="Initial Status">
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget ($)">
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </Field>
              <Field label="Target Reach">
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={form.target_reach}
                  onChange={(e) => setForm({ ...form, target_reach: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                {busy ? "Launching..." : "Launch Campaign"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

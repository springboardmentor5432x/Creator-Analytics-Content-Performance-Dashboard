import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  Loader2,
  X,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
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
import api, { parseError } from "../api/client";
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
  Field,
} from "../components/ui";
import {
  PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  REVENUE_SOURCES,
  REVENUE_SOURCE_LABEL,
  REVENUE_SOURCE_COLOR,
  currency,
  num,
  pct,
  shortDate,
  rangeParams,
  isoDate,
  RANGES,
} from "../utils/format";

const PIE_COLORS = ["#143A41", "#E8A317", "#2E8B6A", "#D4553E", "#B5479B", "#5E8087"];

export default function RevenueAnalytics() {
  const [days, setDays] = useState(90);
  const [custom, setCustom] = useState({
    start: isoDate(new Date(Date.now() - 89 * 864e5)),
    end: isoDate(new Date()),
  });
  const [platform, setPlatform] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState({ by: "date", order: "desc" });

  // Modal State for Add / Edit
  const [modalForm, setModalForm] = useState(null); // null = closed, object = open
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toastMsg, setToastMsg] = useState(null);

  const filterParams = {
    ...rangeParams(days, custom),
    platform: platform || undefined,
    source: source || undefined,
  };

  const summaryApi = useApi("/api/revenue/summary", filterParams);
  const recordsApi = useApi("/api/revenue/records", {
    ...filterParams,
    search: search || undefined,
    sort_by: sort.by,
    order: sort.order,
    page,
    page_size: pageSize,
  });

  const reloadAll = () => {
    summaryApi.reload();
    recordsApi.reload();
  };

  const openAddModal = () => {
    setModalForm({
      source: "sponsorships",
      platform: "youtube",
      amount: "",
      date: isoDate(new Date()),
      notes: "",
    });
    setModalError("");
  };

  const openEditModal = (rec) => {
    setModalForm({
      id: rec.id,
      source: rec.source,
      platform: rec.platform,
      amount: rec.amount,
      date: rec.date,
      notes: rec.notes || "",
    });
    setModalError("");
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!modalForm.amount || Number(modalForm.amount) < 0) {
      setModalError("Please enter a valid non-negative revenue amount.");
      return;
    }
    setModalBusy(true);
    setModalError("");
    try {
      const payload = {
        source: modalForm.source,
        platform: modalForm.platform,
        amount: Number(modalForm.amount),
        date: modalForm.date,
        notes: modalForm.notes.trim() || null,
      };

      if (modalForm.id) {
        await api.put(`/api/revenue/records/${modalForm.id}`, payload);
        setToastMsg({ kind: "success", text: "Revenue transaction updated." });
      } else {
        await api.post("/api/revenue/records", payload);
        setToastMsg({ kind: "success", text: "New revenue transaction recorded." });
      }
      setModalForm(null);
      reloadAll();
    } catch (err) {
      setModalError(parseError(err).message);
    } finally {
      setModalBusy(false);
    }
  };

  const handleDeleteRecord = async (rec) => {
    if (!window.confirm(`Delete this $${rec.amount.toFixed(2)} ${REVENUE_SOURCE_LABEL[rec.source]} record?`)) {
      return;
    }
    try {
      await api.delete(`/api/revenue/records/${rec.id}`);
      setToastMsg({ kind: "success", text: "Revenue record removed." });
      reloadAll();
    } catch (err) {
      setToastMsg({ kind: "error", text: parseError(err).message });
    }
  };

  const d = summaryApi.data;
  const isPositiveGrowth = (d?.cards?.growth_pct ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        subtitle="Track multi-platform earnings, monetization sources, and revenue growth trajectory."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <select
            aria-label="Date range"
            className="input w-auto text-xs"
            value={days}
            onChange={(e) => setDays(e.target.value === "custom" ? "custom" : Number(e.target.value))}
          >
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
            <option value="custom">Custom range</option>
          </select>

          {days === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                aria-label="Start date"
                type="date"
                className="input w-auto text-xs"
                value={custom.start}
                onChange={(e) => setCustom({ ...custom, start: e.target.value })}
              />
              <span className="text-ink-400">to</span>
              <input
                aria-label="End date"
                type="date"
                className="input w-auto text-xs"
                value={custom.end}
                onChange={(e) => setCustom({ ...custom, end: e.target.value })}
              />
            </div>
          )}

          {/* Revenue Source Filter */}
          <select
            aria-label="Revenue source filter"
            className="input w-auto text-xs"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All Sources</option>
            {REVENUE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {REVENUE_SOURCE_LABEL[s]}
              </option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            aria-label="Platform filter"
            className="input w-auto text-xs"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All Platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>

          {/* Add Revenue Action */}
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Revenue
          </button>
        </div>
      </PageHeader>

      {toastMsg && (
        <Alert kind={toastMsg.kind} onClose={() => setToastMsg(null)}>
          {toastMsg.text}
        </Alert>
      )}

      {summaryApi.loading && !d ? (
        <Spinner label="Calculating financial metrics…" />
      ) : summaryApi.error ? (
        <ErrorState message={summaryApi.error} onRetry={reloadAll} />
      ) : d.empty && !recordsApi.data?.total ? (
        <EmptyState
          title="No Revenue Data Recorded Yet"
          text="Track your sponsorships, ad payouts, affiliate income, and subscriptions all in one place. Load demo data to explore the revenue dashboard."
          action={
            <div className="flex gap-2.5">
              <LoadDemoButton onDone={reloadAll} label="Load Sample Revenue Data" />
              <button onClick={openAddModal} className="btn-secondary">
                Record First Transaction
              </button>
            </div>
          }
        />
      ) : (
        <>
          {d.has_demo && <DemoBanner />}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={currency(d.cards.total_revenue)}
              icon={DollarSign}
              hint="Filtered range total"
            />
            <StatCard
              label="Current Month"
              value={currency(d.cards.current_month_revenue)}
              icon={Calendar}
              hint="MTD calendar earnings"
            />
            <StatCard
              label="Previous Month"
              value={currency(d.cards.previous_month_revenue)}
              icon={CreditCard}
              hint="Prior full calendar month"
            />
            <div className="card">
              <div className="flex items-center justify-between text-ink-500">
                <span className="text-sm font-medium">Revenue Growth</span>
                {isPositiveGrowth ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold sm:text-3xl tabular-nums">
                  {pct(d.cards.growth_pct)}
                </span>
                <span
                  className={`inline-flex items-center text-xs font-bold ${
                    isPositiveGrowth ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isPositiveGrowth ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  MoM
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">Month-over-month trajectory</p>
            </div>
          </div>

          {/* Revenue Visualizations */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Monthly Trend Area Chart (spans 2 columns) */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Monthly Revenue Trend"
                subtitle="Trajectory and historical growth across months"
                height={300}
              >
                {d.monthly_trends?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.monthly_trends}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#143A41" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#143A41" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `$${num(v)}`}
                        tick={{ fontSize: 11 }}
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        formatter={(val) => [currency(val), "Revenue"]}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total Revenue"
                        stroke="#143A41"
                        strokeWidth={2.5}
                        fill="url(#revGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-ink-400">
                    No trend records available for current filter.
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Revenue by Source Donut Chart */}
            <ChartCard
              title="Revenue Sources Breakdown"
              subtitle="Contribution by monetization stream"
              height={300}
            >
              {d.breakdown_by_source?.filter((s) => s.amount > 0).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={d.breakdown_by_source.filter((s) => s.amount > 0)}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {d.breakdown_by_source
                        .filter((s) => s.amount > 0)
                        .map((entry) => (
                          <Cell
                            key={entry.source}
                            fill={REVENUE_SOURCE_COLOR[entry.source] || "#143A41"}
                          />
                        ))}
                    </Pie>
                    <Tooltip formatter={(val) => currency(val)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-ink-400">
                  No source breakdown available.
                </div>
              )}
            </ChartCard>
          </div>

          {/* Platform-wise Revenue & Sources Summary Table */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Platform Revenue Distribution BarChart */}
            <ChartCard
              title="Platform-wise Revenue"
              subtitle="Earnings generated per social platform"
              height={260}
            >
              {d.platform_breakdown?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.platform_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `$${num(v)}`}
                      tick={{ fontSize: 11 }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip formatter={(val) => [currency(val), "Revenue"]} />
                    <Bar dataKey="amount" name="Revenue" radius={[4, 4, 0, 0]}>
                      {d.platform_breakdown.map((entry) => (
                        <Cell
                          key={entry.platform}
                          fill={PLATFORM_COLOR[entry.platform] || "#143A41"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-ink-400">
                  No platform revenue found.
                </div>
              )}
            </ChartCard>

            {/* Sources Table */}
            <div className="card">
              <h2 className="font-display text-base font-bold">Monetization Streams Breakdown</h2>
              <p className="mb-3 text-xs text-ink-500">Performance across all 5 revenue categories</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-ink-500">
                      <th className="py-2 font-medium">Source</th>
                      <th className="py-2 text-right font-medium">Transactions</th>
                      <th className="py-2 text-right font-medium">Total Amount</th>
                      <th className="py-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.breakdown_by_source.map((s) => (
                      <tr key={s.source} className="border-b border-ink-50">
                        <td className="py-2.5 font-medium flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: REVENUE_SOURCE_COLOR[s.source] }}
                          />
                          {s.label}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-ink-600">
                          {s.count}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-bold text-ink-950">
                          {currency(s.amount)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-ink-600">
                          {pct(s.percentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Revenue Transactions Table */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Revenue Transactions</h2>
                <p className="text-xs text-ink-500">
                  Manage individual payouts, sponsorship brand deals, and creator earnings.
                </p>
              </div>

              {/* Table search & sort */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search notes or source…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="input py-1 pl-8 text-xs w-48 sm:w-64"
                  />
                </div>
              </div>
            </div>

            {recordsApi.loading && !recordsApi.data ? (
              <Spinner label="Loading transaction records…" />
            ) : recordsApi.data?.items?.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-500">
                No matching revenue transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-ink-500">
                      <th
                        className="cursor-pointer py-2 font-medium hover:text-ink-950"
                        onClick={() =>
                          setSort({
                            by: "date",
                            order: sort.by === "date" && sort.order === "desc" ? "asc" : "desc",
                          })
                        }
                      >
                        Date {sort.by === "date" && (sort.order === "desc" ? "↓" : "↑")}
                      </th>
                      <th className="py-2 font-medium">Source</th>
                      <th className="py-2 font-medium">Platform</th>
                      <th
                        className="cursor-pointer py-2 text-right font-medium hover:text-ink-950"
                        onClick={() =>
                          setSort({
                            by: "amount",
                            order: sort.by === "amount" && sort.order === "desc" ? "asc" : "desc",
                          })
                        }
                      >
                        Amount {sort.by === "amount" && (sort.order === "desc" ? "↓" : "↑")}
                      </th>
                      <th className="py-2 font-medium pl-4">Notes / Client</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recordsApi.data?.items || []).map((rec) => (
                      <tr key={rec.id} className="border-b border-ink-50 transition hover:bg-ink-50/50">
                        <td className="py-2.5 font-medium tabular-nums">{shortDate(rec.date)}</td>
                        <td className="py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${REVENUE_SOURCE_COLOR[rec.source]}15`,
                              color: REVENUE_SOURCE_COLOR[rec.source],
                            }}
                          >
                            {REVENUE_SOURCE_LABEL[rec.source]}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: PLATFORM_COLOR[rec.platform] }}
                          />
                          {PLATFORM_LABEL[rec.platform]}
                        </td>
                        <td className="py-2.5 text-right font-bold text-ink-950 tabular-nums">
                          {currency(rec.amount)}
                        </td>
                        <td className="py-2.5 text-ink-600 pl-4 max-w-xs truncate">
                          {rec.notes || <span className="text-ink-400 italic">None</span>}
                          {rec.is_demo && <DemoBadge className="ml-2 text-[10px]" />}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(rec)}
                              className="rounded p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-950"
                              aria-label={`Edit ${rec.source} transaction`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec)}
                              className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              aria-label={`Delete ${rec.source} transaction`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {recordsApi.data?.pages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
                    <span>
                      Page <b>{recordsApi.data.page}</b> of <b>{recordsApi.data.pages}</b> (
                      {recordsApi.data.total} records)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        disabled={page >= recordsApi.data.pages}
                        onClick={() => setPage(page + 1)}
                        className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Revenue Modal */}
      {modalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={() => !modalBusy && setModalForm(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-ink-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h2 className="font-display text-lg font-bold">
                {modalForm.id ? "Edit Revenue Record" : "Record New Revenue"}
              </h2>
              <button
                disabled={modalBusy}
                onClick={() => setModalForm(null)}
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3">
                <Alert kind="error" onClose={() => setModalError("")}>
                  {modalError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="mt-4 space-y-4 text-xs">
              <Field label="Revenue Source">
                <select
                  className="input"
                  value={modalForm.source}
                  onChange={(e) => setModalForm({ ...modalForm, source: e.target.value })}
                >
                  {REVENUE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {REVENUE_SOURCE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Platform">
                <select
                  className="input"
                  value={modalForm.platform}
                  onChange={(e) => setModalForm({ ...modalForm, platform: e.target.value })}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABEL[p]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount ($ USD)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2500"
                    className="input"
                    value={modalForm.amount}
                    onChange={(e) => setModalForm({ ...modalForm, amount: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Transaction Date">
                  <input
                    type="date"
                    className="input"
                    value={modalForm.date}
                    onChange={(e) => setModalForm({ ...modalForm, date: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <Field label="Notes / Client Details (Optional)">
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Nike Summer Video Deal or AdSense Payout"
                  className="input"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                />
              </Field>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-ink-100 pt-4">
                <button
                  type="button"
                  disabled={modalBusy}
                  onClick={() => setModalForm(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" disabled={modalBusy} className="btn-primary shadow-sm">
                  {modalBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modalForm.id ? "Update Transaction" : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useMemo } from "react";
import {
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  PieChart as PieIcon,
  Info,
  Sparkles,
  ShieldCheck,
  Check,
  Eye,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from "recharts";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
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
  Alert,
  Field
} from "../components/ui";
import {
  PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  currency,
  num,
  compact,
  pct,
  shortDate,
  isoDate,
  normalizeRole
} from "../utils/format";

// -----------------------------------------------------------------------------
// Safe Formatting Helpers (Display 'N/A' instead of 0 or crashing when unavailable)
// -----------------------------------------------------------------------------
const formatMoney = (val) => {
  if (val === null || val === undefined) return "N/A";
  return currency(val);
};

const formatPct = (val) => {
  if (val === null || val === undefined) return "N/A";
  return pct(val);
};

const formatRatio = (val) => {
  if (val === null || val === undefined) return "N/A";
  return `${Number(val).toFixed(2)}x`;
};

const formatCount = (val) => {
  if (val === null || val === undefined) return "N/A";
  return num(val);
};

const formatRate = (val) => {
  if (val === null || val === undefined) return "N/A";
  return `$${Number(val).toFixed(2)}`;
};

const STATUS_BADGE = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  planning: "bg-amber-50 text-amber-700 border-amber-200",
  paused: "bg-ink-100 text-ink-600 border-ink-200"
};

export default function CampaignROI() {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const isCreator = userRole === "creator";
  const canManage = userRole === "marketing" || userRole === "agency" || userRole === "admin";

  // Filter States
  const [includeDemo, setIncludeDemo] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");
  const [costMode, setCostMode] = useState("authoritative");
  const [days, setDays] = useState("30");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [chartTab, setChartTab] = useState("revenue");

  // Export State
  const [exportLoading, setExportLoading] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCreatorExportMenu, setShowCreatorExportMenu] = useState(false);

  // Modal State for Adding Performance Milestone
  const [showModal, setShowModal] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [formData, setFormData] = useState({
    campaign_id: "",
    creator_id: "",
    impressions: 50000,
    reach: 40000,
    engagements: 2500,
    clicks: 1200,
    conversions: 60,
    revenue: 2400,
    reporting_date: isoDate(new Date()),
    data_source: "platform"
  });

  // Construct Query Params for Overview API
  const summaryParams = useMemo(() => {
    const p = {
      include_demo: includeDemo,
      cost_mode: costMode,
    };
    if (statusFilter) p.status = statusFilter;
    if (platformFilter) p.platform = platformFilter;
    return p;
  }, [includeDemo, costMode, statusFilter, platformFilter]);

  // Load Multi-Campaign Summary API
  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
    reload: reloadSummary
  } = useApi("/api/campaigns/roi/summary", summaryParams);

  // Available campaigns list for selector
  const campaignsList = summaryData?.campaigns || [];

  // When a specific campaign is selected, construct query params
  const singleCampaignParams = useMemo(() => {
    if (selectedCampaignId === "all") return null;
    const p = { cost_mode: costMode };
    if (days === "custom" && customRange.start && customRange.end) {
      p.start_date = customRange.start;
      p.end_date = customRange.end;
    } else if (days !== "all") {
      p.days = Number(days);
    }
    return p;
  }, [selectedCampaignId, costMode, days, customRange]);

  // Load Single Campaign ROI API (when specific campaign selected)
  const isSingle = selectedCampaignId !== "all";
  const {
    data: singleRoi,
    loading: singleLoading,
    error: singleError,
    reload: reloadSingleRoi
  } = useApi(
    isSingle ? `/api/campaigns/${selectedCampaignId}/roi` : null,
    singleCampaignParams,
    isSingle
  );

  // Load Periodic Performance Milestones for Single Campaign
  const {
    data: perfMilestones,
    loading: perfLoading,
    reload: reloadPerf
  } = useApi(
    isSingle ? `/api/campaigns/${selectedCampaignId}/performance` : null,
    singleCampaignParams,
    isSingle
  );

  // Load Creator-Level Performance Breakdown for Single Campaign
  const {
    data: creatorPerfs,
    loading: creatorLoading,
    reload: reloadCreators
  } = useApi(
    isSingle ? `/api/campaigns/${selectedCampaignId}/creators/performance` : null,
    singleCampaignParams,
    isSingle
  );

  // Load Financial Breakdown
  const {
    data: breakdownData,
    reload: reloadBreakdown
  } = useApi(
    isSingle ? `/api/campaigns/${selectedCampaignId}/breakdown` : null,
    { cost_mode: costMode },
    isSingle
  );

  const reloadAll = () => {
    reloadSummary();
    if (isSingle) {
      reloadSingleRoi();
      reloadPerf();
      reloadCreators();
      reloadBreakdown();
    }
  };

  // Identify currently active data source
  const currentSummary = isSingle ? singleRoi : null;
  const costData = isSingle ? currentSummary?.cost : null;
  const revenueData = isSingle ? currentSummary?.revenue : null;
  const metricsData = isSingle ? currentSummary?.metrics : null;
  const totalsData = isSingle ? currentSummary?.totals : null;

  // Ambiguity check
  const hasAmbiguity = isSingle
    ? Boolean(costData?.has_cost_ambiguity)
    : campaignsList.some((c) => c.cost?.has_cost_ambiguity);

  // Handlers for Milestone Creation
  const handleOpenModal = () => {
    setFormData({
      campaign_id: selectedCampaignId !== "all" ? selectedCampaignId : (campaignsList[0]?.campaign_id || ""),
      creator_id: "",
      impressions: 50000,
      reach: 40000,
      engagements: 2500,
      clicks: 1200,
      conversions: 60,
      revenue: 2400,
      reporting_date: isoDate(new Date()),
      data_source: "platform"
    });
    setFormError("");
    setShowModal(true);
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!formData.campaign_id) {
      setFormError("Please select a target campaign.");
      return;
    }
    setFormBusy(true);
    setFormError("");
    try {
      const payload = {
        campaign_id: Number(formData.campaign_id),
        creator_id: formData.creator_id ? Number(formData.creator_id) : null,
        impressions: Number(formData.impressions) || 0,
        reach: Number(formData.reach) || 0,
        engagements: Number(formData.engagements) || 0,
        clicks: Number(formData.clicks) || 0,
        conversions: Number(formData.conversions) || 0,
        revenue: Number(formData.revenue) || 0,
        reporting_date: formData.reporting_date,
        data_source: formData.data_source
      };
      await api.post(`/api/campaigns/${payload.campaign_id}/performance`, payload);
      setToastMsg("Performance milestone recorded successfully!");
      setShowModal(false);
      reloadAll();
    } catch (err) {
      setFormError(parseError(err).message);
    } finally {
      setFormBusy(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Export Handlers (Phase 7.5 Reports Engine)
  // ---------------------------------------------------------------------------
  const handleExportCampaigns = async (format) => {
    setExportLoading(`camp-${format}`);
    setShowExportMenu(false);
    try {
      const isSingleCamp = selectedCampaignId !== "all";
      const endpoint = isSingleCamp
        ? `/api/reports/campaigns/${selectedCampaignId}/export`
        : `/api/reports/campaigns/export`;

      const params = {
        format,
        cost_mode: costMode,
        include_demo: includeDemo,
      };
      if (statusFilter) params.status = statusFilter;
      if (platformFilter) params.platform = platformFilter;
      if (days === "custom" && customRange.start && customRange.end) {
        params.start_date = customRange.start;
        params.end_date = customRange.end;
      } else if (days !== "all") {
        params.days = Number(days);
      }

      const res = await api.get(endpoint, {
        params,
        responseType: "blob",
      });

      let filename = `creatorIQ-${isSingleCamp ? `campaign-${selectedCampaignId}` : "campaigns-summary"}-${isoDate(new Date())}.${format}`;
      const disposition = res.headers["content-disposition"];
      if (disposition) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) filename = match[1];
      }

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setToastMsg(`Successfully exported ${format.toUpperCase()} report: ${filename}`);
    } catch (err) {
      const parsed = parseError(err);
      setToastMsg(`Export failed: ${parsed.message}`);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportCreators = async (format) => {
    setExportLoading(`creator-${format}`);
    setShowCreatorExportMenu(false);
    try {
      const isSingleCamp = selectedCampaignId !== "all";
      const params = {
        format,
        include_demo: includeDemo,
      };
      if (isSingleCamp) {
        params.campaign_id = Number(selectedCampaignId);
      }
      if (days === "custom" && customRange.start && customRange.end) {
        params.start_date = customRange.start;
        params.end_date = customRange.end;
      } else if (days !== "all") {
        params.days = Number(days);
      }

      const res = await api.get("/api/reports/creators/export", {
        params,
        responseType: "blob",
      });

      let filename = `creatorIQ-creator-performance-${isoDate(new Date())}.${format}`;
      const disposition = res.headers["content-disposition"];
      if (disposition) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) filename = match[1];
      }

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setToastMsg(`Successfully exported creator ${format.toUpperCase()} report: ${filename}`);
    } catch (err) {
      const parsed = parseError(err);
      setToastMsg(`Export failed: ${parsed.message}`);
    } finally {
      setExportLoading(null);
    }
  };

  // Prepare Chart Data
  const milestoneChartData = useMemo(() => {
    if (!perfMilestones?.items) return [];
    return [...perfMilestones.items]
      .sort((a, b) => new Date(a.reporting_date) - new Date(b.reporting_date))
      .map((item) => ({
        date: shortDate(item.reporting_date),
        revenue: item.revenue || 0,
        impressions: item.impressions || 0,
        reach: item.reach || 0,
        engagements: item.engagements || 0,
        clicks: item.clicks || 0,
        conversions: item.conversions || 0,
        ctr: item.click_through_rate || 0,
        convRate: item.conversion_rate || 0
      }));
  }, [perfMilestones]);

  const overviewCampaignsChartData = useMemo(() => {
    if (!summaryData?.campaigns) return [];
    return summaryData.campaigns.map((c) => ({
      name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
      cost: c.cost?.total_campaign_cost ?? 0,
      revenue: c.revenue?.attributed_revenue ?? 0,
      budget: c.cost?.budget ?? 0,
      roi: c.metrics?.roi_pct ?? 0,
      roas: c.metrics?.roas ?? 0,
      reach: c.totals?.reach ?? 0,
      impressions: c.totals?.impressions ?? 0
    }));
  }, [summaryData]);

  if (summaryLoading && !summaryData) {
    return <Spinner label="Loading Campaign ROI intelligence…" />;
  }

  if (summaryError && !summaryData) {
    return <ErrorState message={summaryError} onRetry={reloadAll} />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* --------------------------------------------------------------------- */}
      {/* 1. Header & Primary Controls */}
      {/* --------------------------------------------------------------------- */}
      <PageHeader
        title="Campaign ROI & Performance Dashboard"
        subtitle="Track authoritative campaign costs, attributed revenue, ROAS, CPM, and creator deliverables."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Demo Toggle Button */}
          <button
            onClick={() => setIncludeDemo(!includeDemo)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              includeDemo
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
            }`}
            title="Toggle generated sample demo campaigns"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {includeDemo ? "Demo Data: Active" : "Demo Data: Hidden"}
          </button>

          {/* Record Performance Milestone Button (Only for Manager Roles) */}
          {canManage && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-1.5 text-xs font-bold text-ink-950 shadow-sm transition hover:bg-signal/90"
            >
              <Plus className="h-4 w-4" /> Record Milestone
            </button>
          )}

          {/* Export Report Dropdown (Phase 7.5 Engine) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={Boolean(exportLoading)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition hover:bg-ink-50 disabled:opacity-50"
              title="Export reports in CSV, XLSX, or PDF"
            >
              {exportLoading?.startsWith("camp-") ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-ink-500" />
              ) : (
                <Download className="h-3.5 w-3.5 text-ink-600" />
              )}
              <span>Export Report</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-lg border border-ink-200 bg-white p-1.5 shadow-lg space-y-1"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  {selectedCampaignId !== "all" ? "Campaign Deep Dive" : "Consolidated Overview"}
                </div>
                <button
                  onClick={() => handleExportCampaigns("csv")}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 hover:text-ink-950 font-medium"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  <span>CSV Spreadsheet (.csv)</span>
                </button>
                <button
                  onClick={() => handleExportCampaigns("xlsx")}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 hover:text-ink-950 font-medium"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                  <span>Excel Workbook (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportCampaigns("pdf")}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 hover:text-ink-950 font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-rose-600" />
                  <span>PDF Document (.pdf)</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={reloadAll}
            className="btn-ghost p-1.5 text-ink-500 hover:text-ink-900"
            title="Refresh analytics data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </PageHeader>

      {/* Demo Banner Notification */}
      {includeDemo && summaryData?.has_demo && (
        <DemoBanner />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <Alert kind="success" onClose={() => setToastMsg("")}>
          {toastMsg}
        </Alert>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. Global Filter Controls Bar */}
      {/* --------------------------------------------------------------------- */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Analytics Controls</span>
          </div>
          <div className="text-xs text-ink-500">
            Accounting Mode: <span className="font-semibold text-ink-800 uppercase">{costMode}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Campaign Selector */}
          <div>
            <label className="label">Campaign</label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="input w-full text-xs font-medium"
            >
              <option value="all">Consolidated Overview (All Campaigns)</option>
              {campaignsList.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  {c.is_demo ? "[DEMO] " : ""}{c.title} ({c.client_name})
                </option>
              ))}
            </select>
          </div>

          {/* Cost Accounting Mode Selector */}
          <div>
            <label className="label" title="Controls how Campaign.spent and talent liabilities are reconciled">
              Cost Accounting Mode
            </label>
            <select
              value={costMode}
              onChange={(e) => setCostMode(e.target.value)}
              className="input w-full text-xs font-medium"
            >
              <option value="authoritative">Authoritative (Detect Ambiguity)</option>
              <option value="inclusive">Inclusive (Spent Includes Talent)</option>
              <option value="additive">Additive (Direct Media + Talent)</option>
              <option value="direct_only">Direct Spend Only</option>
              <option value="talent_only">Talent Spend Only</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="label">Timeframe Window</label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="input w-full text-xs font-medium"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Campaign Milestones</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Status or Custom Date Inputs */}
          {days === "custom" ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input w-full text-xs"
                  value={customRange.start}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input w-full text-xs"
                  value={customRange.end}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Campaign Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full text-xs font-medium"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="planning">Planning</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. Cost Ambiguity Warning Alert (Strict Accounting Rule) */}
      {/* --------------------------------------------------------------------- */}
      {hasAmbiguity && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900">
                Cost Accounting Ambiguity Detected
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                {costData?.cost_ambiguity_note ||
                  "Both Campaign.spent and active creator talent commitments exist for this campaign. The data model cannot establish whether Campaign.spent is inclusive or exclusive of talent without an explicit declaration. Total cost and ROI are reported as N/A to prevent publishing inaccurate financial figures."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-900">Resolve by selecting:</span>
                <button
                  onClick={() => setCostMode("inclusive")}
                  className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                >
                  Inclusive Mode (Spent includes talent)
                </button>
                <button
                  onClick={() => setCostMode("additive")}
                  className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                >
                  Additive Mode (Direct media + talent liabilities)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. Core KPI Stat Cards Grid (With safe N/A handling) */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Total Cost */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Campaign Cost</span>
            <DollarSign className="h-4 w-4 text-ink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle
              ? formatMoney(costData?.total_campaign_cost)
              : formatMoney(summaryData?.total_cost)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Budget: {isSingle ? currency(costData?.budget) : currency(summaryData?.total_budget)}
          </p>
        </div>

        {/* Attributed Revenue */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Attributed Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-emerald-600 sm:text-3xl">
            {isSingle
              ? formatMoney(revenueData?.attributed_revenue)
              : formatMoney(summaryData?.total_attributed_revenue)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="capitalize">
              {isSingle ? (revenueData?.attribution_status || "verified") : "Verified Milestones"}
            </span>
          </div>
        </div>

        {/* ROI (%) */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Campaign ROI</span>
            <Target className="h-4 w-4 text-signal-dark" />
          </div>
          <p className={`mt-2 font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${
            (isSingle ? metricsData?.roi_pct : summaryData?.overall_roi_pct) > 0
              ? "text-emerald-600"
              : (isSingle ? metricsData?.roi_pct : summaryData?.overall_roi_pct) < 0
              ? "text-coral"
              : "text-ink-800"
          }`}>
            {isSingle ? formatPct(metricsData?.roi_pct) : formatPct(summaryData?.overall_roi_pct)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Net: {isSingle ? formatMoney(metricsData?.net_profit) : "Consolidated"}
          </p>
        </div>

        {/* ROAS */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Return on Ad Spend (ROAS)</span>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-purple-700 sm:text-3xl">
            {isSingle ? formatRatio(metricsData?.roas) : formatRatio(summaryData?.overall_roas)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Attributed Rev / Total Cost</p>
        </div>

        {/* CPM */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">CPM (Cost / 1k Imp)</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatRate(metricsData?.cpm) : formatRate(summaryData?.overall_cpm)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Cost efficiency per thousand</p>
        </div>

        {/* CPE */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">CPE (Cost / Engagement)</span>
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatRate(metricsData?.cpe) : formatRate(summaryData?.overall_cpe)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Cost per direct interaction</p>
        </div>

        {/* CTR (%) */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Click-Through Rate (CTR)</span>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatPct(metricsData?.ctr) : "N/A"}
          </p>
          <p className="mt-1 text-xs text-ink-500">Clicks / Impressions × 100</p>
        </div>

        {/* Conversion Rate (%) */}
        <div className="card">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatPct(metricsData?.conversion_rate) : "N/A"}
          </p>
          <p className="mt-1 text-xs text-ink-500">Conversions / Clicks × 100</p>
        </div>

        {/* Impressions & Reach */}
        <div className="card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Audience Reach</span>
            <Eye className="h-4 w-4 text-ink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatCount(totalsData?.reach) : formatCount(summaryData?.total_impressions)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Impressions: {isSingle ? formatCount(totalsData?.impressions) : formatCount(summaryData?.total_impressions)}
          </p>
        </div>

        {/* Engagements & Clicks */}
        <div className="card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-ink-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Engagements</span>
            <Users className="h-4 w-4 text-ink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink-950 sm:text-3xl">
            {isSingle ? formatCount(totalsData?.engagements) : formatCount(summaryData?.total_engagements)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Clicks: {isSingle ? formatCount(totalsData?.clicks) : "—"}
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5. Performance Analytics Charts Section */}
      {/* --------------------------------------------------------------------- */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-950">
              {isSingle ? `Performance Analytics: ${singleRoi?.title}` : "Consolidated Performance & Cost Comparison"}
            </h3>
            <p className="text-xs text-ink-500">
              {isSingle
                ? "Periodic performance milestones, engagement tracking, and revenue attribution timeline"
                : "Cross-campaign revenue return, expenditure, and reach comparisons"}
            </p>
          </div>

          {/* Chart Tab Navigation */}
          {isSingle && (
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-ink-100 p-1">
              {[
                { id: "revenue", label: "Revenue vs Cost" },
                { id: "reach", label: "Impressions & Reach" },
                { id: "engagement", label: "Engagements & Clicks" },
                { id: "conversions", label: "Conversions" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setChartTab(t.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    chartTab === t.id
                      ? "bg-white text-ink-950 shadow-sm"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Single Campaign Charts */}
        {isSingle ? (
          <div>
            {perfLoading ? (
              <Spinner label="Loading performance milestone timeline…" />
            ) : milestoneChartData.length === 0 ? (
              <EmptyState
                title="No Performance Milestones Recorded"
                text="This campaign does not have any periodic performance milestones recorded yet. Click 'Record Milestone' to log impressions, reach, engagements, and attributed revenue."
                action={
                  canManage && (
                    <button onClick={handleOpenModal} className="btn-primary mt-2">
                      <Plus className="h-4 w-4" /> Log First Milestone
                    </button>
                  )
                }
              />
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartTab === "revenue" && (
                    <BarChart data={milestoneChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Attributed Revenue"]} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10B981" name="Attributed Revenue ($)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}

                  {chartTab === "reach" && (
                    <AreaChart data={milestoneChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString(), ""]} />
                      <Legend />
                      <Area type="monotone" dataKey="impressions" stroke="#6366F1" fill="#EEF2FF" name="Impressions" />
                      <Area type="monotone" dataKey="reach" stroke="#B5479B" fill="#FDF4FF" name="Audience Reach" />
                    </AreaChart>
                  )}

                  {chartTab === "engagement" && (
                    <LineChart data={milestoneChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString(), ""]} />
                      <Legend />
                      <Line type="monotone" dataKey="engagements" stroke="#0D9488" strokeWidth={2} name="Engagements" />
                      <Line type="monotone" dataKey="clicks" stroke="#D97706" strokeWidth={2} name="Clicks" />
                    </LineChart>
                  )}

                  {chartTab === "conversions" && (
                    <BarChart data={milestoneChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Conversions"]} />
                      <Legend />
                      <Bar dataKey="conversions" fill="#8B5CF6" name="Attributed Conversions" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          /* Multi-Campaign Overview Charts */
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overviewCampaignsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${compact(v)}`} />
                <Tooltip formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]} />
                <Legend />
                <Bar dataKey="budget" fill="#94A3B8" name="Budget ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#F43F5E" name="Total Cost ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="#10B981" name="Attributed Revenue ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6. Creator-Level Performance Table (Single Campaign Mode) */}
      {/* --------------------------------------------------------------------- */}
      {isSingle && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink-950">
                Creator Deliverables & Performance Roster
              </h3>
              <p className="text-xs text-ink-500">
                Granular performance metrics, contractual compensation, and attribution by assigned creator.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isCreator && (
                <span className="rounded-md border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs text-ink-600">
                  Privacy Shield Active: Other creators' agreed compensation is masked.
                </span>
              )}

              {/* Creator Deliverables Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCreatorExportMenu(!showCreatorExportMenu)}
                  disabled={Boolean(exportLoading)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50 shadow-sm disabled:opacity-50"
                  title="Export Creator Performance and Deliverables"
                >
                  {exportLoading?.startsWith("creator-") ? (
                    <RefreshCw className="h-3 w-3 animate-spin text-ink-500" />
                  ) : (
                    <Download className="h-3 w-3 text-ink-600" />
                  )}
                  <span>Export Roster</span>
                </button>

                {showCreatorExportMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-lg border border-ink-200 bg-white p-1.5 shadow-lg space-y-1"
                    onMouseLeave={() => setShowCreatorExportMenu(false)}
                  >
                    <button
                      onClick={() => handleExportCreators("csv")}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Export as CSV</span>
                    </button>
                    <button
                      onClick={() => handleExportCreators("xlsx")}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 font-medium"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                      <span>Export as Excel</span>
                    </button>
                    <button
                      onClick={() => handleExportCreators("pdf")}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50 font-medium"
                    >
                      <Download className="h-3.5 w-3.5 text-rose-600" />
                      <span>Export as PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {creatorLoading ? (
            <Spinner label="Loading creator performance roster…" />
          ) : !creatorPerfs?.items?.length ? (
            <div className="py-8 text-center text-sm text-ink-500">
              No creators assigned to this campaign yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/70 font-semibold text-ink-600">
                    <th className="py-2.5 px-3">Creator</th>
                    <th className="py-2.5 px-3">Assignment Status</th>
                    <th className="py-2.5 px-3">Agreed Compensation</th>
                    <th className="py-2.5 px-3 text-right">Impressions</th>
                    <th className="py-2.5 px-3 text-right">Reach</th>
                    <th className="py-2.5 px-3 text-right">Engagements</th>
                    <th className="py-2.5 px-3 text-right">Clicks</th>
                    <th className="py-2.5 px-3 text-right">Conversions</th>
                    <th className="py-2.5 px-3 text-right">Attributed Revenue</th>
                    <th className="py-2.5 px-3 text-right">Creator ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {creatorPerfs.items.map((cp) => (
                    <tr key={cp.creator_id} className="hover:bg-ink-50/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900">{cp.creator_name}</div>
                        {cp.creator_email && (
                          <div className="text-[11px] text-ink-400">{cp.creator_email}</div>
                        )}
                        {cp.deliverables && (
                          <div className="mt-0.5 max-w-xs truncate text-[11px] italic text-ink-500">
                            {cp.deliverables}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          cp.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          cp.status === "completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          cp.status === "declined" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {cp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-ink-900">
                        {/* Financial field masking for creators */}
                        {isCreator && cp.creator_id !== user.id
                          ? <span className="text-ink-400 italic">Masked</span>
                          : currency(cp.agreed_compensation)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{compact(cp.impressions)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{compact(cp.reach)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{compact(cp.engagements)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{compact(cp.clicks)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{num(cp.conversions)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">
                        {formatMoney(cp.attributed_revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums">
                        {formatPct(cp.roi_pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 7. Detailed Financial Cost & Revenue Breakdown Section */}
      {/* --------------------------------------------------------------------- */}
      {isSingle && breakdownData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cost Accounting Breakdown */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h3 className="font-display text-base font-bold text-ink-950">
                Authoritative Cost Reconciler
              </h3>
              <span className="rounded bg-ink-100 px-2 py-0.5 text-[11px] font-mono font-semibold text-ink-700">
                {breakdownData.cost_breakdown?.cost_rule_applied}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="text-ink-600">Direct Campaign Spend (Logged on Campaign.spent)</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {currency(breakdownData.cost_breakdown?.direct_spend)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="text-ink-600">Creator Talent Compensation Total ({breakdownData.cost_breakdown?.active_creators_count} creators)</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {currency(breakdownData.cost_breakdown?.creator_compensation_total)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="text-ink-600">Brand Sponsorship Commitments Total ({breakdownData.cost_breakdown?.active_sponsorships_count} contracts)</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {currency(breakdownData.cost_breakdown?.sponsorship_total)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="font-medium text-ink-700">Deduplicated Talent Expenditure Liability</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {currency(breakdownData.cost_breakdown?.deduplicated_talent_total)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-sm bg-ink-50 px-2.5 rounded-lg">
                <span className="text-ink-950">Total Authoritative Campaign Cost</span>
                <span className="text-ink-950 tabular-nums">
                  {formatMoney(breakdownData.cost_breakdown?.total_campaign_cost)}
                </span>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-400">
              * Reconciliation Rule: Prevents double-counting between Campaign.spent and talent liabilities. Soft-archived contracts are strictly excluded from active cost accounting.
            </p>
          </div>

          {/* Revenue Attribution Policy & Sources */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h3 className="font-display text-base font-bold text-ink-950">
                Attributed Revenue Breakdown
              </h3>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                Status: {breakdownData.revenue_attribution?.attribution_status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="text-ink-600">Total Attributable Revenue</span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {formatMoney(breakdownData.revenue_attribution?.attributed_revenue)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-50">
                <span className="text-ink-600">Verified Milestone Count</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {breakdownData.revenue_attribution?.attribution_sources_count}
                </span>
              </div>

              {/* By Source Breakdown */}
              <div className="pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Revenue by Source:</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(breakdownData.revenue_attribution?.revenue_by_source || {}).map(([src, amt]) => (
                    <div key={src} className="rounded-lg border border-ink-100 bg-ink-50/50 p-2">
                      <span className="capitalize text-[11px] font-semibold text-ink-600">{src}</span>
                      <p className="font-bold text-ink-900 tabular-nums">{currency(amt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-ink-200/80 bg-ink-50/70 p-3 text-[11px] leading-relaxed text-ink-600">
              <span className="font-bold text-ink-800">Attribution Policy: </span>
              {breakdownData.revenue_attribution_policy ||
                "Strict zero-cross-contamination: only CampaignPerformance milestones linked directly to this campaign ID are attributed."}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 8. Record Performance Milestone Modal */}
      {/* --------------------------------------------------------------------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-signal-dark" />
                <h3 className="font-display text-lg font-bold text-ink-950">
                  Record Campaign Performance Milestone
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost p-1 text-ink-400 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <Alert kind="error" onClose={() => setFormError("")}>
                {formError}
              </Alert>
            )}

            <form onSubmit={handleCreateMilestone} className="space-y-3.5 text-xs">
              {/* Campaign Select */}
              <Field label="Target Campaign *" htmlFor="milestone_campaign">
                <select
                  id="milestone_campaign"
                  className="input w-full text-xs font-medium"
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  required
                >
                  <option value="">Select campaign…</option>
                  {campaignsList.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.title} ({c.client_name})
                    </option>
                  ))}
                </select>
              </Field>

              {/* Reporting Date & Data Source */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reporting Date *" htmlFor="reporting_date">
                  <input
                    id="reporting_date"
                    type="date"
                    className="input w-full text-xs"
                    value={formData.reporting_date}
                    onChange={(e) => setFormData({ ...formData, reporting_date: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Data Source" htmlFor="data_source">
                  <select
                    id="data_source"
                    className="input w-full text-xs"
                    value={formData.data_source}
                    onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                  >
                    <option value="platform">Platform Export</option>
                    <option value="manual">Manual Entry</option>
                    <option value="youtube">YouTube Analytics</option>
                    <option value="instagram">Instagram Graph API</option>
                    <option value="tiktok">TikTok Ads</option>
                  </select>
                </Field>
              </div>

              {/* Impressions & Reach */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Impressions" htmlFor="impressions">
                  <input
                    id="impressions"
                    type="number"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.impressions}
                    onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                  />
                </Field>

                <Field label="Reach" htmlFor="reach">
                  <input
                    id="reach"
                    type="number"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.reach}
                    onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
                  />
                </Field>
              </div>

              {/* Engagements & Clicks */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Engagements" htmlFor="engagements">
                  <input
                    id="engagements"
                    type="number"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.engagements}
                    onChange={(e) => setFormData({ ...formData, engagements: e.target.value })}
                  />
                </Field>

                <Field label="Clicks" htmlFor="clicks">
                  <input
                    id="clicks"
                    type="number"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.clicks}
                    onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                  />
                </Field>
              </div>

              {/* Conversions & Attributed Revenue */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Conversions" htmlFor="conversions">
                  <input
                    id="conversions"
                    type="number"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.conversions}
                    onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                  />
                </Field>

                <Field label="Attributed Revenue ($)" htmlFor="revenue">
                  <input
                    id="revenue"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-full text-xs"
                    value={formData.revenue}
                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  />
                </Field>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost text-xs"
                  disabled={formBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={formBusy}
                >
                  {formBusy ? "Saving…" : "Record Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Filter,
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Clock,
  Inbox,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  useApi,
  Spinner,
  ErrorState,
  EmptyState,
  PageHeader,
  DemoBanner,
  DemoBadge,
  Alert,
} from "../components/ui";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_CATEGORY_COLOR,
  timeAgo,
} from "../utils/format";

const CATEGORY_ICONS = {
  performance: Sparkles,
  engagement: TrendingUp,
  revenue: DollarSign,
  system: ShieldCheck,
};

export default function Notifications() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | category
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);

  const queryParams = {
    page,
    limit: 50,
    category:
      activeTab !== "all" && activeTab !== "unread" ? activeTab : undefined,
    is_read: activeTab === "unread" ? false : undefined,
  };

  const notifApi = useApi("/api/notifications", queryParams);
  const data = notifApi.data;
  const isLoading = notifApi.loading && !data;
  const hasError = notifApi.error;

  const markRead = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.patch(`/api/notifications/${id}/read`);
      notifApi.reload();
    } catch (err) {
      setActionError(parseError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setActionError("");
    try {
      const catParam =
        activeTab !== "all" && activeTab !== "unread"
          ? `?category=${activeTab}`
          : "";
      const res = await api.patch(`/api/notifications/read-all${catParam}`);
      setActionSuccess(`Marked ${res.data.updated_count} notifications as read.`);
      notifApi.reload();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setActionError(parseError(err).message);
    }
  };

  const deleteNotif = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.delete(`/api/notifications/${id}`);
      notifApi.reload();
    } catch (err) {
      setActionError(parseError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const hasDemo = data?.items?.some((n) => n.is_demo);
  const unreadCount = data?.unread_count || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alert Center"
        subtitle="Real-time milestone alerts, audience velocity notifications, and commercial updates."
      >
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="btn-ghost text-xs flex items-center gap-1.5 border border-ink-200 bg-white shadow-sm hover:border-signal"
            >
              <CheckCheck className="h-4 w-4 text-signal-dark" />
              Mark all as read
            </button>
          )}
          <button
            onClick={() => notifApi.reload()}
            className="btn-ghost p-2"
            title="Refresh notifications"
          >
            <RefreshCw className="h-4 w-4 text-ink-600" />
          </button>
        </div>
      </PageHeader>

      {hasDemo && <DemoBanner />}

      {actionError && (
        <Alert kind="error" onClose={() => setActionError("")}>
          {actionError}
        </Alert>
      )}

      {actionSuccess && (
        <Alert kind="success" onClose={() => setActionSuccess("")}>
          {actionSuccess}
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-100 pb-2">
        <button
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === "all"
              ? "bg-ink-950 text-white shadow-sm"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          All
          {data?.total !== undefined && (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {data.total}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("unread");
            setPage(1);
          }}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "unread"
              ? "bg-signal text-ink-950 font-bold shadow-sm"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-coral text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {NOTIFICATION_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveTab(cat);
              setPage(1);
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all capitalize ${
              activeTab === cat
                ? "bg-ink-950 text-white shadow-sm"
                : "text-ink-600 hover:bg-ink-100"
            }`}
          >
            {NOTIFICATION_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <Spinner label="Loading notifications…" />
      ) : hasError ? (
        <ErrorState message={notifApi.error} onRetry={notifApi.reload} />
      ) : !data?.items || data.items.length === 0 ? (
        <EmptyState
          title={
            activeTab === "unread"
              ? "You're all caught up!"
              : "No notifications in this view"
          }
          text={
            activeTab === "unread"
              ? "There are no unread alerts at this time. New performance spikes and milestones will appear automatically."
              : "New commercial deals, audience spikes, and content milestones will be delivered here."
          }
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((n) => {
            const Icon = CATEGORY_ICONS[n.category] || Bell;
            const badgeStyle =
              NOTIFICATION_CATEGORY_COLOR[n.category] ||
              "bg-ink-100 text-ink-700 border-ink-200";

            return (
              <div
                key={n.id}
                className={`card relative flex items-start gap-4 p-4 transition-all ${
                  !n.is_read
                    ? "border-l-4 border-l-signal bg-white shadow-sm hover:border-signal"
                    : "bg-ink-50/40 border border-ink-100 text-ink-600 hover:bg-white"
                }`}
              >
                {/* Category Icon */}
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-xs ${
                    !n.is_read
                      ? "bg-signal-soft text-signal-dark font-bold"
                      : "bg-ink-100 text-ink-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          !n.is_read ? "bg-signal-dark" : "bg-transparent"
                        }`}
                        title={!n.is_read ? "Unread" : "Read"}
                      />
                      <h3
                        className={`text-sm font-bold tracking-tight ${
                          !n.is_read ? "text-ink-950 font-extrabold" : "text-ink-700 font-semibold"
                        }`}
                      >
                        {n.title}
                      </h3>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}
                      >
                        {NOTIFICATION_CATEGORY_LABEL[n.category] || n.category}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] text-ink-400 font-medium">
                      <Clock className="h-3 w-3" />
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-ink-600 font-normal">
                    {n.message}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={busyId === n.id}
                      title="Mark as read"
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-signal-dark transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(n.id)}
                    disabled={busyId === n.id}
                    title="Dismiss notification"
                    className="rounded-lg p-1.5 text-ink-300 hover:bg-coral/10 hover:text-coral transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


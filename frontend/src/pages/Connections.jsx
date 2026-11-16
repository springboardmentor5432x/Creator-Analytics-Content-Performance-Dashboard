import { useState } from "react";
import {
  Info,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Radio,
  Users,
  Video,
  Eye,
  X,
  Play,
  Key,
  Instagram,
} from "lucide-react";
import api, { parseError } from "../api/client";
import { useApi, Spinner, ErrorState, PageHeader, Alert } from "../components/ui";
import { PLATFORM_COLOR, num, compact, timeAgo, normalizeRole, ROLE_LABEL } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function Connections() {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const canSwitchCreator = ["agency", "marketing", "admin"].includes(userRole);

  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const creatorsApi = useApi(
    canSwitchCreator ? "/api/audience/creators" : null,
    null,
    canSwitchCreator
  );
  const creatorOptions = creatorsApi.data || [];

  const connParams = selectedCreatorId ? { user_id: Number(selectedCreatorId) } : undefined;
  const { data, loading, error, reload } = useApi("/api/connections", connParams);

  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // YouTube Connect Modal state
  const [ytModalOpen, setYtModalOpen] = useState(false);
  const [channelId, setChannelId] = useState("UC_creatoriq_official");
  const [channelTitle, setChannelTitle] = useState("CreatorIQ Tech Channel");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Instagram Connect Modal state
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [igUsername, setIgUsername] = useState("@creatoriq_official");
  const [igAccountName, setIgAccountName] = useState("CreatorIQ Studio");
  const [igConnecting, setIgConnecting] = useState(false);

  const act = async (fn, platform) => {
    setBusy(platform);
    setMsg(null);
    setSuccessMsg(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setMsg(parseError(e).message);
    } finally {
      setBusy("");
    }
  };

  const handleConnectYouTube = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setMsg(null);
    try {
      const payload = {
        channel_id: channelId.trim(),
        account_name: channelTitle.trim() || undefined,
        api_key: apiKey.trim() || undefined,
      };
      const queryParam = selectedCreatorId ? `?user_id=${selectedCreatorId}` : "";
      const res = await api.post(`/api/connections/youtube/connect${queryParam}`, payload);
      setSuccessMsg(`Successfully connected YouTube channel '${res.data.account_name}' with verified Real Account status.`);
      setYtModalOpen(false);
      await reload();
    } catch (err) {
      setMsg(parseError(err).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncYouTube = async () => {
    setBusy("youtube_sync");
    setMsg(null);
    setSuccessMsg(null);
    try {
      const queryParam = selectedCreatorId ? `?user_id=${selectedCreatorId}` : "";
      const res = await api.post(`/api/connections/youtube/sync${queryParam}`);
      setSuccessMsg(
        `YouTube Sync Complete: Ingested ${res.data.synced_videos_count} verified videos and ${num(res.data.subscribers)} subscribers.`
      );
      await reload();
    } catch (err) {
      setMsg(parseError(err).message);
    } finally {
      setBusy("");
    }
  };

  const handleConnectInstagram = async (e) => {
    e.preventDefault();
    setIgConnecting(true);
    setMsg(null);
    try {
      const payload = {
        username: igUsername.trim(),
        account_name: igAccountName.trim() || undefined,
      };
      const queryParam = selectedCreatorId ? `?user_id=${selectedCreatorId}` : "";
      const res = await api.post(`/api/connections/instagram/connect${queryParam}`, payload);
      setSuccessMsg(`Successfully connected Instagram Professional account '${res.data.account_name}' with verified Real Account status.`);
      setIgModalOpen(false);
      await reload();
    } catch (err) {
      setMsg(parseError(err).message);
    } finally {
      setIgConnecting(false);
    }
  };

  const handleSyncInstagram = async () => {
    setBusy("instagram_sync");
    setMsg(null);
    setSuccessMsg(null);
    try {
      const queryParam = selectedCreatorId ? `?user_id=${selectedCreatorId}` : "";
      const res = await api.post(`/api/connections/instagram/sync${queryParam}`);
      setSuccessMsg(
        `Instagram Sync Complete: Ingested ${res.data.synced_media_count || res.data.media_count} verified media posts and ${num(res.data.followers)} followers.`
      );
      await reload();
    } catch (err) {
      setMsg(parseError(err).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <PageHeader
        title="Social Media Connections"
        subtitle="Authorize platform connectors to stream real metrics and manage sandbox demo modes."
      >
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
              aria-label="Select creator for social connection management"
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
      </PageHeader>

      {/* Governance & Architecture Notice */}
      <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4.5 text-xs text-ink-700 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
          <div className="space-y-1">
            <p className="font-semibold text-ink-950">
              Platform Integration & Data Governance Standard:
            </p>
            <p className="leading-relaxed">
              CreatorIQ maintains a strict firewall between <b>Real Platform Data</b> and <b>Demo Mode</b>.
              When an authorized channel is connected (such as YouTube Data API v3 or Meta Instagram Graph API), all synchronized media and audience records are flagged as verified live records (<code className="rounded bg-ink-100 px-1 py-0.5 text-[11px]">is_demo: false</code>).
              OAuth client credentials and API keys are stored securely on the backend in environment variables and never exposed to the client browser.
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="mb-4">
          <Alert onClose={() => setMsg(null)}>{msg}</Alert>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950">
            &times;
          </button>
        </div>
      )}

      {loading && !data ? (
        <Spinner label="Loading platform connectors..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const isYouTube = c.platform === "youtube";
            const isInstagram = c.platform === "instagram";
            const isConnected = c.status === "connected";
            const isDemo = c.status === "demo";
            const meta = c.metadata || {};

            return (
              <div
                key={c.platform}
                className={`card flex flex-col transition border-2 ${
                  isConnected
                    ? "border-emerald-300 bg-emerald-50/20"
                    : isDemo
                    ? "border-signal/40 bg-white"
                    : "border-transparent bg-white"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-ink-100">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-950">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: PLATFORM_COLOR[c.platform] }}
                    />
                    {c.name}
                  </h2>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 shadow-sm">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> CONNECTED (REAL DATA)
                    </span>
                  ) : isDemo ? (
                    <span className="rounded-md border border-signal/40 bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal-dark">
                      DEMO MODE
                    </span>
                  ) : (
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
                      NOT CONNECTED
                    </span>
                  )}
                </div>

                {/* Account Details / Telemetry */}
                <div className="py-4 space-y-3 flex-1">
                  {isConnected ? (
                    <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-ink-950 truncate">{c.account_name}</span>
                        <span className="text-[10px] text-ink-400 font-mono">{c.external_id}</span>
                      </div>

                      {isYouTube && meta.subscriber_count !== undefined && (
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ink-50 text-center">
                          <div>
                            <span className="block text-[10px] text-ink-400">Subscribers</span>
                            <b className="text-xs text-ink-950">{compact(meta.subscriber_count)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-ink-400">Total Views</span>
                            <b className="text-xs text-ink-950">{compact(meta.view_count)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-ink-400">Videos</span>
                            <b className="text-xs text-ink-950">{meta.video_count}</b>
                          </div>
                        </div>
                      )}

                      {isInstagram && (meta.followers_count !== undefined || meta.followers !== undefined) && (
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ink-50 text-center">
                          <div>
                            <span className="block text-[10px] text-ink-400">Followers</span>
                            <b className="text-xs text-ink-950">{compact(meta.followers_count ?? meta.followers)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-ink-400">Media / Posts</span>
                            <b className="text-xs text-ink-950">{meta.media_count ?? 0}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-ink-400">Type</span>
                            <b className="text-xs text-ink-950">{meta.account_type || "CREATOR"}</b>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-ink-500">
                        <span>Last sync: <b>{c.last_synced_at ? timeAgo(c.last_synced_at) : "Just now"}</b></span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-500" /> Ingested
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-ink-700 leading-relaxed">
                        <b>Authorized Connector Requirements:</b> {c.requirements}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Server-side credentials: <code className="bg-ink-50 px-1 py-0.5 rounded text-[10px]">{c.env_vars}</code>
                      </p>
                    </>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-auto border-t border-ink-100 pt-3 flex flex-wrap gap-2">
                  {isConnected ? (
                    <>
                      {isYouTube && (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          disabled={busy === "youtube_sync"}
                          onClick={handleSyncYouTube}
                        >
                          {busy === "youtube_sync" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Sync Live Data
                        </button>
                      )}
                      {isInstagram && (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          disabled={busy === "instagram_sync"}
                          onClick={handleSyncInstagram}
                        >
                          {busy === "instagram_sync" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Sync Live Data
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-danger text-xs py-1.5 px-3 ml-auto"
                        disabled={busy === c.platform}
                        onClick={() =>
                          act(() => api.delete(`/api/connections/${c.platform}${selectedCreatorId ? `?user_id=${selectedCreatorId}` : ""}`), c.platform)
                        }
                      >
                        Disconnect
                      </button>
                    </>
                  ) : isDemo ? (
                    <>
                      {isYouTube && (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3"
                          onClick={() => setYtModalOpen(true)}
                        >
                          Connect Real Account
                        </button>
                      )}
                      {isInstagram && (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3"
                          onClick={() => setIgModalOpen(true)}
                        >
                          Connect Real Account
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-danger text-xs py-1.5 px-3 ml-auto"
                        disabled={busy === c.platform}
                        onClick={() =>
                          act(() => api.delete(`/api/connections/${c.platform}${selectedCreatorId ? `?user_id=${selectedCreatorId}` : ""}`), c.platform)
                        }
                      >
                        {busy === c.platform && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Turn off demo
                      </button>
                    </>
                  ) : (
                    <>
                      {isYouTube ? (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          onClick={() => setYtModalOpen(true)}
                        >
                          <Play className="h-3 w-3 fill-current" /> Connect Real Channel
                        </button>
                      ) : isInstagram ? (
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          onClick={() => setIgModalOpen(true)}
                        >
                          <Instagram className="h-3.5 w-3.5" /> Connect Professional
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost text-xs py-1.5 px-3"
                          disabled
                          title="Phase 6 integrates YouTube and Instagram first. Additional connectors will follow."
                        >
                          Connect real account
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost text-xs py-1.5 px-3 ml-auto hover:bg-signal-soft/50 hover:text-signal-dark font-medium"
                        disabled={busy === c.platform}
                        onClick={() =>
                          act(() => api.post(`/api/connections/${c.platform}/demo${selectedCreatorId ? `?user_id=${selectedCreatorId}` : ""}`), c.platform)
                        }
                      >
                        {busy === c.platform && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Use demo mode
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* YouTube Connect Modal */}
      {ytModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-ink-100">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-600 text-white font-bold">
                  ▶
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink-950">Connect YouTube Channel</h3>
                  <p className="text-[11px] text-ink-500">YouTube Data API v3 integration</p>
                </div>
              </div>
              <button
                onClick={() => setYtModalOpen(false)}
                className="text-ink-400 hover:text-ink-950 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConnectYouTube} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700">
                  YouTube Channel ID or Handle <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="e.g. UC_creatoriq_official or @mkbhd"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-xs font-mono focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                />
                <p className="mt-1 text-[11px] text-ink-500">
                  Enter your YouTube Channel ID (starts with UC) or verified handle.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700">
                  Channel Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={channelTitle}
                  onChange={(e) => setChannelTitle(e.target.value)}
                  placeholder="e.g. CreatorIQ Tech Channel"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-xs focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-ink-800 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure Data Pipeline
                </div>
                <p className="text-[11px] text-ink-600 leading-relaxed">
                  Upon connection, CreatorIQ will validate channel statistics and pull published video metrics as verified Real Account data (<code className="text-ink-900">is_demo: false</code>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setYtModalOpen(false)}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                >
                  {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Connect & Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram Connect Modal */}
      {igModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-ink-100">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold">
                  <Instagram className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink-950">Connect Instagram Account</h3>
                  <p className="text-[11px] text-ink-500">Meta Graph API (Professional Creator / Business)</p>
                </div>
              </div>
              <button
                onClick={() => setIgModalOpen(false)}
                className="text-ink-400 hover:text-ink-950 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConnectInstagram} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700">
                  Instagram Username or Professional Account ID <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={igUsername}
                  onChange={(e) => setIgUsername(e.target.value)}
                  placeholder="e.g. @creatoriq_official or 178414..."
                  className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-xs font-mono focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                />
                <p className="mt-1 text-[11px] text-ink-500">
                  Enter your Instagram username (@handle) or Meta Graph Account ID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700">
                  Account Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={igAccountName}
                  onChange={(e) => setIgAccountName(e.target.value)}
                  placeholder="e.g. CreatorIQ Studio"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-xs focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-ink-800 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Meta OAuth 2.0 Security Standard
                </div>
                <p className="text-[11px] text-ink-600 leading-relaxed">
                  CreatorIQ adheres strictly to Meta platform policies. Raw access tokens are prohibited in browser inputs to protect credentials.
                  All authorization occurs via the secure Meta OAuth endpoint (<code className="text-ink-900">https://www.facebook.com/v26.0/dialog/oauth</code>) with cryptographic CSRF state validation and replay protection.
                </p>
                <p className="text-[11px] text-ink-500 border-t border-ink-100 pt-1.5">
                  <b>Eligibility requirement:</b> Only Instagram Professional (Business or Creator) accounts linked to a Facebook Page can connect.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setIgModalOpen(false)}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={igConnecting}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                >
                  {igConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Connect & Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

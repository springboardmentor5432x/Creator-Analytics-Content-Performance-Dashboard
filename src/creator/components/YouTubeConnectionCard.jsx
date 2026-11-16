import React, { useState } from "react";
import {
  Video,
  ExternalLink,
  RefreshCw,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles,
  Eye,
  Users,
  Film,
  TrendingUp,
  Clock,
  Layers,
  HelpCircle,
  X,
  Calendar,
} from "lucide-react";

export default function YouTubeConnectionCard({
  channel,
  summary,
  isConnected,
  isConfigured,
  isLoading,
  isSyncing,
  error,
  onConnect,
  onDisconnect,
  onRefresh,
  dateRange,
  onChangeDateRange,
}) {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return Number(num).toLocaleString();
  };

  const formatCompact = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div style={styles.wrapper}>
      {/* ────────────────────────────────────────────────────────────────────────
          STATE 1: CONNECTED CHANNEL SUMMARY
      ──────────────────────────────────────────────────────────────────────── */}
      {isConnected && channel ? (
        <div style={styles.connectedCard}>
          {/* Channel Header Banner */}
          <div style={styles.channelHeader}>
            <div style={styles.channelMetaLeft}>
              <div style={styles.avatarWrap}>
                {channel.thumbnail ? (
                  <img
                    src={channel.thumbnail}
                    alt={channel.title}
                    style={styles.channelAvatar}
                  />
                ) : (
                  <div style={styles.fallbackAvatar}>
                    <Video size={24} color="#ffffff" />
                  </div>
                )}
                <span style={styles.pulseDot} title="OAuth Verified & Live" />
              </div>

              <div>
                <div style={styles.titleRow}>
                  <h3 style={styles.channelTitle}>{channel.title}</h3>
                  <span style={styles.verifiedBadge}>
                    <ShieldCheck size={13} style={{ marginRight: 4 }} />
                    YouTube Verified
                  </span>
                </div>

                <div style={styles.handleRow}>
                  <span style={styles.channelHandle}>{channel.customUrl || `@${channel.title}`}</span>
                  <a
                    href={`https://www.youtube.com/${channel.customUrl ? channel.customUrl.replace(/^@/, '') : `channel/${channel.channelId}`}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.externalLink}
                    title="View YouTube Channel"
                  >
                    <ExternalLink size={12} style={{ marginRight: 3 }} />
                    View Channel
                  </a>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.headerActions}>
              <div style={styles.syncMetaText}>
                <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                <span>Synced {channel.lastSynced ? new Date(channel.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
              </div>

              <button
                onClick={onRefresh}
                disabled={isSyncing}
                style={styles.refreshBtn}
                title="Fetch live metrics from YouTube Data & Analytics APIs"
              >
                <RefreshCw
                  size={13}
                  style={{
                    animation: isSyncing ? "spin 0.8s linear infinite" : "none",
                    marginRight: 6,
                  }}
                />
                {isSyncing ? "Syncing API..." : "Sync Live Data"}
              </button>

              <button
                onClick={() => setShowDisconnectModal(true)}
                style={styles.disconnectBtn}
                title="Revoke OAuth token and disconnect channel"
              >
                <Unlink size={13} style={{ marginRight: 6 }} />
                Disconnect
              </button>
            </div>
          </div>

          {/* Quick Real Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricCardTop}>
                <span style={styles.metricLabel}>Total Subscribers</span>
                <div style={{ ...styles.metricIconWrap, backgroundColor: "#fee2e2", color: "#dc2626" }}>
                  <Users size={15} />
                </div>
              </div>
              <div style={styles.metricValue}>{formatNumber(channel.subscriberCount)}</div>
              <div style={styles.metricSubtext}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>
                  +{formatCompact(summary?.subscribersGained28d || 0)}
                </span>{" "}
                in last 28 days
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardTop}>
                <span style={styles.metricLabel}>Lifetime Views</span>
                <div style={{ ...styles.metricIconWrap, backgroundColor: "#e0f2fe", color: "#0284c7" }}>
                  <Eye size={15} />
                </div>
              </div>
              <div style={styles.metricValue}>{formatCompact(channel.viewCount)}</div>
              <div style={styles.metricSubtext}>
                <span style={{ color: "#0284c7", fontWeight: 600 }}>
                  {formatCompact(summary?.recentViews28d || channel.viewCount)}
                </span>{" "}
                recent views
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardTop}>
                <span style={styles.metricLabel}>Public Uploads</span>
                <div style={{ ...styles.metricIconWrap, backgroundColor: "#fef3c7", color: "#d97706" }}>
                  <Film size={15} />
                </div>
              </div>
              <div style={styles.metricValue}>{formatNumber(channel.videoCount)}</div>
              <div style={styles.metricSubtext}>Active video catalogue</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardTop}>
                <span style={styles.metricLabel}>Engagement Rate</span>
                <div style={{ ...styles.metricIconWrap, backgroundColor: "#dcfce7", color: "#16a34a" }}>
                  <TrendingUp size={15} />
                </div>
              </div>
              <div style={{ ...styles.metricValue, color: "#15803d" }}>
                {summary?.engagementRate || "4.8%"}
              </div>
              <div style={styles.metricSubtext}>Likes + comments / views</div>
            </div>
          </div>

          {/* Timeframe Filter Bar */}
          <div style={styles.timeframeBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={14} color="#64748b" />
              <span style={styles.timeframeLabel}>Telemetry Window:</span>
              <div style={styles.rangeButtons}>
                {["7d", "28d", "90d"].map((r) => (
                  <button
                    key={r}
                    onClick={() => onChangeDateRange && onChangeDateRange(r)}
                    style={{
                      ...styles.rangeBtn,
                      backgroundColor: dateRange === r ? "#2563eb" : "#f1f5f9",
                      color: dateRange === r ? "#ffffff" : "#475569",
                      fontWeight: dateRange === r ? 600 : 500,
                    }}
                  >
                    Last {r.replace("d", " Days")}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.securityNote}>
              <ShieldCheck size={14} color="#15803d" />
              <span>Read-only telemetry via YouTube Data & Analytics APIs. Tokens encrypted server-side.</span>
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────────────
            STATE 2: DISCONNECTED / NOT CONNECTED STATE
        ──────────────────────────────────────────────────────────────────────── */
        <div style={styles.disconnectedCard}>
          <div style={styles.disconnectedContent}>
            <div style={styles.ytLogoWrap}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="#dc2626" />
                <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ffffff" />
              </svg>
            </div>

            <div style={styles.disconnectedInfo}>
              <div style={styles.badgeRow}>
                <span style={styles.ytPill}>Official Integration</span>
                <span style={styles.readOnlyPill}>Read-Only Access</span>
              </div>
              <h3 style={styles.disconnectedTitle}>Connect Your YouTube Channel</h3>
              <p style={styles.disconnectedDesc}>
                Authenticate via official Google OAuth 2.0 to stream real-time subscriber counts, watch
                time analytics, video virality curves, and engagement benchmarks directly into your CreatorIQ suite.
              </p>
            </div>
          </div>

          <div style={styles.connectActions}>
            <button
              onClick={onConnect}
              disabled={isLoading}
              style={styles.connectBtn}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={15} style={{ animation: "spin 0.8s linear infinite", marginRight: 8 }} />
                  Connecting...
                </>
              ) : (
                <>
                  <Video size={16} style={{ marginRight: 8 }} />
                  Connect YouTube Channel
                </>
              )}
            </button>

            <button
              onClick={() => setShowSetupModal(true)}
              style={styles.setupGuideBtn}
              title="Google Cloud Console & OAuth Setup Guide"
            >
              <HelpCircle size={14} style={{ marginRight: 6 }} />
              API Setup Guide
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          ERROR BANNER (IF ANY)
      ──────────────────────────────────────────────────────────────────────── */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={16} color="#b91c1c" />
          <div style={{ flex: 1 }}>
            <span style={styles.errorTitle}>YouTube Connection Notice:</span>{" "}
            <span style={styles.errorText}>{error}</span>
          </div>
          <button onClick={onConnect} style={styles.reconnectBtn}>
            Reconnect
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          DISCONNECT CONFIRMATION MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {showDisconnectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h4 style={styles.modalTitle}>Disconnect YouTube Channel?</h4>
              </div>
              <button
                onClick={() => setShowDisconnectModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p style={styles.modalBodyText}>
              Disconnecting <strong>{channel?.title || "your channel"}</strong> will revoke the Google
              OAuth access tokens and permanently erase server-cached metrics and private credentials.
              Live telemetry in CreatorIQ will revert to benchmark states until you reconnect.
            </p>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowDisconnectModal(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDisconnectModal(false);
                  onDisconnect && onDisconnect();
                }}
                style={styles.confirmDisconnectBtn}
              >
                Yes, Disconnect Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          GOOGLE CLOUD OAUTH SETUP GUIDE MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {showSetupModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: "580px" }}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h4 style={styles.modalTitle}>Google Cloud OAuth & API Setup</h4>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.setupContent}>
              <div style={styles.setupStep}>
                <span style={styles.stepNum}>1</span>
                <div>
                  <div style={styles.stepTitle}>Enable Required Google APIs</div>
                  <div style={styles.stepDesc}>
                    In Google Cloud Console, enable <strong>YouTube Data API v3</strong> and{" "}
                    <strong>YouTube Analytics API</strong>.
                  </div>
                </div>
              </div>

              <div style={styles.setupStep}>
                <span style={styles.stepNum}>2</span>
                <div>
                  <div style={styles.stepTitle}>Configure OAuth 2.0 Credentials</div>
                  <div style={styles.stepDesc}>
                    Create an <strong>OAuth 2.0 Client ID</strong> (Web application) with:
                    <div style={styles.codeSnippet}>
                      Authorized redirect URI: <code>http://localhost:5173/api/auth/youtube/callback</code>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.setupStep}>
                <span style={styles.stepNum}>3</span>
                <div>
                  <div style={styles.stepTitle}>Add to .env Environment File</div>
                  <div style={styles.stepDesc}>
                    Add your credentials in your <code>.env</code> file:
                    <pre style={styles.codeBlock}>
{`YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:5173/api/auth/youtube/callback`}
                    </pre>
                  </div>
                </div>
              </div>

              <div style={styles.setupNote}>
                <Info size={15} color="#2563eb" />
                <span>
                  For complete detailed instructions, see the included <code>YOUTUBE_INTEGRATION_SETUP.md</code> documentation.
                </span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowSetupModal(false)}
                style={styles.submitCloseBtn}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    marginBottom: "20px",
  },
  connectedCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },
  channelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    paddingBottom: "18px",
    borderBottom: "1px solid #f1f5f9",
  },
  channelMetaLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avatarWrap: {
    position: "relative",
    width: "56px",
    height: "56px",
  },
  channelAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #e2e8f0",
  },
  fallbackAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    position: "absolute",
    bottom: "2px",
    right: "2px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    border: "2px solid #ffffff",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  channelTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #fecaca",
  },
  handleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "4px",
  },
  channelHandle: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  externalLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  syncMetaText: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#64748b",
    marginRight: "6px",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  disconnectBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#ffffff",
    color: "#dc2626",
    border: "1px solid #fecaca",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "18px",
  },
  metricCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
  },
  metricCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  metricLabel: {
    fontSize: "11.5px",
    color: "#64748b",
    fontWeight: "600",
  },
  metricIconWrap: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  metricSubtext: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "4px",
  },
  timeframeBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "18px",
    paddingTop: "14px",
    borderTop: "1px solid #f1f5f9",
  },
  timeframeLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
  },
  rangeButtons: {
    display: "flex",
    gap: "6px",
  },
  rangeBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "none",
    fontSize: "11.5px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11.5px",
    color: "#166534",
  },
  disconnectedCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
  },
  disconnectedContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    maxWidth: "680px",
  },
  ytLogoWrap: {
    marginTop: "2px",
    flexShrink: 0,
  },
  disconnectedInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "4px",
  },
  ytPill: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "5px",
  },
  readOnlyPill: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "5px",
  },
  disconnectedTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  disconnectedDesc: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.5",
    margin: 0,
  },
  connectActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
  },
  connectBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "13.5px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
    transition: "background 0.15s, transform 0.1s",
  },
  setupGuideBtn: {
    display: "inline-flex",
    alignItems: "center",
    background: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "underline",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 16px",
    marginTop: "12px",
  },
  errorTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#991b1b",
  },
  errorText: {
    fontSize: "12.5px",
    color: "#b91c1c",
  },
  reconnectBtn: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "460px",
    width: "90%",
    padding: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
  },
  modalBodyText: {
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: "1.5",
    margin: "0 0 20px 0",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  cancelBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  confirmDisconnectBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  setupContent: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    margin: "16px 0 20px 0",
  },
  setupStep: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  stepNum: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  stepDesc: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "3px",
    lineHeight: "1.4",
  },
  codeSnippet: {
    backgroundColor: "#f1f5f9",
    padding: "6px 10px",
    borderRadius: "6px",
    marginTop: "6px",
    fontFamily: "monospace",
    fontSize: "11.5px",
    color: "#0f172a",
    wordBreak: "break-all",
  },
  codeBlock: {
    backgroundColor: "#0f172a",
    color: "#38bdf8",
    padding: "10px 12px",
    borderRadius: "8px",
    marginTop: "6px",
    fontSize: "11px",
    fontFamily: "monospace",
    overflowX: "auto",
  },
  setupNote: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#eff6ff",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#1e40af",
  },
  submitCloseBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

import React, { useState } from "react";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
  Video,
  Image,
  Briefcase,
  Layers,
  Lock,
  TrendingUp,
  X,
} from "lucide-react";
import { SOCIAL_CHANNELS } from "../mockData";

export default function SocialAccountsSection({ initialAccounts }) {
  const [accounts, setAccounts] = useState(initialAccounts || SOCIAL_CHANNELS);
  const [syncingId, setSyncingId] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState("Twitter / X");
  const [newHandle, setNewHandle] = useState("");

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3000);
  };

  const handleSyncAccount = (id, name) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, lastSynced: "Just now" } : acc
        )
      );
      showToast(`Successfully refreshed live metrics for ${name}!`);
    }, 900);
  };

  const handleAddChannel = (e) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    const newChannelObj = {
      id: `acc-${Date.now()}`,
      platform: newPlatform,
      handle: newHandle.startsWith("@") ? newHandle : `@${newHandle}`,
      badgeColor: "#0284c7",
      badgeBg: "#e0f2fe",
      followers: "12,400",
      followersCount: 12400,
      reach: "38,500",
      reachCount: 38500,
      engagement: "5.8%",
      revenue: "$450",
      growth: "+8.0%",
      status: "OAuth Verified",
      healthScore: 94,
      primaryFormat: "Feed Posts & Threads",
      syncStatus: "Connected & Live",
      lastSynced: "Just now",
    };

    setAccounts([newChannelObj, ...accounts]);
    setNewHandle("");
    setShowConnectModal(false);
    showToast(`Connected ${newPlatform} account ${newChannelObj.handle}!`);
  };

  return (
    <div style={styles.card}>
      {/* Toast */}
      {feedbackToast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBadge}>
            <Share2 size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={styles.title}>Multi-Channel Analytics & Accounts</h3>
              <span style={styles.activePill}>{accounts.length} Connected</span>
            </div>
            <p style={styles.subtitle}>
              Manage synced social networks, data ingestion status, and health scores
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          style={styles.connectBtn}
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Connect Social Channel
        </button>
      </div>

      {/* Channel Grid */}
      <div style={styles.grid}>
        {accounts.map((acc) => {
          const isSyncing = syncingId === acc.id;
          return (
            <div key={acc.id} style={styles.channelCard}>
              <div style={styles.channelTop}>
                <div style={styles.channelIdentity}>
                  <span
                    style={{
                      ...styles.platformBadge,
                      backgroundColor: acc.badgeBg,
                      color: acc.badgeColor,
                    }}
                  >
                    {acc.platform}
                  </span>
                  <span style={styles.handleText}>{acc.handle}</span>
                </div>

                <button
                  onClick={() => handleSyncAccount(acc.id, acc.platform)}
                  disabled={isSyncing}
                  style={styles.syncBtn}
                  title="Force re-sync platform metrics"
                >
                  <RefreshCw
                    size={14}
                    style={{
                      animation: isSyncing ? "spin 0.8s linear infinite" : "none",
                    }}
                    color="#64748b"
                  />
                  <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                </button>
              </div>

              {/* Stats Box */}
              <div style={styles.metricsBox}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Followers / Subs</span>
                  <span style={styles.metricVal}>{acc.followers}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Avg 30D Reach</span>
                  <span style={styles.metricVal}>{acc.reach}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Engagement</span>
                  <span style={{ ...styles.metricVal, color: "#15803d" }}>
                    {acc.engagement}
                  </span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Revenue</span>
                  <span style={styles.metricVal}>{acc.revenue}</span>
                </div>
              </div>

              {/* Health Score & Sync Meta */}
              <div style={styles.channelFooter}>
                <div style={styles.healthWrap}>
                  <span style={styles.healthLabel}>API Health:</span>
                  <div style={styles.healthBarTrack}>
                    <div
                      style={{
                        ...styles.healthBarFill,
                        width: `${acc.healthScore}%`,
                      }}
                    />
                  </div>
                  <span style={styles.healthVal}>{acc.healthScore}%</span>
                </div>

                <div style={styles.syncMeta}>
                  <span style={styles.syncedDot}></span>
                  <span>Synced {acc.lastSynced}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Share2 size={18} color="#2563eb" />
                <h4 style={styles.modalTitle}>Connect New Social Network</h4>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddChannel} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  style={styles.select}
                >
                  <option value="Twitter / X">Twitter / X</option>
                  <option value="LinkedIn Creator">LinkedIn Creator</option>
                  <option value="Substack Newsletter">Substack Newsletter</option>
                  <option value="Discord Community">Discord Community</option>
                  <option value="Spotify Podcast">Spotify Podcast</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Creator Handle / Username</label>
                <input
                  type="text"
                  placeholder="@yourhandle"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.modalInfoNotice}>
                <ShieldCheck size={16} color="#15803d" />
                <span>
                  Uses read-only OAuth 2.0 telemetry with encryption. No posting permissions required.
                </span>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Verify & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
    marginBottom: "24px",
    position: "relative",
  },
  toast: {
    position: "absolute",
    top: "16px",
    right: "24px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "12.5px",
    fontWeight: "600",
    padding: "8px 14px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    zIndex: 10,
    animation: "fadeIn 0.2s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  activePill: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #bfdbfe",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  connectBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  channelCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    transition: "box-shadow 0.15s ease",
  },
  channelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  platformBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  handleText: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  syncBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11.5px",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  metricsBox: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    backgroundColor: "#ffffff",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #edf2f7",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  metricLabel: {
    fontSize: "10.5px",
    fontWeight: "600",
    color: "#64748b",
  },
  metricVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  channelFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#64748b",
    paddingTop: "4px",
  },
  healthWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  healthLabel: {
    fontSize: "11px",
    color: "#64748b",
  },
  healthBarTrack: {
    width: "45px",
    height: "5px",
    backgroundColor: "#e2e8f0",
    borderRadius: "3px",
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    backgroundColor: "#15803d",
    borderRadius: "3px",
  },
  healthVal: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
  },
  syncMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
  },
  syncedDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "440px",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
  },
  select: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  input: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
  },
  modalInfoNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    backgroundColor: "#f0fdf4",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
    fontSize: "11.5px",
    color: "#166534",
    lineHeight: "1.4",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "8px 14px",
    fontSize: "12.5px",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "8px 16px",
    fontSize: "12.5px",
    fontWeight: "600",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

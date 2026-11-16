import React, { useState } from "react";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Video,
  Layers,
  Lock,
  X,
} from "lucide-react";

export default function SocialAccountsSection({
  connectedYouTubeChannel = null,
  isYouTubeConnected = false,
}) {
  const [selectedModalPlatform, setSelectedModalPlatform] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3000);
  };

  const platforms = [
    {
      id: "youtube",
      platform: "YouTube",
      handle: isYouTubeConnected && connectedYouTubeChannel
        ? connectedYouTubeChannel.customUrl || `@${connectedYouTubeChannel.title?.replace(/\s+/g, "")}`
        : "Not connected",
      badgeColor: "#dc2626",
      badgeBg: "#fee2e2",
      followers: isYouTubeConnected && connectedYouTubeChannel
        ? Number(connectedYouTubeChannel.subscriberCount || 0).toLocaleString()
        : "—",
      followersLabel: "Subscribers",
      reach: isYouTubeConnected && connectedYouTubeChannel
        ? Number(connectedYouTubeChannel.viewCount || 0).toLocaleString()
        : "—",
      reachLabel: "Channel Views",
      uploads: isYouTubeConnected && connectedYouTubeChannel
        ? `${connectedYouTubeChannel.videoCount || 0} videos`
        : "—",
      status: isYouTubeConnected ? "OAuth 2.0 Verified" : "Not Connected",
      syncStatus: isYouTubeConnected ? "Connected & Live" : "Available",
      isConnected: isYouTubeConnected,
      primaryFormat: "Longform & Shorts",
      actionText: isYouTubeConnected ? "Live Connected" : "Connect via Google OAuth",
    },
    {
      id: "instagram",
      platform: "Instagram",
      handle: "Not connected",
      badgeColor: "#e1306c",
      badgeBg: "#fce7f3",
      followers: "—",
      followersLabel: "Followers",
      reach: "—",
      reachLabel: "Impressions",
      uploads: "—",
      status: "Not Connected",
      syncStatus: "Available",
      isConnected: false,
      primaryFormat: "Reels & Carousels",
      actionText: "Connect Account",
    },
    {
      id: "tiktok",
      platform: "TikTok",
      handle: "Not connected",
      badgeColor: "#0f172a",
      badgeBg: "#f1f5f9",
      followers: "—",
      followersLabel: "Followers",
      reach: "—",
      reachLabel: "Video Views",
      uploads: "—",
      status: "Not Connected",
      syncStatus: "Available",
      isConnected: false,
      primaryFormat: "Shortform Video",
      actionText: "Connect Account",
    },
    {
      id: "twitch",
      platform: "Twitch",
      handle: "Not connected",
      badgeColor: "#9333ea",
      badgeBg: "#f3e8ff",
      followers: "—",
      followersLabel: "Followers",
      reach: "—",
      reachLabel: "Stream Hours",
      uploads: "—",
      status: "Not Connected",
      syncStatus: "Available",
      isConnected: false,
      primaryFormat: "Livestreams",
      actionText: "Connect Account",
    },
  ];

  return (
    <div style={styles.card}>
      {/* Toast Feedback */}
      {feedbackToast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Social Media Channel Integrations</h3>
            <span style={styles.activePill}>
              {isYouTubeConnected ? "1 Connected Channel" : "0 Channels Connected"}
            </span>
          </div>
          <p style={styles.subtitle}>
            Authorized social platforms streaming verified real-time audience metrics and engagement data
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div style={styles.grid}>
        {platforms.map((acc) => (
          <div
            key={acc.id}
            style={{
              ...styles.accountCard,
              borderColor: acc.isConnected ? "#bfdbfe" : "#e2e8f0",
              backgroundColor: acc.isConnected ? "#ffffff" : "#f8fafc",
            }}
          >
            <div style={styles.accountTop}>
              <div style={styles.platformBadgeWrap}>
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

              {acc.isConnected ? (
                <span style={styles.connectedBadge}>
                  <ShieldCheck size={12} style={{ marginRight: 4 }} />
                  Live API
                </span>
              ) : (
                <span style={styles.notConnectedBadge}>Not Connected</span>
              )}
            </div>

            {/* Metrics Row */}
            <div style={styles.metricsRow}>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>{acc.followersLabel}</span>
                <span style={styles.metricVal}>{acc.followers}</span>
              </div>

              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>{acc.reachLabel}</span>
                <span style={styles.metricVal}>{acc.reach}</span>
              </div>

              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>Content</span>
                <span style={styles.metricVal}>{acc.uploads}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div style={styles.cardFooter}>
              {acc.isConnected ? (
                <div style={styles.syncStatusWrap}>
                  <span style={styles.liveDot} />
                  <span style={styles.syncStatusText}>OAuth 2.0 Live Synced</span>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedModalPlatform(acc.platform)}
                  style={styles.connectBtn}
                >
                  {acc.actionText}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connect Info Modal */}
      {selectedModalPlatform && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>Connect {selectedModalPlatform}</h4>
              <button
                onClick={() => setSelectedModalPlatform(null)}
                style={styles.closeBtn}
              >
                <X size={16} />
              </button>
            </div>
            <p style={styles.modalDesc}>
              {selectedModalPlatform === "YouTube"
                ? "YouTube integration is fully active via Google OAuth 2.0. Use the 'Connect YouTube' card at the top of the Analytics page to authenticate your channel."
                : `Official ${selectedModalPlatform} OAuth API integration is currently in rollout. YouTube is currently our live, verified platform integration with Google Cloud.`}
            </p>
            <button
              onClick={() => setSelectedModalPlatform(null)}
              style={styles.modalPrimaryBtn}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
    position: "relative",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  subtitle: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "4px",
    marginBottom: 0,
  },
  activePill: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  accountCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "border-color 0.15s ease",
  },
  accountTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "14px",
  },
  platformBadgeWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  platformBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    width: "fit-content",
  },
  handleText: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: "600",
  },
  connectedBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  notConnectedBadge: {
    fontSize: "10.5px",
    fontWeight: "600",
    color: "#94a3b8",
    backgroundColor: "#f1f5f9",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    padding: "10px 0",
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
    marginBottom: "14px",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
  },
  metricLabel: {
    fontSize: "10.5px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  metricVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "2px",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncStatusWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#15803d",
  },
  syncStatusText: {
    fontSize: "11.5px",
    color: "#15803d",
    fontWeight: "600",
  },
  connectBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    transition: "background 0.15s",
  },
  toast: {
    position: "absolute",
    top: "16px",
    right: "16px",
    backgroundColor: "#ffffff",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: "600",
    padding: "8px 14px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "24px",
    width: "90%",
    maxWidth: "420px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
  },
  modalDesc: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
    marginBottom: "20px",
  },
  modalPrimaryBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

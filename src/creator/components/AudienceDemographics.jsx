import React from "react";
import { Users, Eye, Video, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AudienceDemographics({ channel = null, summary = null, isLiveConnected = false }) {
  const subscribers = Number(channel?.subscriberCount) || Number(summary?.subscribers) || 0;
  const totalViews = Number(channel?.viewCount) || Number(summary?.totalViews) || 0;
  const totalVideos = Number(channel?.videoCount) || Number(summary?.totalVideos) || 0;
  const engagementRate = summary?.engagementRate || "0.0%";
  const avgViewsPerVideo = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
  const watchHours = Number(summary?.estimatedWatchHours) || 0;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Audience & Channel Telemetry</h3>
            {isLiveConnected && (
              <span style={styles.verifiedBadge}>
                <ShieldCheck size={12} style={{ marginRight: 4 }} />
                Google OAuth Verified
              </span>
            )}
          </div>
          <p style={styles.subtitle}>
            Verified channel metrics, engagement ratios, and library volume from YouTube Data API v3
          </p>
        </div>
      </div>

      {isLiveConnected && channel ? (
        <div style={styles.telemetryContainer}>
          <div style={styles.grid}>
            {/* Metric 1: Subscribers */}
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Total Subscribers</span>
                <div style={{ ...styles.iconBox, backgroundColor: "#eff6ff" }}>
                  <Users size={16} color="#2563eb" />
                </div>
              </div>
              <div style={styles.metricValue}>{subscribers.toLocaleString()}</div>
              <div style={styles.metricSub}>Direct channel subscribers</div>
            </div>

            {/* Metric 2: Lifetime Views */}
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Lifetime Views</span>
                <div style={{ ...styles.iconBox, backgroundColor: "#fee2e2" }}>
                  <Eye size={16} color="#dc2626" />
                </div>
              </div>
              <div style={styles.metricValue}>{totalViews.toLocaleString()}</div>
              <div style={styles.metricSub}>Total impressions & plays</div>
            </div>

            {/* Metric 3: Video Library */}
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Published Uploads</span>
                <div style={{ ...styles.iconBox, backgroundColor: "#f0fdf4" }}>
                  <Video size={16} color="#15803d" />
                </div>
              </div>
              <div style={styles.metricValue}>{totalVideos.toLocaleString()}</div>
              <div style={styles.metricSub}>Public video catalogue</div>
            </div>

            {/* Metric 4: Avg Views / Video */}
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Avg Views / Video</span>
                <div style={{ ...styles.iconBox, backgroundColor: "#f5f3ff" }}>
                  <Sparkles size={16} color="#7c3aed" />
                </div>
              </div>
              <div style={styles.metricValue}>{avgViewsPerVideo.toLocaleString()}</div>
              <div style={styles.metricSub}>Calculated performance ratio</div>
            </div>
          </div>

          {/* Channel Identity Bar */}
          <div style={styles.channelBar}>
            <div style={styles.channelLeft}>
              {channel.thumbnail ? (
                <img src={channel.thumbnail} alt={channel.title} style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>{channel.title?.charAt(0) || "Y"}</div>
              )}
              <div>
                <span style={styles.channelTitle}>{channel.title}</span>
                <span style={styles.channelHandle}>
                  {channel.customUrl || `@${channel.title?.replace(/\s+/g, "")}`} • Channel ID: {channel.channelId?.slice(0, 14)}...
                </span>
              </div>
            </div>
            <div style={styles.statusPill}>
              <CheckCircle2 size={13} color="#15803d" />
              <span>Live API Synced</span>
            </div>
          </div>

          <div style={styles.transparencyNote}>
            <span>
              ℹ️ Demographic census metrics (age brackets, gender ratios, geographical breakdown) require YouTube Analytics Content Owner enterprise quota. The metrics above represent 100% verified real-time data from your connected channel.
            </span>
          </div>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <Users size={28} color="#94a3b8" />
          <h4 style={styles.emptyTitle}>YouTube Channel Not Connected</h4>
          <p style={styles.emptyText}>
            Connect your official YouTube account above to stream verified real-time audience reach, impressions, and engagement telemetry.
          </p>
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
  verifiedBadge: {
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
  telemetryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  metricCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: "10px",
    padding: "14px",
  },
  metricHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  metricLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },
  iconBox: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
  },
  metricSub: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "2px",
  },
  channelBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 16px",
  },
  channelLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "14px",
  },
  channelTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  channelHandle: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#ffffff",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "6px",
  },
  transparencyNote: {
    fontSize: "11px",
    color: "#94a3b8",
    lineHeight: "1.4",
    backgroundColor: "#ffffff",
    border: "1px solid #f1f5f9",
    padding: "10px 12px",
    borderRadius: "8px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
  },
  emptyTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "10px 0 4px 0",
  },
  emptyText: {
    fontSize: "12.5px",
    color: "#64748b",
    maxWidth: "400px",
    lineHeight: "1.4",
    margin: 0,
  },
};

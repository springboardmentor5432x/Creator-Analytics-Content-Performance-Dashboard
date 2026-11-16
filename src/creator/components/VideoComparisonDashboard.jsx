import React, { useState } from "react";
import {
  GitCompare,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Clock,
  Percent,
  ExternalLink,
  BarChart2,
  AlertCircle,
  Video as VideoIcon,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function VideoComparisonDashboard({
  videos = [],
  isLiveConnected = false,
  onAnalyzeVideo,
  themeColor = "#2563eb",
}) {
  // If fewer than 2 videos, handle safely
  const initialA = videos[0]?.id || "";
  const initialB = videos.length > 1 ? videos[1]?.id : videos[0]?.id || "";

  const [selectedIdA, setSelectedIdA] = useState(initialA);
  const [selectedIdB, setSelectedIdB] = useState(initialB);

  // Keep selection in sync if videos list updates
  const videoA = videos.find((v) => v.id === selectedIdA) || videos[0] || null;
  const videoB = videos.find((v) => v.id === selectedIdB) || (videos.length > 1 ? videos[1] : videos[0]) || null;

  if (!isLiveConnected || videos.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <GitCompare size={28} color="#94a3b8" />
          </div>
          <h4 style={styles.emptyTitle}>
            {isLiveConnected ? "No Uploaded Videos to Compare" : "YouTube Channel Not Connected"}
          </h4>
          <p style={styles.emptyText}>
            {isLiveConnected
              ? "Your connected YouTube channel currently has 0 uploaded videos. Once you upload content to YouTube, you can select any two videos to compare retention curves, engagement ratios, and viewer impressions side-by-side."
              : "Connect your official YouTube channel above via Google OAuth 2.0 to compare video performance side-by-side with real metrics."}
          </p>
        </div>
      </div>
    );
  }

  // Helper for numeric values
  const getNum = (v, key, fallbackKey) => {
    if (!v) return 0;
    if (v[key] !== undefined && v[key] !== null) return Number(v[key]) || 0;
    if (fallbackKey && v[fallbackKey] !== undefined) return Number(v[fallbackKey]) || 0;
    return 0;
  };

  const viewsA = getNum(videoA, "views", "viewsCount");
  const viewsB = getNum(videoB, "views", "viewsCount");

  const likesA = getNum(videoA, "likes", "likesCount");
  const likesB = getNum(videoB, "likes", "likesCount");

  const commentsA = getNum(videoA, "comments", "commentsCount");
  const commentsB = getNum(videoB, "comments", "commentsCount");

  const getEngRateNum = (v) => {
    if (!v) return 0;
    const str = v.engagementRate || v.engagement || "0.0%";
    return parseFloat(str) || 0;
  };

  const engA = getEngRateNum(videoA);
  const engB = getEngRateNum(videoB);

  const watchTimeHoursA = videoA?.watchTimeHours !== undefined ? Number(videoA.watchTimeHours) : null;
  const watchTimeHoursB = videoB?.watchTimeHours !== undefined ? Number(videoB.watchTimeHours) : null;

  const avgDurationSecA = videoA?.averageViewDurationSeconds !== undefined ? Number(videoA.averageViewDurationSeconds) : null;
  const avgDurationSecB = videoB?.averageViewDurationSeconds !== undefined ? Number(videoB.averageViewDurationSeconds) : null;

  const retentionPctA = videoA?.averageViewPercentage !== undefined ? Number(videoA.averageViewPercentage) : null;
  const retentionPctB = videoB?.averageViewPercentage !== undefined ? Number(videoB.averageViewPercentage) : null;

  // Comparison metrics definition
  const metrics = [
    {
      id: "views",
      label: "Total Views",
      icon: Eye,
      iconColor: "#2563eb",
      valA: viewsA,
      valB: viewsB,
      format: (val) => val.toLocaleString(),
      isAvailableA: true,
      isAvailableB: true,
      better: viewsA > viewsB ? "A" : viewsB > viewsA ? "B" : "EQUAL",
      diffText: () => {
        const diff = Math.abs(viewsA - viewsB);
        const minVal = Math.min(viewsA, viewsB);
        const pct = minVal > 0 ? ((diff / minVal) * 100).toFixed(1) : "—";
        return `Δ ${diff.toLocaleString()} (${pct !== "—" ? `+${pct}%` : "Higher"})`;
      },
    },
    {
      id: "likes",
      label: "Likes",
      icon: ThumbsUp,
      iconColor: "#dc2626",
      valA: likesA,
      valB: likesB,
      format: (val) => val.toLocaleString(),
      isAvailableA: true,
      isAvailableB: true,
      better: likesA > likesB ? "A" : likesB > likesA ? "B" : "EQUAL",
      diffText: () => {
        const diff = Math.abs(likesA - likesB);
        const minVal = Math.min(likesA, likesB);
        const pct = minVal > 0 ? ((diff / minVal) * 100).toFixed(1) : "—";
        return `Δ ${diff.toLocaleString()} (${pct !== "—" ? `+${pct}%` : "Higher"})`;
      },
    },
    {
      id: "comments",
      label: "Comments",
      icon: MessageSquare,
      iconColor: "#8b5cf6",
      valA: commentsA,
      valB: commentsB,
      format: (val) => val.toLocaleString(),
      isAvailableA: true,
      isAvailableB: true,
      better: commentsA > commentsB ? "A" : commentsB > commentsA ? "B" : "EQUAL",
      diffText: () => {
        const diff = Math.abs(commentsA - commentsB);
        const minVal = Math.min(commentsA, commentsB);
        const pct = minVal > 0 ? ((diff / minVal) * 100).toFixed(1) : "—";
        return `Δ ${diff.toLocaleString()} (${pct !== "—" ? `+${pct}%` : "Higher"})`;
      },
    },
    {
      id: "engagement",
      label: "Engagement Rate",
      icon: TrendingUp,
      iconColor: "#16a34a",
      valA: engA,
      valB: engB,
      format: (val) => `${val.toFixed(1)}%`,
      isAvailableA: true,
      isAvailableB: true,
      better: engA > engB ? "A" : engB > engA ? "B" : "EQUAL",
      diffText: () => {
        const diff = Math.abs(engA - engB).toFixed(2);
        return `Δ ${diff}% pts`;
      },
    },
    {
      id: "watchTime",
      label: "Estimated Watch Time",
      icon: Clock,
      iconColor: "#f59e0b",
      valA: watchTimeHoursA,
      valB: watchTimeHoursB,
      format: (val) => (val !== null ? `${val} hrs` : "Pending"),
      isAvailableA: watchTimeHoursA !== null && videoA?.analyticsAvailable,
      isAvailableB: watchTimeHoursB !== null && videoB?.analyticsAvailable,
      better:
        watchTimeHoursA !== null && watchTimeHoursB !== null
          ? watchTimeHoursA > watchTimeHoursB
            ? "A"
            : watchTimeHoursB > watchTimeHoursA
            ? "B"
            : "EQUAL"
          : null,
      diffText: () => {
        if (watchTimeHoursA === null || watchTimeHoursB === null) return "Pending Analytics sync";
        const diff = Math.abs(watchTimeHoursA - watchTimeHoursB).toFixed(1);
        return `Δ ${diff} hrs`;
      },
    },
    {
      id: "avgDuration",
      label: "Avg. View Duration",
      icon: Clock,
      iconColor: "#0284c7",
      valA: avgDurationSecA,
      valB: avgDurationSecB,
      format: (val, v) => (v?.averageViewDurationFormatted ? v.averageViewDurationFormatted : val !== null && val > 0 ? `${Math.floor(val / 60)}:${String(val % 60).padStart(2, "0")}` : "Pending"),
      isAvailableA: avgDurationSecA !== null && videoA?.analyticsAvailable,
      isAvailableB: avgDurationSecB !== null && videoB?.analyticsAvailable,
      better:
        avgDurationSecA !== null && avgDurationSecB !== null
          ? avgDurationSecA > avgDurationSecB
            ? "A"
            : avgDurationSecB > avgDurationSecA
            ? "B"
            : "EQUAL"
          : null,
      diffText: () => {
        if (avgDurationSecA === null || avgDurationSecB === null) return "Pending Analytics sync";
        const diff = Math.abs(avgDurationSecA - avgDurationSecB);
        return `Δ ${diff}s`;
      },
    },
    {
      id: "retention",
      label: "Audience Retention Rate",
      icon: Percent,
      iconColor: "#10b981",
      valA: retentionPctA,
      valB: retentionPctB,
      format: (val) => (val !== null ? `${val.toFixed(1)}%` : "Pending"),
      isAvailableA: retentionPctA !== null && videoA?.analyticsAvailable,
      isAvailableB: retentionPctB !== null && videoB?.analyticsAvailable,
      better:
        retentionPctA !== null && retentionPctB !== null
          ? retentionPctA > retentionPctB
            ? "A"
            : retentionPctB > retentionPctA
            ? "B"
            : "EQUAL"
          : null,
      diffText: () => {
        if (retentionPctA === null || retentionPctB === null) return "Pending Analytics sync";
        const diff = Math.abs(retentionPctA - retentionPctB).toFixed(1);
        return `Δ ${diff}% pts`;
      },
    },
  ];

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={styles.headerIcon}>
              <GitCompare size={16} color="#2563eb" />
            </div>
            <h3 style={styles.title}>Side-by-Side Video Performance Comparison</h3>
          </div>
          <p style={styles.subtitle}>
            Select any two uploaded YouTube videos to benchmark impressions, engagement conversion, and watch duration
          </p>
        </div>

        {videos.length === 1 && (
          <div style={styles.singleVideoNotice}>
            <AlertCircle size={14} color="#d97706" />
            <span>Upload a second video to YouTube to unlock full comparative analytics.</span>
          </div>
        )}
      </div>

      {/* Selectors Row */}
      <div style={styles.selectorsGrid}>
        {/* Selector A */}
        <div style={styles.selectorCol}>
          <div style={styles.selectorLabelRow}>
            <span style={{ ...styles.videoBadge, backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
              Video A
            </span>
            <span style={styles.selectPrompt}>Choose primary video:</span>
          </div>
          <select
            value={videoA?.id || ""}
            onChange={(e) => setSelectedIdA(e.target.value)}
            style={styles.selectInput}
          >
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} ({Number(v.views || 0).toLocaleString()} views)
              </option>
            ))}
          </select>
        </div>

        {/* Versus Divider Badge */}
        <div style={styles.vsBadgeWrap}>
          <span style={styles.vsBadge}>VS</span>
        </div>

        {/* Selector B */}
        <div style={styles.selectorCol}>
          <div style={styles.selectorLabelRow}>
            <span style={{ ...styles.videoBadge, backgroundColor: "#fef3c7", color: "#b45309" }}>
              Video B
            </span>
            <span style={styles.selectPrompt}>Choose comparison video:</span>
          </div>
          <select
            value={videoB?.id || ""}
            onChange={(e) => setSelectedIdB(e.target.value)}
            style={styles.selectInput}
          >
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} ({Number(v.views || 0).toLocaleString()} views)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Cards Hero (Thumbnail & Info) */}
      <div style={styles.heroesGrid}>
        {/* Video A Card */}
        <div style={{ ...styles.videoCard, borderTopColor: "#2563eb" }}>
          <div style={styles.videoCardTop}>
            <div style={styles.thumbWrap}>
              {videoA?.thumbnail ? (
                <img src={videoA.thumbnail} alt={videoA.title} style={styles.thumb} />
              ) : (
                <div style={styles.thumbPlaceholder}>
                  <VideoIcon size={20} color="#94a3b8" />
                </div>
              )}
              {videoA?.duration && <span style={styles.durationPill}>{videoA.duration}</span>}
            </div>

            <div style={styles.videoInfo}>
              <div style={styles.cardTagRow}>
                <span style={{ ...styles.videoBadge, backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
                  Video A
                </span>
                <span style={styles.dateText}>{videoA?.publishedDate || "Recent"}</span>
              </div>
              <h4 style={styles.videoCardTitle} title={videoA?.title}>
                {videoA?.title}
              </h4>
            </div>
          </div>

          <div style={styles.cardActionRow}>
            <a
              href={videoA?.url || `https://www.youtube.com/watch?v=${videoA?.id?.replace(/^yt-/, "")}`}
              target="_blank"
              rel="noreferrer"
              style={styles.ytLink}
            >
              <ExternalLink size={12} style={{ marginRight: 4 }} />
              Watch Video
            </a>

            {onAnalyzeVideo && (
              <button
                onClick={() => onAnalyzeVideo(videoA)}
                style={styles.analyzeBtn}
              >
                <BarChart2 size={12} style={{ marginRight: 4 }} />
                Analyze
              </button>
            )}
          </div>
        </div>

        {/* Video B Card */}
        <div style={{ ...styles.videoCard, borderTopColor: "#f59e0b" }}>
          <div style={styles.videoCardTop}>
            <div style={styles.thumbWrap}>
              {videoB?.thumbnail ? (
                <img src={videoB.thumbnail} alt={videoB.title} style={styles.thumb} />
              ) : (
                <div style={styles.thumbPlaceholder}>
                  <VideoIcon size={20} color="#94a3b8" />
                </div>
              )}
              {videoB?.duration && <span style={styles.durationPill}>{videoB.duration}</span>}
            </div>

            <div style={styles.videoInfo}>
              <div style={styles.cardTagRow}>
                <span style={{ ...styles.videoBadge, backgroundColor: "#fef3c7", color: "#b45309" }}>
                  Video B
                </span>
                <span style={styles.dateText}>{videoB?.publishedDate || "Recent"}</span>
              </div>
              <h4 style={styles.videoCardTitle} title={videoB?.title}>
                {videoB?.title}
              </h4>
            </div>
          </div>

          <div style={styles.cardActionRow}>
            <a
              href={videoB?.url || `https://www.youtube.com/watch?v=${videoB?.id?.replace(/^yt-/, "")}`}
              target="_blank"
              rel="noreferrer"
              style={styles.ytLink}
            >
              <ExternalLink size={12} style={{ marginRight: 4 }} />
              Watch Video
            </a>

            {onAnalyzeVideo && (
              <button
                onClick={() => onAnalyzeVideo(videoB)}
                style={styles.analyzeBtn}
              >
                <BarChart2 size={12} style={{ marginRight: 4 }} />
                Analyze
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: "32%" }}>Metric</th>
              <th style={{ ...styles.th, width: "24%", textAlign: "right" }}>Video A</th>
              <th style={{ ...styles.th, width: "20%", textAlign: "center" }}>Difference</th>
              <th style={{ ...styles.th, width: "24%", textAlign: "right" }}>Video B</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <tr key={m.id} style={styles.tr}>
                  {/* Metric Label */}
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ ...styles.metricIconBox, color: m.iconColor }}>
                        <Icon size={14} />
                      </div>
                      <span style={styles.metricName}>{m.label}</span>
                    </div>
                  </td>

                  {/* Video A Value */}
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.valWithBadgeRight}>
                      {m.better === "A" && (
                        <span style={styles.leadBadgeGreen}>
                          <CheckCircle2 size={11} style={{ marginRight: 3 }} />
                          Higher
                        </span>
                      )}
                      <span
                        style={{
                          ...styles.metricNum,
                          fontWeight: m.better === "A" ? 700 : 500,
                          color: m.better === "A" ? "#0f172a" : "#475569",
                        }}
                      >
                        {m.format(m.valA, videoA)}
                      </span>
                    </div>
                  </td>

                  {/* Difference Column */}
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.diffBadge}>{m.diffText()}</span>
                  </td>

                  {/* Video B Value */}
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.valWithBadgeRight}>
                      {m.better === "B" && (
                        <span style={styles.leadBadgeGreen}>
                          <CheckCircle2 size={11} style={{ marginRight: 3 }} />
                          Higher
                        </span>
                      )}
                      <span
                        style={{
                          ...styles.metricNum,
                          fontWeight: m.better === "B" ? 700 : 500,
                          color: m.better === "B" ? "#0f172a" : "#475569",
                        }}
                      >
                        {m.format(m.valB, videoB)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Proportional Volume Visualizer Bars */}
      <div style={styles.barsSection}>
        <h4 style={styles.barsTitle}>Proportional Share Comparison</h4>
        <div style={styles.barsGrid}>
          {/* Views share */}
          <div style={styles.barItem}>
            <div style={styles.barLabelRow}>
              <span>Views Distribution</span>
              <span style={styles.barPcts}>
                {viewsA + viewsB > 0
                  ? `${((viewsA / (viewsA + viewsB)) * 100).toFixed(0)}% (A) vs ${((viewsB / (viewsA + viewsB)) * 100).toFixed(0)}% (B)`
                  : "0% vs 0%"}
              </span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barSegmentA,
                  width: `${viewsA + viewsB > 0 ? (viewsA / (viewsA + viewsB)) * 100 : 50}%`,
                }}
              />
              <div
                style={{
                  ...styles.barSegmentB,
                  width: `${viewsA + viewsB > 0 ? (viewsB / (viewsA + viewsB)) * 100 : 50}%`,
                }}
              />
            </div>
          </div>

          {/* Likes share */}
          <div style={styles.barItem}>
            <div style={styles.barLabelRow}>
              <span>Likes Distribution</span>
              <span style={styles.barPcts}>
                {likesA + likesB > 0
                  ? `${((likesA / (likesA + likesB)) * 100).toFixed(0)}% (A) vs ${((likesB / (likesA + likesB)) * 100).toFixed(0)}% (B)`
                  : "0% vs 0%"}
              </span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barSegmentA,
                  width: `${likesA + likesB > 0 ? (likesA / (likesA + likesB)) * 100 : 50}%`,
                }}
              />
              <div
                style={{
                  ...styles.barSegmentB,
                  width: `${likesA + likesB > 0 ? (likesB / (likesA + likesB)) * 100 : 50}%`,
                }}
              />
            </div>
          </div>

          {/* Comments share */}
          <div style={styles.barItem}>
            <div style={styles.barLabelRow}>
              <span>Comments Distribution</span>
              <span style={styles.barPcts}>
                {commentsA + commentsB > 0
                  ? `${((commentsA / (commentsA + commentsB)) * 100).toFixed(0)}% (A) vs ${((commentsB / (commentsA + commentsB)) * 100).toFixed(0)}% (B)`
                  : "0% vs 0%"}
              </span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barSegmentA,
                  width: `${commentsA + commentsB > 0 ? (commentsA / (commentsA + commentsB)) * 100 : 50}%`,
                }}
              />
              <div
                style={{
                  ...styles.barSegmentB,
                  width: `${commentsA + commentsB > 0 ? (commentsB / (commentsA + commentsB)) * 100 : 50}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
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
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  headerIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: "3px",
    marginBottom: 0,
  },
  singleVideoNotice: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fef3c7",
    color: "#b45309",
    fontSize: "12px",
    padding: "6px 12px",
    borderRadius: "8px",
  },
  selectorsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
  },
  selectorCol: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  selectorLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  videoBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  selectPrompt: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  selectInput: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    outline: "none",
  },
  vsBadgeWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  vsBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "0.05em",
  },
  heroesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "24px",
  },
  videoCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderTopWidth: "4px",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
  },
  videoCardTop: {
    display: "flex",
    gap: "12px",
  },
  thumbWrap: {
    position: "relative",
    width: "120px",
    height: "68px",
    borderRadius: "6px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#0f172a",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  durationPill: {
    position: "absolute",
    bottom: "4px",
    right: "4px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "600",
    padding: "1px 4px",
    borderRadius: "3px",
  },
  videoInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  cardTagRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  dateText: {
    fontSize: "11px",
    color: "#64748b",
  },
  videoCardTitle: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardActionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "10px",
    borderTop: "1px solid #f1f5f9",
  },
  ytLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600",
  },
  analyzeBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    border: "none",
    color: "#0f172a",
    fontSize: "11.5px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  tableWrap: {
    overflowX: "auto",
    marginBottom: "24px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  thRow: {
    borderBottom: "2px solid #e2e8f0",
  },
  th: {
    padding: "10px 12px",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px",
    verticalAlign: "middle",
  },
  metricIconBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricName: {
    fontWeight: "600",
    color: "#0f172a",
  },
  metricNum: {
    fontSize: "13.5px",
  },
  valWithBadgeRight: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: "flex-end",
  },
  leadBadgeGreen: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  diffBadge: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  barsSection: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "18px",
    border: "1px solid #e2e8f0",
  },
  barsTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    margin: "0 0 14px 0",
  },
  barsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  barItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  barLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
  },
  barPcts: {
    fontSize: "11px",
    color: "#64748b",
  },
  barTrack: {
    height: "10px",
    borderRadius: "6px",
    backgroundColor: "#e2e8f0",
    display: "flex",
    overflow: "hidden",
  },
  barSegmentA: {
    backgroundColor: "#2563eb",
    height: "100%",
    transition: "width 0.3s ease",
  },
  barSegmentB: {
    backgroundColor: "#f59e0b",
    height: "100%",
    transition: "width 0.3s ease",
  },
  emptyState: {
    padding: "48px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "14px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  emptyText: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "520px",
    lineHeight: 1.5,
    margin: 0,
  },
};


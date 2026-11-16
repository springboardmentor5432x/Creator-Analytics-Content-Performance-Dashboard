import React, { useState } from "react";
import {
  Video as VideoIcon,
  Eye,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
  Sparkles,
  BarChart2,
  Clock,
  TrendingUp,
  Award,
  SlidersHorizontal,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function TopContentSection({
  liveVideos = [],
  isLiveConnected = false,
  channelTitle = "",
  onAnalyzeVideo,
  onCompareVideo,
}) {
  const [tableFilter, setTableFilter] = useState("all"); // 'all' | 'highest_views' | 'most_liked'
  const [chartMode, setChartMode] = useState("normalized"); // 'normalized' | 'ratios' | 'raw'
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Format live YouTube videos from Google Data API
  const formattedLiveVideos = (liveVideos || []).map((v) => {
    const viewsCount = Number(v.views) || Number(v.viewsCount) || 0;
    const likesCount = Number(v.likes) || Number(v.likesCount) || 0;
    const commentsCount = Number(v.comments) || Number(v.commentsCount) || 0;
    const engagementRate =
      v.engagementRate ||
      v.engagement ||
      (viewsCount > 0 ? (((likesCount + commentsCount) / viewsCount) * 100).toFixed(1) + "%" : "0.0%");

    return {
      ...v,
      id: v.id,
      rawId: v.id?.replace(/^yt-/, ""),
      title: v.title || "Untitled Upload",
      publishedDate: v.publishedDate || "Recent",
      views: viewsCount.toLocaleString(),
      viewsCount,
      likes: likesCount.toLocaleString(),
      likesCount,
      comments: commentsCount.toLocaleString(),
      commentsCount,
      duration: v.duration || v.formattedDuration || "Standard",
      durationSeconds: v.durationSeconds || 0,
      engagementRate,
      watchTimeHours: v.watchTimeHours !== undefined ? v.watchTimeHours : null,
      averageViewDurationFormatted: v.averageViewDurationFormatted || null,
      averageViewPercentage: v.averageViewPercentage || null,
      analyticsAvailable: Boolean(v.analyticsAvailable),
      earnings: `$${Math.round((viewsCount / 1000) * 3.5).toLocaleString()}`,
      viralityScore: Math.min(99, Math.round(50 + Math.log10(Math.max(1, viewsCount)) * 10)),
      thumbnail: v.thumbnail || "",
      url: v.url || `https://www.youtube.com/watch?v=${v.id?.replace(/^yt-/, "")}`,
    };
  });

  // Calculate dataset total views for share of views calculations
  const totalDatasetViews = formattedLiveVideos.reduce((acc, v) => acc + v.viewsCount, 0);

  // Rank top 5 performing videos by views
  const top5Videos = [...formattedLiveVideos]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 5);

  // Filter for table
  let displayedTableContent = [...formattedLiveVideos];
  if (tableFilter === "highest_views") {
    displayedTableContent.sort((a, b) => b.viewsCount - a.viewsCount);
  } else if (tableFilter === "most_liked") {
    displayedTableContent.sort((a, b) => b.likesCount - a.likesCount);
  }

  // Visualizer data prep for Top 5
  const peakViews = Math.max(...top5Videos.map((v) => v.viewsCount), 1);
  const peakLikes = Math.max(...top5Videos.map((v) => v.likesCount), 1);
  const peakComments = Math.max(...top5Videos.map((v) => v.commentsCount), 1);

  const rankBadges = [
    { rank: 1, label: "#1 Top Video", bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    { rank: 2, label: "#2 Rank", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
    { rank: 3, label: "#3 Rank", bg: "#ffedd5", color: "#9a3412", border: "#fdba74" },
    { rank: 4, label: "#4 Rank", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    { rank: 5, label: "#5 Rank", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  ];

  return (
    <div style={styles.container}>
      {/* ────────────────────────────────────────────────────────────────────────
          SECTION 1: TOP 5 PERFORMING VIDEOS LEADERBOARD
      ──────────────────────────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={styles.headerIconWrap}>
                <Award size={18} color="#eab308" />
              </div>
              <h3 style={styles.title}>Top Performing Videos Leaderboard</h3>
              {top5Videos.length > 0 && (
                <span style={styles.topBadgeCount}>
                  Top {top5Videos.length} of {formattedLiveVideos.length} Uploads
                </span>
              )}
            </div>
            <p style={styles.subtitle}>
              Ranked by verified view counts from Google YouTube Data API v3 with relative channel view share
            </p>
          </div>

          {top5Videos.length > 1 && onCompareVideo && (
            <button
              onClick={() => onCompareVideo(top5Videos[0], top5Videos[1])}
              style={styles.compareShortcutBtn}
            >
              Compare #1 vs #2 →
            </button>
          )}
        </div>

        {/* Top 5 Cards Grid */}
        {top5Videos.length > 0 ? (
          <div style={styles.top5Grid}>
            {top5Videos.map((video, idx) => {
              const badge = rankBadges[idx] || rankBadges[3];
              const viewSharePct =
                totalDatasetViews > 0
                  ? ((video.viewsCount / totalDatasetViews) * 100).toFixed(1)
                  : "0.0";

              return (
                <div key={video.id} style={{ ...styles.top5Card, borderColor: idx === 0 ? "#fde047" : "#e2e8f0" }}>
                  {/* Card Top: Rank Badge & Date */}
                  <div style={styles.top5CardHeader}>
                    <span
                      style={{
                        ...styles.rankPill,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {idx === 0 && <Sparkles size={11} style={{ marginRight: 3 }} />}
                      {badge.label}
                    </span>
                    <span style={styles.top5Date}>{video.publishedDate}</span>
                  </div>

                  {/* Thumbnail & Title */}
                  <div style={styles.top5MediaRow}>
                    <div style={styles.top5ThumbWrap}>
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} style={styles.top5Thumb} />
                      ) : (
                        <div style={styles.top5ThumbFallback}>
                          <VideoIcon size={20} color="#94a3b8" />
                        </div>
                      )}
                      {video.duration && <span style={styles.top5Duration}>{video.duration}</span>}
                    </div>

                    <div style={styles.top5TitleWrap}>
                      <h4 style={styles.top5Title} title={video.title}>
                        {video.title}
                      </h4>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.top5YtLink}
                        title="Open on YouTube"
                      >
                        <ExternalLink size={11} style={{ marginRight: 3 }} />
                        View on YouTube
                      </a>
                    </div>
                  </div>

                  {/* Core Metrics Grid */}
                  <div style={styles.top5StatsRow}>
                    <div style={styles.top5Stat}>
                      <span style={styles.top5StatLabel}>Views</span>
                      <span style={styles.top5StatVal}>{video.views}</span>
                    </div>
                    <div style={styles.top5Stat}>
                      <span style={styles.top5StatLabel}>Likes</span>
                      <span style={styles.top5StatVal}>{video.likes}</span>
                    </div>
                    <div style={styles.top5Stat}>
                      <span style={styles.top5StatLabel}>Comments</span>
                      <span style={styles.top5StatVal}>{video.comments}</span>
                    </div>
                    <div style={styles.top5Stat}>
                      <span style={styles.top5StatLabel}>Engagement</span>
                      <span style={{ ...styles.top5StatVal, color: "#16a34a" }}>
                        {video.engagementRate}
                      </span>
                    </div>
                  </div>

                  {/* Share of Views Progress Bar */}
                  <div style={styles.shareSection}>
                    <div style={styles.shareLabelRow}>
                      <span style={styles.shareLabel}>Share of Channel Views</span>
                      <span style={styles.shareVal}>{viewSharePct}%</span>
                    </div>
                    <div style={styles.shareTrack}>
                      <div
                        style={{
                          ...styles.shareFill,
                          width: `${Math.min(100, Math.max(2, Number(viewSharePct) || 0))}%`,
                          backgroundColor: idx === 0 ? "#eab308" : "#2563eb",
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Row */}
                  <div style={styles.top5ActionRow}>
                    <button
                      onClick={() => onAnalyzeVideo && onAnalyzeVideo(video)}
                      style={styles.top5AnalyzeBtn}
                    >
                      <BarChart2 size={13} style={{ marginRight: 5 }} />
                      Analyze Video Telemetry
                      <ChevronRight size={13} style={{ marginLeft: "auto" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrap}>
              <VideoIcon size={28} color="#94a3b8" />
            </div>
            <h4 style={styles.emptyTitle}>
              {isLiveConnected
                ? "No Uploaded Videos on Connected YouTube Channel"
                : "YouTube Channel Not Connected"}
            </h4>
            <p style={styles.emptyText}>
              {isLiveConnected
                ? `Channel "${channelTitle || "Connected Channel"}" currently has 0 uploaded videos. Once you upload content to YouTube, your top videos will automatically be ranked and analyzed here.`
                : "Connect your official YouTube channel above via Google OAuth 2.0 to rank top performing videos."}
            </p>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          SECTION 2: VIEWS, LIKES & COMMENTS COMPARISON VISUALIZER
      ──────────────────────────────────────────────────────────────────────── */}
      {top5Videos.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ ...styles.headerIconWrap, backgroundColor: "#eff6ff" }}>
                  <TrendingUp size={18} color="#2563eb" />
                </div>
                <h3 style={styles.title}>Views, Likes & Comments Comparison Visualizer</h3>
              </div>
              <p style={styles.subtitle}>
                Multi-metric benchmarking across top uploads with normalized relative scaling to prevent large view counts from obscuring interactions
              </p>
            </div>

            {/* Mode Selector */}
            <div style={styles.chartModePills}>
              {[
                { id: "normalized", label: "Normalized (% of Peak)" },
                { id: "ratios", label: "Interactions per 1k Views" },
                { id: "raw", label: "Raw Numbers" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChartMode(m.id)}
                  style={{
                    ...styles.modePillBtn,
                    backgroundColor: chartMode === m.id ? "#0f172a" : "#f1f5f9",
                    color: chartMode === m.id ? "#ffffff" : "#475569",
                    fontWeight: chartMode === m.id ? 600 : 500,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visualizer Chart */}
          <div style={styles.visualizerContainer}>
            {/* Chart Legend */}
            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#2563eb" }} />
                <span>Views</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#dc2626" }} />
                <span>Likes</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#8b5cf6" }} />
                <span>Comments</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#16a34a" }} />
                <span>Engagement Rate</span>
              </div>
            </div>

            {/* Bars List */}
            <div style={styles.barsList}>
              {top5Videos.map((video, idx) => {
                const normViews = (video.viewsCount / peakViews) * 100;
                const normLikes = (video.likesCount / peakLikes) * 100;
                const normComments = (video.commentsCount / peakComments) * 100;

                const likesPer1k = video.viewsCount > 0 ? ((video.likesCount / video.viewsCount) * 1000).toFixed(1) : "0.0";
                const commentsPer1k = video.viewsCount > 0 ? ((video.commentsCount / video.viewsCount) * 1000).toFixed(1) : "0.0";

                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={video.id}
                    style={{
                      ...styles.barRowCard,
                      backgroundColor: isHovered ? "#f8fafc" : "#ffffff",
                    }}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Video Identity Column */}
                    <div style={styles.barVideoCol}>
                      <div style={styles.barRankPill}>#{idx + 1}</div>
                      <div style={styles.barThumbWrap}>
                        {video.thumbnail && <img src={video.thumbnail} alt={video.title} style={styles.barThumb} />}
                      </div>
                      <div style={styles.barTitleInfo}>
                        <h5 style={styles.barVideoTitle} title={video.title}>
                          {video.title}
                        </h5>
                        <span style={styles.barDurationText}>{video.duration}</span>
                      </div>
                    </div>

                    {/* Bars Display Column */}
                    <div style={styles.barTracksCol}>
                      {chartMode === "normalized" && (
                        <>
                          {/* Views bar */}
                          <div style={styles.singleBarGroup}>
                            <div style={styles.singleBarLabel}>
                              <span>Views: {video.views}</span>
                              <span style={styles.barPctNum}>{normViews.toFixed(0)}%</span>
                            </div>
                            <div style={styles.trackBg}>
                              <div style={{ ...styles.trackFill, width: `${Math.max(2, normViews)}%`, backgroundColor: "#2563eb" }} />
                            </div>
                          </div>

                          {/* Likes bar */}
                          <div style={styles.singleBarGroup}>
                            <div style={styles.singleBarLabel}>
                              <span>Likes: {video.likes}</span>
                              <span style={styles.barPctNum}>{normLikes.toFixed(0)}%</span>
                            </div>
                            <div style={styles.trackBg}>
                              <div style={{ ...styles.trackFill, width: `${Math.max(2, normLikes)}%`, backgroundColor: "#dc2626" }} />
                            </div>
                          </div>

                          {/* Comments bar */}
                          <div style={styles.singleBarGroup}>
                            <div style={styles.singleBarLabel}>
                              <span>Comments: {video.comments}</span>
                              <span style={styles.barPctNum}>{normComments.toFixed(0)}%</span>
                            </div>
                            <div style={styles.trackBg}>
                              <div style={{ ...styles.trackFill, width: `${Math.max(2, normComments)}%`, backgroundColor: "#8b5cf6" }} />
                            </div>
                          </div>
                        </>
                      )}

                      {chartMode === "ratios" && (
                        <div style={styles.ratiosGrid}>
                          <div style={styles.ratioStatBox}>
                            <span style={styles.ratioLabel}>Likes / 1k Views</span>
                            <span style={{ ...styles.ratioVal, color: "#dc2626" }}>{likesPer1k}</span>
                          </div>
                          <div style={styles.ratioStatBox}>
                            <span style={styles.ratioLabel}>Comments / 1k Views</span>
                            <span style={{ ...styles.ratioVal, color: "#8b5cf6" }}>{commentsPer1k}</span>
                          </div>
                          <div style={styles.ratioStatBox}>
                            <span style={styles.ratioLabel}>Engagement Rate</span>
                            <span style={{ ...styles.ratioVal, color: "#16a34a" }}>{video.engagementRate}</span>
                          </div>
                        </div>
                      )}

                      {chartMode === "raw" && (
                        <div style={styles.rawGrid}>
                          <div style={styles.rawStat}>
                            <Eye size={12} color="#2563eb" />
                            <span><strong>{video.views}</strong> views</span>
                          </div>
                          <div style={styles.rawStat}>
                            <ThumbsUp size={12} color="#dc2626" />
                            <span><strong>{video.likes}</strong> likes</span>
                          </div>
                          <div style={styles.rawStat}>
                            <MessageSquare size={12} color="#8b5cf6" />
                            <span><strong>{video.comments}</strong> comments</span>
                          </div>
                          <div style={styles.rawStat}>
                            <TrendingUp size={12} color="#16a34a" />
                            <span><strong>{video.engagementRate}</strong> eng</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Column */}
                    <div style={styles.barActionCol}>
                      <button
                        onClick={() => onAnalyzeVideo && onAnalyzeVideo(video)}
                        style={styles.miniAnalyzeBtn}
                        title="Analyze individual video"
                      >
                        <BarChart2 size={13} style={{ marginRight: 4 }} />
                        Analyze
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          SECTION 3: COMPLETE UPLOADS PERFORMANCE TABLE
      ──────────────────────────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={styles.title}>All Uploaded Videos & Performance Details</h3>
              {isLiveConnected && (
                <span style={styles.badgeCount}>{formattedLiveVideos.length} Uploads Tracked</span>
              )}
            </div>
            <p style={styles.subtitle}>
              Verified video statistics, durations, engagement rates, and deep-dive actions
            </p>
          </div>

          {/* Filter Badges */}
          {formattedLiveVideos.length > 0 && (
            <div style={styles.filterGroup}>
              <div style={styles.platformPills}>
                {[
                  { id: "all", label: "All Uploads" },
                  { id: "highest_views", label: "Highest Views" },
                  { id: "most_liked", label: "Most Liked" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTableFilter(f.id)}
                    style={{
                      ...styles.filterBtn,
                      backgroundColor: tableFilter === f.id ? "#0f172a" : "#f1f5f9",
                      color: tableFilter === f.id ? "#ffffff" : "#475569",
                      fontWeight: tableFilter === f.id ? 600 : 500,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {displayedTableContent.length > 0 ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: "36%" }}>Video Title & Details</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Views</th>
                  <th style={styles.th}>Interactions</th>
                  <th style={styles.th}>Engagement</th>
                  <th style={styles.th}>Watch Time</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTableContent.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.titleBlock}>
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} style={styles.tableThumb} />
                        ) : (
                          <div style={styles.formatIcon}>
                            <VideoIcon size={16} />
                          </div>
                        )}
                        <div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.contentTitle}
                            title="Open on YouTube"
                          >
                            {item.title}
                            <ExternalLink size={11} style={{ marginLeft: 4, display: "inline" }} />
                          </a>
                          <div style={styles.formatMeta}>
                            <span style={{ color: "#dc2626", fontWeight: 700 }}>• Live API</span>
                            <span>•</span>
                            <span>Published {item.publishedDate}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.durationTablePill}>
                        <Clock size={11} style={{ marginRight: 3 }} />
                        {item.duration}
                      </span>
                    </td>

                    <td style={styles.tdBold}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Eye size={13} color="#2563eb" />
                        {item.views}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.interactionGroup}>
                        <span style={styles.interactionItem}>
                          <ThumbsUp size={12} color="#dc2626" />
                          {item.likes}
                        </span>
                        <span style={styles.interactionItem}>
                          <MessageSquare size={12} color="#8b5cf6" />
                          {item.comments}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.engagementBadge}>{item.engagementRate}</span>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.watchTimeText}>
                        {item.watchTimeHours !== null ? `${item.watchTimeHours} hrs` : item.analyticsAvailable ? "0 hrs" : "Pending"}
                      </span>
                    </td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        onClick={() => onAnalyzeVideo && onAnalyzeVideo(item)}
                        style={styles.tableAnalyzeBtn}
                        title="Analyze individual video telemetry"
                      >
                        <BarChart2 size={12} style={{ marginRight: 4 }} />
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No video records to display.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
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
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
  },
  headerIconWrap: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#fef9c3",
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
  topBadgeCount: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#854d0e",
    backgroundColor: "#fef9c3",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid #fde047",
  },
  compareShortcutBtn: {
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  top5Grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  top5Card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  top5CardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankPill: {
    fontSize: "11px",
    fontWeight: "800",
    padding: "2px 8px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
  },
  top5Date: {
    fontSize: "11px",
    color: "#64748b",
  },
  top5MediaRow: {
    display: "flex",
    gap: "12px",
  },
  top5ThumbWrap: {
    position: "relative",
    width: "110px",
    height: "62px",
    borderRadius: "6px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#0f172a",
  },
  top5Thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  top5ThumbFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  top5Duration: {
    position: "absolute",
    bottom: "3px",
    right: "3px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    fontSize: "9.5px",
    fontWeight: "600",
    padding: "1px 4px",
    borderRadius: "3px",
  },
  top5TitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
    minWidth: 0,
  },
  top5Title: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  top5YtLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "500",
  },
  top5StatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
    backgroundColor: "#f8fafc",
    padding: "8px",
    borderRadius: "8px",
  },
  top5Stat: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    textAlign: "center",
  },
  top5StatLabel: {
    fontSize: "9.5px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  top5StatVal: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#0f172a",
  },
  shareSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  shareLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
  },
  shareLabel: {
    color: "#64748b",
  },
  shareVal: {
    fontWeight: "700",
    color: "#0f172a",
  },
  shareTrack: {
    height: "6px",
    borderRadius: "4px",
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  shareFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  top5ActionRow: {
    paddingTop: "6px",
  },
  top5AnalyzeBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    padding: "7px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  chartModePills: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#f8fafc",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  modePillBtn: {
    border: "none",
    padding: "5px 12px",
    borderRadius: "6px",
    fontSize: "11.5px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  visualizerContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "12px",
    color: "#475569",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  barsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  barRowCard: {
    display: "grid",
    gridTemplateColumns: "240px 1fr 100px",
    alignItems: "center",
    gap: "16px",
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    transition: "background 0.15s",
  },
  barVideoCol: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  barRankPill: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#64748b",
    width: "24px",
    textAlign: "center",
  },
  barThumbWrap: {
    width: "48px",
    height: "28px",
    borderRadius: "4px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#0f172a",
  },
  barThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  barTitleInfo: {
    minWidth: 0,
    flex: 1,
  },
  barVideoTitle: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  barDurationText: {
    fontSize: "10.5px",
    color: "#64748b",
  },
  barTracksCol: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  singleBarGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  singleBarLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10.5px",
    color: "#475569",
  },
  barPctNum: {
    fontWeight: "600",
    color: "#64748b",
  },
  trackBg: {
    height: "5px",
    borderRadius: "3px",
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  },
  ratiosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  ratioStatBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  ratioLabel: {
    fontSize: "10.5px",
    color: "#64748b",
  },
  ratioVal: {
    fontSize: "13px",
    fontWeight: "700",
  },
  rawGrid: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "12px",
    color: "#334155",
  },
  rawStat: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  barActionCol: {
    display: "flex",
    justifyContent: "flex-end",
  },
  miniAnalyzeBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    border: "none",
    color: "#0f172a",
    fontSize: "11.5px",
    fontWeight: "600",
    padding: "5px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  badgeCount: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  platformPills: {
    display: "flex",
    gap: "6px",
    backgroundColor: "#f8fafc",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  filterBtn: {
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    fontSize: "11.5px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tableWrapper: {
    overflowX: "auto",
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
    textAlign: "left",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "12px",
    verticalAlign: "middle",
    fontWeight: "700",
    color: "#0f172a",
  },
  titleBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  tableThumb: {
    width: "56px",
    height: "34px",
    borderRadius: "5px",
    objectFit: "cover",
    flexShrink: 0,
    border: "1px solid #e2e8f0",
  },
  formatIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    flexShrink: 0,
  },
  contentTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    textDecoration: "none",
    display: "inline-block",
    lineHeight: 1.3,
  },
  formatMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  durationTablePill: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  interactionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  interactionItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
  },
  engagementBadge: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#16a34a",
    backgroundColor: "#dcfce7",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  watchTimeText: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: "500",
  },
  tableAnalyzeBtn: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    padding: "5px 10px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  emptyState: {
    padding: "36px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  emptyText: {
    fontSize: "12.5px",
    color: "#64748b",
    maxWidth: "480px",
    lineHeight: 1.5,
    margin: 0,
  },
};

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Percent,
  TrendingUp,
  Calendar,
  AlertCircle,
  RefreshCw,
  Video as VideoIcon,
  Sparkles,
  BarChart2,
  ShieldCheck,
} from "lucide-react";
import { getVideoTrendAnalytics } from "../youtubeService";

export default function VideoDetailModal({
  video,
  isOpen,
  onClose,
  user,
  dateRange = "28d",
  themeColor = "#2563eb",
}) {
  const [trendData, setTrendData] = useState([]);
  const [trendSummary, setTrendSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState("views"); // 'views' | 'watchMinutes'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Fetch daily trends for this specific video
  const fetchTrends = useCallback(async () => {
    if (!video?.id || !user) return;
    setLoading(true);
    setError(null);

    try {
      // Strip potential 'yt-' prefix if present from formatted IDs
      const rawId = video.id.replace(/^yt-/, "");
      const res = await getVideoTrendAnalytics(user, rawId, dateRange);

      if (res.success) {
        setTrendData(res.dailyTrends || []);
        setTrendSummary(res.summary || null);
      } else {
        setError(res.message || "Failed to load video trends from YouTube Analytics API.");
      }
    } catch (err) {
      console.warn("[VideoDetailModal] Trends fetch exception:", err.message);
      setError("Unable to connect to YouTube Analytics API. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [video?.id, user, dateRange]);

  useEffect(() => {
    if (isOpen && video) {
      fetchTrends();
    }
  }, [isOpen, video, fetchTrends]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !video) return null;

  const viewsCount = Number(video.views) || Number(video.viewsCount) || 0;
  const likesCount = Number(video.likes) || Number(video.likesCount) || 0;
  const commentsCount = Number(video.comments) || Number(video.commentsCount) || 0;

  // Rate calculations
  const likeRate = viewsCount > 0 ? ((likesCount / viewsCount) * 100).toFixed(2) + "%" : "0.00%";
  const commentRate = viewsCount > 0 ? ((commentsCount / viewsCount) * 100).toFixed(2) + "%" : "0.00%";
  const engagementRate = video.engagementRate || video.engagement || (viewsCount > 0 ? (((likesCount + commentsCount) / viewsCount) * 100).toFixed(1) + "%" : "0.0%");

  // Analytics API metrics
  const hasAnalytics = Boolean(video.analyticsAvailable);
  const watchHours = video.watchTimeHours !== undefined && video.watchTimeHours > 0 ? `${video.watchTimeHours} hrs` : null;
  const watchMinutes = video.watchTimeMinutes !== undefined && video.watchTimeMinutes > 0 ? `${video.watchTimeMinutes} min` : null;
  const avgDuration = video.averageViewDurationFormatted && video.averageViewDurationFormatted !== "0:00" ? video.averageViewDurationFormatted : null;
  const avgPercentage = video.averageViewPercentage !== undefined && video.averageViewPercentage > 0 ? `${video.averageViewPercentage}%` : null;

  // Trend chart points & calculations
  const chartValues = trendData.map((d) => (activeMetric === "views" ? Number(d.views) || 0 : Number(d.estimatedMinutesWatched) || 0));
  const maxVal = Math.max(...chartValues, 5) * 1.15;
  const minVal = 0;

  const width = 640;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = chartValues.map((val, idx) => {
    const x = padding.left + (idx / Math.max(1, chartValues.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val, label: trendData[idx]?.formattedDate || trendData[idx]?.date || "" };
  });

  const createSmoothPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = points.length > 0 ? createSmoothPath(points) : "";
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
    : "";

  const activeHoverPt = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.headerIconWrap}>
              <BarChart2 size={18} color="#dc2626" />
            </div>
            <div>
              <h3 id="video-modal-title" style={styles.modalTitle}>
                Individual Video Performance Analytics
              </h3>
              <p style={styles.modalSub}>
                Verified YouTube Data API v3 statistics & YouTube Analytics API telemetry
              </p>
            </div>
          </div>

          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={styles.modalBody}>
          {/* Video Identity Hero Card */}
          <div style={styles.videoHero}>
            <div style={styles.thumbnailWrap}>
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} style={styles.thumbnail} />
              ) : (
                <div style={styles.thumbPlaceholder}>
                  <VideoIcon size={24} color="#94a3b8" />
                </div>
              )}
              {video.duration && <span style={styles.durationBadge}>{video.duration}</span>}
            </div>

            <div style={styles.videoHeroInfo}>
              <div style={styles.tagRow}>
                <span style={styles.ytBadge}>
                  <ShieldCheck size={11} style={{ marginRight: 3 }} />
                  YouTube Verified
                </span>
                <span style={styles.dateBadge}>
                  <Calendar size={11} style={{ marginRight: 3 }} />
                  {video.publishedDate || "Recent Upload"}
                </span>
              </div>

              <h4 style={styles.videoTitle}>{video.title}</h4>

              <div style={styles.urlRow}>
                <a
                  href={video.url || `https://www.youtube.com/watch?v=${video.id?.replace(/^yt-/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.watchLink}
                  title="Open on YouTube"
                >
                  <ExternalLink size={12} style={{ marginRight: 4 }} />
                  Watch on YouTube
                </a>
                <span style={styles.dotSeparator}>•</span>
                <span style={styles.rawDurationText}>
                  Duration: {video.duration || "Standard"} ({video.durationSeconds || 0}s)
                </span>
              </div>
            </div>
          </div>

          {/* Primary Metric Grid (Views, Interactions & Ratios) */}
          <div style={styles.gridHeading}>Key Engagement & Performance Metrics</div>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Total Views</span>
                <Eye size={15} color="#2563eb" />
              </div>
              <div style={styles.metricCardValue}>{viewsCount.toLocaleString()}</div>
              <div style={styles.metricCardSub}>Lifetime public views</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Engagement Rate</span>
                <TrendingUp size={15} color="#16a34a" />
              </div>
              <div style={{ ...styles.metricCardValue, color: "#16a34a" }}>{engagementRate}</div>
              <div style={styles.metricCardSub}>(Likes + Comments) / Views</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Likes</span>
                <ThumbsUp size={15} color="#dc2626" />
              </div>
              <div style={styles.metricCardValue}>{likesCount.toLocaleString()}</div>
              <div style={styles.metricCardSub}>Like rate: {likeRate}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Comments</span>
                <MessageSquare size={15} color="#8b5cf6" />
              </div>
              <div style={styles.metricCardValue}>{commentsCount.toLocaleString()}</div>
              <div style={styles.metricCardSub}>Comment rate: {commentRate}</div>
            </div>
          </div>

          {/* Watch Time & Retention Section */}
          <div style={styles.gridHeading}>Audience Retention & Watch Telemetry</div>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Estimated Watch Time</span>
                <Clock size={15} color="#f59e0b" />
              </div>
              <div style={styles.metricCardValue}>
                {watchHours || (watchMinutes ? `${watchMinutes}` : hasAnalytics ? "0.0 hrs" : "Pending")}
              </div>
              <div style={styles.metricCardSub}>
                {hasAnalytics ? "Aggregated by YouTube Analytics API" : "Processing in YouTube Studio API"}
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Avg. View Duration</span>
                <Clock size={15} color="#0284c7" />
              </div>
              <div style={styles.metricCardValue}>{avgDuration || (hasAnalytics ? "0:00" : "Pending")}</div>
              <div style={styles.metricCardSub}>
                {hasAnalytics ? "Average watch time per view" : "Awaiting Google report sync"}
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Audience Retention</span>
                <Percent size={15} color="#10b981" />
              </div>
              <div style={styles.metricCardValue}>{avgPercentage || (hasAnalytics ? "0.0%" : "Pending")}</div>
              <div style={styles.metricCardSub}>
                {hasAnalytics ? "Average view completion percentage" : "Requires YouTube Analytics sync"}
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Net Subscribers</span>
                <Sparkles size={15} color="#ec4899" />
              </div>
              <div style={styles.metricCardValue}>
                {video.subscribersGained !== undefined ? `+${video.subscribersGained}` : (hasAnalytics ? "+0" : "Pending")}
              </div>
              <div style={styles.metricCardSub}>Subscribers gained via this video</div>
            </div>
          </div>

          {/* Individual Video Daily Performance Trend */}
          <div style={styles.trendSection}>
            <div style={styles.trendHeader}>
              <div>
                <h4 style={styles.trendTitle}>
                  Daily Performance Trajectory ({dateRange.replace("d", " Days")})
                </h4>
                <p style={styles.trendSub}>
                  Chronological day-by-day views and watch time for this video
                </p>
              </div>

              <div style={styles.trendControls}>
                <div style={styles.metricPills}>
                  <button
                    onClick={() => setActiveMetric("views")}
                    style={{
                      ...styles.metricPill,
                      backgroundColor: activeMetric === "views" ? themeColor : "#f1f5f9",
                      color: activeMetric === "views" ? "#ffffff" : "#475569",
                      fontWeight: activeMetric === "views" ? 600 : 500,
                    }}
                  >
                    Views
                  </button>
                  <button
                    onClick={() => setActiveMetric("watchMinutes")}
                    style={{
                      ...styles.metricPill,
                      backgroundColor: activeMetric === "watchMinutes" ? "#f59e0b" : "#f1f5f9",
                      color: activeMetric === "watchMinutes" ? "#ffffff" : "#475569",
                      fontWeight: activeMetric === "watchMinutes" ? 600 : 500,
                    }}
                  >
                    Watch Min
                  </button>
                </div>

                <button onClick={fetchTrends} disabled={loading} style={styles.syncBtn} title="Refresh video trend">
                  <RefreshCw size={12} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
                </button>
              </div>
            </div>

            {loading ? (
              <div style={styles.loadingBox}>
                <RefreshCw size={20} color={themeColor} style={{ animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: "13px", color: "#64748b", marginTop: 8 }}>
                  Querying YouTube Analytics API trajectory...
                </span>
              </div>
            ) : error ? (
              <div style={styles.errorBox}>
                <AlertCircle size={16} color="#b91c1c" />
                <span>{error}</span>
              </div>
            ) : trendData.length > 0 ? (
              <div style={styles.chartWrap}>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  style={{ width: "100%", height: "auto", overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="videoTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeMetric === "views" ? themeColor : "#f59e0b"} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={activeMetric === "views" ? themeColor : "#f59e0b"} stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.33, 0.66, 1].map((pct, idx) => {
                    const y = padding.top + chartH * pct;
                    const val = Math.round(maxVal - (maxVal - minVal) * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + chartW}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text x={padding.left - 8} y={y + 3.5} fill="#94a3b8" fontSize="9.5" textAnchor="end">
                          {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  {areaPath && <path d={areaPath} fill="url(#videoTrendGradient)" />}

                  {/* Line curve */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={activeMetric === "views" ? themeColor : "#f59e0b"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Hover or latest point highlight */}
                  {activeHoverPt && (
                    <g>
                      <line
                        x1={activeHoverPt.x}
                        y1={padding.top}
                        x2={activeHoverPt.x}
                        y2={padding.top + chartH}
                        stroke={activeMetric === "views" ? themeColor : "#f59e0b"}
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={activeHoverPt.x}
                        cy={activeHoverPt.y}
                        r="5"
                        fill="#ffffff"
                        stroke={activeMetric === "views" ? themeColor : "#f59e0b"}
                        strokeWidth="2.5"
                      />
                    </g>
                  )}

                  {/* X Axis Labels */}
                  {points.map((pt, idx) => {
                    // Show ~5 labels across the timeline
                    const step = Math.max(1, Math.floor(points.length / 5));
                    if (idx % step === 0 || idx === points.length - 1) {
                      return (
                        <text
                          key={idx}
                          x={pt.x}
                          y={padding.top + chartH + 18}
                          fill="#64748b"
                          fontSize="9.5"
                          textAnchor="middle"
                        >
                          {pt.label}
                        </text>
                      );
                    }
                    return null;
                  })}

                  {/* Interactive invisible hover overlay bars */}
                  {points.map((pt, idx) => (
                    <rect
                      key={idx}
                      x={pt.x - chartW / (points.length * 2)}
                      y={padding.top}
                      width={chartW / points.length}
                      height={chartH}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </svg>

                {/* Hover Callout Box */}
                {activeHoverPt && (
                  <div style={styles.hoverCallout}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{activeHoverPt.label}: </span>
                    <span style={{ color: activeMetric === "views" ? themeColor : "#f59e0b", fontWeight: 700 }}>
                      {Number(activeHoverPt.val).toLocaleString()} {activeMetric === "views" ? "views" : "minutes"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.emptyTrendBox}>
                <VideoIcon size={24} color="#94a3b8" />
                <p style={styles.emptyTrendText}>
                  No views recorded for this video during the last {dateRange.replace("d", " days")}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={styles.modalFooter}>
          <div style={styles.disclaimerText}>
            <ShieldCheck size={13} color="#16a34a" style={{ marginRight: 4 }} />
            <span>Telemetry verified via Google OAuth 2.0. No fabricated retention curves.</span>
          </div>

          <button onClick={onClose} style={styles.doneBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "760px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  headerIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  videoHero: {
    display: "flex",
    gap: "16px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  thumbnailWrap: {
    position: "relative",
    width: "160px",
    height: "90px",
    borderRadius: "8px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#0f172a",
  },
  thumbnail: {
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
  durationBadge: {
    position: "absolute",
    bottom: "6px",
    right: "6px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  videoHeroInfo: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  ytBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#dc2626",
    backgroundColor: "#fee2e2",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  dateBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "10.5px",
    color: "#64748b",
  },
  videoTitle: {
    fontSize: "15px",
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
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
  },
  watchLink: {
    display: "inline-flex",
    alignItems: "center",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600",
  },
  dotSeparator: {
    color: "#cbd5e1",
  },
  rawDurationText: {
    color: "#64748b",
  },
  gridHeading: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },
  metricCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricCardLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  metricCardValue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  metricCardSub: {
    fontSize: "10.5px",
    color: "#94a3b8",
  },
  trendSection: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
  },
  trendHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "10px",
  },
  trendTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  trendSub: {
    fontSize: "11.5px",
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  trendControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metricPills: {
    display: "flex",
    backgroundColor: "#f8fafc",
    padding: "2px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  metricPill: {
    border: "none",
    padding: "4px 10px",
    fontSize: "11px",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  syncBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    height: "160px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    padding: "12px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#b91c1c",
    fontSize: "12.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  chartWrap: {
    position: "relative",
    marginTop: "8px",
  },
  hoverCallout: {
    textAlign: "center",
    fontSize: "12px",
    marginTop: "6px",
    padding: "4px 8px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    display: "inline-block",
  },
  emptyTrendBox: {
    height: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  emptyTrendText: {
    fontSize: "12.5px",
    color: "#64748b",
    margin: 0,
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #f1f5f9",
  },
  disclaimerText: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#64748b",
  },
  doneBtn: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};


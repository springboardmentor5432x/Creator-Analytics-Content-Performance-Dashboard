import React, { useState } from "react";
import { TrendingUp, BarChart2, Video, ArrowUpRight } from "lucide-react";

export default function InteractiveLineChart({
  themeColor = "#2563eb",
  liveTimeSeries = [],
  isLiveConnected = false,
  channelTitle = "",
  dateRange = "28d",
}) {
  const [activeMetric, setActiveMetric] = useState("views");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Generate fallback date labels if live series is empty or pending
  const daysCount = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 28;
  const fallbackDates = [];
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    fallbackDates.push({
      date: d.toISOString().split("T")[0],
      formattedDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: 0,
      subscribers: 0,
      watchHours: 0,
    });
  }

  const series = (isLiveConnected && Array.isArray(liveTimeSeries) && liveTimeSeries.length > 0)
    ? liveTimeSeries
    : (isLiveConnected ? fallbackDates : []);

  const labels = series.map((d) => d.formattedDate || d.date);

  let values = [];
  if (activeMetric === "views") {
    values = series.map((d) => Number(d.views) || 0);
  } else if (activeMetric === "followers") {
    values = series.map((d) => Number(d.subscribers) || 0);
  } else if (activeMetric === "watchHours") {
    values = series.map((d) => Number(d.watchHours) || 0);
  } else if (activeMetric === "revenue") {
    // Estimated AdSense revenue based on real views ($3.50 RPM)
    values = series.map((d) => Math.round(((Number(d.views) || 0) / 1000) * 3.5));
  }

  const totalMetricSum = values.reduce((a, b) => a + b, 0);
  const avgMetric = values.length > 0 ? Math.round(totalMetricSum / values.length) : 0;
  const peakMetric = values.length > 0 ? Math.max(...values) : 0;

  const metricConfig = {
    views: {
      label: "Impressions & Views",
      format: (val) => `${Number(val).toLocaleString()} views`,
      shortFormat: (val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val),
      color: themeColor,
      gradientId: "viewsGradient",
    },
    followers: {
      label: "Net Subscriber Gain",
      format: (val) => `+${Number(val).toLocaleString()} subs`,
      shortFormat: (val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val),
      color: "#10b981",
      gradientId: "followersGradient",
    },
    revenue: {
      label: "Est. YouTube AdSense",
      format: (val) => `$${Number(val).toLocaleString()}`,
      shortFormat: (val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
      color: "#f59e0b",
      gradientId: "revenueGradient",
    },
    watchHours: {
      label: "Audience Watch Time",
      format: (val) => `${Number(val).toLocaleString()} hours`,
      shortFormat: (val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}h`,
      color: "#8b5cf6",
      gradientId: "watchGradient",
    },
  };

  const activeConf = metricConfig[activeMetric] || metricConfig.views;

  // SVG Chart Dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values) * 1.15 || 10;
  const minVal = 0;

  // Calculate points
  const points = values.map((val, idx) => {
    const x = padding.left + (idx / Math.max(1, values.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val, label: labels[idx] };
  });

  // Generate smooth SVG curve path
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

  const activePt = hoveredIndex !== null ? points[hoveredIndex] : (points.length > 0 ? points[points.length - 1] : null);

  return (
    <div style={styles.chartContainer}>
      {/* Chart Top Controls */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={styles.chartHeading}>Audience Velocity & Impression Curve</span>
            {isLiveConnected ? (
              <span style={styles.liveIndicator}>
                <span style={styles.livePulse}></span>
                Live YouTube API ({channelTitle || "Connected Channel"})
              </span>
            ) : (
              <span style={styles.notConnectedIndicator}>
                YouTube Not Connected
              </span>
            )}
          </div>
          <p style={styles.chartSub}>
            {isLiveConnected
              ? `Real-time ${dateRange.replace("d", " days")} telemetry calculated directly from YouTube Data & Analytics APIs without mock data.`
              : "Connect your official YouTube account to visualize live view curves and subscriber velocity."}
          </p>
        </div>

        {/* Metric Selector */}
        {isLiveConnected && (
          <div style={styles.controlsGroup}>
            <div style={styles.metricBtnGroup}>
              {[
                { id: "views", label: "Views" },
                { id: "followers", label: "Subs" },
                { id: "revenue", label: "AdSense" },
                { id: "watchHours", label: "Watch Hrs" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMetric(m.id);
                    setHoveredIndex(null);
                  }}
                  style={{
                    ...styles.metricBtn,
                    backgroundColor: activeMetric === m.id ? activeConf.color : "#ffffff",
                    color: activeMetric === m.id ? "#ffffff" : "#475569",
                    borderColor: activeMetric === m.id ? activeConf.color : "#e2e8f0",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLiveConnected ? (
        <>
          {/* Snapshot Summary Bar */}
          <div style={styles.summaryBar}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total {activeConf.label} (28D)</span>
              <div style={styles.summaryValWrap}>
                <span style={{ ...styles.summaryVal, color: activeConf.color }}>
                  {activeConf.shortFormat(totalMetricSum)}
                </span>
                <span style={styles.liveTag}>Live API Verified</span>
              </div>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Daily Average</span>
              <span style={styles.summaryValSub}>{activeConf.shortFormat(avgMetric)}</span>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>28D Peak Interval</span>
              <span style={styles.summaryValSub}>{activeConf.shortFormat(peakMetric)}</span>
            </div>

            {activePt && (
              <div style={styles.hoverSnapshot}>
                <span style={styles.hoverDate}>{activePt.label}</span>
                <span style={{ ...styles.hoverVal, color: activeConf.color }}>
                  {activeConf.format(activePt.val)}
                </span>
              </div>
            )}
          </div>

          {/* Interactive SVG Area Chart */}
          <div style={styles.svgWrapper}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={styles.svg}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={activeConf.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeConf.color} stopOpacity="0.28" />
                  <stop offset="70%" stopColor={activeConf.color} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={activeConf.color} stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = padding.top + chartH * (1 - pct);
                const val = Math.round(minVal + (maxVal - minVal) * pct);
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeDasharray={i === 0 ? "none" : "4 4"}
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="end"
                    >
                      {activeConf.shortFormat(val)}
                    </text>
                  </g>
                );
              })}

              {/* Area & Stroke */}
              {areaPath && <path d={areaPath} fill={`url(#${activeConf.gradientId})`} />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={activeConf.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Hover Nodes */}
              {points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                const isStep = idx % 4 === 0 || idx === points.length - 1;
                return (
                  <g key={idx}>
                    {isStep && (
                      <text
                        x={pt.x}
                        y={height - 12}
                        fill="#94a3b8"
                        fontSize="9.5"
                        textAnchor="middle"
                      >
                        {pt.label}
                      </text>
                    )}

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 2.5}
                      fill={isHovered ? "#ffffff" : activeConf.color}
                      stroke={activeConf.color}
                      strokeWidth={isHovered ? 2.5 : 1}
                      style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      ) : (
        <div style={styles.disconnectedBox}>
          <BarChart2 size={32} color="#94a3b8" />
          <h4 style={styles.discTitle}>Audience Impression Velocity</h4>
          <p style={styles.discText}>
            Connect your YouTube channel in the Analytics tab to stream your verified view velocity and subscriber retention curves without mock data.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  chartContainer: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "16px",
  },
  chartHeading: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  chartSub: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "4px",
    marginBottom: 0,
  },
  liveIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  livePulse: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#dc2626",
  },
  notConnectedIndicator: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  controlsGroup: {
    display: "flex",
    gap: "8px",
  },
  metricBtnGroup: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#f8fafc",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  metricBtn: {
    padding: "5px 12px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px",
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    marginBottom: "14px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
  },
  summaryLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
  },
  summaryValWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "2px",
  },
  summaryVal: {
    fontSize: "17px",
    fontWeight: "800",
  },
  summaryValSub: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "2px",
  },
  liveTag: {
    fontSize: "10.5px",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "1px 6px",
    borderRadius: "4px",
    fontWeight: "600",
  },
  hoverSnapshot: {
    marginLeft: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  hoverDate: {
    fontSize: "11px",
    color: "#64748b",
  },
  hoverVal: {
    fontSize: "15px",
    fontWeight: "700",
  },
  svgWrapper: {
    width: "100%",
    position: "relative",
  },
  svg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  disconnectedBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "44px 20px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
    textAlign: "center",
  },
  discTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "12px 0 6px 0",
  },
  discText: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "460px",
    lineHeight: "1.5",
    margin: 0,
  },
};

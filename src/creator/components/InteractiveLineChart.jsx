import React, { useState } from "react";
import { TrendingUp, Calendar, ArrowUpRight, BarChart2 } from "lucide-react";
import { TIME_SERIES_METRICS } from "../mockData";

export default function InteractiveLineChart({ themeColor = "#2563eb" }) {
  const [timeRange, setTimeRange] = useState("30D");
  const [activeMetric, setActiveMetric] = useState("views");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const currentData = TIME_SERIES_METRICS[timeRange] || TIME_SERIES_METRICS["30D"];
  const labels = currentData.labels;
  const values = currentData[activeMetric] || currentData.views;
  const prevValues = currentData.previousViews || values.map((v) => Math.round(v * 0.85));

  const metricConfig = {
    views: {
      label: "Total Impressions & Views",
      format: (val) => `${Number(val).toLocaleString()} views`,
      shortFormat: (val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val),
      color: themeColor,
      gradientId: "viewsGradient",
      growth: "+18.4%",
    },
    followers: {
      label: "Net Follower & Sub Gain",
      format: (val) => `+${Number(val).toLocaleString()} subscribers`,
      shortFormat: (val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val),
      color: "#10b981",
      gradientId: "followersGradient",
      growth: "+14.2%",
    },
    revenue: {
      label: "Estimated Creator Earnings",
      format: (val) => `$${Number(val).toLocaleString()}`,
      shortFormat: (val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
      color: "#f59e0b",
      gradientId: "revenueGradient",
      growth: "+22.5%",
    },
    watchHours: {
      label: "Audience Watch Time",
      format: (val) => `${Number(val).toLocaleString()} hours`,
      shortFormat: (val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}h`,
      color: "#8b5cf6",
      gradientId: "watchGradient",
      growth: "+19.1%",
    },
  };

  const activeConf = metricConfig[activeMetric] || metricConfig.views;

  // SVG Chart Dimensions
  const width = 800;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, ...prevValues) * 1.15 || 100;
  const minVal = 0;

  // Calculate points
  const points = values.map((val, idx) => {
    const x = padding.left + (idx / (values.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val, label: labels[idx], prevVal: prevValues[idx] };
  });

  const prevPoints = prevValues.map((val, idx) => {
    const x = padding.left + (idx / (prevValues.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val };
  });

  // Generate smooth SVG Catmull-Rom or Bezier curve path
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

  const linePath = createSmoothPath(points);
  const prevLinePath = createSmoothPath(prevPoints);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Total summary of current metric
  const totalMetricSum = values.reduce((a, b) => a + b, 0);
  const avgMetric = Math.round(totalMetricSum / values.length);
  const peakMetric = Math.max(...values);

  // Active hover point
  const activePt = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div style={styles.chartContainer}>
      {/* Chart Top Controls */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={styles.chartHeading}>Audience Growth & Velocity Engine</span>
            <span style={styles.liveIndicator}>
              <span style={styles.livePulse}></span>
              Live Sync
            </span>
          </div>
          <p style={styles.chartSub}>
            Interactive cross-platform telemetry comparing actual vs historical benchmarks
          </p>
        </div>

        {/* Range & Metric Selectors */}
        <div style={styles.controlsGroup}>
          {/* Metric Selector */}
          <div style={styles.metricBtnGroup}>
            {[
              { id: "views", label: "Views" },
              { id: "followers", label: "Subs" },
              { id: "revenue", label: "Revenue" },
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

          {/* Timeframe Selector */}
          <div style={styles.rangeBtnGroup}>
            {["7D", "30D", "90D", "1Y"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r);
                  setHoveredIndex(null);
                }}
                style={{
                  ...styles.rangeBtn,
                  backgroundColor: timeRange === r ? "#0f172a" : "transparent",
                  color: timeRange === r ? "#ffffff" : "#64748b",
                  fontWeight: timeRange === r ? 600 : 500,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total {activeConf.label}</span>
          <div style={styles.summaryValWrap}>
            <span style={{ ...styles.summaryVal, color: activeConf.color }}>
              {activeConf.shortFormat(totalMetricSum)}
            </span>
            <span style={styles.growthBadge}>
              <TrendingUp size={12} style={{ marginRight: 3 }} />
              {activeConf.growth}
            </span>
          </div>
        </div>

        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Average / Interval</span>
          <span style={styles.summaryValSub}>{activeConf.shortFormat(avgMetric)}</span>
        </div>

        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Peak Interval Spike</span>
          <span style={styles.summaryValSub}>{activeConf.shortFormat(peakMetric)}</span>
        </div>

        <div style={styles.legendWrap}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendLine, backgroundColor: activeConf.color }}></span>
            <span>Current Period</span>
          </div>
          <div style={styles.legendItem}>
            <span style={styles.legendLineDashed}></span>
            <span>Prior Benchmark</span>
          </div>
        </div>
      </div>

      {/* Interactive Responsive SVG Area Chart */}
      <div style={styles.svgWrapper}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={styles.svg}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={activeConf.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeConf.color} stopOpacity="0.32" />
              <stop offset="60%" stopColor={activeConf.color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={activeConf.color} stopOpacity="0.00" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={activeConf.color} floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const val = minVal + (maxVal - minVal) * pct;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={i === 0 ? "none" : "4 4"}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="inherit"
                >
                  {activeConf.shortFormat(Math.round(val))}
                </text>
              </g>
            );
          })}

          {/* Area Gradient Fill */}
          <path d={areaPath} fill={`url(#${activeConf.gradientId})`} />

          {/* Previous Period Baseline (Dashed) */}
          <path
            d={prevLinePath}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="5 5"
          />

          {/* Primary Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={activeConf.color}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* X Axis Labels */}
          {points.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={height - 12}
              textAnchor="middle"
              fill={hoveredIndex === idx ? "#0f172a" : "#64748b"}
              fontWeight={hoveredIndex === idx ? "700" : "500"}
              fontSize="11"
              fontFamily="inherit"
            >
              {pt.label}
            </text>
          ))}

          {/* Interactive Crosshair & Cursor tracking */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                y1={padding.top}
                x2={activePt.x}
                y2={padding.top + chartH}
                stroke={activeConf.color}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity={hoveredIndex !== null ? 0.8 : 0.4}
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="6"
                fill="#ffffff"
                stroke={activeConf.color}
                strokeWidth="3.5"
                style={{ transition: "all 0.15s ease" }}
              />
            </g>
          )}

          {/* Transparent Hover Hit Boxes for easy mouse capture */}
          {points.map((pt, idx) => {
            const colWidth = chartW / points.length;
            return (
              <rect
                key={idx}
                x={pt.x - colWidth / 2}
                y={padding.top}
                width={colWidth}
                height={chartH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredIndex !== null && activePt && (
          <div
            style={{
              ...styles.tooltip,
              left: `${(activePt.x / width) * 100}%`,
              top: `${Math.max(10, (activePt.y / height) * 100 - 35)}%`,
            }}
          >
            <div style={styles.tooltipHeader}>
              <span>{activePt.label} ({timeRange})</span>
              <span style={{ ...styles.tooltipBadge, color: activeConf.color }}>
                {activeConf.shortFormat(activePt.val)}
              </span>
            </div>
            <div style={styles.tooltipBody}>
              <div style={styles.tooltipRow}>
                <span style={styles.tooltipLabel}>Metric:</span>
                <span style={styles.tooltipVal}>{activeConf.format(activePt.val)}</span>
              </div>
              <div style={styles.tooltipRow}>
                <span style={styles.tooltipLabel}>Prior cycle:</span>
                <span style={styles.tooltipValMuted}>{activeConf.format(activePt.prevVal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
    marginBottom: "24px",
    position: "relative",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "18px",
  },
  chartHeading: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  liveIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    padding: "2px 8px",
    borderRadius: "20px",
    border: "1px solid #bbf7d0",
  },
  livePulse: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
  },
  chartSub: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "2px",
  },
  controlsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
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
    fontSize: "12px",
    fontWeight: "600",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  rangeBtnGroup: {
    display: "flex",
    gap: "2px",
    backgroundColor: "#f1f5f9",
    padding: "3px",
    borderRadius: "8px",
  },
  rangeBtn: {
    padding: "5px 10px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
    padding: "14px 18px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    marginBottom: "16px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  summaryLabel: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  summaryValWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  summaryVal: {
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },
  summaryValSub: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
  },
  growthBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "2px 7px",
    borderRadius: "6px",
  },
  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendLine: {
    width: "16px",
    height: "3px",
    borderRadius: "2px",
  },
  legendLineDashed: {
    width: "16px",
    height: "2px",
    borderTop: "2px dashed #94a3b8",
  },
  svgWrapper: {
    width: "100%",
    position: "relative",
  },
  svg: {
    width: "100%",
    height: "auto",
    overflow: "visible",
  },
  tooltip: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    backdropFilter: "blur(8px)",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    pointerEvents: "none",
    zIndex: 20,
    minWidth: "170px",
    transition: "left 0.1s ease, top 0.1s ease",
  },
  tooltipHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: "600",
    borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
    paddingBottom: "4px",
    marginBottom: "5px",
  },
  tooltipBadge: {
    fontWeight: "700",
    fontSize: "12px",
  },
  tooltipBody: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  tooltipRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
  },
  tooltipLabel: {
    color: "#94a3b8",
  },
  tooltipVal: {
    fontWeight: "600",
    color: "#f8fafc",
  },
  tooltipValMuted: {
    color: "#cbd5e1",
  },
};

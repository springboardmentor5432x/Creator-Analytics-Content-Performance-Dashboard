import React, { useState } from "react";
import { DollarSign, TrendingUp, Sparkles, ExternalLink } from "lucide-react";
import { REVENUE_STREAMS } from "../mockData";

export default function RevenueDonutChart() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const totalAmount = REVENUE_STREAMS.reduce((acc, curr) => acc + curr.amount, 0);

  // Donut geometry
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment offsets
  let accumulatedPercent = 0;
  const segments = REVENUE_STREAMS.map((stream, idx) => {
    const strokeDasharray = `${(stream.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += stream.percentage;
    return {
      ...stream,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeStream = hoveredIndex !== null ? REVENUE_STREAMS[hoveredIndex] : null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Revenue & Monetization Streams</h3>
            <span style={styles.dealPill}>$18,400 / mo</span>
          </div>
          <p style={styles.subtitle}>Diversified income breakdown across sponsor deals & AdSense</p>
        </div>
        <span style={styles.growthBadge}>
          <TrendingUp size={13} style={{ marginRight: 4 }} />
          +22.5% vs Q3
        </span>
      </div>

      <div style={styles.contentWrap}>
        {/* Interactive SVG Donut */}
        <div style={styles.donutWrap}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.svg}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {segments.map((seg, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <circle
                  key={seg.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    cursor: "pointer",
                    filter: isHovered ? `drop-shadow(0 2px 8px ${seg.color}55)` : "none",
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div style={styles.donutCenter}>
            {activeStream ? (
              <div style={styles.centerActive}>
                <span style={styles.centerPercent}>{activeStream.percentage}%</span>
                <span style={styles.centerName}>{activeStream.name}</span>
                <span style={{ ...styles.centerVal, color: activeStream.color }}>
                  {activeStream.formatted}
                </span>
              </div>
            ) : (
              <div style={styles.centerDefault}>
                <span style={styles.centerTotalLabel}>Total 30D Revenue</span>
                <span style={styles.centerTotalVal}>${totalAmount.toLocaleString()}</span>
                <span style={styles.centerTip}>Hover slices for detail</span>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Legend List */}
        <div style={styles.listWrap}>
          {REVENUE_STREAMS.map((stream, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={stream.name}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  ...styles.streamRow,
                  backgroundColor: isHovered ? "#f8fafc" : "transparent",
                  borderColor: isHovered ? stream.color : "transparent",
                }}
              >
                <div style={styles.streamLeft}>
                  <span
                    style={{
                      ...styles.colorDot,
                      backgroundColor: stream.color,
                      transform: isHovered ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                  <div>
                    <span style={styles.streamName}>{stream.name}</span>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${stream.percentage}%`,
                          backgroundColor: stream.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={styles.streamRight}>
                  <span style={styles.streamAmount}>{stream.formatted}</span>
                  <span style={styles.streamShare}>{stream.percentage}% share</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  dealPill: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  growthBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "4px 10px",
    borderRadius: "8px",
  },
  contentWrap: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: "24px",
    alignItems: "center",
  },
  donutWrap: {
    position: "relative",
    width: "200px",
    height: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  donutCenter: {
    position: "relative",
    zIndex: 5,
    textAlign: "center",
    maxWidth: "130px",
    pointerEvents: "none",
  },
  centerActive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  centerPercent: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: "1",
  },
  centerName: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "110px",
  },
  centerVal: {
    fontSize: "13px",
    fontWeight: "700",
    marginTop: "2px",
  },
  centerDefault: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  centerTotalLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  centerTotalVal: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "2px 0",
  },
  centerTip: {
    fontSize: "10px",
    color: "#64748b",
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  streamRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid",
    transition: "all 0.15s ease",
    cursor: "pointer",
  },
  streamLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
  },
  colorDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    transition: "transform 0.2s ease",
    flexShrink: 0,
  },
  streamName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e293b",
    display: "block",
  },
  barTrack: {
    width: "140px",
    height: "4px",
    backgroundColor: "#e2e8f0",
    borderRadius: "2px",
    overflow: "hidden",
    marginTop: "4px",
  },
  barFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
  streamRight: {
    textAlign: "right",
  },
  streamAmount: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  streamShare: {
    fontSize: "11px",
    color: "#64748b",
  },
};

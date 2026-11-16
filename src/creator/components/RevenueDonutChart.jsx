import React, { useState } from "react";
import { DollarSign, TrendingUp, Briefcase, Video, Sparkles } from "lucide-react";

export default function RevenueDonutChart({ invitations = [], channel = null, summary = null }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Calculate real revenue from dynamic platform data
  const acceptedInvs = (invitations || []).filter((i) => i.status === "accepted");
  const sponsorshipsTotal = acceptedInvs.reduce(
    (acc, curr) => acc + (Number(curr.compensation) || 0),
    0
  );

  const totalViews = Number(channel?.viewCount) || Number(summary?.totalViews) || 0;
  // Estimated YouTube AdSense based on real views ($3.50 RPM benchmark)
  const adSenseEstimate = totalViews > 0 ? Math.round((totalViews / 1000) * 3.5) : 0;

  const totalAmount = sponsorshipsTotal + adSenseEstimate;

  const streams = [
    {
      name: "Brand Sponsorships",
      amount: sponsorshipsTotal,
      formatted: `$${sponsorshipsTotal.toLocaleString()}`,
      percentage: totalAmount > 0 ? Math.round((sponsorshipsTotal / totalAmount) * 100) : 0,
      color: "#2563eb",
      icon: Briefcase,
      countLabel: `${acceptedInvs.length} accepted deal${acceptedInvs.length === 1 ? "" : "s"}`,
    },
    {
      name: "YouTube AdSense (Est.)",
      amount: adSenseEstimate,
      formatted: `$${adSenseEstimate.toLocaleString()}`,
      percentage: totalAmount > 0 ? 100 - Math.round((sponsorshipsTotal / totalAmount) * 100) : 0,
      color: "#dc2626",
      icon: Video,
      countLabel: `${totalViews.toLocaleString()} verified views`,
    },
  ];

  // Donut geometry
  const size = 190;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = streams.map((stream) => {
    const strokeDasharray = totalAmount > 0
      ? `${(stream.percentage / 100) * circumference} ${circumference}`
      : `0 ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += stream.percentage;
    return {
      ...stream,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeStream = hoveredIndex !== null ? streams[hoveredIndex] : null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Revenue & Deal Attribution</h3>
            <span style={styles.dealPill}>
              {totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : "$0.00"}
            </span>
          </div>
          <p style={styles.subtitle}>
            Verified income calculated from accepted brand campaign contracts and live YouTube views
          </p>
        </div>
      </div>

      <div style={styles.contentWrap}>
        {/* SVG Donut */}
        <div style={styles.donutWrap}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.svg}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Active Segments */}
            {totalAmount > 0 &&
              segments.map((seg, idx) => {
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
                      transition: "all 0.25s ease",
                      cursor: "pointer",
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
                <span style={styles.centerTotalLabel}>Tracked Earnings</span>
                <span style={styles.centerTotalVal}>
                  ${totalAmount.toLocaleString()}
                </span>
                <span style={styles.centerSubLabel}>
                  {acceptedInvs.length} active deals
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Real Streams Legend List */}
        <div style={styles.streamList}>
          {streams.map((stream, idx) => {
            const Icon = stream.icon;
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={stream.name}
                style={{
                  ...styles.streamRow,
                  backgroundColor: isHovered ? "#f8fafc" : "transparent",
                  borderColor: isHovered ? stream.color : "#f1f5f9",
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div style={styles.streamLeft}>
                  <div style={{ ...styles.colorIndicator, backgroundColor: stream.color }} />
                  <div>
                    <span style={styles.streamName}>{stream.name}</span>
                    <span style={styles.streamCount}>{stream.countLabel}</span>
                  </div>
                </div>

                <div style={styles.streamRight}>
                  <span style={styles.streamAmount}>{stream.formatted}</span>
                  <span style={styles.streamPct}>
                    {totalAmount > 0 ? `${stream.percentage}%` : "0%"}
                  </span>
                </div>
              </div>
            );
          })}

          <div style={styles.disclaimerNote}>
            <span>
              Real-time calculation: sponsorship payments are tracked from accepted Firestore campaign invitations. YouTube monetization is estimated from live Data API view metrics.
            </span>
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
  dealPill: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    fontSize: "11.5px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  contentWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "24px",
  },
  donutWrap: {
    position: "relative",
    width: "190px",
    height: "190px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
  },
  svg: {
    transform: "rotate(-90deg)",
  },
  donutCenter: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    pointerEvents: "none",
  },
  centerDefault: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  centerTotalLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  centerTotalVal: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "2px 0",
  },
  centerSubLabel: {
    fontSize: "11px",
    color: "#15803d",
    fontWeight: "600",
  },
  centerActive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  centerPercent: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  centerName: {
    fontSize: "11px",
    color: "#64748b",
    maxWidth: "100px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  centerVal: {
    fontSize: "12px",
    fontWeight: "700",
  },
  streamList: {
    flex: 1,
    minWidth: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  streamRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    transition: "all 0.15s ease",
  },
  streamLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  colorIndicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  streamName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },
  streamCount: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "block",
  },
  streamRight: {
    textAlign: "right",
  },
  streamAmount: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  streamPct: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
    display: "block",
  },
  disclaimerNote: {
    fontSize: "11px",
    color: "#94a3b8",
    lineHeight: "1.4",
    marginTop: "6px",
  },
};

import React, { useState } from "react";
import { Users, Globe, Clock, Sparkles } from "lucide-react";
import { AUDIENCE_DEMOGRAPHICS, POSTING_HEATMAP } from "../mockData";

export default function AudienceDemographics() {
  const [activeTab, setActiveTab] = useState("geo"); // 'geo' | 'age' | 'heatmap'
  const [hoveredCell, setHoveredCell] = useState(null);

  const hours = ["9 AM", "12 PM", "3 PM", "6 PM", "9 PM"];

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Audience Telemetry & Behavior</h3>
            <span style={styles.verifiedBadge}>Verified Census</span>
          </div>
          <p style={styles.subtitle}>Geographic penetration, age demographics & optimal posting window</p>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabGroup}>
          <button
            onClick={() => setActiveTab("geo")}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === "geo" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "geo" ? "#ffffff" : "#475569",
            }}
          >
            Geography
          </button>
          <button
            onClick={() => setActiveTab("age")}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === "age" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "age" ? "#ffffff" : "#475569",
            }}
          >
            Age & Gender
          </button>
          <button
            onClick={() => setActiveTab("heatmap")}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === "heatmap" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "heatmap" ? "#ffffff" : "#475569",
            }}
          >
            Peak Hours
          </button>
        </div>
      </div>

      {/* Tab: Geography */}
      {activeTab === "geo" && (
        <div style={styles.tabContent}>
          <div style={styles.geoGrid}>
            {AUDIENCE_DEMOGRAPHICS.topCountries.map((c) => (
              <div key={c.country} style={styles.geoCard}>
                <div style={styles.geoTop}>
                  <span style={styles.geoFlag}>{c.flag}</span>
                  <div>
                    <span style={styles.geoCountry}>{c.country}</span>
                    <span style={styles.geoCount}>{c.count} members</span>
                  </div>
                </div>
                <div style={styles.geoShare}>{c.share}</div>
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: c.share,
                      backgroundColor: "#2563eb",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Age & Gender */}
      {activeTab === "age" && (
        <div style={styles.tabContent}>
          <div style={styles.ageSection}>
            <span style={styles.sectionMiniTitle}>Age Distribution</span>
            <div style={styles.ageList}>
              {AUDIENCE_DEMOGRAPHICS.ageGroups.map((grp) => (
                <div key={grp.range} style={styles.ageRow}>
                  <span style={styles.ageRange}>{grp.range} yrs</span>
                  <div style={styles.ageBarWrap}>
                    <div
                      style={{
                        ...styles.ageBarFill,
                        width: `${grp.percentage}%`,
                        backgroundColor: grp.percentage > 30 ? "#2563eb" : "#60a5fa",
                      }}
                    />
                  </div>
                  <span style={styles.agePercent}>{grp.percentage}%</span>
                  <span style={styles.ageCount}>({grp.count})</span>
                </div>
              ))}
            </div>

            {/* Gender Split Bar */}
            <div style={styles.genderWrap}>
              <span style={styles.sectionMiniTitle}>Gender Representation</span>
              <div style={styles.genderMultiBar}>
                {AUDIENCE_DEMOGRAPHICS.genderSplit.map((g) => (
                  <div
                    key={g.gender}
                    style={{
                      ...styles.genderSegment,
                      width: `${g.percentage}%`,
                      backgroundColor: g.color,
                    }}
                    title={`${g.gender}: ${g.percentage}%`}
                  />
                ))}
              </div>
              <div style={styles.genderLegend}>
                {AUDIENCE_DEMOGRAPHICS.genderSplit.map((g) => (
                  <div key={g.gender} style={styles.genderItem}>
                    <span style={{ ...styles.genderDot, backgroundColor: g.color }} />
                    <span style={styles.genderName}>{g.gender}:</span>
                    <span style={styles.genderVal}>{g.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Optimal Posting Time Heatmap */}
      {activeTab === "heatmap" && (
        <div style={styles.tabContent}>
          <div style={styles.heatmapWrap}>
            <div style={styles.heatmapHeader}>
              <span style={styles.heatmapTip}>
                <Sparkles size={13} style={{ marginRight: 5, color: "#2563eb" }} />
                Prime Posting Window: <strong>Thursday & Friday 6:00 PM - 9:00 PM EST</strong> for 42% higher retention.
              </span>
            </div>

            {/* Grid */}
            <div style={styles.matrixContainer}>
              {/* Header row with hours */}
              <div style={styles.matrixRow}>
                <span style={styles.matrixDayLabel}></span>
                {hours.map((hr) => (
                  <span key={hr} style={styles.matrixHourHeader}>
                    {hr}
                  </span>
                ))}
              </div>

              {/* Data rows */}
              {POSTING_HEATMAP.map((row) => (
                <div key={row.day} style={styles.matrixRow}>
                  <span style={styles.matrixDayLabel}>{row.day}</span>
                  {row.slots.map((val, colIdx) => {
                    const isOptimal = val === 5;
                    const opacity = val * 0.18;
                    const cellKey = `${row.day}-${colIdx}`;
                    const isHovered = hoveredCell === cellKey;
                    return (
                      <div
                        key={colIdx}
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          ...styles.heatCell,
                          backgroundColor: isOptimal ? "#2563eb" : `rgba(37, 99, 235, ${opacity})`,
                          border: isHovered ? "2px solid #1e3a8a" : "1px solid #ffffff",
                          transform: isHovered ? "scale(1.15)" : "scale(1)",
                          boxShadow: isOptimal ? "0 2px 6px rgba(37, 99, 235, 0.3)" : "none",
                        }}
                        title={`${row.day} at ${hours[colIdx]}: Intensity Level ${val}/5`}
                      >
                        {isOptimal && <span style={styles.optimalStar}>★</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "18px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  verifiedBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #bbf7d0",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  tabGroup: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#f1f5f9",
    padding: "3px",
    borderRadius: "8px",
  },
  tabBtn: {
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "600",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabContent: {
    paddingTop: "6px",
  },
  geoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
  },
  geoCard: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  geoTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  geoFlag: {
    fontSize: "20px",
  },
  geoCountry: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },
  geoCount: {
    fontSize: "11px",
    color: "#64748b",
  },
  geoShare: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#2563eb",
    marginTop: "8px",
  },
  progressTrack: {
    width: "100%",
    height: "5px",
    backgroundColor: "#e2e8f0",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "4px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "3px",
  },
  ageSection: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionMiniTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  ageList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  ageRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  ageRange: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#1e293b",
    width: "60px",
  },
  ageBarWrap: {
    flex: 1,
    height: "10px",
    backgroundColor: "#f1f5f9",
    borderRadius: "5px",
    overflow: "hidden",
  },
  ageBarFill: {
    height: "100%",
    borderRadius: "5px",
  },
  agePercent: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    width: "35px",
    textAlign: "right",
  },
  ageCount: {
    fontSize: "11.5px",
    color: "#64748b",
    width: "55px",
  },
  genderWrap: {
    marginTop: "12px",
    paddingTop: "14px",
    borderTop: "1px solid #f1f5f9",
  },
  genderMultiBar: {
    display: "flex",
    height: "10px",
    borderRadius: "5px",
    overflow: "hidden",
    marginTop: "8px",
    backgroundColor: "#f1f5f9",
  },
  genderSegment: {
    height: "100%",
    transition: "width 0.3s ease",
  },
  genderLegend: {
    display: "flex",
    gap: "20px",
    marginTop: "8px",
  },
  genderItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  },
  genderDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  genderName: {
    color: "#64748b",
  },
  genderVal: {
    fontWeight: "700",
    color: "#0f172a",
  },
  heatmapWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  heatmapHeader: {
    backgroundColor: "#eff6ff",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #bfdbfe",
  },
  heatmapTip: {
    fontSize: "12px",
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
  },
  matrixContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  matrixRow: {
    display: "grid",
    gridTemplateColumns: "50px repeat(5, 1fr)",
    gap: "8px",
    alignItems: "center",
  },
  matrixDayLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textAlign: "right",
    paddingRight: "8px",
  },
  matrixHourHeader: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
  },
  heatCell: {
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  optimalStar: {
    color: "#ffffff",
    fontSize: "11px",
  },
};

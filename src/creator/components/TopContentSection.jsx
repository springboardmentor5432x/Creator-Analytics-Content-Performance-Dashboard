import React, { useState } from "react";
import { Video, Eye, ThumbsUp, MessageSquare, TrendingUp, Sparkles, Filter } from "lucide-react";
import { TOP_CONTENT_PIECES } from "../mockData";

export default function TopContentSection() {
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("views");

  const filteredContent = TOP_CONTENT_PIECES.filter((item) => {
    if (selectedPlatform === "All") return true;
    return item.platform.toLowerCase().includes(selectedPlatform.toLowerCase());
  });

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Top Performing Content & Virality Index</h3>
            <span style={styles.badgeCount}>{filteredContent.length} Published Assets</span>
          </div>
          <p style={styles.subtitle}>Granular post-level analytics, estimated payouts, and retention metrics</p>
        </div>

        {/* Filter Badges */}
        <div style={styles.filterGroup}>
          <div style={styles.platformPills}>
            {["All", "YouTube", "TikTok", "Instagram", "Twitch"].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: selectedPlatform === p ? "#0f172a" : "#f1f5f9",
                  color: selectedPlatform === p ? "#ffffff" : "#475569",
                  fontWeight: selectedPlatform === p ? 600 : 500,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Table / List */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: "36%" }}>Title & Format</th>
              <th style={styles.th}>Platform</th>
              <th style={styles.th}>Views</th>
              <th style={styles.th}>Interactions</th>
              <th style={styles.th}>Engagement</th>
              <th style={styles.th}>Est. Earnings</th>
              <th style={styles.th}>Virality Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContent.map((item) => (
              <tr key={item.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.titleBlock}>
                    <div
                      style={{
                        ...styles.formatIcon,
                        backgroundColor: item.platformBg,
                        color: item.platformColor,
                      }}
                    >
                      <Video size={16} />
                    </div>
                    <div>
                      <span style={styles.contentTitle} title={item.title}>
                        {item.title}
                      </span>
                      <div style={styles.formatMeta}>
                        <span>{item.format}</span>
                        <span>•</span>
                        <span>Published {item.publishedDate}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.platformPill,
                      backgroundColor: item.platformBg,
                      color: item.platformColor,
                    }}
                  >
                    {item.platform}
                  </span>
                </td>

                <td style={styles.tdBold}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Eye size={13} color="#64748b" />
                    {item.views}
                  </div>
                </td>

                <td style={styles.td}>
                  <div style={styles.interactionGroup}>
                    <span style={styles.interactionItem}>
                      <ThumbsUp size={12} color="#64748b" />
                      {item.likes}
                    </span>
                    <span style={styles.interactionItem}>
                      <MessageSquare size={12} color="#64748b" />
                      {item.comments}
                    </span>
                  </div>
                </td>

                <td style={styles.td}>
                  <span style={styles.engagementBadge}>{item.engagementRate}</span>
                </td>

                <td style={{ ...styles.tdBold, color: "#15803d" }}>
                  {item.earnings}
                </td>

                <td style={styles.td}>
                  <div style={styles.statusWrap}>
                    <span style={styles.statusPill}>
                      <Sparkles size={11} style={{ marginRight: 4 }} />
                      {item.status}
                    </span>
                    <span style={styles.viralityNum}>Score: {item.viralityScore}/100</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    marginBottom: "24px",
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
  badgeCount: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #bfdbfe",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  platformPills: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#f8fafc",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  filterBtn: {
    padding: "4px 10px",
    fontSize: "11.5px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    padding: "10px 12px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "14px 12px",
    fontSize: "13px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "14px 12px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    verticalAlign: "middle",
  },
  titleBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  formatIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contentTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    maxWidth: "320px",
  },
  formatMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  platformPill: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    display: "inline-block",
  },
  interactionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  interactionItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    color: "#475569",
  },
  engagementBadge: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "2px 8px",
    borderRadius: "6px",
    display: "inline-block",
  },
  statusWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#7c3aed",
    backgroundColor: "#f5f3ff",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #ddd6fe",
    width: "fit-content",
  },
  viralityNum: {
    fontSize: "10.5px",
    color: "#64748b",
  },
};

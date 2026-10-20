import { useState } from "react";
import {
  Send,
  Search,
} from "lucide-react";

export default function InvitationsManager({
  invitations = [],
  onSelectCampaign,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = invitations.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mCamp = inv.campaignTitle?.toLowerCase().includes(q);
      const mName = inv.creatorName?.toLowerCase().includes(q);
      const mEmail = inv.creatorEmail?.toLowerCase().includes(q);
      if (!mCamp && !mName && !mEmail) return false;
    }
    return true;
  });

  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const declinedCount = invitations.filter((i) => i.status === "declined").length;

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Campaign Invitations</h2>
          <p style={styles.pageSubtitle}>
            Monitor creator invitation responses, acceptance rates, and deal milestones.
          </p>
        </div>

        <div style={styles.kpiPills}>
          <div style={styles.pillBox}>
            <span style={styles.pillNum}>{invitations.length}</span>
            <span style={styles.pillLabel}>Total Sent</span>
          </div>
          <div style={{ ...styles.pillBox, backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <span style={{ ...styles.pillNum, color: "#15803d" }}>{acceptedCount}</span>
            <span style={styles.pillLabel}>Accepted</span>
          </div>
          <div style={{ ...styles.pillBox, backgroundColor: "#fef3c7", borderColor: "#fde68a" }}>
            <span style={{ ...styles.pillNum, color: "#b45309" }}>{pendingCount}</span>
            <span style={styles.pillLabel}>Pending</span>
          </div>
          <div style={{ ...styles.pillBox, backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
            <span style={{ ...styles.pillNum, color: "#b91c1c" }}>{declinedCount}</span>
            <span style={styles.pillLabel}>Declined</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by creator name, email, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.tabFilters}>
          {[
            { id: "all", label: "All Invitations" },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "accepted", label: `Accepted (${acceptedCount})` },
            { id: "declined", label: `Declined (${declinedCount})` },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  ...styles.statusTabBtn,
                  backgroundColor: isSelected ? accent : "#f1f5f9",
                  color: isSelected ? "#ffffff" : "#475569",
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div style={styles.tableCard}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <Send size={28} color="#94a3b8" />
            <h4 style={styles.emptyTitle}>No Invitations Found</h4>
            <p style={styles.emptyText}>
              No campaign invitations match your current filter parameters.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Creator</th>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Compensation</th>
                  <th style={styles.th}>Invitation Status</th>
                  <th style={styles.th}>Sent Date</th>
                  <th style={styles.th}>Response Date</th>
                  <th style={styles.th}>Message Preview</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.nameMain}>{inv.creatorName}</span>
                      <span style={styles.emailSub}>{inv.creatorEmail}</span>
                    </td>

                    <td style={styles.td}>
                      <span
                        onClick={() => onSelectCampaign(inv.campaignId)}
                        style={{ ...styles.campaignLink, color: accent }}
                      >
                        {inv.campaignTitle}
                      </span>
                    </td>

                    <td style={styles.tdBold}>{inv.compensation || "$3,000"}</td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusBadgeStyle(inv.status),
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>

                    <td style={styles.td}>{new Date(inv.sentAt).toLocaleDateString()}</td>

                    <td style={styles.td}>
                      {inv.respondedAt ? (
                        new Date(inv.respondedAt).toLocaleDateString()
                      ) : (
                        <span style={styles.waitingLabel}>Awaiting response</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.messageText} title={inv.message}>
                        {inv.message || "Standard campaign invitation"}
                      </span>
                    </td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        onClick={() => onSelectCampaign(inv.campaignId)}
                        style={{ ...styles.viewBtn, color: accent }}
                      >
                        View Campaign →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadgeStyle(status) {
  switch (status) {
    case "accepted":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "declined":
      return { backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" };
    case "pending":
    default:
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  kpiPills: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  pillBox: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pillNum: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#0f172a",
  },
  pillLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  searchWrap: {
    position: "relative",
    flex: "1 1 280px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 36px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    color: "#0f172a",
  },
  tabFilters: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  statusTabBtn: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
    overflow: "hidden",
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
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px 16px",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "12px 16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  nameMain: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  emailSub: {
    fontSize: "11px",
    color: "#64748b",
  },
  campaignLink: {
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "block",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  waitingLabel: {
    fontSize: "11.5px",
    color: "#94a3b8",
  },
  messageText: {
    display: "inline-block",
    maxWidth: "180px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#475569",
    fontSize: "12px",
  },
  viewBtn: {
    background: "none",
    border: "none",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "8px",
  },
  emptyText: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },
};

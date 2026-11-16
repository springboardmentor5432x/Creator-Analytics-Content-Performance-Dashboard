import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  Lock,
  Eye,
  CheckCircle2,
  X,
  Code,
  Layers,
} from "lucide-react";
import { fetchAuditLogs } from "../adminService";

export default function AdminAuditLogsView({ theme }) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Detail View Modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.warn("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (l.targetEmail || "").toLowerCase().includes(q) ||
        (l.targetId || "").toLowerCase().includes(q) ||
        (l.adminEmail || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q) ||
        (l.action || "").toLowerCase().includes(q);

      const matchesAction = actionFilter === "ALL" || l.action === actionFilter;

      let matchesDate = true;
      if (dateFilter !== "ALL" && l.timestamp) {
        const itemTime = new Date(l.timestamp).getTime();
        const now = Date.now();
        if (dateFilter === "today") {
          matchesDate = now - itemTime < 24 * 60 * 60 * 1000;
        } else if (dateFilter === "last_7d") {
          matchesDate = now - itemTime < 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === "last_30d") {
          matchesDate = now - itemTime < 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, searchQuery, actionFilter, dateFilter]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      "Timestamp",
      "Action",
      "Admin_Email",
      "Admin_ID",
      "Target_Type",
      "Target_ID",
      "Target_Email",
      "Reason",
      "Metadata_JSON",
    ];
    const rows = filteredLogs.map((l) => [
      l.timestamp || "",
      l.action || "",
      l.adminEmail || "",
      l.adminId || "",
      l.targetType || "user",
      l.targetId || "",
      l.targetEmail || "",
      `"${(l.reason || "").replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CreatorIQ_Admin_Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "USER_SUSPENDED":
        return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
      case "USER_REACTIVATED":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
      case "USER_WARNED":
        return { bg: "#ffedd5", color: "#c2410c", border: "#fed7aa" };
      case "REPORT_MARKED_UNDER_REVIEW":
        return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "REPORT_RESOLVED":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
      case "REPORT_DISMISSED":
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
      case "REPORT_NOTE_ADDED":
        return { bg: "#f3e8ff", color: "#7e22ce", border: "#e9d5ff" };
      case "CAMPAIGN_RESTRICTED":
        return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
      case "CAMPAIGN_UNRESTRICTED":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
      case "SYSTEM_INITIALIZED":
        return { bg: "#e0e7ff", color: "#4338ca", border: "#c7d2fe" };
      default:
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <FileText size={24} color={accent} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Append-Only Audit Ledger</h1>
              <span style={styles.immutableBadge}>
                <Lock size={11} /> IMMUTABLE LOG
              </span>
            </div>
            <p style={styles.subtitle}>
              All administrative operations, user suspensions, campaign restrictions, and moderation decisions are permanently recorded in an append-only ledger protected by Firestore security rules.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={loadLogs} style={styles.refreshBtn} title="Refresh audit logs">
            <RefreshCw size={14} color="#334155" />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            style={styles.exportBtn}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by target email, admin, reason, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Action Type:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Recorded Actions</option>
              <option value="USER_SUSPENDED">User Suspended</option>
              <option value="USER_REACTIVATED">User Reactivated</option>
              <option value="USER_WARNED">User Warned</option>
              <option value="REPORT_MARKED_UNDER_REVIEW">Report Under Review</option>
              <option value="REPORT_RESOLVED">Report Resolved</option>
              <option value="REPORT_DISMISSED">Report Dismissed</option>
              <option value="REPORT_NOTE_ADDED">Report Note Added</option>
              <option value="CAMPAIGN_RESTRICTED">Campaign Restricted</option>
              <option value="CAMPAIGN_UNRESTRICTED">Campaign Unrestricted</option>
              <option value="SYSTEM_INITIALIZED">System Initialized</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Date Range:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Time</option>
              <option value="today">Today (24h)</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableInfoRow}>
          <span style={styles.counterText}>
            Showing <strong>{filteredLogs.length}</strong> audit records (Sorted newest first)
          </span>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <RefreshCw size={24} color={accent} style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading audit ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.emptyBox}>
            <FileText size={36} color="#94a3b8" />
            <h3 style={{ margin: "10px 0 4px", fontSize: "15px", color: "#0f172a" }}>
              No audit logs found
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              No events matched your search query or filters.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Acting Admin</th>
                  <th style={styles.th}>Target User / Record</th>
                  <th style={styles.th}>Mandatory Reason</th>
                  <th style={styles.thAction}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={styles.tr}
                      onClick={() => setSelectedEvent(log)}
                    >
                      <td style={styles.td}>
                        <div style={styles.timeWrap}>
                          <Clock size={12} color="#94a3b8" />
                          <span>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.actionBadge,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>
                          {log.adminName || "Platform Admin"}
                        </div>
                        <span style={styles.subText}>{log.adminEmail}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>
                          {log.targetEmail || log.targetId}
                        </div>
                        <span style={styles.subText}>
                          {log.targetType?.toUpperCase() || "RECORD"}: {log.targetId}
                        </span>
                      </td>
                      <td style={{ ...styles.td, maxWidth: 320 }}>
                        <p style={styles.reasonText}>"{log.reason}"</p>
                      </td>
                      <td style={styles.tdAction}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(log);
                          }}
                          style={styles.inspectBtn}
                          title="View complete event record"
                        >
                          <Eye size={12} style={{ marginRight: 4 }} />
                          <span>Event</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Event Detail Modal */}
      {selectedEvent && (
        <div style={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={styles.modalIconWrap}>
                  <Lock size={18} color="#4338ca" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={styles.modalTitle}>Audit Record #{selectedEvent.id}</h3>
                    <span
                      style={{
                        ...styles.actionBadge,
                        ...getActionBadge(selectedEvent.action),
                      }}
                    >
                      {selectedEvent.action}
                    </span>
                  </div>
                  <span style={styles.modalSubtitle}>
                    Timestamp:{" "}
                    {selectedEvent.timestamp
                      ? new Date(selectedEvent.timestamp).toUTCString()
                      : "Verified"}
                  </span>
                </div>
              </div>

              <button onClick={() => setSelectedEvent(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Event Attributes Grid */}
              <div style={styles.detailsGrid}>
                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>Acting Administrator</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a", marginTop: 4 }}>
                    {selectedEvent.adminName || "Administrator"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Email: {selectedEvent.adminEmail}
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    UID: {selectedEvent.adminId}
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>Target Affected</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a", marginTop: 4 }}>
                    {selectedEvent.targetEmail || selectedEvent.targetId}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Type: {selectedEvent.targetType?.toUpperCase() || "RECORD"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    ID: {selectedEvent.targetId}
                  </span>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div style={styles.reasonSection}>
                <span style={styles.detailLabel}>Action Justification / Reason:</span>
                <div style={styles.reasonCardBox}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                    "{selectedEvent.reason}"
                  </p>
                </div>
              </div>

              {/* Structured Metadata JSON */}
              <div style={styles.metadataSection}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Code size={13} color="#64748b" />
                  <span style={styles.detailLabel}>Event Metadata Payload</span>
                </div>
                <pre style={styles.jsonBox}>
                  {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
                </pre>
              </div>

              {/* Integrity Seal */}
              <div style={styles.integritySeal}>
                <ShieldCheck size={16} color="#15803d" />
                <span style={{ fontSize: "12px", color: "#166534" }}>
                  This record is append-only and cryptographically locked. Client modifications and deletions are denied by Firestore backend rules.
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedEvent(null)} style={styles.closeFooterBtn}>
                Close Event Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
  },
  immutableBadge: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    letterSpacing: "0.05em",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "680px",
  },
  refreshBtn: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    padding: "14px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: "260px",
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "13px",
    color: "#0f172a",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  filterItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  filterLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  filterSelect: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "12px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  tableInfoRow: {
    padding: "12px 18px",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#fafafa",
  },
  counterText: {
    fontSize: "12px",
    color: "#64748b",
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
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    padding: "12px 18px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  thAction: {
    padding: "12px 18px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    textAlign: "right",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  td: {
    padding: "14px 18px",
    fontSize: "13px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdAction: {
    padding: "14px 18px",
    textAlign: "right",
    verticalAlign: "middle",
  },
  timeWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
    fontFamily: "monospace",
  },
  actionBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid transparent",
  },
  subText: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "block",
  },
  reasonText: {
    margin: 0,
    fontSize: "12px",
    color: "#475569",
    fontStyle: "italic",
    lineHeight: "1.4",
  },
  inspectBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  loadingBox: {
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#64748b",
  },
  emptyBox: {
    padding: "60px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "640px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalIconWrap: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: "12px",
    color: "#64748b",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
  },
  modalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  detailBox: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  reasonSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  reasonCardBox: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  metadataSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  jsonBox: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: "12px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    overflowX: "auto",
    margin: 0,
  },
  integritySeal: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "10px 14px",
    borderRadius: "8px",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
  },
  closeFooterBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

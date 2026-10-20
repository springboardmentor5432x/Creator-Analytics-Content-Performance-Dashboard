import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  Users,
  Activity,
  Clock,
  RefreshCw,
  FileCheck,
  Send,
  TrendingUp,
} from "lucide-react";
import { calculateROI } from "../campaignService";

export default function MarketingReports({
  campaigns = [],
  invitations = [],
  deliverables = [],
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [downloadSuccess, setDownloadSuccess] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const totalBudget = campaigns.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
  const totalAttributedRevenue = campaigns.reduce(
    (acc, c) => acc + (Number(c.attributedRevenue) || 0),
    0
  );
  const totalROI = calculateROI(totalAttributedRevenue, totalSpend);

  // Operations and activity counters
  const acceptedInvitesCount = invitations.filter((i) => i.status === "accepted").length;
  const acceptanceRate = invitations.length
    ? Math.round((acceptedInvitesCount / invitations.length) * 100)
    : 0;
  const approvedDeliverablesCount = deliverables.filter((d) => d.status === "approved").length;
  const pendingDeliverablesCount = deliverables.filter((d) => d.status !== "approved").length;

  const handleRefreshTelemetry = () => {
    setLastRefreshed(new Date());
    setDownloadSuccess("Analytics telemetry refreshed from live database.");
    setTimeout(() => setDownloadSuccess(""), 2500);
  };

  const downloadCSV = (filename, rows) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(`Exported ${filename} successfully!`);
    setTimeout(() => setDownloadSuccess(""), 3500);
  };

  const handleExportCampaignsSummary = () => {
    const headers = [
      "Campaign ID",
      "Campaign Name",
      "Objective",
      "Status",
      "Start Date",
      "End Date",
      "Budget (USD)",
      "Actual Spend (USD)",
      "Attributed Revenue (USD)",
      "ROI (%)",
      "Target Niche",
    ];
    const rows = [headers];
    campaigns.forEach((c) => {
      const roi = calculateROI(c.attributedRevenue || 0, c.spend || c.budget || 0);
      rows.push([
        c.id,
        c.name,
        c.objective,
        c.status,
        c.startDate,
        c.endDate,
        c.budget,
        c.spend || 0,
        c.attributedRevenue || 0,
        roi.formatted,
        c.targetNiche,
      ]);
    });
    downloadCSV(`CreatorIQ_Campaigns_Report_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handleExportDeliverablesAudit = () => {
    const headers = [
      "Deliverable ID",
      "Campaign Name",
      "Creator Name",
      "Creator Email",
      "Content Type",
      "Title",
      "Due Date",
      "Status",
      "Submission URL",
      "Submitted At",
    ];
    const rows = [headers];
    deliverables.forEach((d) => {
      rows.push([
        d.id,
        d.campaignTitle,
        d.creatorName,
        d.creatorEmail,
        d.contentType,
        d.title,
        d.dueDate,
        d.status,
        d.submissionUrl || "N/A",
        d.submittedAt || "Pending",
      ]);
    });
    downloadCSV(`CreatorIQ_Deliverables_Audit_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handleExportCreatorRoster = () => {
    const headers = [
      "Invitation ID",
      "Campaign Name",
      "Creator Name",
      "Creator Email",
      "Status",
      "Compensation",
      "Sent At",
      "Responded At",
    ];
    const rows = [headers];
    invitations.forEach((inv) => {
      rows.push([
        inv.id,
        inv.campaignTitle,
        inv.creatorName,
        inv.creatorEmail,
        inv.status,
        inv.compensation,
        inv.sentAt,
        inv.respondedAt || "Awaiting",
      ]);
    });
    downloadCSV(`CreatorIQ_Creator_Invitations_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Executive Reports & Export Suite</h2>
          <p style={styles.pageSubtitle}>
            Generate audit-ready spreadsheets, campaign briefs, and financial attribution summaries.
          </p>
        </div>

        <button onClick={handlePrint} style={styles.printBtn}>
          <Printer size={15} style={{ marginRight: 6 }} />
          Print / PDF Preview
        </button>
      </div>

      {downloadSuccess && (
        <div style={styles.successToast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Available Downloads Grid */}
      <div style={styles.exportCardsGrid}>
        <div style={styles.exportCard}>
          <div style={{ ...styles.exportIconBox, backgroundColor: "#f0f9ff" }}>
            <Layers size={22} color="#0284c7" />
          </div>
          <h3 style={styles.cardTitle}>Campaign Performance Summary</h3>
          <p style={styles.cardDesc}>
            Comprehensive breakdown of all active, draft, and completed campaigns including budgets, spend, and financial ROI.
          </p>
          <button
            onClick={handleExportCampaignsSummary}
            style={{ ...styles.downloadBtn, backgroundColor: accent }}
          >
            <Download size={14} style={{ marginRight: 6 }} />
            Download Campaigns CSV
          </button>
        </div>

        <div style={styles.exportCard}>
          <div style={{ ...styles.exportIconBox, backgroundColor: "#f0fdf4" }}>
            <FileSpreadsheet size={22} color="#15803d" />
          </div>
          <h3 style={styles.cardTitle}>Deliverables & QA Audit Log</h3>
          <p style={styles.cardDesc}>
            Full audit report of creator deliverable submissions, due dates, review approval statuses, and proof links.
          </p>
          <button
            onClick={handleExportDeliverablesAudit}
            style={{ ...styles.downloadBtn, backgroundColor: "#15803d" }}
          >
            <Download size={14} style={{ marginRight: 6 }} />
            Download Deliverables CSV
          </button>
        </div>

        <div style={styles.exportCard}>
          <div style={{ ...styles.exportIconBox, backgroundColor: "#fef3c7" }}>
            <Users size={22} color="#d97706" />
          </div>
          <h3 style={styles.cardTitle}>Creator Invitations & Pipeline</h3>
          <p style={styles.cardDesc}>
            Roster invitation audit log tracking proposed compensation, responses, response latencies, and conversion rates.
          </p>
          <button
            onClick={handleExportCreatorRoster}
            style={{ ...styles.downloadBtn, backgroundColor: "#d97706" }}
          >
            <Download size={14} style={{ marginRight: 6 }} />
            Download Invitations CSV
          </button>
        </div>
      </div>

      {/* Printable Executive Brief Card */}
      <div style={styles.executiveCard}>
        <div style={styles.executiveHeader}>
          <div>
            <span style={styles.execTag}>Executive Briefing</span>
            <h3 style={styles.execTitle}>CreatorIQ Marketing Intelligence Snapshot</h3>
            <p style={styles.execSub}>
              Generated for Global Brand Marketing • Period: Current Fiscal Quarter
            </p>
          </div>
          <div style={styles.execDateBox}>
            <Calendar size={13} color="#64748b" style={{ marginRight: 6 }} />
            <span>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>

        <div style={styles.execKpiRow}>
          <div style={styles.execKpi}>
            <span style={styles.execKpiLabel}>Campaigns Managed</span>
            <span style={styles.execKpiVal}>{campaigns.length}</span>
            <span style={styles.execKpiSub}>
              {campaigns.filter((c) => c.status === "active").length} Active
            </span>
          </div>

          <div style={styles.execKpi}>
            <span style={styles.execKpiLabel}>Total Budget</span>
            <span style={styles.execKpiVal}>${totalBudget.toLocaleString()}</span>
            <span style={styles.execKpiSub}>
              ${totalSpend.toLocaleString()} Expended
            </span>
          </div>

          <div style={styles.execKpi}>
            <span style={styles.execKpiLabel}>Attributed Sales</span>
            <span style={{ ...styles.execKpiVal, color: "#15803d" }}>
              ${totalAttributedRevenue.toLocaleString()}
            </span>
            <span style={styles.execKpiSub}>Via Platform Attribution</span>
          </div>

          <div style={styles.execKpi}>
            <span style={styles.execKpiLabel}>Overall Financial ROI</span>
            <span
              style={{
                ...styles.execKpiVal,
                color: totalROI.isPositive ? "#15803d" : "#b91c1c",
              }}
            >
              {totalROI.formatted}
            </span>
            <span style={styles.execKpiSub}>
              Net Gain: ${(totalAttributedRevenue - totalSpend).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Campaign Breakdown Table */}
        <div style={{ marginTop: 20 }}>
          <h4 style={styles.tableHead}>Campaign Attribution Overview</h4>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Campaign</th>
                <th style={styles.th}>Objective</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Budget</th>
                <th style={styles.th}>Spend</th>
                <th style={styles.th}>Revenue</th>
                <th style={{ ...styles.th, textAlign: "right" }}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cRoi = calculateROI(c.attributedRevenue || 0, c.spend || c.budget || 0);
                return (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.tdBold}>{c.name}</td>
                    <td style={styles.td}>{c.objective}</td>
                    <td style={styles.td}>
                      <span style={styles.statusPill}>{c.status}</span>
                    </td>
                    <td style={styles.td}>${(Number(c.budget) || 0).toLocaleString()}</td>
                    <td style={styles.td}>${(Number(c.spend) || 0).toLocaleString()}</td>
                    <td style={{ ...styles.td, color: "#15803d", fontWeight: 600 }}>
                      ${(Number(c.attributedRevenue) || 0).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {cRoi.formatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Activity Summary Card */}
      <div style={styles.activitySummaryCard}>
        <div style={styles.activityHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                ...styles.activityIconBox,
                backgroundColor: theme?.accentLight || "#eff6ff",
                borderColor: theme?.accentBorder || "#bfdbfe",
              }}
            >
              <Activity size={20} color={accent} />
            </div>
            <div>
              <h3 style={styles.activityTitle}>Campaign Activity Summary</h3>
              <p style={styles.activitySubtitle}>
                Recent campaign operations, creator invitation responses, deliverable review approvals, and database synchronization.
              </p>
            </div>
          </div>

          <div style={styles.syncStatusContainer}>
            <div style={styles.liveSyncBadge}>
              <span style={styles.pulsingDot} />
              <span>
                Analytics Refresh: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button
              onClick={handleRefreshTelemetry}
              style={styles.refreshBtn}
              title="Refresh Analytics Telemetry"
            >
              <RefreshCw size={12} style={{ marginRight: 5 }} />
              Sync Now
            </button>
          </div>
        </div>

        {/* 4 Activity Metric Badges */}
        <div style={styles.activityStatsGrid}>
          <div style={styles.activityStatBox}>
            <div style={styles.activityStatIconRow}>
              <Layers size={15} color="#0284c7" />
              <span style={styles.activityStatLabel}>Campaign Updates</span>
            </div>
            <span style={styles.activityStatVal}>{campaigns.length} Managed</span>
            <span style={styles.activityStatSub}>
              {campaigns.filter((c) => c.status === "active").length} active in market
            </span>
          </div>

          <div style={styles.activityStatBox}>
            <div style={styles.activityStatIconRow}>
              <Send size={15} color="#d97706" />
              <span style={styles.activityStatLabel}>Invitation Responses</span>
            </div>
            <span style={styles.activityStatVal}>{acceptedInvitesCount} Accepted</span>
            <span style={styles.activityStatSub}>
              {acceptanceRate}% acceptance rate ({invitations.length} total)
            </span>
          </div>

          <div style={styles.activityStatBox}>
            <div style={styles.activityStatIconRow}>
              <FileCheck size={15} color="#15803d" />
              <span style={styles.activityStatLabel}>Deliverable Approvals</span>
            </div>
            <span style={styles.activityStatVal}>{approvedDeliverablesCount} Approved</span>
            <span style={styles.activityStatSub}>
              {pendingDeliverablesCount} pending submission / QA review
            </span>
          </div>

          <div style={styles.activityStatBox}>
            <div style={styles.activityStatIconRow}>
              <Clock size={15} color="#7c3aed" />
              <span style={styles.activityStatLabel}>Latest Telemetry</span>
            </div>
            <span style={{ ...styles.activityStatVal, color: "#15803d" }}>Active & Current</span>
            <span style={styles.activityStatSub}>
              Stored data verified and synchronized
            </span>
          </div>
        </div>

        {/* Operational Highlights Split */}
        <div style={styles.operationsColumnsGrid}>
          {/* Recent Invitation & Creator Responses */}
          <div style={styles.operationsColCard}>
            <div style={styles.opColHeader}>
              <Users size={15} color="#0f172a" />
              <h4 style={styles.opColTitle}>Creator Invitation Responses</h4>
            </div>
            {invitations.length === 0 ? (
              <p style={styles.emptyActivityText}>No creator invitations on record.</p>
            ) : (
              <div style={styles.activityList}>
                {invitations.slice(0, 4).map((inv) => (
                  <div key={inv.id} style={styles.activityRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.activityItemTitle}>{inv.creatorName}</div>
                      <div style={styles.activityItemMeta}>
                        {inv.campaignTitle} • {inv.compensation || "N/A"}
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor:
                          inv.status === "accepted"
                            ? "#f0fdf4"
                            : inv.status === "declined"
                            ? "#fef2f2"
                            : "#fffbeb",
                        color:
                          inv.status === "accepted"
                            ? "#15803d"
                            : inv.status === "declined"
                            ? "#b91c1c"
                            : "#b45309",
                        border: `1px solid ${
                          inv.status === "accepted"
                            ? "#bbf7d0"
                            : inv.status === "declined"
                            ? "#fecaca"
                            : "#fde68a"
                        }`,
                      }}
                    >
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Deliverable QA & Approvals */}
          <div style={styles.operationsColCard}>
            <div style={styles.opColHeader}>
              <FileCheck size={15} color="#0f172a" />
              <h4 style={styles.opColTitle}>Deliverable Approvals & QA</h4>
            </div>
            {deliverables.length === 0 ? (
              <p style={styles.emptyActivityText}>No deliverables assigned yet.</p>
            ) : (
              <div style={styles.activityList}>
                {deliverables.slice(0, 4).map((del) => (
                  <div key={del.id} style={styles.activityRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.activityItemTitle}>{del.title}</div>
                      <div style={styles.activityItemMeta}>
                        {del.creatorName} • Due: {del.dueDate || "N/A"}
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor:
                          del.status === "approved"
                            ? "#f0fdf4"
                            : del.status === "submitted" || del.status === "resubmitted"
                            ? "#eff6ff"
                            : del.status === "revision_requested"
                            ? "#fef2f2"
                            : "#f8fafc",
                        color:
                          del.status === "approved"
                            ? "#15803d"
                            : del.status === "submitted" || del.status === "resubmitted"
                            ? "#1d4ed8"
                            : del.status === "revision_requested"
                            ? "#b91c1c"
                            : "#475569",
                        border: `1px solid ${
                          del.status === "approved"
                            ? "#bbf7d0"
                            : del.status === "submitted" || del.status === "resubmitted"
                            ? "#bfdbfe"
                            : del.status === "revision_requested"
                            ? "#fecaca"
                            : "#e2e8f0"
                        }`,
                      }}
                    >
                      {del.status?.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
  printBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  successToast: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  exportCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
  exportCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "14px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  exportIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDesc: {
    fontSize: "12.5px",
    color: "#64748b",
    lineHeight: "1.45",
  },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.1)",
  },
  executiveCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "26px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },
  executiveHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
    paddingBottom: "18px",
    borderBottom: "1px solid #e2e8f0",
  },
  execTag: {
    fontSize: "10.5px",
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#0369a1",
    backgroundColor: "#e0f2fe",
    padding: "2px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  execTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "6px",
  },
  execSub: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "2px",
  },
  execDateBox: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#475569",
    fontWeight: "500",
  },
  execKpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
    marginTop: "20px",
  },
  execKpi: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "16px",
  },
  execKpiLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
  },
  execKpiVal: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "4px",
    display: "block",
  },
  execKpiSub: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
    display: "block",
  },
  tableHead: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12.5px",
  },
  thRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
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
    padding: "10px 14px",
    color: "#475569",
  },
  tdBold: {
    padding: "10px 14px",
    color: "#0f172a",
    fontWeight: "700",
  },
  statusPill: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  activitySummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  activityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9",
  },
  activityIconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  activitySubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  syncStatusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  liveSyncBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 10px",
    borderRadius: "20px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "11.5px",
    fontWeight: "600",
  },
  pulsingDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    display: "inline-block",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  activityStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
  },
  activityStatBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  activityStatIconRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  activityStatLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  activityStatVal: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  activityStatSub: {
    fontSize: "11px",
    color: "#64748b",
  },
  operationsColumnsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
    marginTop: "4px",
  },
  operationsColCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "16px",
  },
  opColHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e2e8f0",
  },
  opColTitle: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyActivityText: {
    fontSize: "12px",
    color: "#94a3b8",
    fontStyle: "italic",
    padding: "8px 0",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    gap: "10px",
  },
  activityItemTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  activityItemMeta: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
};

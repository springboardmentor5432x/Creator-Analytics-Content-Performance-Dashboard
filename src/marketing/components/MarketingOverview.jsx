import {
  Layers,
  DollarSign,
  Send,
  CheckSquare,
  ArrowRight,
  Plus,
  Calendar,
  AlertCircle,
  Target,
} from "lucide-react";

export default function MarketingOverview({
  campaigns = [],
  invitations = [],
  deliverables = [],
  loading = false,
  error = null,
  onNavigate,
  onOpenCreateModal,
  onSelectCampaign,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  // Compute all metrics dynamically from database records
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  const totalBudget = campaigns.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
  const actualSpend = campaigns.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending").length;
  const awaitingReviewDeliverables = deliverables.filter(
    (d) => d.status === "submitted" || d.status === "resubmitted"
  ).length;

  if (loading) {
    return (
      <div style={styles.loadingBox}>
        <div style={{ ...styles.spinner, borderTopColor: accent }} />
        <p style={styles.loadingText}>Loading Marketing Intelligence & Campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <AlertCircle size={22} color="#dc2626" />
        <div>
          <h4 style={styles.errorTitle}>Error Loading Campaign Data</h4>
          <p style={styles.errorDesc}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Alert banner if deliverables need review */}
      {awaitingReviewDeliverables > 0 && (
        <div style={styles.alertBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.alertIconBadge}>
              <CheckSquare size={16} color="#0284c7" />
            </div>
            <div>
              <span style={styles.alertTitle}>Action Required:</span>
              <span style={styles.alertText}>
                {" "}You have <strong>{awaitingReviewDeliverables}</strong> creator deliverable{awaitingReviewDeliverables > 1 ? "s" : ""} awaiting your approval or feedback.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("deliverables")}
            style={{ ...styles.alertActionBtn, backgroundColor: accent }}
          >
            Review Now
            <ArrowRight size={13} style={{ marginLeft: 4 }} />
          </button>
        </div>
      )}

      {/* KPI Cards Grid - All derived dynamically */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Campaigns</span>
            <div style={{ ...styles.kpiIconWrap, backgroundColor: "#f0f9ff" }}>
              <Layers size={18} color="#0284c7" />
            </div>
          </div>
          <div style={styles.kpiValue}>{totalCampaigns}</div>
          <div style={styles.kpiFooter}>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{activeCampaigns} Active</span>
            <span style={styles.kpiDot}>•</span>
            <span style={{ color: "#d97706" }}>{draftCampaigns} Draft</span>
            <span style={styles.kpiDot}>•</span>
            <span style={{ color: "#64748b" }}>{completedCampaigns} Done</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Campaign Budget</span>
            <div style={{ ...styles.kpiIconWrap, backgroundColor: "#f0fdf4" }}>
              <DollarSign size={18} color="#15803d" />
            </div>
          </div>
          <div style={styles.kpiValue}>${totalBudget.toLocaleString()}</div>
          <div style={styles.kpiFooter}>
            <span style={{ color: "#475569" }}>
              Actual Spend: <strong>${actualSpend.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Pending Invitations</span>
            <div style={{ ...styles.kpiIconWrap, backgroundColor: "#fef3c7" }}>
              <Send size={18} color="#d97706" />
            </div>
          </div>
          <div style={styles.kpiValue}>{pendingInvitations}</div>
          <div style={styles.kpiFooter}>
            <button
              onClick={() => onNavigate("invitations")}
              style={styles.textLinkBtn}
            >
              View Creator Invites →
            </button>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Deliverables In Review</span>
            <div style={{ ...styles.kpiIconWrap, backgroundColor: awaitingReviewDeliverables > 0 ? "#eff6ff" : "#f8fafc" }}>
              <CheckSquare size={18} color={awaitingReviewDeliverables > 0 ? "#2563eb" : "#64748b"} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: awaitingReviewDeliverables > 0 ? "#2563eb" : "#0f172a" }}>
            {awaitingReviewDeliverables}
          </div>
          <div style={styles.kpiFooter}>
            <button
              onClick={() => onNavigate("deliverables")}
              style={styles.textLinkBtn}
            >
              {awaitingReviewDeliverables > 0 ? "Inspect Submissions →" : "All deliverables clear"}
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Table Card */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Campaign Portfolio</h3>
            <p style={styles.sectionSubtitle}>
              Live marketing initiatives, creator counts, budgets, and operational statuses.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => onNavigate("campaigns")}
              style={styles.secondaryBtn}
            >
              View All Campaigns
            </button>
            <button
              onClick={onOpenCreateModal}
              style={{ ...styles.primaryBtn, backgroundColor: accent }}
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              Create Campaign
            </button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrap}>
              <Layers size={28} color="#94a3b8" />
            </div>
            <h4 style={styles.emptyTitle}>No Campaigns Found</h4>
            <p style={styles.emptyText}>
              Get started by launching your first influencer marketing campaign.
            </p>
            <button
              onClick={onOpenCreateModal}
              style={{ ...styles.primaryBtn, backgroundColor: accent, marginTop: 14 }}
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              Create Campaign
            </button>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Campaign Name</th>
                  <th style={styles.th}>Objective</th>
                  <th style={styles.th}>Timeline</th>
                  <th style={styles.th}>Budget & Spend</th>
                  <th style={styles.th}>Creators</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 6).map((c) => {
                  const creatorInvites = invitations.filter((inv) => inv.campaignId === c.id);
                  const acceptedCreators = creatorInvites.filter((inv) => inv.status === "accepted").length;
                  const totalInvited = creatorInvites.length;

                  return (
                    <tr key={c.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt={c.name}
                              style={styles.campaignThumb}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div style={styles.thumbFallback}>
                              <Layers size={14} color="#0284c7" />
                            </div>
                          )}
                          <div>
                            <span
                              onClick={() => onSelectCampaign(c.id)}
                              style={styles.campaignLinkName}
                            >
                              {c.name}
                            </span>
                            <span style={styles.campaignNiche}>{c.targetNiche}</span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.objectivePill}>
                          <Target size={11} style={{ marginRight: 4 }} />
                          {c.objective || "Awareness"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.timelineCell}>
                          <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <span>{c.startDate} → {c.endDate}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.budgetCell}>
                          <span style={styles.budgetTotal}>${(Number(c.budget) || 0).toLocaleString()}</span>
                          <span style={styles.budgetSpend}>Spend: ${(Number(c.spend) || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.creatorsCell}>
                          <span style={styles.creatorsCount}>
                            {acceptedCreators} accepted
                          </span>
                          <span style={styles.creatorsInvited}>
                            ({totalInvited} invited)
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...getStatusStyle(c.status),
                          }}
                        >
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <button
                          onClick={() => onSelectCampaign(c.id)}
                          style={{ ...styles.viewBtn, color: accent }}
                        >
                          Details →
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
    </div>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case "active":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "draft":
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
    case "completed":
      return { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
    case "cancelled":
      return { backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" };
    default:
      return { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  loadingBox: {
    padding: "60px 20px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  spinner: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  loadingText: {
    marginTop: "14px",
    fontSize: "14px",
    color: "#64748b",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  errorTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: "2px",
  },
  errorDesc: {
    fontSize: "13px",
    color: "#b91c1c",
  },
  alertBanner: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "12px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  alertIconBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #bae6fd",
  },
  alertTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0369a1",
  },
  alertText: {
    fontSize: "13px",
    color: "#0c4a6e",
  },
  alertActionBtn: {
    padding: "6px 14px",
    borderRadius: "7px",
    color: "#ffffff",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  kpiLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  kpiIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
    marginBottom: "6px",
  },
  kpiFooter: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#64748b",
    gap: "6px",
    flexWrap: "wrap",
  },
  kpiDot: {
    color: "#cbd5e1",
  },
  textLinkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "12px",
    fontWeight: "600",
    color: "#0284c7",
    cursor: "pointer",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "2px",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
    transition: "opacity 0.15s ease",
  },
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  tableHeaderRow: {
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
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "14px 14px",
    verticalAlign: "middle",
  },
  campaignThumb: {
    width: "42px",
    height: "42px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #e2e8f0",
  },
  thumbFallback: {
    width: "42px",
    height: "42px",
    borderRadius: "8px",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  campaignLinkName: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
    cursor: "pointer",
  },
  campaignNiche: {
    fontSize: "11px",
    color: "#64748b",
  },
  objectivePill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: "6px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "11px",
    fontWeight: "600",
  },
  timelineCell: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#475569",
  },
  budgetCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  budgetTotal: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  budgetSpend: {
    fontSize: "11px",
    color: "#64748b",
  },
  creatorsCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  creatorsCount: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
  },
  creatorsInvited: {
    fontSize: "11px",
    color: "#64748b",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  viewBtn: {
    background: "none",
    border: "none",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
  },
  emptyIconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
    border: "1px solid #e2e8f0",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
    maxWidth: "360px",
    margin: "4px auto 0",
  },
};

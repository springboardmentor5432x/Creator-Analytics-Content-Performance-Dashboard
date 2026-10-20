import { useState } from "react";
import {
  Layers,
  Search,
  Plus,
  Calendar,
  Users,
  Target,
  Edit3,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export default function CampaignsList({
  campaigns = [],
  invitations = [],
  deliverables = [],
  onOpenCreateModal,
  onOpenEditModal,
  onSelectCampaign,
  onStatusChange,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [objectiveFilter, setObjectiveFilter] = useState("all");

  // Confirmation modal state for cancellation
  const [cancelModalCampaign, setCancelModalCampaign] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (objectiveFilter !== "all" && c.objective !== objectiveFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchNiche = c.targetNiche?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchName && !matchNiche && !matchDesc) return false;
    }
    return true;
  });

  const handleConfirmCancel = () => {
    if (cancelModalCampaign) {
      onStatusChange(cancelModalCampaign.id, "cancelled", cancelReason);
      setCancelModalCampaign(null);
      setCancelReason("");
    }
  };

  return (
    <div style={styles.container}>
      {/* Header & Action Bar */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Campaign Management</h2>
          <p style={styles.pageSubtitle}>
            Create, configure, monitor, and manage your full creator campaign pipeline.
          </p>
        </div>
        <button
          onClick={onOpenCreateModal}
          style={{ ...styles.primaryBtn, backgroundColor: accent }}
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Create Campaign
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search campaigns by name, niche, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.selectWrap}>
            <label style={styles.selectLabel}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All Statuses ({campaigns.length})</option>
              <option value="active">Active ({campaigns.filter((c) => c.status === "active").length})</option>
              <option value="draft">Draft ({campaigns.filter((c) => c.status === "draft").length})</option>
              <option value="completed">Completed ({campaigns.filter((c) => c.status === "completed").length})</option>
              <option value="cancelled">Cancelled ({campaigns.filter((c) => c.status === "cancelled").length})</option>
            </select>
          </div>

          <div style={styles.selectWrap}>
            <label style={styles.selectLabel}>Objective:</label>
            <select
              value={objectiveFilter}
              onChange={(e) => setObjectiveFilter(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All Objectives</option>
              <option value="Awareness">Awareness</option>
              <option value="Engagement">Engagement</option>
              <option value="Traffic">Traffic</option>
              <option value="Leads">Leads</option>
              <option value="Sales">Sales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div style={styles.tableCard}>
        {filteredCampaigns.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrap}>
              <Layers size={26} color="#94a3b8" />
            </div>
            <h4 style={styles.emptyTitle}>No matching campaigns found</h4>
            <p style={styles.emptyText}>
              Try adjusting your search terms or filter selection.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Objective & Niche</th>
                  <th style={styles.th}>Dates</th>
                  <th style={styles.th}>Budget & Spend</th>
                  <th style={styles.th}>Creators</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const creatorInvites = invitations.filter((inv) => inv.campaignId === c.id);
                  const acceptedCount = creatorInvites.filter((inv) => inv.status === "accepted").length;
                  const cDeliverables = deliverables.filter((d) => d.campaignId === c.id);
                  const approvedDeliverables = cDeliverables.filter((d) => d.status === "approved").length;

                  return (
                    <tr key={c.id} style={styles.tr}>
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
                              <Layers size={16} color="#0284c7" />
                            </div>
                          )}
                          <div>
                            <span
                              onClick={() => onSelectCampaign(c.id)}
                              style={styles.campaignName}
                            >
                              {c.name}
                            </span>
                            <span style={styles.platformTags}>
                              {(c.targetPlatforms || []).join(" • ")}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.objectivePill}>
                          <Target size={11} style={{ marginRight: 4 }} />
                          {c.objective}
                        </span>
                        <span style={styles.nicheSub}>{c.targetNiche}</span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.dateBlock}>
                          <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <span>{c.startDate}</span>
                          <span style={{ color: "#94a3b8", margin: "0 2px" }}>→</span>
                          <span>{c.endDate}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.budgetWrap}>
                          <span style={styles.budgetMain}>
                            ${(Number(c.budget) || 0).toLocaleString()} {c.currency || "USD"}
                          </span>
                          <span style={styles.spendSub}>
                            Spend: ${(Number(c.spend) || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.creatorsCell}>
                          <span style={styles.creatorsCount}>
                            <Users size={12} style={{ marginRight: 4 }} />
                            {acceptedCount} accepted ({creatorInvites.length} invited)
                          </span>
                          <span style={styles.deliverablesSub}>
                            {approvedDeliverables}/{cDeliverables.length} deliverables approved
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
                          {c.status}
                        </span>
                      </td>

                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <div style={styles.actionBtnGroup}>
                          <button
                            onClick={() => onSelectCampaign(c.id)}
                            style={{ ...styles.viewBtn, color: accent }}
                            title="View Campaign Details"
                          >
                            View
                          </button>

                          <button
                            onClick={() => onOpenEditModal(c)}
                            style={styles.editBtn}
                            title="Edit Campaign"
                          >
                            <Edit3 size={13} />
                          </button>

                          {c.status === "draft" && (
                            <button
                              onClick={() => onStatusChange(c.id, "active")}
                              style={styles.activateBtn}
                              title="Activate Campaign"
                            >
                              <Play size={13} style={{ marginRight: 3 }} />
                              Activate
                            </button>
                          )}

                          {c.status === "active" && (
                            <button
                              onClick={() => onStatusChange(c.id, "completed")}
                              style={styles.completeBtn}
                              title="Mark Campaign Completed"
                            >
                              <CheckCircle size={13} style={{ marginRight: 3 }} />
                              Complete
                            </button>
                          )}

                          {(c.status === "active" || c.status === "draft") && (
                            <button
                              onClick={() => setCancelModalCampaign(c)}
                              style={styles.cancelBtn}
                              title="Cancel Campaign"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalCampaign && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModal}>
            <div style={styles.confirmModalHeader}>
              <div style={styles.warnIconWrap}>
                <AlertTriangle size={20} color="#b91c1c" />
              </div>
              <div>
                <h3 style={styles.confirmModalTitle}>Cancel Campaign?</h3>
                <p style={styles.confirmModalDesc}>
                  Are you sure you want to cancel "<strong>{cancelModalCampaign.name}</strong>"?
                  Active invitations and pending deliverables will be marked accordingly.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.modalLabel}>Optional Cancellation Reason:</label>
              <textarea
                placeholder="e.g. Budget reallocation, timeline postponement..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={styles.modalTextarea}
                rows={3}
              />
            </div>

            <div style={styles.confirmModalActions}>
              <button
                onClick={() => setCancelModalCampaign(null)}
                style={styles.modalCancelBtn}
              >
                No, Keep Campaign
              </button>
              <button
                onClick={handleConfirmCancel}
                style={styles.modalConfirmDeleteBtn}
              >
                Yes, Cancel Campaign
              </button>
            </div>
          </div>
        </div>
      )}
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
    gap: "18px",
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
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
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
    flex: "1 1 300px",
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
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  selectWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  selectLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  selectInput: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "12.5px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
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
    padding: "14px 16px",
    verticalAlign: "middle",
  },
  campaignThumb: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #e2e8f0",
  },
  thumbFallback: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  campaignName: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
    cursor: "pointer",
  },
  platformTags: {
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
  nicheSub: {
    display: "block",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  dateBlock: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#475569",
    whiteSpace: "nowrap",
  },
  budgetWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  budgetMain: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  spendSub: {
    fontSize: "11px",
    color: "#64748b",
  },
  creatorsCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  creatorsCount: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
  },
  deliverablesSub: {
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
  actionBtnGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: "flex-end",
  },
  viewBtn: {
    background: "none",
    border: "none",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  editBtn: {
    padding: "5px 8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  activateBtn: {
    padding: "5px 9px",
    borderRadius: "6px",
    border: "1px solid #86efac",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  completeBtn: {
    padding: "5px 9px",
    borderRadius: "6px",
    border: "1px solid #bfdbfe",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  cancelBtn: {
    padding: "5px 7px",
    borderRadius: "6px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
  },
  emptyIconWrap: {
    width: "52px",
    height: "52px",
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
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  confirmModal: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "460px",
    width: "100%",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
  },
  confirmModalHeader: {
    display: "flex",
    gap: "14px",
  },
  warnIconWrap: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  confirmModalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "4px",
  },
  confirmModalDesc: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.4",
  },
  modalLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "4px",
  },
  modalTextarea: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  },
  confirmModalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  modalCancelBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  modalConfirmDeleteBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

import { useState } from "react";
import {
  CheckSquare,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  X,
  FileCheck,
  RotateCcw,
} from "lucide-react";

export default function DeliverablesManager({
  deliverables = [],
  onReviewDeliverable,
  onSelectCampaign,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal state
  const [reviewModalDeliverable, setReviewModalDeliverable] = useState(null);
  const [reviewAction, setReviewAction] = useState("approve"); // 'approve' | 'request_revision'
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const awaitingReviewCount = deliverables.filter(
    (d) => d.status === "submitted" || d.status === "resubmitted"
  ).length;
  const approvedCount = deliverables.filter((d) => d.status === "approved").length;
  const revisionRequestedCount = deliverables.filter((d) => d.status === "revision_requested").length;
  const pendingCount = deliverables.filter((d) => d.status === "pending").length;

  const filtered = deliverables.filter((d) => {
    if (statusFilter === "needs_review") {
      if (d.status !== "submitted" && d.status !== "resubmitted") return false;
    } else if (statusFilter !== "all" && d.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mTitle = d.title?.toLowerCase().includes(q);
      const mCreator = d.creatorName?.toLowerCase().includes(q);
      const mCamp = d.campaignTitle?.toLowerCase().includes(q);
      if (!mTitle && !mCreator && !mCamp) return false;
    }
    return true;
  });

  const handleOpenReview = (del) => {
    setReviewModalDeliverable(del);
    setReviewAction("approve");
    setRevisionFeedback(del.revisionFeedback || "");
    setReviewError("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");

    if (reviewAction === "request_revision" && !revisionFeedback.trim()) {
      setReviewError("Please provide clear feedback explaining what revisions are needed.");
      return;
    }

    setSubmittingReview(true);
    try {
      await onReviewDeliverable(reviewModalDeliverable.id, {
        action: reviewAction,
        feedback: revisionFeedback,
      });
      setReviewModalDeliverable(null);
    } catch (err) {
      setReviewError(err.message || "Failed to update deliverable review status.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header & KPI Summary */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Deliverables & QA Pipeline</h2>
          <p style={styles.pageSubtitle}>
            Inspect creator submissions, approve finished marketing assets, and communicate revision requests.
          </p>
        </div>

        <div style={styles.kpiPills}>
          <div
            style={{
              ...styles.pillBox,
              backgroundColor: awaitingReviewCount > 0 ? "#eff6ff" : "#ffffff",
              borderColor: awaitingReviewCount > 0 ? "#bfdbfe" : "#e2e8f0",
            }}
          >
            <span style={{ ...styles.pillNum, color: awaitingReviewCount > 0 ? "#1d4ed8" : "#0f172a" }}>
              {awaitingReviewCount}
            </span>
            <span style={styles.pillLabel}>Needs Review</span>
          </div>

          <div style={{ ...styles.pillBox, backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <span style={{ ...styles.pillNum, color: "#15803d" }}>{approvedCount}</span>
            <span style={styles.pillLabel}>Approved</span>
          </div>

          <div style={{ ...styles.pillBox, backgroundColor: "#fef3c7", borderColor: "#fde68a" }}>
            <span style={{ ...styles.pillNum, color: "#b45309" }}>{revisionRequestedCount}</span>
            <span style={styles.pillLabel}>Revisions</span>
          </div>

          <div style={{ ...styles.pillBox, backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
            <span style={{ ...styles.pillNum, color: "#64748b" }}>{pendingCount}</span>
            <span style={styles.pillLabel}>In Production</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search deliverables by title, creator, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.tabFilters}>
          {[
            { id: "all", label: `All (${deliverables.length})` },
            { id: "needs_review", label: `Needs Review (${awaitingReviewCount})` },
            { id: "approved", label: `Approved (${approvedCount})` },
            { id: "revision_requested", label: `Revisions (${revisionRequestedCount})` },
            { id: "pending", label: `In Production (${pendingCount})` },
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

      {/* Deliverables Table */}
      <div style={styles.tableCard}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <CheckSquare size={32} color="#94a3b8" />
            <h4 style={styles.emptyTitle}>No Deliverables Found</h4>
            <p style={styles.emptyText}>
              No deliverables match your search criteria or filter status.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Deliverable Title & Format</th>
                  <th style={styles.th}>Creator</th>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>QA Status</th>
                  <th style={styles.th}>Submission URL</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Review Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((del) => {
                  const needsReview = del.status === "submitted" || del.status === "resubmitted";
                  return (
                    <tr key={del.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.delTitle}>{del.title}</span>
                        <span style={styles.delFormat}>{del.contentType}</span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.creatorName}>{del.creatorName}</span>
                        <span style={styles.creatorEmail}>{del.creatorEmail}</span>
                      </td>

                      <td style={styles.td}>
                        <span
                          onClick={() => onSelectCampaign(del.campaignId)}
                          style={{ ...styles.campaignLink, color: accent }}
                        >
                          {del.campaignTitle}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.dateBlock}>
                          <Clock size={12} color="#64748b" />
                          <span>{del.dueDate}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...getQAStatusStyle(del.status),
                          }}
                        >
                          {formatQAStatus(del.status)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {del.submissionUrl ? (
                          <a
                            href={del.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...styles.proofLink, color: accent }}
                          >
                            <ExternalLink size={12} style={{ marginRight: 4 }} />
                            Inspect Content
                          </a>
                        ) : (
                          <span style={styles.emptyProof}>Awaiting link</span>
                        )}
                      </td>

                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {needsReview ? (
                          <button
                            onClick={() => handleOpenReview(del)}
                            style={{ ...styles.reviewBtn, backgroundColor: accent }}
                          >
                            Review Work
                          </button>
                        ) : del.status === "approved" ? (
                          <span style={styles.approvedTag}>
                            <CheckCircle2 size={13} color="#15803d" style={{ marginRight: 4 }} />
                            Approved
                          </span>
                        ) : del.status === "revision_requested" ? (
                          <button
                            onClick={() => handleOpenReview(del)}
                            style={styles.revisionsPendingBtn}
                          >
                            Feedback Sent
                          </button>
                        ) : (
                          <span style={styles.inProdTag}>In Production</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal Dialog */}
      {reviewModalDeliverable && (
        <div style={styles.modalOverlay}>
          <div style={styles.reviewModalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIconWrap, backgroundColor: "#f0f9ff" }}>
                  <FileCheck size={18} color={accent} />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Review Deliverable Submission</h3>
                  <p style={styles.modalSub}>
                    {reviewModalDeliverable.creatorName} • {reviewModalDeliverable.campaignTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalDeliverable(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            {reviewError && (
              <div style={styles.errorBanner}>
                <AlertTriangle size={16} color="#dc2626" />
                <span>{reviewError}</span>
              </div>
            )}

            <div style={styles.modalBody}>
              {/* Deliverable Info */}
              <div style={styles.infoCard}>
                <span style={styles.infoLabel}>Deliverable Title:</span>
                <span style={styles.infoTitle}>{reviewModalDeliverable.title}</span>

                <span style={styles.infoLabel}>Requirements:</span>
                <p style={styles.infoText}>
                  {reviewModalDeliverable.requirements || "Standard campaign deliverable requirements."}
                </p>

                <div style={styles.proofBox}>
                  <span style={styles.infoLabel}>Creator Submission URL:</span>
                  {reviewModalDeliverable.submissionUrl ? (
                    <a
                      href={reviewModalDeliverable.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...styles.inspectWorkLink, color: accent }}
                    >
                      <ExternalLink size={14} style={{ marginRight: 6 }} />
                      {reviewModalDeliverable.submissionUrl}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: "12px" }}>No URL submitted yet.</span>
                  )}

                  {reviewModalDeliverable.submissionNotes && (
                    <div style={{ marginTop: 8 }}>
                      <span style={styles.infoLabel}>Creator Notes:</span>
                      <p style={styles.infoText}>{reviewModalDeliverable.submissionNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Selection */}
              <div style={styles.decisionWrap}>
                <span style={styles.decisionLabel}>Select Review Decision:</span>
                <div style={styles.decisionButtons}>
                  <button
                    type="button"
                    onClick={() => setReviewAction("approve")}
                    style={{
                      ...styles.decisionBtn,
                      backgroundColor: reviewAction === "approve" ? "#f0fdf4" : "#ffffff",
                      borderColor: reviewAction === "approve" ? "#16a34a" : "#cbd5e1",
                      color: reviewAction === "approve" ? "#15803d" : "#475569",
                      fontWeight: reviewAction === "approve" ? 700 : 500,
                    }}
                  >
                    <CheckCircle2 size={16} color={reviewAction === "approve" ? "#16a34a" : "#64748b"} />
                    <span>Approve Submission</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction("request_revision")}
                    style={{
                      ...styles.decisionBtn,
                      backgroundColor: reviewAction === "request_revision" ? "#fef3c7" : "#ffffff",
                      borderColor: reviewAction === "request_revision" ? "#d97706" : "#cbd5e1",
                      color: reviewAction === "request_revision" ? "#b45309" : "#475569",
                      fontWeight: reviewAction === "request_revision" ? 700 : 500,
                    }}
                  >
                    <RotateCcw size={16} color={reviewAction === "request_revision" ? "#d97706" : "#64748b"} />
                    <span>Request Revisions</span>
                  </button>
                </div>
              </div>

              {/* Revision Feedback */}
              {reviewAction === "request_revision" && (
                <div style={styles.feedbackWrap}>
                  <label style={styles.feedbackLabel}>
                    Revision Explanation & Change Instructions <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="Specify timestamps, audio changes, brand mention requirements, or link corrections required from the creator..."
                    style={styles.feedbackTextarea}
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setReviewModalDeliverable(null)}
                disabled={submittingReview}
                style={styles.cancelBtn}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                style={{
                  ...styles.submitDecisionBtn,
                  backgroundColor: reviewAction === "approve" ? "#16a34a" : "#d97706",
                }}
              >
                {submittingReview
                  ? "Updating..."
                  : reviewAction === "approve"
                  ? "Confirm & Approve Deliverable"
                  : "Submit Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getQAStatusStyle(status) {
  switch (status) {
    case "approved":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "submitted":
    case "resubmitted":
      return { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
    case "revision_requested":
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
    case "pending":
    default:
      return { backgroundColor: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
  }
}

function formatQAStatus(status) {
  switch (status) {
    case "approved":
      return "Approved";
    case "resubmitted":
      return "Resubmitted (QA)";
    case "submitted":
      return "Submitted (QA)";
    case "revision_requested":
      return "Revision Requested";
    case "pending":
    default:
      return "Pending Submission";
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
  delTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  delFormat: {
    fontSize: "10.5px",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "2px 6px",
    borderRadius: "4px",
    display: "inline-block",
    marginTop: "2px",
  },
  creatorName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },
  creatorEmail: {
    fontSize: "11px",
    color: "#64748b",
  },
  campaignLink: {
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  dateBlock: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
  },
  proofLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
  },
  emptyProof: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  reviewBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  approvedTag: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#15803d",
  },
  revisionsPendingBtn: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #fde68a",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  inProdTag: {
    fontSize: "11px",
    color: "#64748b",
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
  reviewModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "580px",
    width: "100%",
    padding: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  modalIconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #bae6fd",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "14px",
  },
  infoLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "2px",
  },
  infoTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "8px",
    display: "block",
  },
  infoText: {
    fontSize: "12.5px",
    color: "#334155",
    lineHeight: "1.45",
    margin: "0 0 10px 0",
  },
  proofBox: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  inspectWorkLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: "700",
    textDecoration: "none",
    wordBreak: "break-all",
  },
  decisionWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  decisionLabel: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
  },
  decisionButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  decisionBtn: {
    padding: "12px",
    borderRadius: "10px",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  feedbackWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  feedbackLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#b45309",
  },
  feedbackTextarea: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  cancelBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  submitDecisionBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

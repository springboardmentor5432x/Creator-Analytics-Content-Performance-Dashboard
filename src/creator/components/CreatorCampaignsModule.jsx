import { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Calendar,
  FileCheck,
  Check,
  X,
  CheckSquare,
} from "lucide-react";
import {
  getLocalInvitations,
  getLocalDeliverables,
  respondToInvitation,
  submitDeliverable,
  subscribeToDataChanges,
} from "../../marketing/campaignService";

export default function CreatorCampaignsModule({
  currentUser,
  userProfile,
  theme,
}) {
  const accent = theme?.accent || "#2563eb";
  const userEmail = (userProfile?.email || currentUser?.email || "creator@creatoriq.io").toLowerCase();
  const userId = userProfile?.uid || currentUser?.uid;

  const [invitations, setInvitations] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submission modal state
  const [submitModalDeliverable, setSubmitModalDeliverable] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const refreshCreatorData = () => {
    // Get all invitations matching this creator by email or uid
    const allInv = getLocalInvitations();
    const myInv = allInv.filter(
      (inv) =>
        (inv.creatorEmail && inv.creatorEmail.toLowerCase() === userEmail) ||
        (inv.creatorId && inv.creatorId === userId) ||
        // Fallback for demo creator accounts
        (userEmail.includes("creator") && inv.creatorEmail?.includes("creator"))
    );

    // Get all deliverables matching this creator
    const allDel = getLocalDeliverables();
    const myDel = allDel.filter(
      (del) =>
        (del.creatorEmail && del.creatorEmail.toLowerCase() === userEmail) ||
        (del.creatorId && del.creatorId === userId) ||
        (userEmail.includes("creator") && del.creatorEmail?.includes("creator"))
    );

    setInvitations(myInv);
    setDeliverables(myDel);
    setLoading(false);
  };

  useEffect(() => {
    refreshCreatorData();
    const unsubscribe = subscribeToDataChanges(() => {
      refreshCreatorData();
    });
    return () => unsubscribe();
  }, [userEmail, userId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleRespond = async (invitationId, responseStatus) => {
    try {
      await respondToInvitation(invitationId, responseStatus, userProfile || currentUser);
      showToast(
        responseStatus === "accepted"
          ? "Campaign invitation accepted! Deliverables will be assigned shortly."
          : "Campaign invitation declined."
      );
      refreshCreatorData();
    } catch (err) {
      alert(err.message || "Failed to respond to invitation.");
    }
  };

  const handleOpenSubmitModal = (del) => {
    setSubmitModalDeliverable(del);
    setSubmissionUrl(del.submissionUrl || "");
    setSubmissionNotes(del.submissionNotes || "");
    setSubmitError("");
  };

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!submissionUrl.trim()) {
      setSubmitError("Please provide a valid URL to your published or staged content.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDeliverable(
        submitModalDeliverable.id,
        {
          submissionUrl: submissionUrl.trim(),
          submissionNotes: submissionNotes.trim(),
        },
        userProfile || currentUser
      );

      showToast("Content submitted to brand marketing team for QA review!");
      setSubmitModalDeliverable(null);
      refreshCreatorData();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit deliverable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const acceptedInvitations = invitations.filter((i) => i.status === "accepted");

  return (
    <div style={styles.card}>
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Brand Campaign Invitations & Deliverables</h3>
            <span style={styles.liveTag}>Real-time Synced</span>
          </div>
          <p style={styles.subtitle}>
            Review official brand marketing invitations, accept deals, and upload deliverable links for review.
          </p>
        </div>

        <div style={styles.statsSummary}>
          <div style={styles.sumBox}>
            <span style={styles.sumLabel}>Pending Invites</span>
            <span style={{ ...styles.sumVal, color: pendingInvitations.length > 0 ? "#d97706" : "#0f172a" }}>
              {pendingInvitations.length}
            </span>
          </div>
          <div style={styles.sumBox}>
            <span style={styles.sumLabel}>Active Deals</span>
            <span style={{ ...styles.sumVal, color: "#15803d" }}>{acceptedInvitations.length}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: INVITATIONS */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={styles.subSectionTitle}>
          Campaign Invitations ({invitations.length})
        </h4>

        {invitations.length === 0 ? (
          <div style={styles.emptyNotice}>
            <Send size={24} color="#94a3b8" />
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              No brand invitations received yet. When brands invite you from Creator Discovery, they will appear here.
            </span>
          </div>
        ) : (
          <div style={styles.invitationGrid}>
            {invitations.map((inv) => {
              const isPending = inv.status === "pending";
              return (
                <div
                  key={inv.id}
                  style={{
                    ...styles.inviteCard,
                    borderColor: isPending ? "#fde68a" : "#e2e8f0",
                    backgroundColor: isPending ? "#fffbeb" : "#ffffff",
                  }}
                >
                  <div style={styles.inviteTop}>
                    <div>
                      <span style={styles.campaignTitleText}>{inv.campaignTitle}</span>
                      <span style={styles.marketingBrandText}>
                        Invited by: <strong>{inv.marketingName}</strong>
                      </span>
                    </div>

                    <span style={styles.compensationTag}>{inv.compensation || "$3,000"}</span>
                  </div>

                  <p style={styles.inviteMsg}>
                    "{inv.message || "We would love to partner with you on this campaign."}"
                  </p>

                  <div style={styles.inviteFooter}>
                    <div style={styles.sentDateMeta}>
                      <Clock size={12} color="#64748b" />
                      <span>Sent {new Date(inv.sentAt).toLocaleDateString()}</span>
                    </div>

                    {isPending ? (
                      <div style={styles.actionButtonGroup}>
                        <button
                          onClick={() => handleRespond(inv.id, "declined")}
                          style={styles.declineBtn}
                        >
                          <X size={13} style={{ marginRight: 4 }} />
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespond(inv.id, "accepted")}
                          style={{ ...styles.acceptBtn, backgroundColor: accent }}
                        >
                          <Check size={13} style={{ marginRight: 4 }} />
                          Accept Invite
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor: inv.status === "accepted" ? "#f0fdf4" : "#fef2f2",
                          color: inv.status === "accepted" ? "#15803d" : "#b91c1c",
                          borderColor: inv.status === "accepted" ? "#bbf7d0" : "#fecaca",
                        }}
                      >
                        {inv.status === "accepted" ? "✓ Accepted" : "Declined"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: DELIVERABLES */}
      <div>
        <h4 style={styles.subSectionTitle}>
          Assigned Deliverables & Production Status ({deliverables.length})
        </h4>

        {deliverables.length === 0 ? (
          <div style={styles.emptyNotice}>
            <CheckSquare size={24} color="#94a3b8" />
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              No deliverables assigned yet. Accept a campaign invitation to receive production briefs.
            </span>
          </div>
        ) : (
          <div style={styles.deliverablesList}>
            {deliverables.map((del) => {
              const isRevision = del.status === "revision_requested";
              const isApproved = del.status === "approved";
              const isSubmitted = del.status === "submitted" || del.status === "resubmitted";
              const isPending = del.status === "pending";

              return (
                <div
                  key={del.id}
                  style={{
                    ...styles.deliverableCard,
                    borderColor: isRevision ? "#f59e0b" : isApproved ? "#86efac" : "#e2e8f0",
                  }}
                >
                  <div style={styles.delHeader}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={styles.delTitleText}>{del.title}</span>
                        <span style={styles.formatBadge}>{del.contentType}</span>
                      </div>
                      <span style={styles.delCampText}>{del.campaignTitle}</span>
                    </div>

                    <span
                      style={{
                        ...styles.qaStatusBadge,
                        ...getQAStatusBadgeStyle(del.status),
                      }}
                    >
                      {formatQAStatusText(del.status)}
                    </span>
                  </div>

                  {/* Requirements */}
                  <div style={styles.reqBlock}>
                    <span style={styles.reqLabel}>Requirements & Talking Points:</span>
                    <p style={styles.reqText}>{del.requirements || "Standard campaign production brief."}</p>
                  </div>

                  {/* Revisions Alert if revision requested */}
                  {isRevision && del.revisionFeedback && (
                    <div style={styles.revisionNotice}>
                      <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ display: "block", color: "#92400e", fontSize: "12.5px" }}>
                          Brand Revision Request:
                        </strong>
                        <p style={{ margin: "2px 0 0 0", color: "#78350f", fontSize: "12px", lineHeight: "1.4" }}>
                          "{del.revisionFeedback}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Submission Info / Link */}
                  {del.submissionUrl && (
                    <div style={styles.submittedBox}>
                      <span style={styles.submittedLabel}>Current Submission:</span>
                      <a
                        href={del.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...styles.workUrl, color: accent }}
                      >
                        <ExternalLink size={12} style={{ marginRight: 4 }} />
                        {del.submissionUrl}
                      </a>
                      {del.submissionNotes && (
                        <p style={{ fontSize: "11.5px", color: "#64748b", margin: "4px 0 0 0" }}>
                          Notes: {del.submissionNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={styles.delFooter}>
                    <div style={styles.dueMeta}>
                      <Calendar size={12} color="#64748b" />
                      <span>Due: <strong>{del.dueDate}</strong></span>
                    </div>

                    <div>
                      {isApproved ? (
                        <span style={styles.approvedSuccessTag}>
                          <CheckCircle2 size={14} color="#15803d" style={{ marginRight: 4 }} />
                          Approved & Verified Payout
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenSubmitModal(del)}
                          style={{
                            ...styles.submitWorkBtn,
                            backgroundColor: isRevision ? "#d97706" : accent,
                          }}
                        >
                          {isRevision ? (
                            <>
                              <RotateCcw size={13} style={{ marginRight: 4 }} />
                              Resubmit with Changes
                            </>
                          ) : isSubmitted ? (
                            <>
                              <FileCheck size={13} style={{ marginRight: 4 }} />
                              Update Submission
                            </>
                          ) : (
                            <>
                              <Send size={13} style={{ marginRight: 4 }} />
                              Submit Content Link
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {submitModalDeliverable && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Submit Deliverable</h3>
                <p style={styles.modalSub}>{submitModalDeliverable.title}</p>
              </div>
              <button
                onClick={() => setSubmitModalDeliverable(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            {submitError && (
              <div style={styles.modalError}>
                <AlertTriangle size={15} color="#dc2626" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeliverable} style={styles.modalForm}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Published or Staged Content URL <span style={{ color: "#dc2626" }}>*</span>:
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://tiktok.com/@... or Google Drive link"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  style={styles.input}
                  required
                />
                <span style={styles.fieldHint}>
                  Paste the live video link, vertical post link, or cloud review link.
                </span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Notes for Brand Marketing Reviewer:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Dedicated integration rendered at 03:15. UTM affiliate link confirmed in top description line."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setSubmitModalDeliverable(null)}
                  disabled={isSubmitting}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ ...styles.submitBtn, backgroundColor: accent }}
                >
                  {isSubmitting ? "Submitting..." : "Send to Brand for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getQAStatusBadgeStyle(status) {
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

function formatQAStatusText(status) {
  switch (status) {
    case "approved":
      return "Approved";
    case "resubmitted":
      return "Resubmitted (QA)";
    case "submitted":
      return "Under Review";
    case "revision_requested":
      return "Revision Requested";
    case "pending":
    default:
      return "Pending Submission";
  }
}

const styles = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
    marginBottom: "24px",
    position: "relative",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "13px",
    fontWeight: "600",
    padding: "12px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    zIndex: 999,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  liveTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  statsSummary: {
    display: "flex",
    gap: "10px",
  },
  sumBox: {
    backgroundColor: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    textAlign: "right",
  },
  sumLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
  },
  sumVal: {
    fontSize: "16px",
    fontWeight: "800",
  },
  subSectionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "12px",
  },
  emptyNotice: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
    padding: "24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  invitationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "14px",
  },
  inviteCard: {
    borderRadius: "12px",
    border: "1px solid",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
  },
  inviteTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  campaignTitleText: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  marketingBrandText: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  compensationTag: {
    fontSize: "13.5px",
    fontWeight: "800",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid #bbf7d0",
    flexShrink: 0,
  },
  inviteMsg: {
    fontSize: "12px",
    color: "#475569",
    lineHeight: "1.45",
    fontStyle: "italic",
    backgroundColor: "#ffffff",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  inviteFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "8px",
    borderTop: "1px solid #e2e8f0",
  },
  sentDateMeta: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "#64748b",
  },
  actionButtonGroup: {
    display: "flex",
    gap: "6px",
  },
  declineBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  acceptBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  statusPill: {
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: "700",
  },
  deliverablesList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  deliverableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  delHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "8px",
  },
  delTitleText: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  formatBadge: {
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
  },
  delCampText: {
    fontSize: "11.5px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  qaStatusBadge: {
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
  },
  reqBlock: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
  },
  reqLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
  },
  reqText: {
    fontSize: "12px",
    color: "#334155",
    margin: "2px 0 0 0",
    lineHeight: "1.4",
  },
  revisionNotice: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    padding: "10px 12px",
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },
  submittedBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: "8px",
    border: "1px solid #bae6fd",
    padding: "8px 12px",
  },
  submittedLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#0369a1",
    display: "block",
  },
  workUrl: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "700",
    textDecoration: "none",
    marginTop: "2px",
    wordBreak: "break-all",
  },
  delFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "8px",
    borderTop: "1px solid #f1f5f9",
    flexWrap: "wrap",
    gap: "8px",
  },
  dueMeta: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11.5px",
    color: "#475569",
  },
  approvedSuccessTag: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "700",
    color: "#15803d",
  },
  submitWorkBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
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
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "520px",
    width: "100%",
    padding: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
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
  modalError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "12px",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
  },
  fieldHint: {
    fontSize: "11px",
    color: "#64748b",
  },
  textarea: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
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
  submitBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

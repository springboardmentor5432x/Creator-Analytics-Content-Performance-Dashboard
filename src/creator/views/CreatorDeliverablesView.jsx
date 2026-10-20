import React, { useState } from "react";
import {
  CheckSquare,
  Clock,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Calendar,
  FileCheck,
  Check,
  X,
  CheckCircle2,
  Send,
  DollarSign,
  Building2,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Handshake,
  Mail,
  AlertCircle,
} from "lucide-react";
import { submitDeliverable, matchesCreator } from "../creatorService";

export default function CreatorDeliverablesView({
  deliverables = [],
  invitations = [],
  loading = false,
  error = null,
  theme,
  user,
  userProfile,
  onRefresh,
  onNavigate,
}) {
  const accent = theme?.accent || "#2563eb";
  const [statusFilter, setStatusFilter] = useState("all");

  // Submission modal state
  const [modalDeliverable, setModalDeliverable] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Expandable sections for history / briefs
  const [expandedBriefs, setExpandedBriefs] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});

  const toggleBrief = (id) => {
    setExpandedBriefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHistory = (id) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  const handleOpenSubmit = (del) => {
    setModalDeliverable(del);
    setSubmissionUrl(del.submissionUrl || "");
    setSubmissionNotes(del.submissionNotes || "");
    setSubmitError("");
  };

  const validateUrl = (url) => {
    if (!url || !url.trim()) return "Content URL is required.";
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "URL must begin with http:// or https://";
    }
    try {
      new URL(trimmed);
      return null;
    } catch {
      return "Please enter a valid URL (e.g., https://youtube.com/watch?v=...)";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const urlValidation = validateUrl(submissionUrl);
    if (urlValidation) {
      setSubmitError(urlValidation);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await submitDeliverable(
        modalDeliverable.id,
        {
          submissionUrl: submissionUrl.trim(),
          submissionNotes: submissionNotes.trim(),
        },
        userProfile || user
      );

      setModalDeliverable(null);
      showToast(
        modalDeliverable.status === "revision_requested"
          ? "Deliverable resubmitted with revisions! Brand partner has been notified."
          : "Deliverable submitted for review! Brand partner has been notified."
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit deliverable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. FILTER TO DELIVERABLES ASSIGNED THROUGH ACCEPTED COLLABORATIONS
  const acceptedCampaignIds = new Set(
    (invitations || [])
      .filter((inv) => inv.status === "accepted")
      .map((inv) => inv.campaignId)
      .filter(Boolean)
  );
  const acceptedCampaignTitles = new Set(
    (invitations || [])
      .filter((inv) => inv.status === "accepted")
      .map((inv) => (inv.campaignTitle || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const eligibleDeliverables = deliverables.filter((del) => {
    // Must belong to this creator
    if (!matchesCreator(del, userProfile || user)) return false;

    // Must be tied to an accepted collaboration if invitations exist
    if (invitations && invitations.length > 0) {
      const matchId = del.campaignId && acceptedCampaignIds.has(del.campaignId);
      const matchTitle = del.campaignTitle && acceptedCampaignTitles.has(del.campaignTitle.trim().toLowerCase());
      return matchId || matchTitle;
    }
    return true;
  });

  // 2. STATUS FILTERING: To do, Submitted, Revision requested, Approved
  const filtered = eligibleDeliverables.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "todo") return d.status === "pending" || !d.status;
    if (statusFilter === "submitted") return d.status === "submitted" || d.status === "resubmitted";
    if (statusFilter === "revision_requested") return d.status === "revision_requested";
    if (statusFilter === "approved") return d.status === "approved";
    return true;
  });

  const todoCount = eligibleDeliverables.filter((d) => d.status === "pending" || !d.status).length;
  const inReviewCount = eligibleDeliverables.filter((d) => d.status === "submitted" || d.status === "resubmitted").length;
  const revisionCount = eligibleDeliverables.filter((d) => d.status === "revision_requested").length;
  const approvedCount = eligibleDeliverables.filter((d) => d.status === "approved").length;

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Production Deliverables</h2>
          <p style={styles.pageSubtitle}>
            Tasks assigned through your accepted brand partnerships — submit proof links, review revision requests, and confirm milestones.
          </p>
        </div>

        {/* Filter Pills: To do, Submitted, Revision requested, Approved */}
        <div style={styles.filterPills}>
          {[
            { id: "all", label: "All Deliverables", count: eligibleDeliverables.length },
            { id: "todo", label: "To do", count: todoCount, isAlert: todoCount > 0 },
            { id: "submitted", label: "Submitted", count: inReviewCount },
            { id: "revision_requested", label: "Revision requested", count: revisionCount, isWarning: revisionCount > 0 },
            { id: "approved", label: "Approved", count: approvedCount },
          ].map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: isSelected ? accent : "#ffffff",
                  color: isSelected ? "#ffffff" : "#475569",
                  borderColor: isSelected ? accent : "#cbd5e1",
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    ...styles.countBadge,
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.25)"
                      : pill.isWarning
                      ? "#fef3c7"
                      : pill.isAlert
                      ? "#eff6ff"
                      : "#f1f5f9",
                    color: isSelected
                      ? "#ffffff"
                      : pill.isWarning
                      ? "#b45309"
                      : pill.isAlert
                      ? "#1d4ed8"
                      : "#475569",
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorAlert}>
          <AlertCircle size={18} color="#b91c1c" />
          <div>
            <span style={{ fontWeight: 700, display: "block" }}>Error loading deliverables</span>
            <span style={{ fontSize: "12.5px" }}>{error}</span>
          </div>
          {onRefresh && (
            <button onClick={onRefresh} style={styles.retryBtn}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state: Skeleton Cards */}
      {loading ? (
        <div style={styles.list}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={styles.skeletonCard}>
              <div style={styles.skeletonBarWide} />
              <div style={styles.skeletonBarMedium} />
              <div style={styles.skeletonBarShort} />
            </div>
          ))}
        </div>
      ) : eligibleDeliverables.length === 0 ? (
        /* Empty state: No deliverables assigned yet */
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <CheckSquare size={30} color="#94a3b8" />
          </div>
          <h4 style={styles.emptyTitle}>No deliverables assigned yet</h4>
          <p style={styles.emptyDesc}>
            Deliverables are created by brand partners for your accepted collaborations. When you accept an invitation, assigned production tasks will appear here.
          </p>
          <div style={styles.emptyActions}>
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate("invitations")}
                  style={{ ...styles.primaryBtn, backgroundColor: accent }}
                >
                  <Mail size={13} style={{ marginRight: 6 }} />
                  View Invitations
                </button>
                <button
                  onClick={() => onNavigate("collaborations")}
                  style={styles.secondaryBtn}
                >
                  <Handshake size={13} style={{ marginRight: 6 }} />
                  My Collaborations
                </button>
              </>
            )}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state for current filter */
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <CheckSquare size={26} color="#94a3b8" />
          </div>
          <h4 style={styles.emptyTitle}>No deliverables in this filter</h4>
          <p style={styles.emptyDesc}>
            No deliverables currently match the selected status filter.
          </p>
          <button
            onClick={() => setStatusFilter("all")}
            style={{ ...styles.secondaryBtn, marginTop: 12 }}
          >
            Show All Deliverables
          </button>
        </div>
      ) : (
        /* Deliverables List */
        <div style={styles.list}>
          {filtered.map((del) => {
            const isRevision = del.status === "revision_requested";
            const isApproved = del.status === "approved";
            const isSubmitted = del.status === "submitted" || del.status === "resubmitted";
            const isPending = del.status === "pending" || !del.status;

            // Find matching invitation for extra compensation context
            const matchingInv = (invitations || []).find(
              (inv) =>
                inv.campaignId === del.campaignId ||
                inv.campaignTitle?.toLowerCase() === del.campaignTitle?.toLowerCase()
            );
            const compTerms = del.compensation || matchingInv?.compensation || "Per Agreement";
            const brandPartner = del.brandName || del.marketingName || matchingInv?.marketingName || "Brand Partner";

            const historyList = del.submissionHistory || [];

            return (
              <div
                key={del.id}
                style={{
                  ...styles.card,
                  borderColor: isRevision ? "#fde68a" : isApproved ? "#bbf7d0" : isSubmitted ? "#bfdbfe" : "#e2e8f0",
                }}
              >
                {/* Card Top: Campaign & Brand info */}
                <div style={styles.cardHeader}>
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={styles.metaRow}>
                      <span style={styles.campaignTag}>
                        {del.campaignTitle || del.campaignName || "Brand Campaign"}
                      </span>
                      <span style={styles.dotSeparator}>•</span>
                      <span style={styles.brandTag}>
                        <Building2 size={12} style={{ marginRight: 4, display: "inline" }} />
                        {brandPartner}
                      </span>
                      {del.contentType && (
                        <span style={styles.formatTag}>{del.contentType}</span>
                      )}
                    </div>
                    <h3 style={styles.delTitle}>{del.title}</h3>
                  </div>

                  {/* Status Badge & Compensation Box */}
                  <div style={styles.cardHeaderRight}>
                    {/* Compensation Badge */}
                    <div style={styles.compBox}>
                      <span style={styles.compLabel}>TERMS</span>
                      <span style={styles.compVal}>{compTerms}</span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isApproved && (
                        <span style={styles.approvedPill}>
                          <CheckCircle2 size={13} style={{ marginRight: 4 }} />
                          Reviewed & Accepted
                        </span>
                      )}
                      {del.status === "resubmitted" && (
                        <span style={styles.inReviewPill}>
                          <Clock size={13} style={{ marginRight: 4 }} />
                          Under Review (Resubmitted)
                        </span>
                      )}
                      {del.status === "submitted" && (
                        <span style={styles.inReviewPill}>
                          <Clock size={13} style={{ marginRight: 4 }} />
                          Under Review
                        </span>
                      )}
                      {isRevision && (
                        <span style={styles.revisionPill}>
                          <AlertTriangle size={13} style={{ marginRight: 4 }} />
                          Changes Requested
                        </span>
                      )}
                      {isPending && (
                        <span style={styles.pendingPill}>
                          To do • Awaiting Submission
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Requirements / Brief Box */}
                {del.requirements && (
                  <div style={styles.reqBox}>
                    <span style={styles.reqLabel}>DELIVERABLE REQUIREMENTS & TALKING POINTS:</span>
                    <p style={styles.reqText}>{del.requirements}</p>
                  </div>
                )}

                {/* Campaign Brief Toggle */}
                {del.campaignBrief && (
                  <div>
                    <button
                      onClick={() => toggleBrief(del.id)}
                      style={styles.briefToggleBtn}
                    >
                      <FileText size={13} style={{ marginRight: 5 }} />
                      <span>{expandedBriefs[del.id] ? "Hide Campaign Brief" : "Read Full Campaign Brief"}</span>
                      {expandedBriefs[del.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {expandedBriefs[del.id] && (
                      <div style={styles.briefExpandedBox}>
                        <span style={styles.briefLabel}>CAMPAIGN BRIEF:</span>
                        <p style={styles.briefText}>{del.campaignBrief}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Revision Feedback Alert Banner */}
                {isRevision && del.revisionFeedback && (
                  <div style={styles.revisionBox}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={15} color="#dc2626" />
                      <span style={styles.revisionLabel}>Brand Revision Instructions:</span>
                    </div>
                    <p style={styles.revisionText}>"{del.revisionFeedback}"</p>
                  </div>
                )}

                {/* Current Submission URL preview */}
                {del.submissionUrl && (
                  <div style={styles.submissionBox}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={styles.submissionLabel}>Current Submission Link:</span>
                      {del.submittedAt && (
                        <span style={styles.submittedDate}>
                          Submitted: {new Date(del.submittedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <a
                      href={del.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.submissionLink}
                    >
                      <ExternalLink size={12} style={{ marginRight: 5 }} />
                      {del.submissionUrl}
                    </a>
                    {del.submissionNotes && (
                      <p style={styles.notesText}>
                        <strong>Notes:</strong> {del.submissionNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Submission History Collapsible */}
                {historyList.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleHistory(del.id)}
                      style={styles.historyToggleBtn}
                    >
                      <History size={13} style={{ marginRight: 5 }} />
                      <span>
                        {expandedHistory[del.id]
                          ? `Hide Submission History (${historyList.length})`
                          : `View Submission History (${historyList.length})`}
                      </span>
                      {expandedHistory[del.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {expandedHistory[del.id] && (
                      <div style={styles.historyBox}>
                        {historyList.map((entry, idx) => (
                          <div key={idx} style={styles.historyItem}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                              <span style={{ fontWeight: 700 }}>Version #{idx + 1} ({entry.status})</span>
                              <span>{new Date(entry.submittedAt).toLocaleString()}</span>
                            </div>
                            <a
                              href={entry.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.historyLink}
                            >
                              <ExternalLink size={11} style={{ marginRight: 4 }} />
                              {entry.submissionUrl}
                            </a>
                            {entry.submissionNotes && (
                              <p style={styles.historyNotes}>"{entry.submissionNotes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer with Due Date & Action Buttons */}
                <div style={styles.cardFooter}>
                  <div style={styles.dueCol}>
                    <Calendar size={13} color="#64748b" style={{ marginRight: 5 }} />
                    <span style={styles.dueText}>
                      Due Date: <strong>{del.dueDate || "Flexible"}</strong>
                    </span>
                  </div>

                  <div>
                    {isApproved ? (
                      <span style={styles.payoutDone}>
                        <Check size={14} color="#15803d" style={{ marginRight: 4 }} />
                        Milestone Complete & Approved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenSubmit(del)}
                        style={{
                          ...styles.submitBtn,
                          backgroundColor: isRevision ? "#b45309" : accent,
                        }}
                      >
                        {isRevision ? (
                          <>
                            <RotateCcw size={13} style={{ marginRight: 6 }} />
                            Resubmit with Changes
                          </>
                        ) : isSubmitted ? (
                          <>
                            <FileCheck size={13} style={{ marginRight: 6 }} />
                            Update Submission
                          </>
                        ) : (
                          <>
                            <Send size={13} style={{ marginRight: 6 }} />
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

      {/* Content Submission Modal */}
      {modalDeliverable && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSubHeader}>
                  {modalDeliverable.campaignTitle || "Brand Campaign"} • {modalDeliverable.contentType || "Deliverable"}
                </span>
                <h3 style={styles.modalTitle}>
                  {modalDeliverable.status === "revision_requested"
                    ? "Resubmit Content with Changes"
                    : modalDeliverable.status === "submitted" || modalDeliverable.status === "resubmitted"
                    ? "Update Deliverable Submission"
                    : "Submit Deliverable for Review"}
                </h3>
                <p style={styles.modalDeliverableName}>{modalDeliverable.title}</p>
              </div>
              <button
                onClick={() => setModalDeliverable(null)}
                style={styles.modalCloseBtn}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {submitError && (
              <div style={styles.modalError}>
                <AlertTriangle size={15} color="#dc2626" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Brief and Requirements Reference */}
            <div style={styles.modalBriefBox}>
              <span style={styles.modalBriefLabel}>BRIEF & SUBMISSION REQUIREMENTS:</span>
              <p style={styles.modalBriefText}>
                {modalDeliverable.requirements || modalDeliverable.campaignBrief || "Ensure all campaign guidelines, talking points, and brand disclosures are included."}
              </p>
            </div>

            {/* Revision feedback alert if applicable */}
            {modalDeliverable.status === "revision_requested" && modalDeliverable.revisionFeedback && (
              <div style={styles.modalRevisionNotice}>
                <AlertTriangle size={14} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={styles.modalRevisionTitle}>Brand revision request:</span>
                  <p style={styles.modalRevisionText}>"{modalDeliverable.revisionFeedback}"</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.modalForm}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Public Content URL <span style={{ color: "#dc2626" }}>*</span>:
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or TikTok/Drive/Loom/Reel link"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  style={styles.input}
                  required
                />
                <span style={styles.fieldHint}>
                  Supported: YouTube, TikTok, Instagram Reel/Post, Twitch, Google Drive, Dropbox, Loom, LinkedIn.
                </span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Submission Notes & Timestamps (Optional):</label>
                <textarea
                  rows={3}
                  placeholder="e.g., Mid-roll integration at 03:15, verified coupon code display in description, engagement metrics link..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              {/* Security & review note */}
              <div style={styles.storageNote}>
                <span>
                  ℹ️ Note: Submitting marks this deliverable as <strong>Under Review</strong>. The brand team will inspect your link and either approve or request revisions.
                </span>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setModalDeliverable(null)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...styles.primaryBtn,
                    backgroundColor: modalDeliverable.status === "revision_requested" ? "#b45309" : accent,
                  }}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : modalDeliverable.status === "revision_requested"
                    ? "Resubmit for Review"
                    : "Send to Brand for Review"}
                </button>
              </div>
            </form>
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
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
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
    zIndex: 1100,
  },
  errorAlert: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#b91c1c",
  },
  retryBtn: {
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterPills: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "12.5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  countBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "10px",
  },
  skeletonCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  skeletonBarWide: {
    height: "20px",
    width: "60%",
    backgroundColor: "#f1f5f9",
    borderRadius: "4px",
  },
  skeletonBarMedium: {
    height: "14px",
    width: "40%",
    backgroundColor: "#f1f5f9",
    borderRadius: "4px",
  },
  skeletonBarShort: {
    height: "14px",
    width: "80%",
    backgroundColor: "#f8fafc",
    borderRadius: "4px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  emptyIconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px",
  },
  emptyDesc: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "460px",
    margin: "6px auto 0",
    lineHeight: "1.5",
  },
  emptyActions: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "22px 24px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "4px",
  },
  campaignTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0284c7",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  dotSeparator: {
    color: "#cbd5e1",
    fontSize: "12px",
  },
  brandTag: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
  },
  formatTag: {
    fontSize: "10.5px",
    fontWeight: "600",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  delTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "2px 0 0",
  },
  cardHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  compBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "4px 10px",
    textAlign: "right",
  },
  compLabel: {
    fontSize: "9px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
  },
  compVal: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#15803d",
    display: "block",
  },
  approvedPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "14px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "11.5px",
    fontWeight: "700",
  },
  inReviewPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "14px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: "11.5px",
    fontWeight: "700",
  },
  revisionPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "14px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#b45309",
    fontSize: "11.5px",
    fontWeight: "700",
  },
  pendingPill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "11.5px",
    fontWeight: "600",
  },
  reqBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    padding: "12px 14px",
    border: "1px solid #f1f5f9",
  },
  reqLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: "3px",
  },
  reqText: {
    fontSize: "12.5px",
    color: "#334155",
    lineHeight: "1.45",
    margin: 0,
  },
  briefToggleBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 0",
  },
  briefExpandedBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    marginTop: "6px",
  },
  briefLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
    marginBottom: "2px",
  },
  briefText: {
    fontSize: "12px",
    color: "#334155",
    lineHeight: "1.45",
    margin: 0,
  },
  revisionBox: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "10px",
    padding: "12px 16px",
  },
  revisionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#be123c",
  },
  revisionText: {
    fontSize: "12.5px",
    color: "#9f1239",
    fontStyle: "italic",
    lineHeight: "1.45",
    margin: 0,
  },
  submissionBox: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "10px",
    padding: "12px 16px",
  },
  submissionLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0369a1",
  },
  submittedDate: {
    fontSize: "11px",
    color: "#64748b",
  },
  submissionLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    color: "#0284c7",
    fontWeight: "600",
    textDecoration: "underline",
    wordBreak: "break-all",
    marginTop: "4px",
  },
  notesText: {
    fontSize: "12px",
    color: "#475569",
    marginTop: "6px",
    margin: "6px 0 0",
  },
  historyToggleBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 0",
  },
  historyBox: {
    marginTop: "6px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#fafafa",
  },
  historyItem: {
    padding: "8px 12px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "11.5px",
  },
  historyLink: {
    display: "inline-flex",
    alignItems: "center",
    color: "#0284c7",
    textDecoration: "underline",
    marginTop: "2px",
  },
  historyNotes: {
    color: "#475569",
    fontStyle: "italic",
    margin: "3px 0 0",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "12px",
    flexWrap: "wrap",
    gap: "10px",
  },
  dueCol: {
    display: "flex",
    alignItems: "center",
  },
  dueText: {
    fontSize: "12px",
    color: "#64748b",
  },
  payoutDone: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "700",
    color: "#15803d",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    color: "#ffffff",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    maxWidth: "540px",
    width: "100%",
    boxShadow: "0 24px 40px rgba(0, 0, 0, 0.16)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalSubHeader: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "2px 0 0",
  },
  modalDeliverableName: {
    fontSize: "12.5px",
    color: "#64748b",
    margin: "2px 0 0",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    padding: "6px",
    cursor: "pointer",
    color: "#64748b",
  },
  modalError: {
    backgroundColor: "#fef2f2",
    borderLeft: "3px solid #dc2626",
    padding: "10px 18px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12.5px",
    color: "#b91c1c",
  },
  modalBriefBox: {
    backgroundColor: "#f8fafc",
    padding: "12px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalBriefLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
    marginBottom: "3px",
  },
  modalBriefText: {
    fontSize: "12px",
    color: "#334155",
    lineHeight: "1.45",
    margin: 0,
  },
  modalRevisionNotice: {
    backgroundColor: "#fffbeb",
    borderBottom: "1px solid #fde68a",
    padding: "12px 24px",
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },
  modalRevisionTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#b45309",
    textTransform: "uppercase",
    display: "block",
  },
  modalRevisionText: {
    fontSize: "12px",
    color: "#92400e",
    fontStyle: "italic",
    margin: "2px 0 0",
  },
  modalForm: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  fieldHint: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  textarea: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
  },
  storageNote: {
    backgroundColor: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#64748b",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "6px",
  },
  primaryBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    color: "#ffffff",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
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
    display: "inline-flex",
    alignItems: "center",
  },
};

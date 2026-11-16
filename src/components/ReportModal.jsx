import React, { useState } from "react";
import {
  ShieldAlert,
  X,
  AlertCircle,
  CheckCircle2,
  Send,
  Lock,
  Flag,
} from "lucide-react";
import { REPORT_CATEGORIES, submitReport } from "../admin/moderationService";

export default function ReportModal({
  isOpen,
  onClose,
  targetType = "campaign",
  targetId = "",
  targetTitle = "",
  currentUser,
  onSuccess,
}) {
  const [category, setCategory] = useState(
    targetType === "campaign" ? "fraud" : "impersonation"
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentUser) {
      setError("You must be logged in to file a report.");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Please provide a detailed explanation (minimum 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        reporterUser: currentUser,
        category,
        targetType,
        targetId,
        targetTitle,
        reason: reason.trim(),
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        setReason("");
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <div style={styles.iconBadge}>
              <Flag size={18} color="#dc2626" />
            </div>
            <div>
              <h3 style={styles.title}>Submit Trust & Safety Report</h3>
              <p style={styles.subtitle}>
                Confidential report submitted directly to CreatorIQ Platform Moderation
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIconWrap}>
              <CheckCircle2 size={40} color="#15803d" />
            </div>
            <h4 style={styles.successTitle}>Report Submitted Successfully</h4>
            <p style={styles.successText}>
              Thank you for helping keep CreatorIQ secure. Your report has been dispatched to our Trust & Safety queue. We review all violation submissions within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.body}>
            {/* Target Context Summary */}
            <div style={styles.targetContext}>
              <span style={styles.targetLabel}>Report Target:</span>
              <div style={styles.targetCard}>
                <span style={styles.targetTypeBadge}>{targetType.toUpperCase()}</span>
                <span style={styles.targetTitleText}>{targetTitle || targetId}</span>
              </div>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={16} color="#b91c1c" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Category Select */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Violation Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.select}
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Reason */}
            <div style={styles.formGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label}>Detailed Explanation & Evidence</label>
                <span style={styles.charCount}>
                  {reason.trim().length}/10 min chars
                </span>
              </div>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what occurred, any specific misleading claims, harmful behavior, or links to violation evidence..."
                style={styles.textarea}
                required
              />
            </div>

            {/* Reporter Attestation */}
            <div style={styles.attestationBox}>
              <Lock size={13} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={styles.attestationText}>
                Submitting as <strong>{currentUser?.displayName || currentUser?.fullName || "Verified User"}</strong> ({currentUser?.email}). Your identity is protected from the reported party. False reports are subject to account penalties.
              </span>
            </div>

            {/* Footer Buttons */}
            <div style={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || reason.trim().length < 10}
                style={{
                  ...styles.submitBtn,
                  opacity: submitting || reason.trim().length < 10 ? 0.6 : 1,
                  cursor: submitting || reason.trim().length < 10 ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? (
                  <span>Submitting Report...</span>
                ) : (
                  <>
                    <Send size={14} style={{ marginRight: 6 }} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "540px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    animation: "fadeIn 0.2s ease-out",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  headerTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBadge: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#64748b",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  targetContext: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  targetLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  targetCard: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    overflow: "hidden",
  },
  targetTypeBadge: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  targetTitleText: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#b91c1c",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  charCount: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  attestationBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 12px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  attestationText: {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
  },
  successBox: {
    padding: "40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  successIconWrap: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  successTitle: {
    margin: "0 0 8px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  successText: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.5",
    maxWidth: "400px",
  },
};

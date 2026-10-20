import { useState } from "react";
import { X, CheckSquare, AlertCircle } from "lucide-react";

const CONTENT_TYPES = [
  "YouTube Video",
  "TikTok Short",
  "Instagram Reel",
  "Instagram Story Series",
  "Twitch Stream",
  "LinkedIn Article",
  "Podcast Audio Mention",
];

export default function DeliverableFormModal({
  isOpen,
  onClose,
  onSubmit,
  campaign,
  invitation,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  const [contentType, setContentType] = useState("YouTube Video");
  const [title, setTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please enter a deliverable title.");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        campaignId: campaign.id,
        creatorId: invitation.creatorId,
        creatorName: invitation.creatorName,
        creatorEmail: invitation.creatorEmail,
        contentType,
        title: title.trim(),
        requirements: requirements.trim(),
        dueDate,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create deliverable.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...styles.iconWrap, backgroundColor: "#f0f9ff" }}>
              <CheckSquare size={18} color={accent} />
            </div>
            <div>
              <h3 style={styles.title}>Assign Campaign Deliverable</h3>
              <p style={styles.subtitle}>
                Creator: <strong>{invitation.creatorName}</strong> • {campaign.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Content Format / Platform Type:</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={styles.select}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Deliverable Title <span style={{ color: "#dc2626" }}>*</span>:
            </label>
            <input
              type="text"
              placeholder="e.g. 60s Dedicated Mid-roll Integration & Product Walkthrough"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Due Date <span style={{ color: "#dc2626" }}>*</span>:
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Specific Requirements & Briefing Notes:</label>
            <textarea
              rows={4}
              placeholder="Provide exact talking points, call to action, UTM tracking links, hashtag requirements, and production standards..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              style={styles.textarea}
            />
          </div>

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
              disabled={submitting}
              style={{ ...styles.submitBtn, backgroundColor: accent }}
            >
              {submitting ? "Assigning..." : "Assign Deliverable"}
            </button>
          </div>
        </form>
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  iconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #bae6fd",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  form: {
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
  select: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
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
  footer: {
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

import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Info,
  ShieldAlert,
  Clock,
  Users,
  X,
  Send,
  Ban,
} from "lucide-react";
import {
  fetchAllAnnouncements,
  publishAnnouncement,
  deactivateAnnouncement,
} from "../announcementService";

const PRIORITY_OPTIONS = [
  { value: "info", label: "Info — General notice", color: "#2563eb", bg: "#eff6ff" },
  { value: "warning", label: "Warning — Platform change ahead", color: "#d97706", bg: "#fffbeb" },
  { value: "critical", label: "Critical — Urgent system alert", color: "#dc2626", bg: "#fef2f2" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "All signed-in users" },
  { value: "Creator", label: "Creators only" },
  { value: "Marketing Team", label: "Marketing Teams (Brands) only" },
  { value: "Agency", label: "Agencies only" },
];

export default function AdminAnnouncementsView({ user, userProfile, theme }) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Compose panel
  const [showCompose, setShowCompose] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composePriority, setComposePriority] = useState("info");
  const [composeTargetRole, setComposeTargetRole] = useState("all");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  // Deactivate modal
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAllAnnouncements();
      setAnnouncements(list);
    } catch (err) {
      console.warn("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter === "ALL") return true;
    return a.status === statusFilter;
  });

  const handlePublish = async (e) => {
    e.preventDefault();
    setPublishError("");
    setPublishing(true);
    try {
      await publishAnnouncement({
        adminUser: {
          uid: user?.uid,
          email: user?.email,
          displayName: userProfile?.fullName || user?.displayName || "Admin",
          fullName: userProfile?.fullName || user?.displayName || "Admin",
          role: "Admin",
        },
        title: composeTitle,
        message: composeMessage,
        priority: composePriority,
        targetRole: composeTargetRole,
      });
      setShowCompose(false);
      setComposeTitle("");
      setComposeMessage("");
      setComposePriority("info");
      setComposeTargetRole("all");
      loadAnnouncements();
    } catch (err) {
      setPublishError(err.message || "Failed to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeactivate = async (e) => {
    e.preventDefault();
    if (!deactivateReason.trim()) {
      setDeactivateError("A justification reason is required to deactivate a published announcement.");
      return;
    }
    setDeactivating(true);
    setDeactivateError("");
    try {
      await deactivateAnnouncement({
        adminUser: {
          uid: user?.uid,
          email: user?.email,
          displayName: userProfile?.fullName || user?.displayName || "Admin",
          role: "Admin",
        },
        announcementId: deactivateTarget.id,
        reason: deactivateReason.trim(),
      });
      setDeactivateTarget(null);
      setDeactivateReason("");
      loadAnnouncements();
    } catch (err) {
      setDeactivateError(err.message || "Failed to deactivate announcement.");
    } finally {
      setDeactivating(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "critical": return <ShieldAlert size={14} color="#dc2626" />;
      case "warning": return <AlertTriangle size={14} color="#d97706" />;
      default: return <Info size={14} color="#2563eb" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const opt = PRIORITY_OPTIONS.find((o) => o.value === priority) || PRIORITY_OPTIONS[0];
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: opt.color,
          backgroundColor: opt.bg,
          padding: "2px 8px",
          borderRadius: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {getPriorityIcon(priority)}
        {priority}
      </span>
    );
  };

  const activeCount = announcements.filter((a) => a.status === "active").length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <Megaphone size={24} color={accent} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Platform Announcements</h1>
              {activeCount > 0 && (
                <span style={styles.activeBadge}>{activeCount} LIVE</span>
              )}
            </div>
            <p style={styles.subtitle}>
              Broadcast official platform announcements to all or specific user roles. Published announcements appear as a dismissible banner in each portal.
            </p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button onClick={loadAnnouncements} style={styles.secondaryBtn}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCompose(true)}
            style={{ ...styles.primaryBtn, backgroundColor: accent }}
          >
            <Plus size={15} />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* Governance Note */}
      <div style={styles.govCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Info size={17} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
            All announcement content is <strong>rendered as safe plain text</strong> — arbitrary HTML is not executed. Each publish and deactivation action is committed to the platform audit ledger. Announcements are shown once per session per user with a permanent dismissal option.
          </p>
        </div>
      </div>

      {/* Compose Announcement Form */}
      {showCompose && (
        <div style={styles.composeCard}>
          <div style={styles.composeHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Send size={18} color={accent} />
              <h3 style={styles.composeTitle}>Compose & Publish Announcement</h3>
            </div>
            <button onClick={() => setShowCompose(false)} style={styles.closeBtn}>
              <X size={16} color="#64748b" />
            </button>
          </div>

          <form onSubmit={handlePublish} style={styles.composeForm}>
            {publishError && (
              <div style={styles.errorBox}>
                <AlertTriangle size={14} color="#b91c1c" />
                <span>{publishError}</span>
              </div>
            )}

            <div style={styles.formRow}>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.formLabel}>Title <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Scheduled maintenance window 2026-10-25"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priority Level</label>
                <select
                  value={composePriority}
                  onChange={(e) => setComposePriority(e.target.value)}
                  style={styles.select}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Target Audience</label>
                <select
                  value={composeTargetRole}
                  onChange={(e) => setComposeTargetRole(e.target.value)}
                  style={styles.select}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Message Body <span style={{ color: "#dc2626" }}>*</span></label>
              <textarea
                required
                maxLength={500}
                rows={3}
                placeholder="Write a clear, concise message. HTML tags are stripped before display."
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                style={styles.textarea}
              />
              <span style={styles.charCount}>{composeMessage.length}/500</span>
            </div>

            {/* Live Preview */}
            {(composeTitle || composeMessage) && (
              <div style={styles.previewBox}>
                <span style={styles.previewLabel}>LIVE PREVIEW</span>
                <div
                  style={{
                    ...styles.previewBanner,
                    backgroundColor:
                      composePriority === "critical"
                        ? "#fef2f2"
                        : composePriority === "warning"
                        ? "#fffbeb"
                        : "#eff6ff",
                    borderColor:
                      composePriority === "critical"
                        ? "#fecaca"
                        : composePriority === "warning"
                        ? "#fde68a"
                        : "#bfdbfe",
                    color:
                      composePriority === "critical"
                        ? "#991b1b"
                        : composePriority === "warning"
                        ? "#92400e"
                        : "#1e40af",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {getPriorityIcon(composePriority)}
                    <strong>{composeTitle || "Your title here..."}</strong>
                    {composeMessage && <span style={{ opacity: 0.85 }}>• {composeMessage}</span>}
                  </div>
                  <div style={styles.previewAudience}>
                    <Users size={11} />
                    <span>→ {ROLE_OPTIONS.find(o => o.value === composeTargetRole)?.label}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.composeActions}>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                style={{ ...styles.publishBtn, backgroundColor: accent }}
              >
                <Send size={14} />
                <span>{publishing ? "Publishing..." : "Publish Announcement"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <span style={styles.filterLabel}>Filter by status:</span>
        {["ALL", "active", "inactive"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              ...styles.filterChip,
              backgroundColor: statusFilter === s ? accent : "#ffffff",
              color: statusFilter === s ? "#ffffff" : "#475569",
              borderColor: statusFilter === s ? accent : "#e2e8f0",
              fontWeight: statusFilter === s ? 700 : 500,
            }}
          >
            {s === "ALL" ? "All" : s === "active" ? "Live" : "Deactivated"}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div style={styles.listCard}>
        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={24} color="#64748b" />
            <span style={styles.emptyTitle}>Loading announcements...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div style={styles.emptyState}>
            <Megaphone size={32} color="#94a3b8" />
            <span style={styles.emptyTitle}>No announcements yet</span>
            <span style={styles.emptyDesc}>
              {statusFilter === "ALL"
                ? "Click 'New Announcement' above to broadcast a platform-wide message."
                : `No ${statusFilter} announcements found.`}
            </span>
          </div>
        ) : (
          <div style={styles.announcementList}>
            {filteredAnnouncements.map((a) => (
              <div key={a.id} style={styles.announcementRow}>
                <div style={styles.announcementLeft}>
                  <div style={styles.announcementMeta}>
                    {getPriorityBadge(a.priority || "info")}
                    <span
                      style={{
                        ...styles.statusPill,
                        backgroundColor: a.status === "active" ? "#dcfce7" : "#f1f5f9",
                        color: a.status === "active" ? "#15803d" : "#64748b",
                      }}
                    >
                      {a.status === "active" ? "● Live" : "○ Deactivated"}
                    </span>
                    <span style={styles.audienceTag}>
                      <Users size={11} color="#64748b" />
                      <span>{a.targetRole === "all" ? "All Users" : a.targetRole}</span>
                    </span>
                  </div>
                  <h4 style={styles.announcementTitle}>{a.title}</h4>
                  <p style={styles.announcementMessage}>{a.message}</p>
                  <div style={styles.announcementFooter}>
                    <span style={styles.footerItem}>
                      <Clock size={12} color="#94a3b8" />
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : "Unknown date"}
                    </span>
                    <span style={styles.footerItem}>
                      by {a.createdByName || "Admin"}
                    </span>
                    {a.deactivationReason && (
                      <span style={styles.footerItem} title={a.deactivationReason}>
                        Reason: "{a.deactivationReason}"
                      </span>
                    )}
                  </div>
                </div>

                <div style={styles.announcementActions}>
                  {a.status === "active" && (
                    <button
                      onClick={() => { setDeactivateTarget(a); setDeactivateReason(""); setDeactivateError(""); }}
                      style={styles.deactivateBtn}
                    >
                      <Ban size={13} />
                      <span>Deactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deactivate Modal */}
      {deactivateTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIcon, backgroundColor: "#fef3c7" }}>
                  <Ban size={18} color="#d97706" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Deactivate Announcement</h3>
                  <span style={styles.modalSub}>"{deactivateTarget.title}"</span>
                </div>
              </div>
              <button onClick={() => setDeactivateTarget(null)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDeactivate} style={styles.modalForm}>
              {deactivateError && (
                <div style={styles.errorBox}>
                  <AlertTriangle size={14} color="#b91c1c" />
                  <span>{deactivateError}</span>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Deactivation Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Maintenance window completed, issue resolved..."
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  style={styles.textarea}
                />
                <span style={styles.helpText}>
                  Required — committed to the audit log and stored with the announcement record.
                </span>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setDeactivateTarget(null)}
                  style={styles.cancelBtn}
                  disabled={deactivating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.deactivateSubmitBtn}
                  disabled={deactivating}
                >
                  {deactivating ? "Processing..." : "Confirm Deactivation"}
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
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxSizing: "border-box",
  },
  headerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: "24px 28px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
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
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  activeBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#059669",
    backgroundColor: "#d1fae5",
    padding: "3px 8px",
    borderRadius: "6px",
    letterSpacing: "0.04em",
  },
  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
  },
  govCard: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "14px 18px",
  },
  composeCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
  },
  composeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  composeTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  composeForm: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  formLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  input: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    color: "#0f172a",
  },
  select: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box",
  },
  charCount: {
    fontSize: "11px",
    color: "#94a3b8",
    textAlign: "right",
  },
  previewBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
  },
  previewLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.05em",
    marginBottom: "8px",
  },
  previewBanner: {
    borderRadius: "8px",
    border: "1px solid",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "13px",
    gap: "8px",
    flexWrap: "wrap",
  },
  previewAudience: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    opacity: 0.7,
  },
  composeActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "4px",
  },
  cancelBtn: {
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  publishBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    padding: "9px 18px",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#64748b",
  },
  filterChip: {
    padding: "5px 14px",
    borderRadius: "20px",
    border: "1px solid",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  listCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  announcementList: {
    display: "flex",
    flexDirection: "column",
  },
  announcementRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
    gap: "16px",
    flexWrap: "wrap",
  },
  announcementLeft: {
    flex: 1,
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  announcementMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  statusPill: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "4px",
  },
  audienceTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  announcementTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  announcementMessage: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
  },
  announcementFooter: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  footerItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    color: "#94a3b8",
  },
  announcementActions: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    flexShrink: 0,
    paddingTop: "4px",
  },
  deactivateBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
    padding: "7px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyState: {
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#475569",
  },
  emptyDesc: {
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#991b1b",
  },
  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  modalForm: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  helpText: {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  modalActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
  },
  deactivateSubmitBtn: {
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#d97706",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

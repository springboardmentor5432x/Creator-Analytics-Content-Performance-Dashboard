import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Lock,
  Send,
  Flag,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  REPORT_CATEGORIES,
  fetchAllReports,
  updateReportStatus,
  addInternalModerationNote,
  executeModerationAction,
} from "../moderationService";

export default function AdminReportsModerationView({
  user,
  userProfile,
  theme,
  onNavigateToCampaigns,
  onNavigateToUsers,
}) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Selected report for detail/moderation modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Resolution / Action modal state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    actionType: "", // 'resolve' | 'dismiss' | 'suspend_user' | 'restrict_campaign' | 'warn_user'
    title: "",
    confirmPrompt: "",
    reason: "",
    submitting: false,
    error: "",
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchAllReports();
      setReports(data || []);
      if (selectedReport) {
        const refreshed = data.find((r) => r.id === selectedReport.id);
        if (refreshed) setSelectedReport(refreshed);
      }
    } catch (err) {
      console.warn("Could not load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id?.toLowerCase().includes(q) ||
        r.targetId?.toLowerCase().includes(q) ||
        r.targetTitle?.toLowerCase().includes(q) ||
        r.reporterEmail?.toLowerCase().includes(q) ||
        r.reporterName?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;

      let matchesDate = true;
      if (dateFilter !== "ALL" && r.createdAt) {
        const itemTime = new Date(r.createdAt).getTime();
        const now = Date.now();
        if (dateFilter === "today") {
          matchesDate = now - itemTime < 24 * 60 * 60 * 1000;
        } else if (dateFilter === "last_7d") {
          matchesDate = now - itemTime < 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === "last_30d") {
          matchesDate = now - itemTime < 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [reports, searchQuery, statusFilter, categoryFilter, dateFilter]);

  // Status metrics
  const metrics = useMemo(() => {
    return {
      total: reports.length,
      open: reports.filter((r) => r.status === "open").length,
      underReview: reports.filter((r) => r.status === "under_review").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      dismissed: reports.filter((r) => r.status === "dismissed").length,
    };
  }, [reports]);

  // Handlers
  const handleMarkUnderReview = async (report) => {
    try {
      await updateReportStatus({
        adminUser: userProfile || user,
        reportId: report.id,
        newStatus: "under_review",
        reason: "Review initiated by platform administrator",
      });
      await loadReports();
    } catch (err) {
      alert(err.message || "Could not update status.");
    }
  };

  const handleOpenActionModal = (actionType) => {
    let title = "";
    let confirmPrompt = "";
    if (actionType === "resolve") {
      title = "Resolve Report";
      confirmPrompt = "Provide a resolution reason explaining the outcome.";
    } else if (actionType === "dismiss") {
      title = "Dismiss Report";
      confirmPrompt = "Provide a dismissal reason (e.g. invalid claim, no violation found).";
    } else if (actionType === "suspend_user") {
      title = "Confirm Target Account Suspension";
      confirmPrompt = `Are you sure you want to suspend account "${selectedReport.targetTitle}"? This will block login and all protected operations.`;
    } else if (actionType === "restrict_campaign") {
      title = "Confirm Campaign Restriction";
      confirmPrompt = `Are you sure you want to restrict campaign "${selectedReport.targetTitle}"? It will be removed from creator discovery.`;
    } else if (actionType === "warn_user") {
      title = "Issue Official Policy Warning";
      confirmPrompt = `Send an official Trust & Safety warning notice to "${selectedReport.targetTitle}".`;
    }

    setActionModal({
      isOpen: true,
      actionType,
      title,
      confirmPrompt,
      reason: "",
      submitting: false,
      error: "",
    });
  };

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!actionModal.reason || !actionModal.reason.trim()) {
      setActionModal((prev) => ({ ...prev, error: "A justification reason is required." }));
      return;
    }

    setActionModal((prev) => ({ ...prev, submitting: true, error: "" }));

    try {
      const adminActor = userProfile || user;

      if (actionModal.actionType === "resolve") {
        await updateReportStatus({
          adminUser: adminActor,
          reportId: selectedReport.id,
          newStatus: "resolved",
          reason: actionModal.reason.trim(),
        });
      } else if (actionModal.actionType === "dismiss") {
        await updateReportStatus({
          adminUser: adminActor,
          reportId: selectedReport.id,
          newStatus: "dismissed",
          reason: actionModal.reason.trim(),
        });
      } else if (
        actionModal.actionType === "suspend_user" ||
        actionModal.actionType === "restrict_campaign" ||
        actionModal.actionType === "warn_user"
      ) {
        await executeModerationAction({
          adminUser: adminActor,
          report: selectedReport,
          actionType: actionModal.actionType,
          reason: actionModal.reason.trim(),
        });
      }

      await loadReports();
      setActionModal({
        isOpen: false,
        actionType: "",
        title: "",
        confirmPrompt: "",
        reason: "",
        submitting: false,
        error: "",
      });
    } catch (err) {
      setActionModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || "Failed to execute moderation action.",
      }));
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedReport) return;
    setAddingNote(true);
    try {
      await addInternalModerationNote({
        adminUser: userProfile || user,
        reportId: selectedReport.id,
        noteText: newNoteText.trim(),
      });
      setNewNoteText("");
      await loadReports();
    } catch (err) {
      alert(err.message || "Could not add internal note.");
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "Open" };
      case "under_review":
        return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Under Review" };
      case "resolved":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", label: "Resolved" };
      case "dismissed":
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: "Dismissed" };
      default:
        return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", label: status };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: "#fee2e2" }}>
            <ShieldAlert size={24} color="#dc2626" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Reports & Content Moderation</h1>
              <span style={styles.realDataBadge}>REAL DATABASE QUEUE</span>
            </div>
            <p style={styles.subtitle}>
              Review user violation reports, investigate misleading campaigns or impersonators, and execute reversible moderation actions backed by immutable audit logs.
            </p>
          </div>
        </div>

        <button onClick={loadReports} style={styles.refreshBtn} title="Refresh reports list">
          <RefreshCw size={15} color="#334155" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total Filed Reports</span>
          <span style={styles.metricValue}>{metrics.total}</span>
          <span style={styles.metricSub}>All submitted tickets</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Pending Action (Open)</span>
          <span style={{ ...styles.metricValue, color: "#b45309" }}>{metrics.open}</span>
          <span style={styles.metricSub}>Awaiting admin review</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Under Review</span>
          <span style={{ ...styles.metricValue, color: "#1d4ed8" }}>{metrics.underReview}</span>
          <span style={styles.metricSub}>Active investigation</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Resolved Violations</span>
          <span style={{ ...styles.metricValue, color: "#15803d" }}>{metrics.resolved}</span>
          <span style={styles.metricSub}>Enforced or cleared</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Dismissed Claims</span>
          <span style={{ ...styles.metricValue, color: "#64748b" }}>{metrics.dismissed}</span>
          <span style={styles.metricSub}>No violation detected</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by target, reporter email, ID, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Statuses ({reports.length})</option>
              <option value="open">Open ({metrics.open})</option>
              <option value="under_review">Under Review ({metrics.underReview})</option>
              <option value="resolved">Resolved ({metrics.resolved})</option>
              <option value="dismissed">Dismissed ({metrics.dismissed})</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Categories</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Date:</label>
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

      {/* Reports Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner}></div>
            <span>Loading moderation records...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={styles.emptyBox}>
            <CheckCircle2 size={36} color="#15803d" />
            <h3 style={styles.emptyTitle}>
              {reports.length === 0
                ? "Moderation Queue Is Empty"
                : "No Reports Match Current Filters"}
            </h3>
            <p style={styles.emptyText}>
              {reports.length === 0
                ? "Zero violation reports have been submitted. Users can report suspicious accounts or misleading campaigns from the creator and marketing portals."
                : "Try resetting your search query or selecting a different status/category filter."}
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Report & Category</th>
                  <th style={styles.th}>Reported Target</th>
                  <th style={styles.th}>Reporter</th>
                  <th style={styles.th}>Filed Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.thAction}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const badge = getStatusBadge(report.status);
                  const isUserTarget = report.targetType === "user";
                  return (
                    <tr key={report.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={styles.reportId}>{report.id}</span>
                          <span style={styles.catLabel}>{report.categoryLabel || report.category}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              ...styles.targetTypeBadge,
                              backgroundColor: isUserTarget ? "#eef2ff" : "#fef3c7",
                              color: isUserTarget ? "#4338ca" : "#92400e",
                            }}
                          >
                            {report.targetType.toUpperCase()}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={styles.targetTitle}>{report.targetTitle}</span>
                            <span style={styles.targetSub}>{report.targetId}</span>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={styles.reporterName}>{report.reporterName}</span>
                          <span style={styles.reporterEmail}>{report.reporterEmail}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: "12px" }}>
                          <MessageSquare size={13} />
                          <span>{report.internalNotes?.length || 0}</span>
                        </div>
                      </td>

                      <td style={styles.tdAction}>
                        <button
                          onClick={() => setSelectedReport(report)}
                          style={styles.reviewBtn}
                        >
                          <Eye size={13} style={{ marginRight: 5 }} />
                          <span>Review</span>
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

      {/* Report Review & Detail Modal */}
      {selectedReport && (
        <div style={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIconWrap, backgroundColor: "#fee2e2" }}>
                  <Flag size={20} color="#dc2626" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={styles.modalTitle}>Report #{selectedReport.id}</h3>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getStatusBadge(selectedReport.status),
                      }}
                    >
                      {selectedReport.status.toUpperCase()}
                    </span>
                  </div>
                  <span style={styles.modalSubtitle}>
                    Filed {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <button onClick={() => setSelectedReport(null)} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div style={styles.modalBody}>
              {/* Target & Reporter Strip */}
              <div style={styles.contextStrip}>
                <div style={styles.contextCol}>
                  <span style={styles.colLabel}>Reported Target</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={styles.targetTypeBadge}>{selectedReport.targetType.toUpperCase()}</span>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                      {selectedReport.targetTitle}
                    </strong>
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    ID: {selectedReport.targetId}
                  </span>
                </div>

                <div style={styles.contextCol}>
                  <span style={styles.colLabel}>Reporter Attribution</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginTop: 4 }}>
                    {selectedReport.reporterName} ({selectedReport.reporterRole})
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedReport.reporterEmail}
                  </span>
                </div>

                <div style={styles.contextCol}>
                  <span style={styles.colLabel}>Violation Category</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#b91c1c", marginTop: 4 }}>
                    {selectedReport.categoryLabel || selectedReport.category}
                  </span>
                </div>
              </div>

              {/* Reported Reason / Evidence */}
              <div style={styles.sectionBlock}>
                <h4 style={styles.blockTitle}>Report Details & Evidence</h4>
                <div style={styles.reasonCard}>
                  <p style={styles.reasonText}>{selectedReport.reason}</p>
                </div>
              </div>

              {/* Resolution Info if already closed */}
              {(selectedReport.status === "resolved" || selectedReport.status === "dismissed") && (
                <div
                  style={{
                    ...styles.resolutionBanner,
                    backgroundColor: selectedReport.status === "resolved" ? "#f0fdf4" : "#f8fafc",
                    borderColor: selectedReport.status === "resolved" ? "#bbf7d0" : "#e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    {selectedReport.status === "resolved" ? (
                      <CheckCircle2 size={16} color="#15803d" />
                    ) : (
                      <XCircle size={16} color="#64748b" />
                    )}
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                      Case {selectedReport.status === "resolved" ? "Resolved" : "Dismissed"}
                    </strong>
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#334155" }}>
                    <strong>Reason:</strong> {selectedReport.resolutionReason || "Action completed"}
                  </p>
                  {selectedReport.actionTaken && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#15803d" }}>
                      <strong>Enforced Action:</strong> {selectedReport.actionTaken}
                    </p>
                  )}
                </div>
              )}

              {/* Moderation Controls (when open or under_review) */}
              {selectedReport.status !== "resolved" && selectedReport.status !== "dismissed" && (
                <div style={styles.sectionBlock}>
                  <h4 style={styles.blockTitle}>Moderation Decisions & Status Actions</h4>
                  <div style={styles.actionButtonGroup}>
                    {selectedReport.status === "open" && (
                      <button
                        onClick={() => handleMarkUnderReview(selectedReport)}
                        style={styles.actionBtnSecondary}
                      >
                        <Clock size={14} style={{ marginRight: 6 }} />
                        <span>Mark Under Review</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenActionModal("resolve")}
                      style={styles.actionBtnSuccess}
                    >
                      <CheckCircle2 size={14} style={{ marginRight: 6 }} />
                      <span>Resolve Without Penalty</span>
                    </button>

                    <button
                      onClick={() => handleOpenActionModal("dismiss")}
                      style={styles.actionBtnNeutral}
                    >
                      <XCircle size={14} style={{ marginRight: 6 }} />
                      <span>Dismiss Report</span>
                    </button>
                  </div>

                  {/* Impactful Moderation Actions */}
                  <div style={styles.impactfulActionsCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <AlertTriangle size={15} color="#b91c1c" />
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b" }}>
                        ENFORCEMENT ACTIONS (AUDIT LOGGED)
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {selectedReport.targetType === "user" && (
                        <>
                          <button
                            onClick={() => handleOpenActionModal("suspend_user")}
                            style={styles.dangerActionBtn}
                          >
                            <Lock size={13} style={{ marginRight: 6 }} />
                            <span>Suspend Target User</span>
                          </button>
                          <button
                            onClick={() => handleOpenActionModal("warn_user")}
                            style={styles.warningActionBtn}
                          >
                            <AlertCircle size={13} style={{ marginRight: 6 }} />
                            <span>Issue Official Warning</span>
                          </button>
                        </>
                      )}

                      {selectedReport.targetType === "campaign" && (
                        <button
                          onClick={() => handleOpenActionModal("restrict_campaign")}
                          style={styles.dangerActionBtn}
                        >
                          <Lock size={13} style={{ marginRight: 6 }} />
                          <span>Restrict Campaign Discovery</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Moderation Notes */}
              <div style={styles.sectionBlock}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Lock size={14} color="#64748b" />
                    <h4 style={styles.blockTitle}>Internal Moderation Notes</h4>
                  </div>
                  <span style={styles.confidentialPill}>Confidential (Admins Only)</span>
                </div>

                <div style={styles.notesList}>
                  {!selectedReport.internalNotes || selectedReport.internalNotes.length === 0 ? (
                    <p style={styles.noNotesText}>No internal moderation notes recorded yet.</p>
                  ) : (
                    selectedReport.internalNotes.map((note) => (
                      <div key={note.id} style={styles.noteItem}>
                        <div style={styles.noteHeader}>
                          <span style={styles.noteAuthor}>{note.adminName}</span>
                          <span style={styles.noteDate}>
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={styles.noteText}>{note.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} style={styles.addNoteForm}>
                  <input
                    type="text"
                    placeholder="Add an internal moderation note (will be audit logged)..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    style={styles.noteInput}
                  />
                  <button
                    type="submit"
                    disabled={addingNote || !newNoteText.trim()}
                    style={{
                      ...styles.addNoteBtn,
                      opacity: addingNote || !newNoteText.trim() ? 0.6 : 1,
                    }}
                  >
                    <Send size={13} style={{ marginRight: 5 }} />
                    <span>Add Note</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedReport(null)} style={styles.closeFooterBtn}>
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Justification Modal */}
      {actionModal.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setActionModal((p) => ({ ...p, isOpen: false }))}>
          <div style={styles.actionModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.actionModalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={18} color="#b91c1c" />
                <h3 style={styles.actionModalTitle}>{actionModal.title}</h3>
              </div>
              <button
                onClick={() => setActionModal((p) => ({ ...p, isOpen: false }))}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAction} style={styles.actionModalBody}>
              <p style={styles.confirmPromptText}>{actionModal.confirmPrompt}</p>

              {actionModal.error && (
                <div style={styles.actionErrorAlert}>
                  <AlertCircle size={14} color="#b91c1c" />
                  <span>{actionModal.error}</span>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.actionLabel}>
                  Mandatory Action Justification / Reason:
                </label>
                <textarea
                  rows={3}
                  placeholder="State the justification reason for this action. This will be permanently recorded in the immutable audit ledger..."
                  value={actionModal.reason}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  required
                  style={styles.actionTextarea}
                />
              </div>

              <div style={styles.actionModalFooter}>
                <button
                  type="button"
                  onClick={() => setActionModal((p) => ({ ...p, isOpen: false }))}
                  disabled={actionModal.submitting}
                  style={styles.actionCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionModal.submitting || !actionModal.reason.trim()}
                  style={styles.actionSubmitBtn}
                >
                  {actionModal.submitting ? "Executing & Logging..." : "Confirm & Record Audit"}
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
  realDataBadge: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "680px",
  },
  refreshBtn: {
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
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "14px",
  },
  metricCard: {
    backgroundColor: "#ffffff",
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  metricLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  metricValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "4px 0 2px 0",
  },
  metricSub: {
    fontSize: "11px",
    color: "#94a3b8",
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
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeaderRow: {
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
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
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
  reportId: {
    fontFamily: "monospace",
    fontSize: "12px",
    fontWeight: "700",
    color: "#0f172a",
  },
  catLabel: {
    fontSize: "12px",
    color: "#64748b",
  },
  targetTypeBadge: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
    letterSpacing: "0.04em",
  },
  targetTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },
  targetSub: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  reporterName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },
  reporterEmail: {
    fontSize: "11px",
    color: "#64748b",
  },
  dateText: {
    fontSize: "12px",
    color: "#64748b",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid transparent",
  },
  reviewBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "12px",
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
    fontSize: "13px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#dc2626",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyBox: {
    padding: "60px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  emptyTitle: {
    margin: "12px 0 6px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "460px",
    lineHeight: "1.5",
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
    maxWidth: "680px",
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
    fontSize: "18px",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
  },
  modalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  contextStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    padding: "14px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  contextCol: {
    display: "flex",
    flexDirection: "column",
  },
  colLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  sectionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  blockTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  reasonCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
  },
  reasonText: {
    margin: 0,
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  },
  resolutionBanner: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid transparent",
  },
  actionButtonGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionBtnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #bfdbfe",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  actionBtnSuccess: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  actionBtnNeutral: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  impactfulActionsCard: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "10px",
    padding: "12px 14px",
    marginTop: "6px",
  },
  dangerActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  warningActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "6px",
    border: "1px solid #fed7aa",
    backgroundColor: "#ffedd5",
    color: "#c2410c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  confidentialPill: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  notesList: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px",
    maxHeight: "180px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  noNotesText: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    padding: "10px",
  },
  noteItem: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px",
  },
  noteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  noteAuthor: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#0f172a",
  },
  noteDate: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  noteText: {
    margin: 0,
    fontSize: "12px",
    color: "#334155",
    lineHeight: "1.4",
  },
  addNoteForm: {
    display: "flex",
    gap: "8px",
    marginTop: "6px",
  },
  noteInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "12px",
    outline: "none",
  },
  addNoteBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
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
  actionModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  actionModalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionModalTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  actionModalBody: {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  confirmPromptText: {
    margin: 0,
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.5",
  },
  actionErrorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    backgroundColor: "#fef2f2",
    borderRadius: "6px",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "12px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  actionLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
  },
  actionTextarea: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  actionModalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "6px",
  },
  actionCancelBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  actionSubmitBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

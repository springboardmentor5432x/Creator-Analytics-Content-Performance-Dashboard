import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  DollarSign,
  Calendar,
  Building2,
  Users,
  Eye,
  ShieldAlert,
  ArrowRight,
  Target,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  fetchAllCampaignsForAdmin,
  restrictCampaign,
  unrestrictCampaign,
} from "../campaignOversightService";

export default function AdminCampaignOversightView({
  user,
  userProfile,
  theme,
  onNavigateToReports,
}) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reportedOnlyFilter, setReportedOnlyFilter] = useState(false);

  // Detail Modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Moderation Restriction Modal
  const [restrictModal, setRestrictModal] = useState({
    isOpen: false,
    mode: "restrict", // 'restrict' | 'unrestrict'
    reason: "",
    restoreStatus: "active",
    submitting: false,
    error: "",
  });

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCampaignsForAdmin();
      setCampaigns(data || []);
      if (selectedCampaign) {
        const refreshed = data.find((c) => c.id === selectedCampaign.id);
        if (refreshed) setSelectedCampaign(refreshed);
      }
    } catch (err) {
      console.warn("Could not load campaigns for admin oversight:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.marketingName?.toLowerCase().includes(q) ||
        c.marketingEmail?.toLowerCase().includes(q) ||
        c.targetNiche?.toLowerCase().includes(q) ||
        c.assignedAgencyName?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesReported = !reportedOnlyFilter || c.reportsCount > 0;

      return matchesSearch && matchesStatus && matchesReported;
    });
  }, [campaigns, searchQuery, statusFilter, reportedOnlyFilter]);

  const metrics = useMemo(() => {
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === "active").length,
      restricted: campaigns.filter((c) => c.status === "restricted").length,
      reported: campaigns.filter((c) => c.reportsCount > 0).length,
    };
  }, [campaigns]);

  const handleOpenRestrictModal = (mode) => {
    setRestrictModal({
      isOpen: true,
      mode,
      reason: "",
      restoreStatus: "active",
      submitting: false,
      error: "",
    });
  };

  const handleExecuteRestriction = async (e) => {
    e.preventDefault();
    if (!restrictModal.reason.trim()) {
      setRestrictModal((prev) => ({ ...prev, error: "Action reason is required." }));
      return;
    }

    setRestrictModal((prev) => ({ ...prev, submitting: true, error: "" }));

    try {
      const adminActor = userProfile || user;
      if (restrictModal.mode === "restrict") {
        await restrictCampaign({
          adminUser: adminActor,
          campaignId: selectedCampaign.id,
          reason: restrictModal.reason.trim(),
        });
      } else {
        await unrestrictCampaign({
          adminUser: adminActor,
          campaignId: selectedCampaign.id,
          reason: restrictModal.reason.trim(),
          restoreStatus: restrictModal.restoreStatus,
        });
      }

      await loadCampaigns();
      setRestrictModal({
        isOpen: false,
        mode: "restrict",
        reason: "",
        restoreStatus: "active",
        submitting: false,
        error: "",
      });
    } catch (err) {
      setRestrictModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || "Failed to execute moderation action.",
      }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", label: "Active" };
      case "restricted":
        return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca", label: "Restricted" };
      case "completed":
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: "Completed" };
      case "draft":
        return { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "Draft" };
      default:
        return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", label: status };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: "#eff6ff" }}>
            <Layers size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Campaign Oversight & Moderation</h1>
              <span style={styles.realDataBadge}>READ-ONLY OVERSIGHT</span>
            </div>
            <p style={styles.subtitle}>
              Monitor platform-wide marketing campaigns, inspect collaborator compliance, review linked violation reports, and execute reversible administrative restrictions.
            </p>
          </div>
        </div>

        <button onClick={loadCampaigns} style={styles.refreshBtn}>
          <RefreshCw size={15} color="#334155" />
          <span>Refresh Campaigns</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total Tracked Campaigns</span>
          <span style={styles.metricValue}>{metrics.total}</span>
          <span style={styles.metricSub}>Across all brand workspaces</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Active in Marketplace</span>
          <span style={{ ...styles.metricValue, color: "#15803d" }}>{metrics.active}</span>
          <span style={styles.metricSub}>Open for creator collaboration</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Restricted by Moderation</span>
          <span style={{ ...styles.metricValue, color: "#b91c1c" }}>{metrics.restricted}</span>
          <span style={styles.metricSub}>Hidden from creator discovery</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Campaigns with Reports</span>
          <span style={{ ...styles.metricValue, color: "#d97706" }}>{metrics.reported}</span>
          <span style={styles.metricSub}>Requiring safety review</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search campaigns by title, brand, agency, ID, or niche..."
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
              <option value="ALL">All Statuses ({campaigns.length})</option>
              <option value="active">Active ({metrics.active})</option>
              <option value="restricted">Restricted ({metrics.restricted})</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={reportedOnlyFilter}
              onChange={(e) => setReportedOnlyFilter(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Reported Only ({metrics.reported})</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner}></div>
            <span>Loading platform campaigns...</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={styles.emptyBox}>
            <CheckCircle2 size={36} color="#15803d" />
            <h3 style={styles.emptyTitle}>No Campaigns Found</h3>
            <p style={styles.emptyText}>
              No campaign records match the selected filters or search parameters.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Campaign Title</th>
                  <th style={styles.th}>Owning Brand / Marketer</th>
                  <th style={styles.th}>Assigned Agency</th>
                  <th style={styles.th}>Budget</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Safety Reports</th>
                  <th style={styles.thAction}>Oversight</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((camp) => {
                  const badge = getStatusBadge(camp.status);
                  const isRestricted = camp.status === "restricted";
                  return (
                    <tr key={camp.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={styles.campTitle}>{camp.name}</span>
                          <span style={styles.campNiche}>
                            {camp.targetNiche || "General"} • {camp.id}
                          </span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={styles.brandName}>{camp.marketingName || "Brand Marketer"}</span>
                          <span style={styles.brandEmail}>{camp.marketingEmail}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.agencyText}>
                          {camp.assignedAgencyName ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Building2 size={12} color="#0d9488" />
                              {camp.assignedAgencyName}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Direct (No Agency)</span>
                          )}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.budgetText}>
                          ${(camp.budget || 0).toLocaleString()}
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
                        {camp.reportsCount > 0 ? (
                          <span style={styles.reportFlagBadge}>
                            <ShieldAlert size={12} />
                            <span>
                              {camp.reportsCount} {camp.reportsCount === 1 ? "Report" : "Reports"}
                            </span>
                          </span>
                        ) : (
                          <span style={styles.cleanBadge}>
                            <CheckCircle2 size={12} color="#15803d" />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      <td style={styles.tdAction}>
                        <button
                          onClick={() => setSelectedCampaign(camp)}
                          style={styles.inspectBtn}
                        >
                          <Eye size={13} style={{ marginRight: 5 }} />
                          <span>Inspect</span>
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

      {/* Campaign Detail / Oversight Modal */}
      {selectedCampaign && (
        <div style={styles.modalOverlay} onClick={() => setSelectedCampaign(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIconWrap, backgroundColor: "#eff6ff" }}>
                  <Layers size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={styles.modalTitle}>{selectedCampaign.name}</h3>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getStatusBadge(selectedCampaign.status),
                      }}
                    >
                      {selectedCampaign.status.toUpperCase()}
                    </span>
                  </div>
                  <span style={styles.modalSubtitle}>
                    ID: {selectedCampaign.id} • Created{" "}
                    {new Date(selectedCampaign.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button onClick={() => setSelectedCampaign(null)} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* If Restricted: Prominent Warning Banner */}
              {selectedCampaign.status === "restricted" && (
                <div style={styles.restrictedAlert}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Lock size={16} color="#b91c1c" />
                    <strong style={{ fontSize: "14px", color: "#991b1b" }}>
                      Administrative Restriction Active
                    </strong>
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#7f1d1d" }}>
                    <strong>Reason:</strong> {selectedCampaign.restrictionReason || "Policy violation review"}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#991b1b" }}>
                    Restricted by Platform Trust & Safety on{" "}
                    {selectedCampaign.restrictedAt
                      ? new Date(selectedCampaign.restrictedAt).toLocaleString()
                      : "Recently"}
                    . Campaign is blocked from public creator discovery and invitations.
                  </p>
                </div>
              )}

              {/* Context Summary Cards */}
              <div style={styles.contextGrid}>
                <div style={styles.contextCard}>
                  <span style={styles.contextLabel}>Owning Marketer</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a", marginTop: 4 }}>
                    {selectedCampaign.marketingName || "Brand Team"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedCampaign.marketingEmail}
                  </span>
                </div>

                <div style={styles.contextCard}>
                  <span style={styles.contextLabel}>Agency Management</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a", marginTop: 4 }}>
                    {selectedCampaign.assignedAgencyName || "Direct Brand Execution"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedCampaign.assignedAgencyName ? "Assigned Agency Partner" : "No agency assigned"}
                  </span>
                </div>

                <div style={styles.contextCard}>
                  <span style={styles.contextLabel}>Allocated Media Budget</span>
                  <strong style={{ fontSize: "15px", color: "#0f172a", marginTop: 4 }}>
                    ${(selectedCampaign.budget || 0).toLocaleString()} {selectedCampaign.currency || "USD"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Objective: {selectedCampaign.objective || "Awareness"}
                  </span>
                </div>

                <div style={styles.contextCard}>
                  <span style={styles.contextLabel}>Collaborator Participation</span>
                  <strong style={{ fontSize: "14px", color: "#0f172a", marginTop: 4 }}>
                    {selectedCampaign.acceptedCreatorsCount || 0} Creators Accepted
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedCampaign.totalInvitations || 0} Total Invitations Issued
                  </span>
                </div>
              </div>

              {/* Description & Deliverables */}
              <div style={styles.sectionBlock}>
                <h4 style={styles.sectionTitle}>Campaign Brief & Requirements</h4>
                <div style={styles.briefCard}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                    {selectedCampaign.description || "No public description provided."}
                  </p>
                  {selectedCampaign.deliverableRequirements && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                        DELIVERABLE REQUIREMENTS:
                      </span>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#475569" }}>
                        {selectedCampaign.deliverableRequirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Reports Section */}
              <div style={styles.sectionBlock}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h4 style={styles.sectionTitle}>
                    Safety Reports Linked to this Campaign ({selectedCampaign.reportsCount || 0})
                  </h4>
                  {selectedCampaign.reportsCount > 0 && onNavigateToReports && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(null);
                        onNavigateToReports();
                      }}
                      style={styles.linkToReportsBtn}
                    >
                      <span>Open in Moderation Queue</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>

                {selectedCampaign.reportsCount === 0 ? (
                  <div style={styles.noReportsBox}>
                    <CheckCircle2 size={16} color="#15803d" />
                    <span style={{ fontSize: "13px", color: "#15803d" }}>
                      Zero violation reports have been filed against this campaign.
                    </span>
                  </div>
                ) : (
                  <div style={styles.linkedReportsList}>
                    {selectedCampaign.linkedReports.map((rep) => (
                      <div key={rep.id} style={styles.linkedReportCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <ShieldAlert size={14} color="#dc2626" />
                            <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                              {rep.categoryLabel || rep.category}
                            </strong>
                            <span style={styles.reportPill}>#{rep.id}</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            Status: <strong>{rep.status}</strong>
                          </span>
                        </div>
                        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#334155" }}>
                          "{rep.reason}"
                        </p>
                        <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: 4, display: "block" }}>
                          Reported by {rep.reporterEmail} on {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Moderation Controls */}
              <div style={styles.sectionBlock}>
                <h4 style={styles.sectionTitle}>Administrative Moderation Controls</h4>
                <div style={styles.moderationControlBox}>
                  {selectedCampaign.status !== "restricted" ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                          Restrict Campaign Discovery
                        </strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                          Temporarily blocks this campaign from creator search and prevents new collaboration agreements during investigation.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenRestrictModal("restrict")}
                        style={styles.restrictBtn}
                      >
                        <Lock size={13} style={{ marginRight: 6 }} />
                        <span>Restrict Campaign</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                          Lift Campaign Restriction
                        </strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                          Restore campaign to active status once compliance investigation is completed.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenRestrictModal("unrestrict")}
                        style={styles.unrestrictBtn}
                      >
                        <Unlock size={13} style={{ marginRight: 6 }} />
                        <span>Restore Campaign</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedCampaign(null)} style={styles.closeFooterBtn}>
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restriction Confirmation Modal */}
      {restrictModal.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setRestrictModal((p) => ({ ...p, isOpen: false }))}>
          <div style={styles.actionModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.actionModalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={18} color="#b91c1c" />
                <h3 style={styles.actionModalTitle}>
                  {restrictModal.mode === "restrict"
                    ? "Confirm Campaign Restriction"
                    : "Restore Campaign Status"}
                </h3>
              </div>
              <button
                onClick={() => setRestrictModal((p) => ({ ...p, isOpen: false }))}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteRestriction} style={styles.actionModalBody}>
              <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                {restrictModal.mode === "restrict"
                  ? `Are you sure you want to restrict "${selectedCampaign.name}"? This action will remove the campaign from public creator discovery, block pending invitation responses, and create an append-only audit record.`
                  : `Lift restriction on "${selectedCampaign.name}"? The campaign will be restored and the marketing team will be notified.`}
              </p>

              {restrictModal.error && (
                <div style={styles.actionErrorAlert}>
                  <AlertCircle size={14} color="#b91c1c" />
                  <span>{restrictModal.error}</span>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.actionLabel}>
                  Mandatory Action Justification / Moderation Reason:
                </label>
                <textarea
                  rows={3}
                  placeholder="State the reason for restricting or restoring this campaign. This will be stored in the permanent audit ledger..."
                  value={restrictModal.reason}
                  onChange={(e) =>
                    setRestrictModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  required
                  style={styles.actionTextarea}
                />
              </div>

              <div style={styles.actionModalFooter}>
                <button
                  type="button"
                  onClick={() => setRestrictModal((p) => ({ ...p, isOpen: false }))}
                  disabled={restrictModal.submitting}
                  style={styles.actionCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restrictModal.submitting || !restrictModal.reason.trim()}
                  style={{
                    ...styles.actionSubmitBtn,
                    backgroundColor: restrictModal.mode === "restrict" ? "#dc2626" : "#15803d",
                  }}
                >
                  {restrictModal.submitting
                    ? "Executing & Logging..."
                    : restrictModal.mode === "restrict"
                    ? "Confirm Restriction"
                    : "Confirm Restoration"}
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
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
    gap: "16px",
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
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
  campTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  campNiche: {
    fontSize: "11px",
    color: "#64748b",
  },
  brandName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },
  brandEmail: {
    fontSize: "11px",
    color: "#64748b",
  },
  agencyText: {
    fontSize: "12px",
    fontWeight: "500",
  },
  budgetText: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid transparent",
  },
  reportFlagBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    borderRadius: "6px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "700",
  },
  cleanBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "#15803d",
    fontWeight: "500",
  },
  inspectBtn: {
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
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
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
    maxWidth: "720px",
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
  restrictedAlert: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "14px 16px",
  },
  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },
  contextCard: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  contextLabel: {
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
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  briefCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
  },
  linkToReportsBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  noReportsBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f0fdf4",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
  },
  linkedReportsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  linkedReportCard: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "8px",
    padding: "12px",
  },
  reportPill: {
    fontSize: "11px",
    fontFamily: "monospace",
    color: "#64748b",
  },
  moderationControlBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
  },
  restrictBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  unrestrictBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#15803d",
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
    maxWidth: "480px",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
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
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

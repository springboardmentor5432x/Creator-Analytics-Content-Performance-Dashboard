import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Send,
  Star,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Award,
} from "lucide-react";
import {
  getRegisteredAgencies,
  getAgencyBrandAssignments,
  getAgencyRecommendations,
  assignCampaignToAgency,
  revokeAgencyBrandAssignment,
  updateRecommendationStatus,
} from "../../agency/agencyService";
import {
  getLocalCampaigns,
  sendCampaignInvitation,
} from "../campaignService";

export default function MarketingAgencies({
  user,
  userProfile,
  theme,
  campaigns = [],
  onRefresh,
}) {
  const accent = theme?.accent || "#0284c7";
  const accentLight = theme?.accentLight || "#f0f9ff";

  const [agencies, setAgencies] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal: Assign Campaign
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [canInviteCreators, setCanInviteCreators] = useState(true);
  const [canReviewDeliverables, setCanReviewDeliverables] = useState(true);
  const [canApproveBudget, setCanApproveBudget] = useState(false);
  const [managementFee, setManagementFee] = useState("15% Agency Management Fee");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Revoke modal
  const [revokeModalItem, setRevokeModalItem] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const brandId = user?.uid || "usr_marketing_demo";
  const brandEmail = user?.email || "marketing@creatoriq.io";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agencyList, assignList, recList] = await Promise.all([
        getRegisteredAgencies(),
        getAgencyBrandAssignments({ brandId, brandEmail }),
        getAgencyRecommendations({ brandId }),
      ]);
      setAgencies(agencyList || []);
      setAssignments(assignList || []);
      setRecommendations(recList || []);
    } catch (err) {
      console.warn("MarketingAgencies load error:", err);
    } finally {
      setLoading(false);
    }
  }, [brandId, brandEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle assigning campaign to agency
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampaignId || !selectedAgencyId) {
      alert("Please select both a campaign and an agency.");
      return;
    }

    const campaign = campaigns.find((c) => c.id === selectedCampaignId) || {
      id: selectedCampaignId,
      name: "Brand Campaign",
    };
    const agency = agencies.find((a) => a.uid === selectedAgencyId);
    if (!agency) return;

    setIsAssigning(true);
    try {
      await assignCampaignToAgency({
        campaign,
        agency,
        brandUser: {
          uid: brandId,
          email: brandEmail,
          fullName: userProfile?.fullName || user?.displayName || "Global Brand Marketing",
          companyName: userProfile?.companyName || "CreatorIQ Brand",
        },
        permissions: {
          canInviteCreators,
          canReviewDeliverables,
          canApproveBudget,
        },
        notes: assignmentNotes,
        managementFee,
      });

      showToast(`Campaign assigned to ${agency.fullName} successfully!`);
      setShowAssignModal(false);
      setSelectedCampaignId("");
      setSelectedAgencyId("");
      setAssignmentNotes("");
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to assign campaign.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle revoking assignment
  const handleRevoke = async () => {
    if (!revokeModalItem) return;
    setIsRevoking(true);
    try {
      await revokeAgencyBrandAssignment(
        revokeModalItem.id,
        user || { uid: brandId, role: "Marketing Team" },
        revokeReason
      );
      showToast("Agency campaign assignment revoked.");
      setRevokeModalItem(null);
      setRevokeReason("");
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to revoke assignment.");
    } finally {
      setIsRevoking(false);
    }
  };

  // Handle approving agency recommendation & creating invite
  const handleApproveRecommendation = async (rec) => {
    try {
      await updateRecommendationStatus(
        rec.id,
        "approved",
        user || { uid: brandId, role: "Marketing Team" }
      );

      // Create an official campaign invitation for the recommended creator
      try {
        await sendCampaignInvitation({
          campaignId: rec.campaignId,
          creator: {
            uid: rec.creatorId,
            fullName: rec.creatorName,
            email: rec.creatorEmail,
          },
          compensation: "$3,500",
          message: `Recommended by ${rec.agencyName}: ${rec.pitchNotes || "High alignment"}`,
          marketingUser: user || { uid: brandId, role: "Marketing Team", email: brandEmail, fullName: userProfile?.fullName || "Brand Marketing" },
        });
      } catch (invErr) {
        console.warn("Auto-invite note:", invErr);
      }

      showToast(`Approved recommendation! Campaign invitation issued to ${rec.creatorName}.`);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to approve recommendation.");
    }
  };

  const handleDeclineRecommendation = async (rec) => {
    try {
      await updateRecommendationStatus(
        rec.id,
        "rejected",
        user || { uid: brandId, role: "Marketing Team" }
      );
      showToast(`Declined recommendation for ${rec.creatorName}.`);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to decline recommendation.");
    }
  };

  const activeAssignments = assignments.filter((a) => a.status === "accepted");
  const pendingAssignments = assignments.filter((a) => a.status === "pending");

  return (
    <div style={styles.container}>
      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div
            style={{
              ...styles.iconBadge,
              backgroundColor: accentLight,
              color: accent,
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <h1 style={styles.title}>Agency Partners & Campaign Delegation</h1>
            <p style={styles.subtitle}>
              Collaborate with verified talent agencies to scale creator scouting, outsource deliverable approvals, and run high-volume influencer campaigns.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={loadData} style={styles.refreshBtn} title="Refresh data">
            <RefreshCw size={15} color="#475569" />
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{ ...styles.primaryBtn, backgroundColor: accent }}
          >
            <Plus size={16} /> Assign Campaign to Agency
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Registered Agencies</span>
          <span style={styles.kpiVal}>{agencies.length}</span>
          <span style={styles.kpiSub}>Accredited talent representation partners</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Active Managed Campaigns</span>
          <span style={{ ...styles.kpiVal, color: "#0d9488" }}>
            {activeAssignments.length}
          </span>
          <span style={styles.kpiSub}>
            {pendingAssignments.length} awaiting agency confirmation
          </span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Creator Recommendations</span>
          <span style={{ ...styles.kpiVal, color: accent }}>
            {recommendations.length}
          </span>
          <span style={styles.kpiSub}>Pitched by agencies for your campaigns</span>
        </div>
      </div>

      {/* 1. Creator Recommendations from Agencies */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award size={18} color="#0d9488" />
            <div>
              <h2 style={styles.sectionTitle}>
                Agency Creator Recommendations ({recommendations.length})
              </h2>
              <span style={styles.sectionSubtitle}>
                Vetted creators pitched by partner agencies specifically for your brand campaigns
              </span>
            </div>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
              No recommendations received yet. When agencies assign roster talent to your campaigns, their pitch notes and match scores will appear here for 1-click invitation.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Recommended Creator</th>
                  <th style={styles.th}>Agency Partner</th>
                  <th style={styles.th}>Match Score</th>
                  <th style={styles.th}>Pitch Notes</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr key={rec.id} style={styles.tr}>
                    <td style={styles.tdBold}>{rec.campaignTitle}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>
                        {rec.creatorName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {rec.creatorEmail}
                      </div>
                    </td>
                    <td style={styles.td}>{rec.agencyName}</td>
                    <td style={styles.td}>
                      <span style={styles.matchScoreBadge}>
                        <Star size={11} fill="#eab308" color="#eab308" />
                        {rec.matchScore}% Match
                      </span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: 280, fontSize: "12px" }}>
                      {rec.pitchNotes || "Strong audience demographic alignment."}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusChip,
                          backgroundColor:
                            rec.status === "approved"
                              ? "#d1fae5"
                              : rec.status === "rejected"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            rec.status === "approved"
                              ? "#065f46"
                              : rec.status === "rejected"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {rec.status !== "approved" && rec.status !== "rejected" ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleApproveRecommendation(rec)}
                            style={styles.approveBtn}
                            title="Approve & Send Campaign Invite"
                          >
                            <CheckCircle2 size={13} /> Approve & Invite
                          </button>
                          <button
                            onClick={() => handleDeclineRecommendation(rec)}
                            style={styles.declineBtn}
                            title="Decline Recommendation"
                          >
                            <XCircle size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {rec.status === "approved" ? "Invited to Campaign" : "Declined"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Campaign Assignments to Agencies */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Layers size={18} color={accent} />
            <div>
              <h2 style={styles.sectionTitle}>
                Campaign Delegations ({assignments.length})
              </h2>
              <span style={styles.sectionSubtitle}>
                Campaigns you have assigned to talent agencies with delegated management permissions
              </span>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
              No campaigns assigned to agencies yet. Click "Assign Campaign to Agency" above to delegate creator sourcing and deliverable reviews.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Agency</th>
                  <th style={styles.th}>Permissions Granted</th>
                  <th style={styles.th}>Management Fee</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.tdBold}>{item.campaignTitle}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>
                        {item.agencyName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {item.agencyEmail}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {item.permissions?.canInviteCreators && (
                          <span style={styles.permBadge}>Invite Creators</span>
                        )}
                        {item.permissions?.canReviewDeliverables && (
                          <span style={styles.permBadge}>Review Deliverables</span>
                        )}
                        {item.permissions?.canApproveBudget && (
                          <span style={styles.permBadge}>Budget Approval</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: "12.5px", color: "#475569" }}>
                        {item.managementFee || "Standard Split"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusChip,
                          backgroundColor:
                            item.status === "accepted"
                              ? "#d1fae5"
                              : item.status === "revoked"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            item.status === "accepted"
                              ? "#065f46"
                              : item.status === "revoked"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {item.status === "accepted" || item.status === "pending" ? (
                        <button
                          onClick={() => setRevokeModalItem(item)}
                          style={styles.revokeBtn}
                        >
                          Revoke Assignment
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Agency Directory Grid */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} color="#475569" />
            <div>
              <h2 style={styles.sectionTitle}>
                Accredited Agency Directory ({agencies.length})
              </h2>
              <span style={styles.sectionSubtitle}>
                Verified agencies ready to represent brand campaigns and scout top talent
              </span>
            </div>
          </div>
        </div>

        <div style={styles.agencyGrid}>
          {agencies.map((agency) => (
            <div key={agency.uid} style={styles.agencyCard}>
              <div style={styles.agencyTop}>
                <div style={styles.agencyIcon}>
                  <Building2 size={20} color="#0d9488" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={styles.agencyCardName}>{agency.fullName}</h3>
                    <ShieldCheck size={14} color="#0d9488" />
                  </div>
                  <span style={styles.agencyCardEmail}>{agency.email}</span>
                </div>
              </div>

              <p style={styles.agencyBio}>{agency.bio}</p>

              <div style={styles.agencyMeta}>
                <span style={styles.metaBadge}>
                  Roster: {agency.rosterSize}+ Creators
                </span>
                <span style={styles.metaBadge}>Rating: {agency.rating} ★</span>
                <span style={styles.metaBadge}>{agency.location}</span>
              </div>

              <div style={styles.cardFooter}>
                <button
                  onClick={() => {
                    setSelectedAgencyId(agency.uid);
                    setShowAssignModal(true);
                  }}
                  style={{ ...styles.assignDirectBtn, backgroundColor: accent }}
                >
                  <Plus size={13} /> Assign Campaign
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Assign Campaign */}
      {showAssignModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>Assign Campaign to Agency</h2>
            <p style={styles.modalSubtitle}>
              Delegate creator recruiting and deliverable management to an accredited agency.
            </p>

            <form onSubmit={handleAssignSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Campaign to Delegate</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">-- Choose an active campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.title} (${Number(c.budget || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Select Partner Agency</label>
                <select
                  value={selectedAgencyId}
                  onChange={(e) => setSelectedAgencyId(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">-- Choose a registered agency --</option>
                  {agencies.map((a) => (
                    <option key={a.uid} value={a.uid}>
                      {a.fullName} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Delegated Permissions</label>
                <div style={styles.checkboxContainer}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={canInviteCreators}
                      onChange={(e) => setCanInviteCreators(e.target.checked)}
                    />
                    <span>Agency can scout and invite creators to this campaign</span>
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={canReviewDeliverables}
                      onChange={(e) => setCanReviewDeliverables(e.target.checked)}
                    />
                    <span>Agency can review, request revisions, and accept deliverables</span>
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={canApproveBudget}
                      onChange={(e) => setCanApproveBudget(e.target.checked)}
                    />
                    <span>Agency can negotiate and approve creator compensation</span>
                  </label>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Management Fee / Split Terms</label>
                <input
                  type="text"
                  value={managementFee}
                  onChange={(e) => setManagementFee(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. 15% Agency Management Fee or $5,000 retainer"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assignment Brief & Guidelines (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  placeholder="Brief the agency on your target demographic, key messaging points, and deadlines..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  style={{ ...styles.submitBtn, backgroundColor: accent }}
                >
                  {isAssigning ? "Assigning..." : "Issue Campaign Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Revoke Assignment */}
      {revokeModalItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b91c1c", marginBottom: 8 }}>
              <AlertCircle size={22} />
              <h2 style={{ ...styles.modalTitle, margin: 0, color: "#b91c1c" }}>
                Revoke Agency Assignment
              </h2>
            </div>
            <p style={styles.modalSubtitle}>
              Are you sure you want to revoke management of <strong>'{revokeModalItem.campaignTitle}'</strong> from <strong>{revokeModalItem.agencyName}</strong>?
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Revocation (Optional)</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder="Campaign completed, taking management in-house, etc."
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setRevokeModalItem(null)}
                style={styles.cancelBtn}
              >
                Keep Assignment
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isRevoking}
                style={{ ...styles.submitBtn, backgroundColor: "#b91c1c" }}
              >
                {isRevoking ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
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
    gap: "24px",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "14px 20px",
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: 9999,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  iconBadge: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    fontSize: "13.5px",
    color: "#64748b",
    maxWidth: "680px",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 12px",
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    cursor: "pointer",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 16px",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  kpiLabel: {
    fontSize: "11.5px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#64748b",
    fontWeight: "700",
  },
  kpiVal: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
  },
  kpiSub: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px 28px",
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: "12.5px",
    color: "#64748b",
  },
  emptyCard: {
    padding: "24px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
    textAlign: "center",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thRow: {
    borderBottom: "1px solid #e2e8f0",
    textAlign: "left",
  },
  th: {
    padding: "10px 14px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px",
    fontSize: "13px",
    color: "#334155",
  },
  tdBold: {
    padding: "14px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  matchScoreBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#854d0e",
    backgroundColor: "#fef9c3",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  statusChip: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "12px",
  },
  permBadge: {
    fontSize: "11px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "600",
  },
  approveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#15803d",
    color: "#ffffff",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  declineBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    cursor: "pointer",
  },
  revokeBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  agencyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
  agencyCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  agencyTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  agencyIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agencyCardName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  agencyCardEmail: {
    fontSize: "12px",
    color: "#64748b",
  },
  agencyBio: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.45",
  },
  agencyMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  metaBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#334155",
    backgroundColor: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  assignDirectBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 12px",
    color: "#ffffff",
    borderRadius: "8px",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "520px",
    width: "100%",
    padding: "28px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    margin: "0 0 6px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "0 0 20px 0",
    fontSize: "13.5px",
    color: "#64748b",
    lineHeight: "1.45",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#334155",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
    backgroundColor: "#ffffff",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  checkboxContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12.5px",
    color: "#334155",
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
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
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

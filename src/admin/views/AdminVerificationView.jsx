import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Mail,
  UserCheck,
  FileCheck,
  FileText,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  fetchAgencyAndBrandAccounts,
  updateAccountVerification,
} from "../verificationService";

export default function AdminVerificationView({ user, userProfile, theme }) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Review Modal State
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [targetStatus, setTargetStatus] = useState("verified");
  const [decisionReason, setDecisionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAgencyAndBrandAccounts();
      setAccounts(data);
    } catch (err) {
      console.warn("Failed to load verification accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter !== "ALL" && acc.role !== roleFilter) return false;
    if (statusFilter !== "ALL" && acc.verificationStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (acc.fullName || "").toLowerCase().includes(q);
      const matchEmail = (acc.email || "").toLowerCase().includes(q);
      const matchUid = (acc.uid || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchUid) return false;
    }
    return true;
  });

  const handleOpenReview = (account, defaultStatus = "verified") => {
    setSelectedAccount(account);
    setTargetStatus(defaultStatus);
    setDecisionReason("");
    setActionError("");
    setActionSuccess("");
  };

  const handleCloseReview = () => {
    if (submitting) return;
    setSelectedAccount(null);
    setDecisionReason("");
    setActionError("");
    setActionSuccess("");
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!decisionReason.trim()) {
      setActionError("A formal justification reason is required for administrative audit integrity.");
      return;
    }

    setSubmitting(true);
    setActionError("");
    try {
      await updateAccountVerification({
        adminUser: {
          uid: user?.uid,
          email: user?.email,
          displayName: userProfile?.fullName || user?.displayName || "Admin",
          role: "Admin",
        },
        targetUser: selectedAccount,
        newStatus: targetStatus,
        reason: decisionReason.trim(),
      });

      setActionSuccess(`Verification record successfully updated to "${targetStatus.toUpperCase()}". Notification and audit log recorded.`);
      setTimeout(() => {
        handleCloseReview();
        loadAccounts();
      }, 1200);
    } catch (err) {
      setActionError(err.message || "Failed to update verification status.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
            <CheckCircle2 size={12} />
            <span>Verified Partner</span>
          </span>
        );
      case "pending":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}>
            <Clock size={12} />
            <span>Pending Review</span>
          </span>
        );
      case "rejected":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}>
            <XCircle size={12} />
            <span>Review Declined</span>
          </span>
        );
      case "unverified":
      default:
        return (
          <span style={{ ...styles.badge, backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" }}>
            <HelpCircle size={12} />
            <span>Unverified</span>
          </span>
        );
    }
  };

  // Summary counts
  const totalAgencies = accounts.filter((a) => a.role === "Agency").length;
  const totalBrands = accounts.filter((a) => a.role === "Marketing Team").length;
  const verifiedCount = accounts.filter((a) => a.verificationStatus === "verified").length;
  const pendingCount = accounts.filter((a) => a.verificationStatus === "pending").length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <Building2 size={24} color={accent} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Brand & Agency Verification Queue</h1>
              <span style={styles.queueBadge}>{accounts.length} ACCOUNTS</span>
            </div>
            <p style={styles.subtitle}>
              Review, verify, and authenticate business identities for Talent Agencies and Brand Marketing Teams. Decisions are logged to the platform audit ledger.
            </p>
          </div>
        </div>

        <button
          onClick={loadAccounts}
          style={styles.refreshBtn}
          title="Refresh verification list"
        >
          <RefreshCw size={14} color="#334155" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Verification Policy Disclaimer & Standards */}
      <div style={styles.policyCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Info size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: "13px", color: "#0369a1", display: "block", marginBottom: 3 }}>
              Product Verification Governance Policy
            </strong>
            <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
              To ensure platform business continuity, <strong>unverified accounts are not blocked by default</strong>. Brand Marketers and Agencies may create campaigns and manage rosters while pending verification. Platform Administrators can grant verified trust badges, request clarifications, or flag high-risk entities. Mandatory legal KYC criteria and document evidence schemas remain subject to the product owner's enterprise compliance roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Verified Businesses</span>
            <div style={{ ...styles.statIconBox, backgroundColor: "#dcfce7" }}>
              <CheckCircle2 size={16} color="#15803d" />
            </div>
          </div>
          <div style={styles.statValue}>{verifiedCount}</div>
          <span style={styles.statSub}>Official verified badges granted</span>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Pending Review</span>
            <div style={{ ...styles.statIconBox, backgroundColor: "#fef3c7" }}>
              <Clock size={16} color="#b45309" />
            </div>
          </div>
          <div style={styles.statValue}>{pendingCount}</div>
          <span style={styles.statSub}>Awaiting admin verification</span>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Registered Agencies</span>
            <div style={{ ...styles.statIconBox, backgroundColor: accentLight }}>
              <Building2 size={16} color={accent} />
            </div>
          </div>
          <div style={styles.statValue}>{totalAgencies}</div>
          <span style={styles.statSub}>Talent representation organizations</span>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Brand Marketing Teams</span>
            <div style={{ ...styles.statIconBox, backgroundColor: "#f0fdf4" }}>
              <FileCheck size={16} color="#16a34a" />
            </div>
          </div>
          <div style={styles.statValue}>{totalBrands}</div>
          <span style={styles.statSub}>Enterprise & DTC brand teams</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by business name, email, or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup}>
          <div style={styles.filterWrap}>
            <Filter size={14} color="#64748b" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">All Account Roles</option>
              <option value="Agency">Talent Agencies</option>
              <option value="Marketing Team">Marketing Teams (Brands)</option>
            </select>
          </div>

          <div style={styles.filterWrap}>
            <ShieldCheck size={14} color="#64748b" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="verified">Verified Partners</option>
              <option value="unverified">Unverified Accounts</option>
              <option value="rejected">Review Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={24} color="#64748b" className="animate-spin" />
            <span style={styles.emptyTitle}>Loading verification queue...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div style={styles.emptyState}>
            <Building2 size={32} color="#94a3b8" />
            <span style={styles.emptyTitle}>No matching accounts found</span>
            <span style={styles.emptyDesc}>Try adjusting your search criteria or role filters.</span>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Entity & Contact</th>
                <th style={styles.th}>Account Role</th>
                <th style={styles.th}>Auth Provider</th>
                <th style={styles.th}>Verification Status</th>
                <th style={styles.th}>Registration Date</th>
                <th style={styles.thRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => {
                const isVerified = account.verificationStatus === "verified";
                const isPending = account.verificationStatus === "pending";

                return (
                  <tr key={account.uid} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.entityCell}>
                        <div style={styles.avatarPill}>
                          {account.role === "Agency" ? "AG" : "BR"}
                        </div>
                        <div>
                          <div style={styles.entityName}>{account.fullName}</div>
                          <div style={styles.entityEmail}>
                            <Mail size={12} color="#94a3b8" />
                            <span>{account.email}</span>
                          </div>
                          {account.verificationReason && (
                            <div style={styles.reasonSnippet} title={account.verificationReason}>
                              Note: "{account.verificationReason}"
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.rolePill,
                          backgroundColor: account.role === "Agency" ? "#f0fdfa" : "#eef2ff",
                          color: account.role === "Agency" ? "#0f766e" : "#4338ca",
                        }}
                      >
                        {account.role === "Agency" ? "Talent Agency" : "Brand Marketer"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.providerTag}>
                        {account.provider === "google" ? "Google OAuth" : "Email & Password"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {renderStatusBadge(account.verificationStatus)}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.dateText}>
                        {account.createdAt
                          ? new Date(account.createdAt).toLocaleDateString()
                          : "Legacy Account"}
                      </span>
                    </td>

                    <td style={styles.tdRight}>
                      <div style={styles.actionGroup}>
                        {!isVerified && (
                          <button
                            onClick={() => handleOpenReview(account, "verified")}
                            style={styles.approveBtn}
                            title="Grant verified partner badge"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {isVerified && (
                          <button
                            onClick={() => handleOpenReview(account, "unverified")}
                            style={styles.revokeBtn}
                            title="Revoke verified partner badge"
                          >
                            <ShieldAlert size={13} />
                            <span>Revoke</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenReview(account, "rejected")}
                          style={styles.rejectBtn}
                          title="Reject or decline verification"
                        >
                          <XCircle size={13} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Administrative Review Modal */}
      {selectedAccount && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    ...styles.modalHeaderIcon,
                    backgroundColor: targetStatus === "verified" ? "#dcfce7" : "#fee2e2",
                  }}
                >
                  {targetStatus === "verified" ? (
                    <ShieldCheck size={20} color="#15803d" />
                  ) : (
                    <ShieldAlert size={20} color="#b91c1c" />
                  )}
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Administrative Verification Review</h3>
                  <span style={styles.modalSub}>
                    Account: <strong>{selectedAccount.fullName}</strong> ({selectedAccount.email})
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseReview}
                style={styles.modalCloseBtn}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDecision} style={styles.modalForm}>
              {actionError && (
                <div style={styles.errorBox}>
                  <AlertTriangle size={15} color="#b91c1c" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div style={styles.successBox}>
                  <CheckCircle2 size={15} color="#15803d" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Target Decision Status</label>
                <div style={styles.statusToggleRow}>
                  <button
                    type="button"
                    onClick={() => setTargetStatus("verified")}
                    style={{
                      ...styles.statusToggleBtn,
                      backgroundColor: targetStatus === "verified" ? "#dcfce7" : "#ffffff",
                      borderColor: targetStatus === "verified" ? "#16a34a" : "#e2e8f0",
                      color: targetStatus === "verified" ? "#15803d" : "#475569",
                      fontWeight: targetStatus === "verified" ? 700 : 500,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Approve & Verify</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetStatus("rejected")}
                    style={{
                      ...styles.statusToggleBtn,
                      backgroundColor: targetStatus === "rejected" ? "#fee2e2" : "#ffffff",
                      borderColor: targetStatus === "rejected" ? "#dc2626" : "#e2e8f0",
                      color: targetStatus === "rejected" ? "#b91c1c" : "#475569",
                      fontWeight: targetStatus === "rejected" ? 700 : 500,
                    }}
                  >
                    <XCircle size={15} />
                    <span>Decline Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetStatus("unverified")}
                    style={{
                      ...styles.statusToggleBtn,
                      backgroundColor: targetStatus === "unverified" ? "#f1f5f9" : "#ffffff",
                      borderColor: targetStatus === "unverified" ? "#94a3b8" : "#e2e8f0",
                      color: targetStatus === "unverified" ? "#1e293b" : "#475569",
                      fontWeight: targetStatus === "unverified" ? 700 : 500,
                    }}
                  >
                    <HelpCircle size={15} />
                    <span>Reset to Unverified</span>
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Administrative Justification / Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Specify verification grounds, corporate registration cross-check notes, or missing documentation details..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  style={styles.textarea}
                />
                <span style={styles.helpText}>
                  Mandatory: This note is permanently committed to the immutable audit ledger and sent directly to the account holder via in-app notification.
                </span>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCloseReview}
                  style={styles.cancelBtn}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    backgroundColor: targetStatus === "verified" ? "#16a34a" : "#dc2626",
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Committing..." : `Confirm ${targetStatus.toUpperCase()}`}
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
  queueBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#4f46e5",
    backgroundColor: "#eef2ff",
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
  refreshBtn: {
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
    transition: "all 0.15s ease",
  },
  policyCard: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
  },
  statTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  statIconBox: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
  },
  statSub: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: "280px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0 14px",
    height: "40px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "13px",
    color: "#1e293b",
  },
  filtersGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  filterWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0 12px",
    height: "40px",
  },
  select: {
    border: "none",
    outline: "none",
    fontSize: "13px",
    fontWeight: 500,
    color: "#334155",
    backgroundColor: "transparent",
    cursor: "pointer",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    padding: "14px 20px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  thRight: {
    padding: "14px 20px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "right",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s ease",
  },
  td: {
    padding: "16px 20px",
    fontSize: "13px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdRight: {
    padding: "16px 20px",
    fontSize: "13px",
    textAlign: "right",
    verticalAlign: "middle",
  },
  entityCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatarPill: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#f1f5f9",
    border: "1px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#475569",
  },
  entityName: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: "14px",
  },
  entityEmail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
  },
  reasonSnippet: {
    fontSize: "11px",
    color: "#0369a1",
    backgroundColor: "#f0f9ff",
    padding: "2px 6px",
    borderRadius: "4px",
    marginTop: "4px",
    maxWidth: "280px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rolePill: {
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "6px",
    display: "inline-block",
  },
  providerTag: {
    fontSize: "12px",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid transparent",
  },
  dateText: {
    fontSize: "12px",
    color: "#64748b",
  },
  actionGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  approveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  revokeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "6px 12px",
    borderRadius: "6px",
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
  },
  // Modal styles
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
    maxWidth: "540px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalHeaderIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    fontSize: "16px",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "4px",
  },
  modalForm: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
  },
  statusToggleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },
  statusToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 6px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "11px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
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
    marginTop: "6px",
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
  submitBtn: {
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
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
  successBox: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#166534",
  },
};

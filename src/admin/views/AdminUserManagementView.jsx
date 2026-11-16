import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Info,
  Calendar,
  Mail,
  UserCheck,
  Sparkles,
  Building2,
  TrendingUp,
  X,
  RefreshCw,
  Lock,
} from "lucide-react";
import { fetchAllUsers, updateUserAccountStatus } from "../adminService";

export default function AdminUserManagementView({
  theme,
  user: adminUser,
  userProfile,
  onUserStatusUpdated,
}) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // User Detail Modal
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Suspend / Reactivate Modal
  const [actionTargetUser, setActionTargetUser] = useState(null);
  const [actionType, setActionType] = useState("suspend"); // 'suspend' | 'reactivate'
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadUsersData = async () => {
    setLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers || []);
    } catch (err) {
      console.warn("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.uid || "").toLowerCase().includes(q);

      // 2. Role Filter
      const matchesRole =
        roleFilter === "ALL" ||
        u.role === roleFilter ||
        (roleFilter === "Marketing Team" && (u.role === "Marketing Team" || u.role === "Marketing"));

      // 3. Status Filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && (u.status === "active" || !u.status)) ||
        (statusFilter === "SUSPENDED" && u.status === "suspended");

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Open modal for suspend or reactivate
  const openActionModal = (target, type) => {
    if (target.uid === adminUser?.uid || target.email?.toLowerCase() === adminUser?.email?.toLowerCase()) {
      alert("Safety Rule: You cannot modify the account status of your currently authenticated Admin session.");
      return;
    }
    setActionTargetUser(target);
    setActionType(type);
    setActionReason("");
    setActionError("");
  };

  // Submit Suspend / Reactivate
  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!actionReason.trim()) {
      setActionError("A detailed explanation is required for this moderation action.");
      return;
    }

    setIsSubmittingAction(true);
    setActionError("");

    try {
      const newStatus = actionType === "suspend" ? "suspended" : "active";
      await updateUserAccountStatus({
        adminUser: {
          uid: adminUser?.uid || "usr_admin_demo",
          email: adminUser?.email || "admin@creatoriq.io",
          displayName: userProfile?.fullName || adminUser?.displayName || "Platform Administrator",
          role: "Admin",
        },
        targetUser: actionTargetUser,
        newStatus,
        reason: actionReason.trim(),
      });

      showToast(
        newStatus === "suspended"
          ? `Account for ${actionTargetUser.fullName} (${actionTargetUser.email}) has been suspended.`
          : `Account for ${actionTargetUser.fullName} has been reactivated successfully.`
      );

      setActionTargetUser(null);
      setActionReason("");
      await loadUsersData();
      if (onUserStatusUpdated) onUserStatusUpdated();
    } catch (err) {
      setActionError(err.message || "Failed to update account status.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const roleBadgeStyle = (role) => {
    switch (role) {
      case "Admin":
        return { bg: "#e0e7ff", color: "#4338ca", border: "#c7d2fe", icon: ShieldCheck };
      case "Agency":
        return { bg: "#ccfbf1", color: "#0f766e", border: "#99f6e4", icon: Building2 };
      case "Marketing Team":
      case "Marketing":
        return { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd", icon: TrendingUp };
      case "Creator":
      default:
        return { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe", icon: Sparkles };
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Card */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <Users size={24} color={accent} />
          </div>
          <div>
            <h1 style={styles.title}>User Management & Directory</h1>
            <p style={styles.subtitle}>
              Inspect registered platform identities, verify role permissions, and enforce security suspensions with mandatory audit reasons.
            </p>
          </div>
        </div>

        <button onClick={loadUsersData} style={styles.refreshBtn}>
          <RefreshCw size={14} color="#334155" />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={styles.clearSearchBtn}
            >
              <X size={14} color="#64748b" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={styles.filtersGroup}>
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Roles</option>
              <option value="Creator">Content Creator</option>
              <option value="Agency">Talent Agency</option>
              <option value="Marketing Team">Marketing Team</option>
              <option value="Admin">Platform Admin</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Account Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderInfo}>
          <span style={styles.tableCounter}>
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> registered users
          </span>
          {(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("ALL");
                setStatusFilter("ALL");
              }}
              style={styles.resetFiltersBtn}
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <RefreshCw size={24} color={accent} style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading user directory from database...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.emptyBox}>
            <Users size={36} color="#94a3b8" />
            <h3 style={{ margin: "10px 0 4px", fontSize: "15px", color: "#0f172a" }}>
              No users matching current filters
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Try adjusting your search query or reset the role and status filters.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>User / Identity</th>
                  <th style={styles.th}>Role Suite</th>
                  <th style={styles.th}>Account Status</th>
                  <th style={styles.th}>Auth Provider</th>
                  <th style={styles.th}>Registered Date</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const rStyle = roleBadgeStyle(u.role);
                  const Icon = rStyle.icon;
                  const isCurrentAdmin =
                    u.uid === adminUser?.uid ||
                    u.email?.toLowerCase() === adminUser?.email?.toLowerCase();
                  const isSuspended = u.status === "suspended";

                  return (
                    <tr key={u.uid || u.email} style={styles.tr}>
                      {/* Name & Email */}
                      <td style={styles.td}>
                        <div style={styles.userNameRow}>
                          <span style={styles.userName}>{u.fullName || "User"}</span>
                          {isCurrentAdmin && (
                            <span style={styles.currentYouBadge}>YOU</span>
                          )}
                        </div>
                        <span style={styles.userEmail}>{u.email}</span>
                      </td>

                      {/* Role Badge */}
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.roleBadge,
                            backgroundColor: rStyle.bg,
                            color: rStyle.color,
                            borderColor: rStyle.border,
                          }}
                        >
                          <Icon size={12} />
                          {u.role || "Creator"}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td style={styles.td}>
                        {isSuspended ? (
                          <span style={styles.suspendedStatusPill}>
                            <AlertTriangle size={12} /> Suspended
                          </span>
                        ) : (
                          <span style={styles.activeStatusPill}>
                            <CheckCircle2 size={12} /> Active
                          </span>
                        )}
                        {isSuspended && u.statusReason && (
                          <span style={styles.statusReasonHint} title={u.statusReason}>
                            Reason: {u.statusReason.slice(0, 32)}...
                          </span>
                        )}
                      </td>

                      {/* Auth Provider */}
                      <td style={styles.td}>
                        <span style={styles.providerBadge}>
                          {u.provider === "google" ? "Google OAuth" : "Email & Password"}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td style={styles.td}>
                        <div style={styles.dateWrap}>
                          <Calendar size={12} color="#94a3b8" />
                          <span>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <div style={styles.actionButtonGroup}>
                          <button
                            onClick={() => setSelectedUserDetail(u)}
                            style={styles.detailsBtn}
                            title="View Full Profile & Security Details"
                          >
                            <Info size={13} /> Details
                          </button>

                          {!isCurrentAdmin && (
                            <>
                              {isSuspended ? (
                                <button
                                  onClick={() => openActionModal(u, "reactivate")}
                                  style={styles.reactivateBtn}
                                  title="Reactivate user access"
                                >
                                  <RotateCcw size={13} /> Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => openActionModal(u, "suspend")}
                                  style={styles.suspendBtn}
                                  title="Suspend user account"
                                >
                                  <AlertTriangle size={13} /> Suspend
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: User Details View */}
      {selectedUserDetail && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIconBox, backgroundColor: accentLight }}>
                  <Users size={20} color={accent} />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>User Account & Security Details</h3>
                  <span style={styles.modalSub}>Detailed record from /users collection</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Full Name</span>
                <span style={styles.detailValue}>{selectedUserDetail.fullName || "—"}</span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Email Address</span>
                <span style={styles.detailValue}>{selectedUserDetail.email}</span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Assigned Role</span>
                <span style={styles.detailValue}>{selectedUserDetail.role}</span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Account Status</span>
                <span style={styles.detailValue}>
                  {selectedUserDetail.status === "suspended" ? "Suspended (Blocked)" : "Active (Full Access)"}
                </span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Firestore User ID (UID)</span>
                <code style={styles.detailCode}>{selectedUserDetail.uid}</code>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Authentication Provider</span>
                <span style={styles.detailValue}>{selectedUserDetail.provider}</span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Account Created At</span>
                <span style={styles.detailValue}>
                  {selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt).toLocaleString() : "—"}
                </span>
              </div>
              <div style={styles.detailField}>
                <span style={styles.detailLabel}>Last Authenticated Session</span>
                <span style={styles.detailValue}>
                  {selectedUserDetail.lastLogin ? new Date(selectedUserDetail.lastLogin).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            {selectedUserDetail.status === "suspended" && (
              <div style={styles.suspensionDetailBox}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b91c1c", fontWeight: "700", marginBottom: 4 }}>
                  <AlertTriangle size={15} />
                  <span>Account Suspended by Administrator</span>
                </div>
                <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#7f1d1d" }}>
                  <strong>Suspension Reason:</strong> {selectedUserDetail.statusReason || "Policy Violation / Risk review"}
                </p>
                {selectedUserDetail.statusUpdatedAt && (
                  <span style={{ fontSize: "11px", color: "#991b1b" }}>
                    Action taken on: {new Date(selectedUserDetail.statusUpdatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                onClick={() => setSelectedUserDetail(null)}
                style={styles.closeBtn}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Suspend / Reactivate Confirmation with Required Reason */}
      {actionTargetUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    ...styles.modalIconBox,
                    backgroundColor: actionType === "suspend" ? "#fee2e2" : "#dcfce7",
                  }}
                >
                  {actionType === "suspend" ? (
                    <AlertTriangle size={20} color="#b91c1c" />
                  ) : (
                    <RotateCcw size={20} color="#15803d" />
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      ...styles.modalTitle,
                      color: actionType === "suspend" ? "#b91c1c" : "#15803d",
                    }}
                  >
                    {actionType === "suspend" ? "Suspend User Account" : "Reactivate User Account"}
                  </h3>
                  <span style={styles.modalSub}>
                    Target: <strong>{actionTargetUser.fullName}</strong> ({actionTargetUser.email})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActionTargetUser(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} style={styles.modalForm}>
              <div style={styles.actionWarningBox}>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5" }}>
                  {actionType === "suspend" ? (
                    <>
                      <strong>Security Enforcement:</strong> Suspending this account will immediately revoke write privileges in Firestore security rules, block campaign creation, prevent deliverable submissions, and halt invitation responses.
                    </>
                  ) : (
                    <>
                      <strong>Access Restoration:</strong> Reactivating this account will restore standard role-based access for {actionTargetUser.role} operations.
                    </>
                  )}
                </p>
              </div>

              {actionError && (
                <div style={styles.actionErrorBox}>
                  <AlertTriangle size={15} color="#b91c1c" style={{ flexShrink: 0 }} />
                  <span>{actionError}</span>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Mandatory Audit Justification / Reason: <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={4}
                  placeholder={
                    actionType === "suspend"
                      ? "Explain why this user is being suspended (e.g., Deliverable fraud, inappropriate communication, unauthorized impersonation, TOS breach)..."
                      : "Explain the reason for restoring account access (e.g., Policy review resolved, identity verified, suspension period served)..."
                  }
                  style={styles.textarea}
                  required
                />
                <span style={styles.helperText}>
                  This reason will be immutably recorded in the append-only <code>audit_logs</code> database.
                </span>
              </div>

              <div style={styles.modalFooterActions}>
                <button
                  type="button"
                  onClick={() => setActionTargetUser(null)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  style={{
                    ...styles.confirmBtn,
                    backgroundColor: actionType === "suspend" ? "#b91c1c" : "#15803d",
                  }}
                >
                  {isSubmittingAction
                    ? "Updating..."
                    : actionType === "suspend"
                    ? "Confirm Suspension & Log Audit"
                    : "Confirm Reactivation & Log Audit"}
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
    zIndex: 10001,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  headerIconBox: {
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
    fontWeight: "800",
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
    gap: "6px",
    padding: "9px 14px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    cursor: "pointer",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "16px 20px",
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
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 12px",
    flex: "1 1 280px",
    maxWidth: "480px",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "13.5px",
    color: "#0f172a",
    width: "100%",
  },
  clearSearchBtn: {
    background: "transparent",
    border: "none",
    padding: "2px",
    cursor: "pointer",
  },
  filtersGroup: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  filterItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#475569",
  },
  filterSelect: {
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
  },
  tableHeaderInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  tableCounter: {
    fontSize: "13px",
    color: "#64748b",
  },
  resetFiltersBtn: {
    background: "transparent",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#4f46e5",
    cursor: "pointer",
    textDecoration: "underline",
  },
  loadingBox: {
    padding: "50px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#64748b",
    fontSize: "13.5px",
  },
  emptyBox: {
    padding: "60px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
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
    transition: "background 0.15s ease",
  },
  td: {
    padding: "14px",
    fontSize: "13px",
    color: "#334155",
    verticalAlign: "middle",
  },
  userNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  userName: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  currentYouBadge: {
    fontSize: "9.5px",
    fontWeight: "800",
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    padding: "1px 5px",
    borderRadius: "4px",
  },
  userEmail: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid",
  },
  activeStatusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    padding: "3px 8px",
    borderRadius: "12px",
    border: "1px solid #bbf7d0",
  },
  suspendedStatusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    padding: "3px 8px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
  },
  statusReasonHint: {
    display: "block",
    fontSize: "10.5px",
    color: "#991b1b",
    marginTop: "3px",
  },
  providerBadge: {
    fontSize: "11.5px",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  dateWrap: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    color: "#64748b",
  },
  actionButtonGroup: {
    display: "flex",
    gap: "6px",
    justifyContent: "flex-end",
  },
  detailsBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  suspendBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  reactivateBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #bbf7d0",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontSize: "12px",
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
    maxWidth: "560px",
    width: "100%",
    padding: "24px 28px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },
  modalIconBox: {
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
    fontWeight: "800",
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    padding: "4px",
    cursor: "pointer",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  detailField: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  detailValue: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },
  detailCode: {
    fontSize: "11.5px",
    color: "#475569",
    fontFamily: "monospace",
    backgroundColor: "#ffffff",
    padding: "2px 5px",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
    display: "inline-block",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  suspensionDetailBox: {
    marginTop: "14px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "12px 16px",
  },
  modalFooter: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "flex-end",
  },
  closeBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  actionWarningBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  actionErrorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12.5px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#1e293b",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  helperText: {
    fontSize: "11px",
    color: "#64748b",
  },
  modalFooterActions: {
    display: "flex",
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
  confirmBtn: {
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
};

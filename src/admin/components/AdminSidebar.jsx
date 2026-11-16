import React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  ShieldAlert,
  BarChart3,
  FileText,
  ShieldCheck,
  LogOut,
  X,
  Sparkles,
  Lock,
  Activity,
  Megaphone,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, implemented: true },
  { id: "users", label: "User Management", icon: Users, implemented: true },
  { id: "campaigns", label: "Campaign Oversight", icon: Layers, implemented: true },
  { id: "reports_moderation", label: "Reports & Moderation", icon: ShieldAlert, implemented: true },
  { id: "agency_brand", label: "Agency & Brand Verification", icon: Building2, implemented: true },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3, implemented: true },
  { id: "system_health", label: "System Health", icon: Activity, implemented: true },
  { id: "announcements", label: "Announcements", icon: Megaphone, implemented: true },
  { id: "audit_logs", label: "Audit Logs", icon: FileText, implemented: true },
];

export default function AdminSidebar({
  activeTab = "overview",
  onSelectTab,
  user,
  userProfile,
  onSignOut,
  theme,
  isMobileOpen = false,
  onCloseMobile,
  totalUsersCount = 0,
  suspendedUsersCount = 0,
}) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const displayName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    "Platform Administrator";

  const displayEmail = user?.email || "admin@creatoriq.io";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={styles.mobileBackdrop}
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(isMobileOpen ? styles.sidebarMobileOpen : {}),
        }}
      >
        {/* Brand / Portal Header */}
        <div style={styles.brandContainer}>
          <div style={styles.brandRow}>
            <div
              style={{
                ...styles.brandIcon,
                backgroundColor: accent,
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div style={styles.brandTextWrap}>
              <div style={styles.brandTitleRow}>
                <span style={styles.brandName}>CreatorIQ</span>
                <span style={styles.adminBadge}>ADMIN</span>
              </div>
              <span style={styles.brandSub}>Security & Governance</span>
            </div>
            {isMobileOpen && (
              <button
                onClick={onCloseMobile}
                style={styles.closeMobileBtn}
                aria-label="Close admin menu"
              >
                <X size={18} color="#94a3b8" />
              </button>
            )}
          </div>

          <div style={styles.securityTag}>
            <Lock size={12} color="#4f46e5" />
            <span>Root Administrator Scope • RBAC Enforced</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={styles.navSection} aria-label="Admin Navigation">
          <div style={styles.navGroupLabel}>CORE GOVERNANCE</div>
          <div style={styles.navList}>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (isMobileOpen && onCloseMobile) onCloseMobile();
                  }}
                  style={{
                    ...styles.navButton,
                    backgroundColor: isActive ? accentLight : "transparent",
                    color: isActive ? accent : "#475569",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <Icon
                    size={17}
                    color={isActive ? accent : "#64748b"}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={styles.navLabel}>{item.label}</span>

                  {item.id === "users" && suspendedUsersCount > 0 && (
                    <span style={styles.suspensionBadge} title="Suspended users">
                      {suspendedUsersCount}
                    </span>
                  )}

                  {item.badge && (
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: isActive ? "#ffffff" : "#f1f5f9",
                        color: "#64748b",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Card & Sign Out */}
        <div style={styles.footerContainer}>
          <div style={styles.adminProfileCard}>
            <div style={styles.adminAvatar}>
              <ShieldCheck size={18} color="#ffffff" />
            </div>
            <div style={styles.adminInfo}>
              <span style={styles.adminName}>{displayName}</span>
              <span style={styles.adminEmail}>{displayEmail}</span>
            </div>
          </div>

          <button onClick={onSignOut} style={styles.signOutBtn}>
            <LogOut size={15} color="#dc2626" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}

const styles = {
  mobileBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(4px)",
    zIndex: 9998,
  },
  sidebar: {
    width: "270px",
    minWidth: "270px",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    position: "sticky",
    top: 0,
    zIndex: 100,
    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  sidebarMobileOpen: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 9999,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  brandContainer: {
    padding: "20px 20px 16px 20px",
    borderBottom: "1px solid #f1f5f9",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)",
  },
  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  brandTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  brandName: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  adminBadge: {
    fontSize: "9.5px",
    fontWeight: "800",
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    padding: "1px 6px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  brandSub: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "500",
  },
  closeMobileBtn: {
    background: "transparent",
    border: "none",
    padding: "6px",
    cursor: "pointer",
  },
  securityTag: {
    marginTop: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#eef2ff",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "10.5px",
    fontWeight: "600",
    color: "#4338ca",
  },
  navSection: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  navGroupLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.8px",
    padding: "0 10px 8px 10px",
    textTransform: "uppercase",
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "9px",
    border: "none",
    fontSize: "13px",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
  navLabel: {
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  statusBadge: {
    fontSize: "10px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  suspensionBadge: {
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "2px 7px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
  },
  footerContainer: {
    padding: "16px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  adminProfileCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  adminAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    backgroundColor: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  adminInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  adminName: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  adminEmail: {
    fontSize: "11px",
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "9px 12px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
};

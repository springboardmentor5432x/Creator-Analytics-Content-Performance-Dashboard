import React from "react";
import {
  LayoutDashboard,
  Building2,
  Layers,
  Users,
  UserCheck,
  Compass,
  Sparkles,
  Handshake,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  X,
  ShieldCheck,
} from "lucide-react";

export const AGENCY_NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "brands", label: "Brand Clients", icon: Building2 },
  { id: "campaigns", label: "Assigned Campaigns", icon: Layers, hasBadge: "campaigns" },
  { id: "roster", label: "Creator Roster", icon: Users },
  { id: "requests", label: "Creator Requests", icon: UserCheck, hasBadge: "requests" },
  { id: "opportunities", label: "Brand Opportunities", icon: Compass },
  { id: "matches", label: "Creator Matches", icon: Sparkles },
  { id: "deals", label: "Deals & Collabs", icon: Handshake },
  { id: "deliverables", label: "Deliverables", icon: CheckSquare },
  { id: "reports", label: "Reports & Commission", icon: BarChart3 },
  { id: "profile", label: "Agency Profile", icon: Settings },
];

export default function AgencySidebar({
  activeTab = "overview",
  onSelectTab,
  pendingAssignmentsCount = 0,
  pendingRequestsCount = 0,
  user,
  userProfile,
  onSignOut,
  theme,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  const agencyName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Talent Agency");

  const displayEmail = userProfile?.email || user?.email || "agency@creatoriq.io";

  const getInitials = (name) => {
    if (!name) return "AG";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

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
        className={`agency-sidebar ${isMobileOpen ? "is-open" : ""}`}
        style={styles.sidebar}
      >
        {/* Sidebar Header / Brand Logo */}
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={{ ...styles.logoBadge, backgroundColor: accent }}>
              <Building2 size={20} color="#ffffff" />
            </div>
            <div>
              <div style={styles.brandTitle}>CreatorIQ</div>
              <div style={{ ...styles.suiteBadge, color: "#0f766e", backgroundColor: "#ccfbf1" }}>
                Talent Agency Suite
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            style={styles.mobileCloseBtn}
            className="mobile-close-btn"
            aria-label="Close navigation"
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Agency Info Summary */}
        <div style={styles.agencySummaryCard}>
          <div style={{ ...styles.agencyAvatar, backgroundColor: accent }}>
            {getInitials(agencyName)}
          </div>
          <div style={styles.agencyTextWrap}>
            <div style={styles.agencyNameText} title={agencyName}>
              {agencyName}
            </div>
            <div style={styles.agencyEmailText} title={displayEmail}>
              {displayEmail}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={styles.navSection} aria-label="Agency navigation">
          {AGENCY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount =
              item.hasBadge === "campaigns"
                ? pendingAssignmentsCount
                : item.hasBadge === "requests"
                ? pendingRequestsCount
                : 0;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{
                  ...styles.navItem,
                  backgroundColor: isActive ? accentLight : "transparent",
                  color: isActive ? accent : "#475569",
                  fontWeight: isActive ? 600 : 500,
                  borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
                }}
              >
                <div style={styles.navItemLeft}>
                  <Icon
                    size={18}
                    color={isActive ? accent : "#64748b"}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={styles.navLabel}>{item.label}</span>
                </div>

                {badgeCount > 0 && (
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: item.hasBadge === "campaigns" ? "#0284c7" : "#e11d48",
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={styles.footer}>
          <button
            onClick={onSignOut}
            style={styles.signOutBtn}
            title="Sign out of Agency portal"
          >
            <LogOut size={16} color="#64748b" />
            <span style={styles.signOutLabel}>Sign Out</span>
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
    backdropFilter: "blur(2px)",
    zIndex: 99,
  },
  sidebar: {
    width: "260px",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    transition: "transform 0.25s ease",
  },
  header: {
    padding: "20px 20px 16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #f1f5f9",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(13, 148, 136, 0.25)",
  },
  brandTitle: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  suiteBadge: {
    fontSize: "9.5px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "4px",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    marginTop: "2px",
    display: "inline-block",
  },
  mobileCloseBtn: {
    display: "none",
    background: "none",
    border: "none",
    padding: "6px",
    cursor: "pointer",
    borderRadius: "6px",
  },
  agencySummaryCard: {
    margin: "12px 14px",
    padding: "10px 12px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  agencyAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agencyTextWrap: {
    minWidth: 0,
    flex: 1,
  },
  agencyNameText: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  agencyEmailText: {
    fontSize: "11px",
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  navSection: {
    flex: 1,
    padding: "8px 10px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "12.5px",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s ease",
  },
  navItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  navLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#ffffff",
    padding: "2px 7px",
    borderRadius: "10px",
  },
  footer: {
    padding: "12px 14px",
    borderTop: "1px solid #f1f5f9",
  },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  signOutLabel: {
    color: "#475569",
  },
};

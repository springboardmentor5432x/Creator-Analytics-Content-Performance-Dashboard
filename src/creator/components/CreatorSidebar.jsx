import React from "react";
import {
  LayoutDashboard,
  Compass,
  Send,
  Handshake,
  CheckSquare,
  BarChart3,
  User,
  Settings,
  LogOut,
  X,
  Sparkles,
  Building2,
} from "lucide-react";

export const CREATOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "discover", label: "Discover Campaigns", icon: Compass },
  { id: "invitations", label: "Invitations", icon: Send, hasBadge: true },
  { id: "collaborations", label: "My Collaborations", icon: Handshake },
  { id: "deliverables", label: "Deliverables", icon: CheckSquare },
  { id: "agency", label: "Agency Representation", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "profile", label: "My Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function CreatorSidebar({
  activeTab = "dashboard",
  onSelectTab,
  pendingInvitesCount = 0,
  activeDeliverablesCount = 0,
  user,
  userProfile,
  onSignOut,
  theme,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const accent = theme?.accent || "#2563eb";
  const accentLight = theme?.accentLight || "#eff6ff";

  // Derive display values from user profile
  const displayName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Creator");

  const displayHandle =
    userProfile?.handle ||
    (user?.email ? `@${user.email.split("@")[0]}` : "@creator");

  const displayPhoto = userProfile?.photoURL || user?.photoURL || null;

  const getInitials = (name) => {
    if (!name) return "CR";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleKeyDown = (e, tabId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavClick(tabId);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={styles.mobileBackdrop}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        style={{
          ...styles.sidebar,
          transform: isMobileOpen ? "translateX(0)" : undefined,
        }}
        className={`creator-sidebar ${isMobileOpen ? "is-open" : ""}`}
        aria-label="Creator Portal Navigation"
      >
        {/* Top Header: Brand Logo & Title */}
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={{ ...styles.logoIcon, backgroundColor: accent }}>
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={styles.brandName}>CreatorIQ</span>
                <span style={styles.portalBadge}>Creator</span>
              </div>
              <span style={styles.brandTagline}>Creator Intelligence Suite</span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobile}
            style={styles.mobileCloseBtn}
            aria-label="Close sidebar navigation"
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Navigation List */}
        <nav style={styles.navSection}>
          <div style={styles.navGroupLabel}>PORTAL NAVIGATION</div>
          <ul style={styles.navList}>
            {CREATOR_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badgeCount =
                item.id === "invitations"
                  ? pendingInvitesCount
                  : item.id === "deliverables"
                  ? activeDeliverablesCount
                  : 0;

              return (
                <li key={item.id} style={{ listStyle: "none" }}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    style={{
                      ...styles.navItem,
                      backgroundColor: isActive ? accentLight : "transparent",
                      color: isActive ? accent : "#475569",
                      fontWeight: isActive ? 600 : 500,
                      borderLeft: isActive
                        ? `3px solid ${accent}`
                        : "3px solid transparent",
                    }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      size={18}
                      color={isActive ? accent : "#64748b"}
                      style={styles.navIcon}
                    />
                    <span style={styles.navLabel}>{item.label}</span>

                    {/* Pending notifications badge */}
                    {badgeCount > 0 && (
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor:
                            item.id === "invitations" ? "#d97706" : accent,
                        }}
                        title={`${badgeCount} action items`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Profile & Sign Out Section */}
        <div style={styles.footer}>
          <div
            onClick={() => handleNavClick("profile")}
            style={styles.profileCard}
            title="View Creator Profile"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, "profile")}
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                style={styles.avatarImg}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div style={{ ...styles.avatarFallback, backgroundColor: accent }}>
                {getInitials(displayName)}
              </div>
            )}

            <div style={styles.profileText}>
              <span style={styles.profileName}>{displayName}</span>
              <span style={styles.profileHandle}>{displayHandle}</span>
            </div>
          </div>

          <button
            onClick={onSignOut}
            style={styles.signOutBtn}
            title="Sign out of CreatorIQ"
            aria-label="Sign out"
          >
            <LogOut size={16} color="#64748b" style={{ marginRight: 8 }} />
            <span>Sign Out</span>
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(2px)",
    zIndex: 998,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "260px",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 999,
    boxShadow: "2px 0 8px rgba(15, 23, 42, 0.02)",
    transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  header: {
    padding: "20px 18px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
    flexShrink: 0,
  },
  brandName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  portalBadge: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: "2px 6px",
    borderRadius: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  brandTagline: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginTop: "1px",
  },
  mobileCloseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "none", // toggled via CSS media query
  },
  navSection: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
  },
  navGroupLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    padding: "0 10px 8px 10px",
  },
  navList: {
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.15s ease",
    textAlign: "left",
  },
  navIcon: {
    marginRight: "12px",
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  badge: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#ffffff",
    padding: "2px 7px",
    borderRadius: "10px",
    marginLeft: "8px",
    lineHeight: "1.2",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  footer: {
    padding: "14px",
    borderTop: "1px solid #f1f5f9",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  avatarImg: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #cbd5e1",
  },
  avatarFallback: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profileHandle: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};

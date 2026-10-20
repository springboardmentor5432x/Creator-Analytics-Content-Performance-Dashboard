import React, { useState, useEffect, useCallback } from "react";
import {
  Menu,
  Sparkles,
  RefreshCw,
  Bell,
  ChevronRight,
  Database,
  ShieldCheck,
} from "lucide-react";
import CreatorSidebar, { CREATOR_NAV_ITEMS } from "./components/CreatorSidebar";
import CreatorDashboardOverview from "./views/CreatorDashboardOverview";
import CreatorDiscoverCampaigns from "./views/CreatorDiscoverCampaigns";
import CreatorInvitationsView from "./views/CreatorInvitationsView";
import CreatorCollaborationsView from "./views/CreatorCollaborationsView";
import CreatorDeliverablesView from "./views/CreatorDeliverablesView";
import CreatorAgencyView from "./views/CreatorAgencyView";
import CreatorAnalyticsView from "./views/CreatorAnalyticsView";
import CreatorProfileView from "./views/CreatorProfileView";
import CreatorSettingsView from "./views/CreatorSettingsView";
import NotificationBell from "../marketing/components/NotificationBell";
import {
  getCreatorInvitations,
  getCreatorDeliverables,
  subscribeToCreatorDeliverables,
  subscribeToDataChanges,
} from "./creatorService";

export default function CreatorPortalLayout({
  user,
  userProfile,
  onSignOut,
  theme,
  isDemoMode,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Real data states
  const [invitations, setInvitations] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState(userProfile || {});

  const accent = theme?.accent || "#2563eb";
  const currentUser = currentProfile?.uid ? currentProfile : user;

  // Refresh invitations & deliverables
  const loadData = useCallback(async () => {
    try {
      const [invs, dels] = await Promise.all([
        getCreatorInvitations(currentUser),
        getCreatorDeliverables(currentUser),
      ]);
      setInvitations(invs);
      setDeliverables(dels);
    } catch (err) {
      console.warn("[CreatorPortal] Data fetch warning:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
    const unsubscribeEvents = subscribeToDataChanges(() => {
      loadData();
    });
    const unsubscribeFirestore = subscribeToCreatorDeliverables(currentUser, (realtimeDels) => {
      if (realtimeDels && realtimeDels.length > 0) {
        setDeliverables((prev) => {
          const map = new Map();
          prev.forEach((d) => map.set(d.id, d));
          realtimeDels.forEach((d) => map.set(d.id, { ...map.get(d.id), ...d }));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeFirestore();
    };
  }, [loadData, currentUser]);

  // Derived counts for sidebar badges
  const pendingInvitesCount = invitations.filter((i) => i.status === "pending").length;
  const activeDeliverablesCount = deliverables.filter(
    (d) => d.status === "revision_requested" || d.status === "pending"
  ).length;

  const currentTabObj =
    CREATOR_NAV_ITEMS.find((item) => item.id === activeTab) || CREATOR_NAV_ITEMS[0];

  return (
    <div style={styles.layoutWrapper}>
      {/* 1. Left-Side Navigation Sidebar */}
      <CreatorSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        pendingInvitesCount={pendingInvitesCount}
        activeDeliverablesCount={activeDeliverablesCount}
        user={user}
        userProfile={currentProfile}
        onSignOut={onSignOut}
        theme={theme}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* 2. Main Content Container (scrolls independently) */}
      <div style={styles.mainWrapper}>
        {/* Sticky Top Header Bar */}
        <header style={styles.topHeader}>
          <div style={styles.headerLeft}>
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              style={styles.hamburgerBtn}
              aria-label="Open portal navigation"
            >
              <Menu size={20} color="#334155" />
            </button>

            {/* Breadcrumb Navigation Indicator */}
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbRoot}>Creator Portal</span>
              <ChevronRight size={14} color="#94a3b8" />
              <span style={styles.breadcrumbActive}>{currentTabObj.label}</span>
            </div>
          </div>

          {/* Top Header Right Actions */}
          <div style={styles.headerRight}>
            {/* Real-time Notification Bell */}
            <NotificationBell
              currentUser={user}
              role="Creator"
              theme={theme}
            />

            {/* Real-time sync badge */}
            <div style={styles.syncBadge} title="Real-time Firestore Synchronized">
              <span style={styles.syncDot} />
              <span style={styles.syncText}>Live Synced</span>
            </div>

            {/* Quick Profile Pill */}
            <div
              onClick={() => setActiveTab("profile")}
              style={styles.headerProfilePill}
              role="button"
              tabIndex={0}
              title="Edit Profile"
            >
              <span style={styles.headerProfileName}>
                {currentProfile?.fullName || user?.displayName || (user?.email ? user.email.split("@")[0] : "Creator")}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Views Area */}
        <main style={styles.contentArea}>
          {activeTab === "dashboard" && (
            <CreatorDashboardOverview
              user={user}
              userProfile={currentProfile}
              theme={theme}
              isDemoMode={isDemoMode}
              invitations={invitations}
              deliverables={deliverables}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "discover" && (
            <CreatorDiscoverCampaigns
              theme={theme}
              user={user}
              userProfile={currentProfile}
            />
          )}

          {activeTab === "invitations" && (
            <CreatorInvitationsView
              invitations={invitations}
              theme={theme}
              user={user}
              userProfile={currentProfile}
              onRefresh={loadData}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "collaborations" && (
            <CreatorCollaborationsView
              invitations={invitations}
              deliverables={deliverables}
              theme={theme}
              onNavigate={(tab) => setActiveTab(tab)}
              onRefresh={loadData}
              user={user}
              userProfile={currentProfile}
            />
          )}

          {activeTab === "deliverables" && (
            <CreatorDeliverablesView
              deliverables={deliverables}
              invitations={invitations}
              loading={loading}
              theme={theme}
              user={user}
              userProfile={currentProfile}
              onRefresh={loadData}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "agency" && (
            <CreatorAgencyView
              user={user}
              userProfile={currentProfile}
              theme={theme}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "analytics" && (
            <CreatorAnalyticsView theme={theme} />
          )}

          {activeTab === "profile" && (
            <CreatorProfileView
              user={user}
              userProfile={currentProfile}
              theme={theme}
              onProfileUpdated={(updated) => {
                setCurrentProfile((prev) => ({ ...prev, ...updated }));
              }}
            />
          )}

          {activeTab === "settings" && (
            <CreatorSettingsView
              user={user}
              userProfile={currentProfile}
              theme={theme}
              onSignOut={onSignOut}
            />
          )}
        </main>
      </div>

      {/* Embedded CSS for responsive sidebar behavior */}
      <style>{`
        @media (max-width: 1024px) {
          .creator-sidebar {
            transform: translateX(-100%);
          }
          .creator-sidebar.is-open {
            transform: translateX(0);
          }
          .creator-sidebar .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  layoutWrapper: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f8fafc",
  },
  mainWrapper: {
    flex: 1,
    marginLeft: "260px", // space for fixed desktop sidebar
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    transition: "margin-left 0.25s ease",
  },
  topHeader: {
    position: "sticky",
    top: 0,
    zIndex: 90,
    height: "64px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  hamburgerBtn: {
    display: "none", // toggled on mobile via CSS
    background: "none",
    border: "none",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
  },
  breadcrumbRoot: {
    color: "#64748b",
    fontWeight: "500",
  },
  breadcrumbActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  syncBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "20px",
    padding: "4px 10px",
  },
  syncDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
  },
  syncText: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
  },
  headerProfilePill: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
  },
  headerProfileName: {
    maxWidth: "140px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  contentArea: {
    flex: 1,
    padding: "24px 28px 40px 28px",
    maxWidth: "1400px",
    width: "100%",
    boxSizing: "border-box",
  },
};

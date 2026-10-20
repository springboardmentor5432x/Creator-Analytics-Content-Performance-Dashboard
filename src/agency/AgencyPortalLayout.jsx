import React, { useState, useEffect, useCallback } from "react";
import { Menu, ChevronRight, RefreshCw, Bell } from "lucide-react";
import AgencySidebar, { AGENCY_NAV_ITEMS } from "./components/AgencySidebar";
import NotificationBell from "../marketing/components/NotificationBell";
import {
  initAgencyStore,
  getAgencyBrandAssignments,
  getAgencyCreatorRelationships,
  getAgencyRecommendations,
} from "./agencyService";

// Views
import AgencyOverview from "./views/AgencyOverview";
import AgencyBrandClients from "./views/AgencyBrandClients";
import AgencyAssignedCampaigns from "./views/AgencyAssignedCampaigns";
import AgencyCreatorRoster from "./views/AgencyCreatorRoster";
import AgencyCreatorRequests from "./views/AgencyCreatorRequests";
import AgencyBrandOpportunities from "./views/AgencyBrandOpportunities";
import AgencyCreatorMatches from "./views/AgencyCreatorMatches";
import AgencyDealsCollaborations from "./views/AgencyDealsCollaborations";
import AgencyDeliverables from "./views/AgencyDeliverables";
import AgencyReports from "./views/AgencyReports";
import AgencyProfileSettings from "./views/AgencyProfileSettings";

export default function AgencyPortalLayout({
  user,
  userProfile,
  onSignOut,
  theme,
  isDemoMode,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const accent = theme?.accent || "#0d9488";
  const agencyId = user?.uid || "usr_agency_demo";

  const loadData = useCallback(async () => {
    try {
      initAgencyStore();
      const [assigns, rels, recs] = await Promise.all([
        getAgencyBrandAssignments({ agencyId }),
        getAgencyCreatorRelationships({ agencyId }),
        getAgencyRecommendations({ agencyId }),
      ]);
      setAssignments(assigns || []);
      setRelationships(rels || []);
      setRecommendations(recs || []);
    } catch (err) {
      console.warn("[AgencyPortal] Data load warning:", err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pendingAssignmentsCount = assignments.filter(
    (a) => a.status === "pending"
  ).length;
  const pendingRequestsCount = relationships.filter(
    (r) => r.status === "pending" && r.initiatedBy === "creator"
  ).length;

  const currentTabObj =
    AGENCY_NAV_ITEMS.find((i) => i.id === activeTab) || AGENCY_NAV_ITEMS[0];

  return (
    <div style={styles.layoutWrapper}>
      <AgencySidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        pendingAssignmentsCount={pendingAssignmentsCount}
        pendingRequestsCount={pendingRequestsCount}
        user={user}
        userProfile={userProfile}
        onSignOut={onSignOut}
        theme={theme}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div style={styles.mainWrapper}>
        <header style={styles.topHeader}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setIsMobileNavOpen(true)}
              style={styles.hamburgerBtn}
              aria-label="Open agency navigation"
              className="agency-hamburger"
            >
              <Menu size={20} color="#334155" />
            </button>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbRoot}>Agency Portal</span>
              <ChevronRight size={14} color="#94a3b8" />
              <span style={styles.breadcrumbActive}>{currentTabObj.label}</span>
            </div>
          </div>

          <div style={styles.headerRight}>
            <NotificationBell currentUser={user} role="Agency" theme={theme} />

            <button
              onClick={loadData}
              style={styles.refreshBtn}
              title="Refresh data"
            >
              <RefreshCw size={14} color="#64748b" />
            </button>

            <div style={styles.syncBadge}>
              <span style={{ ...styles.syncDot, backgroundColor: accent }} />
              <span style={{ ...styles.syncText, color: accent }}>Live</span>
            </div>

            <div
              onClick={() => setActiveTab("profile")}
              style={styles.headerProfilePill}
              role="button"
              tabIndex={0}
              title="Agency Profile"
            >
              <span style={styles.headerProfileName}>
                {userProfile?.fullName ||
                  user?.displayName ||
                  (user?.email ? user.email.split("@")[0] : "Agency")}
              </span>
            </div>
          </div>
        </header>

        <main style={styles.contentArea}>
          {activeTab === "overview" && (
            <AgencyOverview
              user={user}
              userProfile={userProfile}
              theme={theme}
              isDemoMode={isDemoMode}
              assignments={assignments}
              relationships={relationships}
              recommendations={recommendations}
              loading={loading}
              onNavigate={(tab) => setActiveTab(tab)}
              onRefresh={loadData}
            />
          )}
          {activeTab === "brands" && (
            <AgencyBrandClients
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              onRefresh={loadData}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "campaigns" && (
            <AgencyAssignedCampaigns
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              recommendations={recommendations}
              onRefresh={loadData}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "roster" && (
            <AgencyCreatorRoster
              user={user}
              userProfile={userProfile}
              theme={theme}
              relationships={relationships}
              onRefresh={loadData}
            />
          )}
          {activeTab === "requests" && (
            <AgencyCreatorRequests
              user={user}
              userProfile={userProfile}
              theme={theme}
              relationships={relationships}
              onRefresh={loadData}
            />
          )}
          {activeTab === "opportunities" && (
            <AgencyBrandOpportunities
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              relationships={relationships}
              onRefresh={loadData}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "matches" && (
            <AgencyCreatorMatches
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              relationships={relationships}
              recommendations={recommendations}
              onRefresh={loadData}
            />
          )}
          {activeTab === "deals" && (
            <AgencyDealsCollaborations
              user={user}
              userProfile={userProfile}
              theme={theme}
              relationships={relationships}
              recommendations={recommendations}
              onRefresh={loadData}
            />
          )}
          {activeTab === "deliverables" && (
            <AgencyDeliverables
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              onRefresh={loadData}
            />
          )}
          {activeTab === "reports" && (
            <AgencyReports
              user={user}
              userProfile={userProfile}
              theme={theme}
              assignments={assignments}
              relationships={relationships}
              recommendations={recommendations}
            />
          )}
          {activeTab === "profile" && (
            <AgencyProfileSettings
              user={user}
              userProfile={userProfile}
              theme={theme}
              onSignOut={onSignOut}
              onRefresh={loadData}
            />
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .agency-sidebar {
            transform: translateX(-100%);
          }
          .agency-sidebar.is-open {
            transform: translateX(0);
          }
          .agency-sidebar .mobile-close-btn {
            display: block !important;
          }
          .agency-hamburger {
            display: flex !important;
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
    marginLeft: "260px",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
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
    display: "none",
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
    gap: "10px",
  },
  refreshBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "6px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  syncBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "20px",
    padding: "4px 10px",
  },
  syncDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
  syncText: {
    fontSize: "11px",
    fontWeight: "700",
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

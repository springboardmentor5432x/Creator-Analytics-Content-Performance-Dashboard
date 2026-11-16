import React, { useState, useEffect, useCallback } from "react";
import {
  Menu,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Lock,
  AlertTriangle,
  LogOut,
  Sparkles,
} from "lucide-react";
import AdminSidebar, { ADMIN_NAV_ITEMS } from "./components/AdminSidebar";
import AdminOverviewView from "./views/AdminOverviewView";
import AdminUserManagementView from "./views/AdminUserManagementView";
import AdminAuditLogsView from "./views/AdminAuditLogsView";
import AdminReportsModerationView from "./views/AdminReportsModerationView";
import AdminCampaignOversightView from "./views/AdminCampaignOversightView";
import AdminAnalyticsView from "./views/AdminAnalyticsView";
import AdminVerificationView from "./views/AdminVerificationView";
import AdminSystemHealthView from "./views/AdminSystemHealthView";
import AdminAnnouncementsView from "./views/AdminAnnouncementsView";
import { fetchPlatformOverviewStats } from "./adminService";
import NotificationBell from "../marketing/components/NotificationBell";

export default function AdminPortalLayout({
  user,
  userProfile,
  onSignOut,
  theme,
  isDemoMode,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  // Strict Client-Side Role Guard
  // The verified profile must explicitly have role === 'Admin'
  const isAuthorizedAdmin =
    userProfile?.role === "Admin" ||
    (isDemoMode && user?.email === "admin@creatoriq.io");

  const loadStats = useCallback(async () => {
    try {
      const stats = await fetchPlatformOverviewStats();
      setOverviewStats(stats);
    } catch (err) {
      console.warn("Failed to load platform stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadStats();
    }
  }, [isAuthorizedAdmin, loadStats]);

  // If user does not possess verified Admin role, render strict Access Denied screen
  if (!isAuthorizedAdmin) {
    return (
      <div style={styles.deniedContainer}>
        <div style={styles.deniedCard}>
          <div style={styles.deniedIconBox}>
            <AlertTriangle size={36} color="#b91c1c" />
          </div>
          <span style={styles.deniedBadge}>SECURITY BARRIER • 403 FORBIDDEN</span>
          <h1 style={styles.deniedTitle}>Admin Portal Access Denied</h1>
          <p style={styles.deniedDesc}>
            Your authenticated account (<code>{user?.email || "Unknown user"}</code>) is registered with the role:{" "}
            <strong>"{userProfile?.role || "Non-Admin"}"</strong>.
          </p>
          <div style={styles.deniedExplanation}>
            <Lock size={15} color="#991b1b" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              The Platform Administration Suite is restricted exclusively to verified administrators. In accordance with zero-trust security policies, frontend role tampering is strictly blocked.
            </span>
          </div>
          <button onClick={onSignOut} style={styles.deniedSignOutBtn}>
            <LogOut size={14} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    );
  }

  const currentTabObj =
    ADMIN_NAV_ITEMS.find((item) => item.id === activeTab) || ADMIN_NAV_ITEMS[0];

  return (
    <div style={styles.layoutWrapper}>
      {/* 1. Left Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        user={user}
        userProfile={userProfile}
        onSignOut={onSignOut}
        theme={theme}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        totalUsersCount={overviewStats?.totalUsers ?? 0}
        suspendedUsersCount={overviewStats?.statusCounts?.suspended ?? 0}
      />

      {/* 2. Main Content Wrapper */}
      <div style={styles.mainWrapper}>
        {/* Top Header */}
        <header style={styles.topHeader}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setIsMobileOpen(true)}
              style={styles.hamburgerBtn}
              aria-label="Open navigation menu"
            >
              <Menu size={20} color="#334155" />
            </button>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbRoot}>Platform Admin</span>
              <ChevronRight size={14} color="#94a3b8" />
              <span style={styles.breadcrumbActive}>{currentTabObj.label}</span>
            </div>
          </div>

          <div style={styles.headerRight}>
            <NotificationBell currentUser={user} role="Admin" theme={theme} />

            <button
              onClick={loadStats}
              style={styles.headerIconBtn}
              title="Refresh platform statistics"
            >
              <RefreshCw size={14} color="#64748b" />
            </button>

            <div style={styles.adminPill}>
              <ShieldCheck size={13} color="#4338ca" />
              <span>Admin Verified</span>
            </div>

            <div style={styles.userProfilePill}>
              <span style={styles.userName}>
                {userProfile?.fullName || user?.displayName || "Administrator"}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main style={styles.contentArea}>
          {activeTab === "overview" && (
            <AdminOverviewView
              theme={theme}
              user={user}
              userProfile={userProfile}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "users" && (
            <AdminUserManagementView
              theme={theme}
              user={user}
              userProfile={userProfile}
              onUserStatusUpdated={loadStats}
            />
          )}

          {activeTab === "agency_brand" && (
            <AdminVerificationView
              user={user}
              userProfile={userProfile}
              theme={theme}
            />
          )}

          {activeTab === "campaigns" && (
            <AdminCampaignOversightView
              user={user}
              userProfile={userProfile}
              theme={theme}
              onNavigateToReports={() => setActiveTab("reports_moderation")}
            />
          )}

          {activeTab === "reports_moderation" && (
            <AdminReportsModerationView
              user={user}
              userProfile={userProfile}
              theme={theme}
              onNavigateToCampaigns={() => setActiveTab("campaigns")}
              onNavigateToUsers={() => setActiveTab("users")}
            />
          )}

          {activeTab === "analytics" && (
            <AdminAnalyticsView theme={theme} />
          )}

          {activeTab === "system_health" && (
            <AdminSystemHealthView theme={theme} />
          )}

          {activeTab === "announcements" && (
            <AdminAnnouncementsView
              user={user}
              userProfile={userProfile}
              theme={theme}
            />
          )}

          {activeTab === "audit_logs" && (
            <AdminAuditLogsView theme={theme} />
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  layoutWrapper: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  mainWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflowX: "hidden",
  },
  topHeader: {
    height: "64px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    position: "sticky",
    top: 0,
    zIndex: 90,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  hamburgerBtn: {
    display: "none",
    background: "transparent",
    border: "none",
    padding: "6px",
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
    gap: "14px",
  },
  headerIconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  adminPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#4338ca",
    backgroundColor: "#e0e7ff",
    padding: "3px 8px",
    borderRadius: "12px",
    border: "1px solid #c7d2fe",
  },
  userProfilePill: {
    padding: "4px 10px",
    backgroundColor: "#f1f5f9",
    borderRadius: "8px",
  },
  userName: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  contentArea: {
    flex: 1,
    padding: "28px",
    maxWidth: "1440px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  deniedContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: "20px",
  },
  deniedCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #fecaca",
    padding: "36px 32px",
    maxWidth: "520px",
    textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  deniedIconBox: {
    width: "68px",
    height: "68px",
    borderRadius: "18px",
    backgroundColor: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  deniedBadge: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#b91c1c",
    letterSpacing: "0.8px",
    marginBottom: "8px",
  },
  deniedTitle: {
    margin: "0 0 10px 0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  deniedDesc: {
    margin: "0 0 18px 0",
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: "1.5",
  },
  deniedExplanation: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "12px",
    color: "#991b1b",
    textAlign: "left",
    marginBottom: "24px",
    lineHeight: "1.45",
  },
  deniedSignOutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "8px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
};

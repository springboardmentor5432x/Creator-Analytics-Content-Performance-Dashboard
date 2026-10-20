import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Layers,
  BarChart3,
  PieChart,
  Users,
  Video,
  Share2,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import InteractiveLineChart from "../components/InteractiveLineChart";
import RevenueDonutChart from "../components/RevenueDonutChart";
import AudienceDemographics from "../components/AudienceDemographics";
import TopContentSection from "../components/TopContentSection";
import SponsorshipPipeline from "../components/SponsorshipPipeline";
import SocialAccountsSection from "./SocialAccountsSection";
import CreatorCampaignsModule from "../components/CreatorCampaignsModule";
import { CREATOR_OVERVIEW } from "../mockData";

export default function CreatorAnalyticsSection({ theme, userHandle, currentUser, userProfile }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'charts' | 'content' | 'revenue' | 'accounts' | 'campaigns'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotice = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showNotice("Real-time telemetry and API benchmarks updated!");
    }, 700);
  };

  const handleExport = () => {
    showNotice("Generated CreatorIQ Intelligence Report (PDF/CSV ready for download)!");
  };

  return (
    <div style={styles.container}>
      {/* Dynamic Notification Toast */}
      {notification && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{notification}</span>
        </div>
      )}

      {/* Control Bar & Sub-Navigation */}
      <div style={styles.actionBar}>
        <div style={styles.subTabs}>
          {[
            { id: "all", label: "Full Suite Overview", icon: Layers },
            { id: "campaigns", label: "Campaign Deals & Invites", icon: Sparkles },
            { id: "charts", label: "Visualizations & Graphs", icon: BarChart3 },
            { id: "revenue", label: "Revenue & Deals", icon: DollarSign },
            { id: "content", label: "Top Content", icon: Video },
            { id: "accounts", label: "Social Accounts", icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.subTabBtn,
                  backgroundColor: isSelected ? "#2563eb" : "transparent",
                  color: isSelected ? "#ffffff" : "#475569",
                  fontWeight: isSelected ? 600 : 500,
                  boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.25)" : "none",
                }}
              >
                <Icon size={14} style={{ marginRight: 6 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={styles.actionButtons}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={styles.refreshBtn}
            title="Fetch real-time updates"
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
                marginRight: 6,
              }}
            />
            {isRefreshing ? "Refreshing..." : "Sync Live Data"}
          </button>

          <button
            onClick={handleExport}
            style={styles.exportBtn}
            title="Export CSV & PDF report"
          >
            <Download size={14} style={{ marginRight: 6 }} />
            Export Analytics
          </button>
        </div>
      </div>

      {/* Render content depending on activeTab */}
      {(activeTab === "all" || activeTab === "charts") && (
        <>
          {/* Main Interactive Area & Line Chart */}
          <InteractiveLineChart themeColor={theme?.accent || "#2563eb"} />

          {/* 2-Column Visualization Grid */}
          <div style={styles.twoColGrid}>
            <RevenueDonutChart />
            <AudienceDemographics />
          </div>
        </>
      )}

      {(activeTab === "all" || activeTab === "content") && (
        <TopContentSection />
      )}

      {(activeTab === "all" || activeTab === "campaigns" || activeTab === "revenue") && (
        <CreatorCampaignsModule
          currentUser={currentUser}
          userProfile={userProfile}
          theme={theme}
        />
      )}

      {(activeTab === "all" || activeTab === "revenue") && (
        <SponsorshipPipeline />
      )}

      {(activeTab === "all" || activeTab === "accounts") && (
        <SocialAccountsSection />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
    position: "relative",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "13px",
    fontWeight: "600",
    padding: "12px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    zIndex: 999,
    animation: "fadeIn 0.2s ease",
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    backgroundColor: "#ffffff",
    padding: "8px 12px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  subTabs: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  subTabBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    fontSize: "12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  actionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#f8fafc",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  exportBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "24px",
    marginBottom: "24px",
  },
};

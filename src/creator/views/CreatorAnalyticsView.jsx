import React, { useState } from "react";
import {
  BarChart3,
  Download,
  RefreshCw,
  Layers,
  PieChart,
  Video,
  Share2,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import InteractiveLineChart from "../components/InteractiveLineChart";
import RevenueDonutChart from "../components/RevenueDonutChart";
import AudienceDemographics from "../components/AudienceDemographics";
import TopContentSection from "../components/TopContentSection";
import SocialAccountsSection from "../sections/SocialAccountsSection";

export default function CreatorAnalyticsView({ theme }) {
  const accent = theme?.accent || "#2563eb";
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Real-time telemetry and API benchmarks synchronized!");
    }, 600);
  };

  const handleExport = () => {
    showToast("CreatorIQ Analytics Export initiated (CSV / PDF prepared).");
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Creator Analytics & Benchmarks</h2>
          <p style={styles.pageSubtitle}>
            Cross-platform telemetry, audience retention curves, and revenue stream attribution.
          </p>
        </div>

        <div style={styles.actionButtons}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={styles.refreshBtn}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
                marginRight: 6,
              }}
            />
            {isRefreshing ? "Syncing..." : "Sync Live Data"}
          </button>
          <button onClick={handleExport} style={styles.exportBtn}>
            <Download size={14} style={{ marginRight: 6 }} />
            Export Analytics
          </button>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div style={styles.subTabs}>
        {[
          { id: "all", label: "Full Analytics Suite", icon: Layers },
          { id: "charts", label: "Audience Retention & Views", icon: BarChart3 },
          { id: "revenue", label: "Income & Deals", icon: DollarSign },
          { id: "content", label: "Top Content", icon: Video },
          { id: "accounts", label: "Connected Platforms", icon: Share2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.subTabBtn,
                backgroundColor: isSelected ? accent : "#ffffff",
                color: isSelected ? "#ffffff" : "#475569",
                borderColor: isSelected ? accent : "#cbd5e1",
                fontWeight: isSelected ? 600 : 500,
              }}
            >
              <Icon size={14} style={{ marginRight: 6 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content depending on activeTab */}
      {(activeTab === "all" || activeTab === "charts") && (
        <>
          <InteractiveLineChart themeColor={accent} />
          <div style={styles.twoColGrid}>
            <RevenueDonutChart />
            <AudienceDemographics />
          </div>
        </>
      )}

      {(activeTab === "all" || activeTab === "content") && (
        <TopContentSection />
      )}

      {(activeTab === "all" || activeTab === "revenue") && activeTab !== "all" && (
        <div style={styles.twoColGrid}>
          <RevenueDonutChart />
          <AudienceDemographics />
        </div>
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
    gap: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  exportBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  subTabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  subTabBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "12.5px",
    cursor: "pointer",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "20px",
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
    zIndex: 1000,
  },
};

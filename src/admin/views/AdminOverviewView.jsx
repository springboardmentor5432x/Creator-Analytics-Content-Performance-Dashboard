import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  Layers,
  Handshake,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { fetchPlatformOverviewStats, fetchAuditLogs } from "../adminService";

export default function AdminOverviewView({
  theme,
  user,
  userProfile,
  onNavigate,
}) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [overviewStats, logs] = await Promise.all([
        fetchPlatformOverviewStats(),
        fetchAuditLogs(),
      ]);
      setStats(overviewStats);
      setRecentLogs((logs || []).slice(0, 4));
    } catch (err) {
      console.warn("Admin overview data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  return (
    <div style={styles.container}>
      {/* Banner Card */}
      <div style={styles.bannerCard}>
        <div style={styles.bannerLeft}>
          <div style={{ ...styles.bannerIcon, backgroundColor: accentLight }}>
            <ShieldCheck size={28} color={accent} />
          </div>
          <div>
            <div style={styles.bannerTagRow}>
              <span style={styles.bannerTag}>SYSTEM GOVERNANCE SUITE</span>
              <span style={styles.syncTag}>
                <span style={styles.pulseDot}></span>
                Live Database Stream
              </span>
            </div>
            <h1 style={styles.bannerTitle}>Platform Administration & Overview</h1>
            <p style={styles.bannerSub}>
              Real-time oversight of all user accounts, role allocations, active campaigns, and tamper-resistant audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={loadOverviewData}
          style={styles.refreshBtn}
          title="Refresh platform statistics"
        >
          <RefreshCw size={14} color="#334155" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 1. Core Platform KPI Cards */}
      <div style={styles.kpiGrid}>
        {/* Total Users & Status */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Registered Users</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#eef2ff" }}>
              <Users size={18} color="#4f46e5" />
            </div>
          </div>
          <div style={styles.kpiVal}>{stats?.totalUsers ?? "..."}</div>
          <div style={styles.kpiSplitRow}>
            <span style={styles.activePill}>
              <CheckCircle2 size={11} /> {stats?.statusCounts?.active ?? 0} Active
            </span>
            {stats?.statusCounts?.suspended > 0 && (
              <span style={styles.suspendedPill}>
                <AlertTriangle size={11} /> {stats?.statusCounts?.suspended} Suspended
              </span>
            )}
          </div>
        </div>

        {/* Campaigns Count & Status */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Platform Campaigns</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f0fdfa" }}>
              <Layers size={18} color="#0d9488" />
            </div>
          </div>
          <div style={styles.kpiVal}>{stats?.campaignCounts?.total ?? 0}</div>
          <div style={styles.kpiSplitRow}>
            <span style={{ fontSize: "11.5px", color: "#065f46", fontWeight: "600" }}>
              {stats?.campaignCounts?.active ?? 0} Active
            </span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>•</span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
              {stats?.campaignCounts?.completed ?? 0} Completed
            </span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>•</span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
              {stats?.campaignCounts?.draft ?? 0} Draft
            </span>
          </div>
        </div>

        {/* Collaborations / Contracts */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Collaborations & Invites</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f0f9ff" }}>
              <Handshake size={18} color="#0284c7" />
            </div>
          </div>
          <div style={styles.kpiVal}>{stats?.collaborationCounts?.total ?? 0}</div>
          <div style={styles.kpiSplitRow}>
            <span style={{ fontSize: "11.5px", color: "#0369a1", fontWeight: "600" }}>
              {stats?.collaborationCounts?.accepted ?? 0} Accepted
            </span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>•</span>
            <span style={{ fontSize: "11.5px", color: "#b45309" }}>
              {stats?.collaborationCounts?.pending ?? 0} Pending
            </span>
          </div>
        </div>

        {/* Audit Log Entries */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Audit Trail Entries</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#fdf2f8" }}>
              <FileText size={18} color="#db2777" />
            </div>
          </div>
          <div style={styles.kpiVal}>{stats?.totalAuditLogs ?? 0}</div>
          <div style={styles.kpiSplitRow}>
            <span style={{ fontSize: "11.5px", color: "#475569" }}>
              Append-only immutable security ledger
            </span>
          </div>
        </div>
      </div>

      {/* 2. Registered Users Grouped by Role */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div>
            <h2 style={styles.sectionTitle}>Registered Users by Platform Role</h2>
            <p style={styles.sectionSubtitle}>
              Live breakdown of verified accounts across Creator, Agency, Brand Marketing, and Admin suites
            </p>
          </div>
          <button
            onClick={() => onNavigate("users")}
            style={{ ...styles.viewAllBtn, color: accent }}
          >
            <span>Manage All Users</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={styles.roleGrid}>
          {/* Creator */}
          <div style={styles.roleStatCard}>
            <div style={styles.roleStatTop}>
              <div style={{ ...styles.roleIconWrap, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                <Sparkles size={18} />
              </div>
              <span style={styles.roleStatName}>Content Creators</span>
            </div>
            <div style={styles.roleStatNumber}>{stats?.roleCounts?.Creator ?? 0}</div>
            <span style={styles.roleStatDesc}>Channels, influencers & talent</span>
          </div>

          {/* Agency */}
          <div style={styles.roleStatCard}>
            <div style={styles.roleStatTop}>
              <div style={{ ...styles.roleIconWrap, backgroundColor: "#f0fdfa", color: "#0d9488" }}>
                <Building2 size={18} />
              </div>
              <span style={styles.roleStatName}>Talent Agencies</span>
            </div>
            <div style={styles.roleStatNumber}>{stats?.roleCounts?.Agency ?? 0}</div>
            <span style={styles.roleStatDesc}>Roster managers & talent reps</span>
          </div>

          {/* Marketing */}
          <div style={styles.roleStatCard}>
            <div style={styles.roleStatTop}>
              <div style={{ ...styles.roleIconWrap, backgroundColor: "#f0f9ff", color: "#0284c7" }}>
                <TrendingUp size={18} />
              </div>
              <span style={styles.roleStatName}>Brand Marketing</span>
            </div>
            <div style={styles.roleStatNumber}>{stats?.roleCounts?.["Marketing Team"] ?? 0}</div>
            <span style={styles.roleStatDesc}>Campaign sponsors & advertisers</span>
          </div>

          {/* Admin */}
          <div style={styles.roleStatCard}>
            <div style={{ ...styles.roleIconWrap, backgroundColor: "#eef2ff", color: "#4f46e5" }}>
              <ShieldCheck size={18} />
            </div>
            <div style={styles.roleStatTop}>
              <span style={styles.roleStatName}>Platform Admins</span>
            </div>
            <div style={styles.roleStatNumber}>{stats?.roleCounts?.Admin ?? 0}</div>
            <span style={styles.roleStatDesc}>Security & system governance</span>
          </div>
        </div>
      </div>

      {/* 3. Reports & Moderation (Live Queue) */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...styles.noticeIconWrap, backgroundColor: "#fee2e2" }}>
              <ShieldAlert size={18} color="#dc2626" />
            </div>
            <div>
              <h2 style={styles.sectionTitle}>Reports & Content Moderation</h2>
              <span style={styles.sectionSubtitle}>
                Live Trust & Safety queue for user impersonation, fraudulent campaigns, and policy violations
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("reports_moderation")}
            style={{ ...styles.viewAllBtn, color: "#dc2626" }}
          >
            <span>Open Moderation Queue</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={styles.roleStatsGrid}>
          <div style={styles.roleStatCard}>
            <span style={styles.roleStatName}>Total Filed</span>
            <div style={styles.roleStatNumber}>{stats?.reportsStats?.totalReports ?? 0}</div>
            <span style={styles.roleStatDesc}>All-time violation reports</span>
          </div>
          <div style={styles.roleStatCard}>
            <span style={styles.roleStatName}>Open (Pending)</span>
            <div style={{ ...styles.roleStatNumber, color: "#b45309" }}>{stats?.reportsStats?.openReports ?? 0}</div>
            <span style={styles.roleStatDesc}>Awaiting admin triage</span>
          </div>
          <div style={styles.roleStatCard}>
            <span style={styles.roleStatName}>Under Review</span>
            <div style={{ ...styles.roleStatNumber, color: "#1d4ed8" }}>{stats?.reportsStats?.underReview ?? 0}</div>
            <span style={styles.roleStatDesc}>Active safety investigation</span>
          </div>
          <div style={styles.roleStatCard}>
            <span style={styles.roleStatName}>Resolved</span>
            <div style={{ ...styles.roleStatNumber, color: "#15803d" }}>{stats?.reportsStats?.resolved ?? 0}</div>
            <span style={styles.roleStatDesc}>Actions enforced or cleared</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Audit Log Activity */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div>
            <h2 style={styles.sectionTitle}>Recent Administrative Actions</h2>
            <p style={styles.sectionSubtitle}>
              Immutable record of security events, account status modifications, and permission verifications
            </p>
          </div>
          <button
            onClick={() => onNavigate("audit_logs")}
            style={{ ...styles.viewAllBtn, color: accent }}
          >
            <span>View Full Audit Ledger</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div style={styles.emptyLogsBox}>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
              No administrative events recorded yet.
            </p>
          </div>
        ) : (
          <div style={styles.logsList}>
            {recentLogs.map((log) => (
              <div key={log.id} style={styles.logItem}>
                <div style={styles.logLeft}>
                  <div style={styles.logIconBox}>
                    <Clock size={15} color="#4f46e5" />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={styles.logAction}>{log.action}</span>
                      <span style={styles.logTarget}>
                        Target: {log.targetEmail || log.targetId}
                      </span>
                    </div>
                    <p style={styles.logReason}>"{log.reason}"</p>
                  </div>
                </div>

                <div style={styles.logRight}>
                  <span style={styles.logAdmin}>By: {log.adminEmail || log.adminName}</span>
                  <span style={styles.logTime}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  bannerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "18px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  bannerIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTagRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "4px",
  },
  bannerTag: {
    fontSize: "10.5px",
    fontWeight: "800",
    color: "#4338ca",
    backgroundColor: "#eef2ff",
    padding: "2px 8px",
    borderRadius: "4px",
    letterSpacing: "0.6px",
  },
  syncTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#059669",
  },
  pulseDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
  },
  bannerTitle: {
    margin: "0 0 4px 0",
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  bannerSub: {
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
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
  },
  kpiHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  kpiIconBox: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiVal: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  kpiSplitRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "2px",
    flexWrap: "wrap",
  },
  activePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #bbf7d0",
  },
  suspendedPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    margin: "3px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
  },
  viewAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "transparent",
    border: "none",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
  },
  roleStatCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  roleStatTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  roleIconWrap: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  roleStatName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },
  roleStatNumber: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
  },
  roleStatDesc: {
    fontSize: "11.5px",
    color: "#64748b",
  },
  noticeIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  plannedBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    padding: "3px 10px",
    borderRadius: "12px",
    border: "1px solid #fde68a",
  },
  honestNoticeBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "10px",
    padding: "14px 18px",
  },
  honestNoticeText: {
    margin: 0,
    fontSize: "13px",
    color: "#78350f",
    lineHeight: "1.5",
  },
  logsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  logItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    backgroundColor: "#f8fafc",
  },
  logLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logIconBox: {
    width: "30px",
    height: "30px",
    borderRadius: "6px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logAction: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#4338ca",
    backgroundColor: "#e0e7ff",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  logTarget: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
  },
  logReason: {
    margin: "3px 0 0 0",
    fontSize: "12px",
    color: "#64748b",
  },
  logRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  logAdmin: {
    fontSize: "11.5px",
    color: "#475569",
    fontWeight: "500",
  },
  logTime: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  emptyLogsBox: {
    padding: "24px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
  },
};

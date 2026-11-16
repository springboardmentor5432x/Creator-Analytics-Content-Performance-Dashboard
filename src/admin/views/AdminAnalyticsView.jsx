import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Layers,
  Handshake,
  CheckSquare,
  ShieldAlert,
  Calendar,
  Filter,
  RefreshCw,
  DollarSign,
  Building2,
  PieChart,
  Activity,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { fetchPlatformAnalytics } from "../analyticsService";

export default function AdminAnalyticsView({ theme }) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [dateRange, setDateRange] = useState("ALL");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (range) => {
    setLoading(true);
    try {
      const data = await fetchPlatformAnalytics(range);
      setAnalytics(data);
    } catch (err) {
      console.warn("Could not load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <BarChart3 size={24} color={accent} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>Platform Analytics & Growth Telemetry</h1>
              <span style={styles.verifiedBadge}>REAL DATABASE DATA</span>
            </div>
            <p style={styles.subtitle}>
              Aggregate performance metrics derived strictly from actual registered users, active campaigns, deliverable submissions, and safety tickets.
            </p>
          </div>
        </div>

        {/* Date Filter & Refresh */}
        <div style={styles.headerActions}>
          <div style={styles.dateSelector}>
            <Calendar size={14} color="#64748b" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">All Time Records</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="today">Today (24h)</option>
            </select>
          </div>

          <button
            onClick={() => loadData(dateRange)}
            style={styles.refreshBtn}
            title="Refresh database aggregates"
          >
            <RefreshCw size={14} color="#334155" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Metric Definitions & Tracking Integrity Banner */}
      <div style={styles.disclaimerCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Info size={16} color="#0369a1" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: "12px", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Data Integrity & Tracking Standards
            </strong>
            <p style={styles.disclaimerText}>
              All statistics below reflect verifiable records in Firestore. In compliance with platform integrity guidelines, user statuses represent administrative account standing (Active vs Suspended) rather than unmeasured DAU session heartbeats. Campaign budgets reflect stated media pools without fabricated ad sales estimates.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <span>Computing platform aggregates from database records...</span>
        </div>
      ) : !analytics ? (
        <div style={styles.emptyBox}>
          <AlertCircle size={32} color="#dc2626" />
          <p>Failed to aggregate platform analytics.</p>
        </div>
      ) : (
        <>
          {/* Executive Overview Row */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Registered Users</span>
                <Users size={16} color="#2563eb" />
              </div>
              <div style={styles.metricCardVal}>{analytics.totalUsers}</div>
              <div style={styles.metricSubRow}>
                <span style={{ color: "#15803d", fontWeight: "600" }}>
                  {analytics.userStatusCounts.active} Active
                </span>
                <span>•</span>
                <span style={{ color: analytics.userStatusCounts.suspended > 0 ? "#b91c1c" : "#64748b" }}>
                  {analytics.userStatusCounts.suspended} Suspended
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Tracked Campaigns</span>
                <Layers size={16} color="#0d9488" />
              </div>
              <div style={styles.metricCardVal}>{analytics.totalCampaigns}</div>
              <div style={styles.metricSubRow}>
                <span style={{ color: "#0f766e", fontWeight: "600" }}>
                  {analytics.campaignStatusCounts.active} Active
                </span>
                <span>•</span>
                <span style={{ color: analytics.campaignStatusCounts.restricted > 0 ? "#b91c1c" : "#64748b" }}>
                  {analytics.campaignStatusCounts.restricted} Restricted
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Total Allocated Media</span>
                <DollarSign size={16} color="#0284c7" />
              </div>
              <div style={styles.metricCardVal}>
                ${analytics.totalAllocatedBudget.toLocaleString()}
              </div>
              <div style={styles.metricSubRow}>
                <span>Avg ${(analytics.averageCampaignBudget || 0).toLocaleString()} / deal</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Collaboration Acceptance</span>
                <Handshake size={16} color="#d97706" />
              </div>
              <div style={styles.metricCardVal}>{analytics.acceptanceRate}%</div>
              <div style={styles.metricSubRow}>
                <span>{analytics.invitationStatusCounts.accepted} of {analytics.totalInvitations} accepted</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Deliverable Fulfillment</span>
                <CheckSquare size={16} color="#16a34a" />
              </div>
              <div style={styles.metricCardVal}>{analytics.deliverableFulfillmentRate}%</div>
              <div style={styles.metricSubRow}>
                <span>{analytics.deliverableStatusCounts.approved} of {analytics.totalDeliverables} approved</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricCardHeader}>
                <span style={styles.metricCardLabel}>Report Resolution Rate</span>
                <ShieldAlert size={16} color="#dc2626" />
              </div>
              <div style={styles.metricCardVal}>{analytics.reportResolutionRate}%</div>
              <div style={styles.metricSubRow}>
                <span>{analytics.reportStatusCounts.open + analytics.reportStatusCounts.underReview} pending</span>
              </div>
            </div>
          </div>

          {/* Section 1: User Distribution & Registrations Timeline */}
          <div style={styles.dualGrid}>
            {/* Roles Breakdown */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Users by Role Breakdown</h3>
                <span style={styles.pillNote}>All Verified Accounts</span>
              </div>

              <div style={styles.roleRowsList}>
                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#2563eb" }} />
                    <span>Content Creators</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.userRoleCounts.Creator}</strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#0d9488" }} />
                    <span>Talent Agencies</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.userRoleCounts.Agency}</strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#0284c7" }} />
                    <span>Brand Marketing Teams</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.userRoleCounts["Marketing Team"]}</strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#7c3aed" }} />
                    <span>Platform Administrators</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.userRoleCounts.Admin}</strong>
                </div>
              </div>

              {/* Provider Breakdown */}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Authentication Provider:
                </span>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "12px", color: "#334155" }}>
                  <span>Email/Password: <strong>{analytics.providerCounts.email}</strong></span>
                  <span>Google OAuth: <strong>{analytics.providerCounts.google}</strong></span>
                </div>
              </div>
            </div>

            {/* Registrations Timeline */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>New User Registrations Over Time</h3>
                <span style={styles.pillNote}>Timestamped Signups</span>
              </div>

              {analytics.registrationsTimeline.length === 0 ? (
                <div style={styles.emptyNotice}>
                  <span>No user registrations recorded in the selected date window.</span>
                </div>
              ) : (
                <div style={styles.timelineList}>
                  {analytics.registrationsTimeline.map((item) => (
                    <div key={item.date} style={styles.timelineRow}>
                      <span style={styles.timelineDate}>{item.date}</span>
                      <div style={styles.barTrack}>
                        <div
                          style={{
                            ...styles.barFill,
                            width: `${Math.min(100, Math.max(15, (item.count / analytics.totalUsers) * 100))}%`,
                            backgroundColor: accent,
                          }}
                        />
                      </div>
                      <span style={styles.timelineCount}>
                        +{item.count} {item.count === 1 ? "user" : "users"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Marketplace Campaigns & Niches */}
          <div style={styles.dualGrid}>
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Campaign Pipeline by Status</h3>
                <span style={styles.pillNote}>Moderation & Flight State</span>
              </div>

              <div style={styles.roleRowsList}>
                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#15803d" }} />
                    <span>Active in Discovery</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.campaignStatusCounts.active}</strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#b91c1c" }} />
                    <span>Restricted by Moderation</span>
                  </div>
                  <strong style={{ ...styles.statRowVal, color: analytics.campaignStatusCounts.restricted > 0 ? "#b91c1c" : "#0f172a" }}>
                    {analytics.campaignStatusCounts.restricted}
                  </strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#64748b" }} />
                    <span>Completed Flight</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.campaignStatusCounts.completed}</strong>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statRowLabel}>
                    <span style={{ ...styles.colorDot, backgroundColor: "#f59e0b" }} />
                    <span>Draft Stage</span>
                  </div>
                  <strong style={styles.statRowVal}>{analytics.campaignStatusCounts.draft}</strong>
                </div>
              </div>
            </div>

            {/* Campaign Niches */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Campaign Distribution by Niche</h3>
                <span style={styles.pillNote}>Sponsorship Demands</span>
              </div>

              {analytics.nicheDistribution.length === 0 ? (
                <div style={styles.emptyNotice}>
                  <span>No campaigns in this time period.</span>
                </div>
              ) : (
                <div style={styles.roleRowsList}>
                  {analytics.nicheDistribution.map((item) => (
                    <div key={item.niche} style={styles.statRow}>
                      <span style={{ fontSize: "13px", color: "#334155" }}>{item.niche}</span>
                      <strong style={styles.statRowVal}>{item.count} campaigns</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Deliverables, Safety & Agency Ecosystem */}
          <div style={styles.threeGrid}>
            {/* Deliverables Funnel */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Deliverable Workflow</h3>
              </div>
              <div style={styles.roleRowsList}>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#15803d" }}>✓ Approved Content</span>
                  <strong>{analytics.deliverableStatusCounts.approved}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#0369a1" }}>Under Review</span>
                  <strong>{analytics.deliverableStatusCounts.submitted + analytics.deliverableStatusCounts.resubmitted}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#b45309" }}>Revisions Requested</span>
                  <strong>{analytics.deliverableStatusCounts.revision_requested}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Pending Creation</span>
                  <strong>{analytics.deliverableStatusCounts.pending}</strong>
                </div>
              </div>
            </div>

            {/* Safety Reports */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Safety & Violations</h3>
              </div>
              <div style={styles.roleRowsList}>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#b91c1c" }}>Open Safety Reports</span>
                  <strong>{analytics.reportStatusCounts.open}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#1d4ed8" }}>Under Review</span>
                  <strong>{analytics.reportStatusCounts.under_review}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#15803d" }}>Resolved Cases</span>
                  <strong>{analytics.reportStatusCounts.resolved}</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Dismissed Tickets</span>
                  <strong>{analytics.reportStatusCounts.dismissed}</strong>
                </div>
              </div>
            </div>

            {/* Agency Ecosystem */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Agency Ecosystem</h3>
              </div>
              <div style={styles.roleRowsList}>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#334155" }}>Brand Assignments</span>
                  <strong style={styles.statRowVal}>{analytics.activeAgencyBrandAssignments} active</strong>
                </div>
                <div style={styles.statRow}>
                  <span style={{ fontSize: "12px", color: "#334155" }}>Roster Representations</span>
                  <strong style={styles.statRowVal}>{analytics.activeCreatorRepresentations} signed</strong>
                </div>
                <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                  Covers verified talent contracts and brand agency delegation agreements.
                </div>
              </div>
            </div>
          </div>
        </>
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
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
  },
  verifiedBadge: {
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "680px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  dateSelector: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
  },
  select: {
    border: "none",
    background: "transparent",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    outline: "none",
    cursor: "pointer",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  disclaimerCard: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "14px 18px",
  },
  disclaimerText: {
    margin: 0,
    fontSize: "12px",
    color: "#075985",
    lineHeight: "1.5",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  metricCard: {
    backgroundColor: "#ffffff",
    padding: "18px 20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  metricCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricCardLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  metricCardVal: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "8px 0 4px 0",
  },
  metricSubRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#64748b",
  },
  dualGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "16px",
  },
  threeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  contentCard: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pillNote: {
    fontSize: "11px",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  roleRowsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  statRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },
  statRowLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#334155",
  },
  colorDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  statRowVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  timelineRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12px",
  },
  timelineDate: {
    fontFamily: "monospace",
    color: "#64748b",
    width: "85px",
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: "10px",
    backgroundColor: "#f1f5f9",
    borderRadius: "5px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "5px",
    transition: "width 0.3s ease",
  },
  timelineCount: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#0f172a",
    width: "60px",
    textAlign: "right",
    flexShrink: 0,
  },
  emptyNotice: {
    padding: "30px 16px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },
  loadingBox: {
    padding: "60px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#64748b",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyBox: {
    padding: "60px 24px",
    textAlign: "center",
  },
};

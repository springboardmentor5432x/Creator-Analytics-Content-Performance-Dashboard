import React from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Database,
  ArrowRight,
  Send,
  CheckSquare,
  Clock,
  Calendar,
} from "lucide-react";
import InteractiveLineChart from "../components/InteractiveLineChart";
import RevenueDonutChart from "../components/RevenueDonutChart";
import AudienceDemographics from "../components/AudienceDemographics";

export default function CreatorDashboardOverview({
  user,
  userProfile,
  theme,
  isDemoMode,
  invitations = [],
  deliverables = [],
  onNavigate,
}) {
  const accent = theme?.accent || "#2563eb";
  const accentLight = theme?.accentLight || "#eff6ff";

  const displayName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Creator");

  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const acceptedInvites = invitations.filter((i) => i.status === "accepted");
  const awaitingReviewDeliverables = deliverables.filter(
    (d) => d.status === "submitted" || d.status === "resubmitted"
  );
  const actionRequiredDeliverables = deliverables.filter(
    (d) => d.status === "revision_requested" || d.status === "pending"
  );

  return (
    <div style={styles.container}>
      {/* Welcome Hero Banner */}
      <div
        style={{
          ...styles.heroBanner,
          borderLeft: `5px solid ${accent}`,
          backgroundImage: `${theme?.bannerGlow || "radial-gradient(circle at 80% 20%, rgba(37,99,235,0.12) 0%, transparent 70%)"}, linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`,
        }}
      >
        <div>
          <div style={styles.pillRow}>
            <span
              style={{
                ...styles.roleBadge,
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              <Sparkles size={12} style={{ marginRight: 4 }} />
              Content Creator Suite
            </span>

            <span
              style={{
                ...styles.roleBadge,
                backgroundColor: "#f0fdf4",
                color: "#15803d",
                border: "1px solid #bbf7d0",
              }}
            >
              <ShieldCheck size={12} style={{ marginRight: 4 }} />
              Role Verified: Creator
            </span>

            <span
              style={{
                ...styles.roleBadge,
                backgroundColor: "#f0fdf4",
                color: "#15803d",
                border: "1px solid #bbf7d0",
              }}
            >
              <Database size={12} style={{ marginRight: 4 }} />
              Firestore Synced
            </span>

            {isDemoMode && (
              <span
                style={{
                  ...styles.roleBadge,
                  backgroundColor: "#fef3c7",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                }}
              >
                Interactive Preview
              </span>
            )}
          </div>

          <h1 style={styles.heroTitle}>Welcome back, {displayName}!</h1>
          <p style={styles.heroDesc}>
            Multi-channel growth, verified audience retention & brand sponsorships pipeline.
          </p>
        </div>

        <div style={styles.heroRight}>
          <div style={{ ...styles.verifiedCard, backgroundColor: accentLight, borderColor: "#bfdbfe" }}>
            <span style={styles.verifiedLabel}>AUTHENTICATED ROLE</span>
            <span style={{ ...styles.verifiedVal, color: accent }}>Creator</span>
            <span style={styles.verifiedSub}>
              {user?.email || "creator@creatoriq.io"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert if pending invites or revisions exist */}
      {(pendingInvites.length > 0 || actionRequiredDeliverables.length > 0) && (
        <div style={styles.actionAlertBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.alertIconBox}>
              <Sparkles size={16} color="#d97706" />
            </div>
            <div>
              <span style={styles.alertTitle}>Action Required:</span>
              <span style={styles.alertText}>
                {pendingInvites.length > 0 && (
                  <span>
                    {" "}You have <strong>{pendingInvites.length}</strong> pending campaign invitation{pendingInvites.length > 1 ? "s" : ""}.
                  </span>
                )}
                {actionRequiredDeliverables.length > 0 && (
                  <span>
                    {" "}<strong>{actionRequiredDeliverables.length}</strong> deliverable{actionRequiredDeliverables.length > 1 ? "s" : ""} awaiting content submission.
                  </span>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {pendingInvites.length > 0 && (
              <button
                onClick={() => onNavigate("invitations")}
                style={{ ...styles.alertBtn, backgroundColor: accent }}
              >
                Review Invitations
                <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </button>
            )}
            {actionRequiredDeliverables.length > 0 && (
              <button
                onClick={() => onNavigate("deliverables")}
                style={{ ...styles.alertBtn, backgroundColor: "#0f172a" }}
              >
                View Deliverables
                <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Audience Reach</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#eff6ff" }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div style={styles.kpiValue}>1,428,500</div>
          <div style={styles.kpiTrendPositive}>
            <TrendingUp size={14} style={{ marginRight: 4 }} />
            <span>+14.2% subscriber growth this month</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Average Engagement Rate</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#eff6ff" }}>
              <Sparkles size={18} color="#2563eb" />
            </div>
          </div>
          <div style={styles.kpiValue}>6.42%</div>
          <div style={styles.kpiTrendPositive}>
            <TrendingUp size={14} style={{ marginRight: 4 }} />
            <span>2.1% above creator industry benchmark</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Active Brand Deals</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f0fdf4" }}>
              <DollarSign size={18} color="#15803d" />
            </div>
          </div>
          <div style={styles.kpiValue}>{acceptedInvites.length || 3}</div>
          <div style={{ ...styles.kpiTrendPositive, color: "#15803d" }}>
            <span>Contracted partnerships in progress</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Content Quality Score</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f5f3ff" }}>
              <Sparkles size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={styles.kpiValue}>96 / 100</div>
          <div style={{ ...styles.kpiTrendPositive, color: "#7c3aed" }}>
            <span>Top 3% percentile in CreatorIQ roster</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <InteractiveLineChart themeColor={accent} />

      {/* 2-Column Summary Cards */}
      <div style={styles.twoColGrid}>
        <RevenueDonutChart />
        <AudienceDemographics />
      </div>

      {/* Quick Summary Section: Invitations & Deliverables previews */}
      <div style={styles.twoColGrid}>
        {/* Recent Invitations Card */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.sectionIconWrap, backgroundColor: "#fef3c7" }}>
                <Send size={16} color="#d97706" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Campaign Invitations</h3>
                <p style={styles.sectionSubtitle}>
                  {invitations.length} total invitations received from verified brands
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("invitations")}
              style={{ ...styles.sectionLinkBtn, color: accent }}
            >
              View All ({invitations.length}) →
            </button>
          </div>

          {invitations.length === 0 ? (
            <div style={styles.emptyCardBox}>
              <Send size={24} color="#94a3b8" />
              <p style={styles.emptyCardText}>No invitations received yet.</p>
              <button
                onClick={() => onNavigate("discover")}
                style={{ ...styles.smallBtn, backgroundColor: accent }}
              >
                Discover Brand Campaigns
              </button>
            </div>
          ) : (
            <div style={styles.miniList}>
              {invitations.slice(0, 3).map((inv) => (
                <div key={inv.id} style={styles.miniItem}>
                  <div>
                    <span style={styles.miniItemTitle}>
                      {inv.campaignTitle || inv.campaignName || "Campaign Invitation"}
                    </span>
                    <span style={styles.miniItemBrand}>
                      Invited by: {inv.marketingName || "Brand Marketer"} • ${Number(inv.compensation || 0).toLocaleString()}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.statusTag,
                      backgroundColor:
                        inv.status === "accepted"
                          ? "#f0fdf4"
                          : inv.status === "declined"
                          ? "#fef2f2"
                          : "#fef3c7",
                      color:
                        inv.status === "accepted"
                          ? "#15803d"
                          : inv.status === "declined"
                          ? "#b91c1c"
                          : "#b45309",
                    }}
                  >
                    {inv.status ? inv.status.toUpperCase() : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deliverables Status Card */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.sectionIconWrap, backgroundColor: "#f0fdf4" }}>
                <CheckSquare size={16} color="#15803d" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Production Deliverables</h3>
                <p style={styles.sectionSubtitle}>
                  {deliverables.length} assigned content deliverables
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("deliverables")}
              style={{ ...styles.sectionLinkBtn, color: accent }}
            >
              Manage Deliverables →
            </button>
          </div>

          {deliverables.length === 0 ? (
            <div style={styles.emptyCardBox}>
              <CheckSquare size={24} color="#94a3b8" />
              <p style={styles.emptyCardText}>No deliverables assigned yet.</p>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Deliverables appear when you accept campaign invitations.
              </span>
            </div>
          ) : (
            <div style={styles.miniList}>
              {deliverables.slice(0, 3).map((del) => (
                <div key={del.id} style={styles.miniItem}>
                  <div>
                    <span style={styles.miniItemTitle}>{del.title}</span>
                    <span style={styles.miniItemBrand}>
                      {del.format || "Video"} • Due: {del.dueDate || "Flexible"}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.statusTag,
                      backgroundColor:
                        del.status === "approved"
                          ? "#f0fdf4"
                          : del.status === "revision_requested"
                          ? "#fef2f2"
                          : "#eff6ff",
                      color:
                        del.status === "approved"
                          ? "#15803d"
                          : del.status === "revision_requested"
                          ? "#b91c1c"
                          : "#2563eb",
                    }}
                  >
                    {del.status === "approved"
                      ? "APPROVED"
                      : del.status === "revision_requested"
                      ? "REVISION"
                      : "IN PROGRESS"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  heroBanner: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "18px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  pillRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.4px",
  },
  heroDesc: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },
  heroRight: {
    textAlign: "right",
  },
  verifiedCard: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid",
    display: "inline-block",
    textAlign: "left",
  },
  verifiedLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
  },
  verifiedVal: {
    fontSize: "16px",
    fontWeight: "800",
    display: "block",
  },
  verifiedSub: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  actionAlertBanner: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  alertIconBox: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #fde68a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#92400e",
  },
  alertText: {
    fontSize: "13px",
    color: "#78350f",
  },
  alertBtn: {
    padding: "7px 14px",
    borderRadius: "8px",
    color: "#ffffff",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  kpiIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "8px",
    letterSpacing: "-0.5px",
  },
  kpiTrendPositive: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#16a34a",
    marginTop: "6px",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "20px",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "10px",
  },
  sectionIconWrap: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: "12px",
    color: "#64748b",
  },
  sectionLinkBtn: {
    background: "none",
    border: "none",
    fontWeight: "600",
    fontSize: "12.5px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  emptyCardBox: {
    textAlign: "center",
    padding: "30px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
  },
  emptyCardText: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "8px",
  },
  smallBtn: {
    marginTop: "12px",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  miniList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  miniItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
  miniItemTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  miniItemBrand: {
    fontSize: "11.5px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  statusTag: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    letterSpacing: "0.4px",
  },
};

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShieldCheck,
  Sparkles,
  LogOut,
  Database,
  Activity,
  Layers,
  CheckCircle2,
  Building2,
  Target,
  DollarSign,
  Globe,
  Sliders,
  Award,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Video,
  FileText,
  Lock,
} from "lucide-react";
import CreatorAnalyticsSection from "./creator/sections/CreatorAnalyticsSection";
import CreatorPortalLayout from "./creator/CreatorPortalLayout";
import MarketingSection from "./marketing/MarketingSection";
import NotificationBell from "./marketing/components/NotificationBell";
import AgencyPortalLayout from "./agency/AgencyPortalLayout";

// 4 Distinct Role Theme Palettes & Configurations
export const ROLE_THEMES = {
  Creator: {
    id: "Creator",
    name: "Content Creator",
    suiteName: "Creator Intelligence Suite",
    icon: Sparkles,
    accent: "#2563eb", // Royal Sapphire
    accentHover: "#1d4ed8",
    accentLight: "#eff6ff",
    accentMuted: "rgba(37, 99, 235, 0.12)",
    accentBorder: "#bfdbfe",
    badgeColor: "#1d4ed8",
    badgeBg: "#dbeafe",
    gradientHeader: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    bannerGlow: "radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 70%)",
    kpiIconBg: "#eff6ff",
    kpiIconColor: "#2563eb",
    tagline: "Multi-channel growth, audience retention & brand sponsorships",
  },
  Agency: {
    id: "Agency",
    name: "Talent Agency",
    suiteName: "Talent Management & Roster Suite",
    icon: Building2,
    accent: "#0d9488", // Emerald Teal
    accentHover: "#0f766e",
    accentLight: "#f0fdfa",
    accentMuted: "rgba(13, 148, 136, 0.12)",
    accentBorder: "#99f6e4",
    badgeColor: "#0f766e",
    badgeBg: "#ccfbf1",
    gradientHeader: "linear-gradient(135deg, #134e4a 0%, #0d9488 100%)",
    bannerGlow: "radial-gradient(circle at 80% 20%, rgba(13, 148, 136, 0.15) 0%, transparent 70%)",
    kpiIconBg: "#f0fdfa",
    kpiIconColor: "#0d9488",
    tagline: "Multi-creator roster bookings, commissions & contract ROI",
  },
  "Marketing Team": {
    id: "Marketing Team",
    name: "Marketing Team",
    suiteName: "Influencer Attribution & ROI Suite",
    icon: TrendingUp,
    accent: "#0284c7", // Ocean Sky & Amber
    accentHover: "#0369a1",
    accentLight: "#f0f9ff",
    accentMuted: "rgba(2, 132, 199, 0.12)",
    accentBorder: "#bae6fd",
    badgeColor: "#0369a1",
    badgeBg: "#e0f2fe",
    gradientHeader: "linear-gradient(135deg, #075985 0%, #0284c7 100%)",
    bannerGlow: "radial-gradient(circle at 80% 20%, rgba(2, 132, 199, 0.15) 0%, transparent 70%)",
    kpiIconBg: "#f0f9ff",
    kpiIconColor: "#0284c7",
    tagline: "Campaign conversion attribution, influencer ROAS & budget tracking",
  },
  Admin: {
    id: "Admin",
    name: "Platform Admin",
    suiteName: "System Administration & Infrastructure",
    icon: ShieldCheck,
    accent: "#7c3aed", // Royal Purple & Violet
    accentHover: "#6d28d9",
    accentLight: "#f5f3ff",
    accentMuted: "rgba(124, 58, 237, 0.12)",
    accentBorder: "#ddd6fe",
    badgeColor: "#5b21b6",
    badgeBg: "#ede9fe",
    gradientHeader: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
    bannerGlow: "radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)",
    kpiIconBg: "#f5f3ff",
    kpiIconColor: "#7c3aed",
    tagline: "System security, user permissions, audit logs & infrastructure",
  },
};

export default function Dashboard({
  user,
  userProfile,
  onSignOut,
  isDemoMode,
}) {
  // Automatically select theme based on the authenticated user's role
  const authenticatedRole = userProfile?.role || "Creator";
  const [activeRole, setActiveRole] = useState(authenticatedRole);

  React.useEffect(() => {
    if (userProfile?.role) {
      setActiveRole(userProfile.role);
    }
  }, [userProfile?.role]);

  const theme = ROLE_THEMES[activeRole] || ROLE_THEMES.Creator;
  const RoleIcon = theme.icon;

  const formatEmailToName = (rawEmail) => {
    if (!rawEmail || !rawEmail.includes("@")) return "";
    const prefix = rawEmail.split("@")[0];
    return prefix
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  const displayEmail = userProfile?.email || user?.email || "";
  const displayName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    formatEmailToName(displayEmail) ||
    (activeRole ? `${activeRole} Member` : "CreatorIQ User");

  const userHandle =
    userProfile?.handle ||
    (displayEmail
      ? displayEmail.split("@")[0].replace(/[^a-zA-Z0-9._]/g, "").toLowerCase()
      : "") ||
    displayName.replace(/\s+/g, "").toLowerCase() ||
    "creator";

  const provider =
    userProfile?.provider ||
    (user?.providerData?.[0]?.providerId === "google.com" ? "google" : "email");

  const formatAccountTimestamp = (rawDate) => {
    if (!rawDate) return "Active Session";
    try {
      if (typeof rawDate === "object" && rawDate.toDate) {
        return rawDate.toDate().toLocaleString();
      }
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
      }
    } catch {
      // fallback
    }
    return String(rawDate);
  };

  // ── Creator Role → hand off entirely to the sidebar portal layout ──
  if (activeRole === "Creator") {
    return (
      <CreatorPortalLayout
        user={user}
        userProfile={userProfile}
        onSignOut={onSignOut}
        theme={theme}
        isDemoMode={isDemoMode}
      />
    );
  }

  // ── Agency Role → hand off to Agency Portal layout ──
  if (activeRole === "Agency") {
    return (
      <AgencyPortalLayout
        user={user}
        userProfile={userProfile}
        onSignOut={onSignOut}
        theme={theme}
        isDemoMode={isDemoMode}
      />
    );
  }

  return (
    <div
      style={{
        ...styles.dashboardContainer,
        backgroundColor: "#f8fafc",
      }}
    >
      {/* Top Navigation Bar with Dynamic Role Theme Accent */}
      <header
        style={{
          ...styles.dashboardHeader,
          borderBottom: `2px solid ${theme.accentMuted}`,
        }}
      >
        <div style={styles.headerBrand}>
          <div
            style={{
              ...styles.logoBadge,
              backgroundColor: theme.accent,
            }}
          >
            <RoleIcon size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={styles.brandTitle}>CreatorIQ</span>
              <span
                style={{
                  ...styles.roleHeaderPill,
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeColor,
                  borderColor: theme.accentBorder,
                }}
              >
                {theme.name}
              </span>
            </div>
            <span style={styles.brandSubtitle}>{theme.suiteName}</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={styles.headerRight}>
          {/* Real-time Notification Bell */}
          <NotificationBell
            currentUser={user}
            role={activeRole}
            theme={theme}
          />

          {/* User Profile Badge */}
          <div
            style={{
              ...styles.userBadge,
              borderColor: "#e2e8f0",
            }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" style={styles.avatarImg} />
            ) : (
              <div
                style={{
                  ...styles.avatarFallback,
                  backgroundColor: theme.accent,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={styles.userInfoText}>
              <span style={styles.userName}>{displayName}</span>
              <span style={{ ...styles.userRoleTag, color: theme.badgeColor }}>
                ✓ Verified {authenticatedRole}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            style={styles.signOutButton}
            title="Sign out of CreatorIQ"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main style={styles.dashboardMain}>
        {/* Dynamic Welcome Hero Banner */}
        <div
          style={{
            ...styles.welcomeBanner,
            borderLeft: `5px solid ${theme.accent}`,
            backgroundImage: `${theme.bannerGlow}, linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`,
          }}
        >
          <div>
            <div style={styles.tagRow}>
              <span
                style={{
                  ...styles.rolePill,
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeColor,
                  borderColor: theme.accentBorder,
                }}
              >
                <RoleIcon size={13} style={{ marginRight: 5 }} />
                {theme.name} Suite
              </span>

              <span
                style={{
                  ...styles.rolePill,
                  backgroundColor: "#f0fdf4",
                  color: "#15803d",
                  borderColor: "#bbf7d0",
                }}
              >
                <ShieldCheck size={13} style={{ marginRight: 5 }} color="#15803d" />
                Role Verified: {authenticatedRole}
              </span>

              <span style={styles.firestorePill}>
                <Database size={13} style={{ marginRight: 5 }} color="#15803d" />
                Firestore Synced
              </span>

              {isDemoMode && (
                <span style={styles.demoPill}>Interactive Preview</span>
              )}
            </div>

            <h1 style={styles.welcomeTitle}>
              Welcome back, {displayName}!
            </h1>
            <p style={styles.welcomeDesc}>{theme.tagline}</p>
          </div>

          <div style={styles.bannerAction}>
            <div
              style={{
                ...styles.quickStat,
                borderColor: theme.accentBorder,
                backgroundColor: theme.accentLight,
              }}
            >
              <span style={styles.statLabel}>Verified User Role</span>
              <span style={{ ...styles.statVal, color: theme.badgeColor }}>
                {authenticatedRole}
              </span>
              <span style={styles.statSub}>
                Via {provider === "google" ? "Google OAuth" : "Email Login"} • Verified
              </span>
            </div>
          </div>
        </div>

        {/* Role-Specific KPI Cards (for Creator, Agency, Admin) */}
        {activeRole !== "Marketing Team" && (
          <div style={styles.statsGrid}>
            {activeRole === "Creator" && (
            <>
              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Total Audience Reach</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Users size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>1,428,500</div>
                <div style={styles.statTrendPositive}>
                  <TrendingUp size={14} style={{ marginRight: 4 }} />
                  <span>+14.2% subscriber growth this month</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Average Engagement Rate</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Activity size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>6.42%</div>
                <div style={styles.statTrendPositive}>
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                  <span>2.1% above creator industry benchmark</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Active Brand Deals</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <DollarSign size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>$18,400</div>
                <div style={styles.statTrendPositive}>
                  <ArrowUpRight size={14} style={{ marginRight: 4 }} />
                  <span>4 sponsored contracts in pipeline</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Content Quality Score</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Sparkles size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>96 / 100</div>
                <div style={styles.statTrendNeutral}>
                  <span>Top 3% percentile in CreatorIQ</span>
                </div>
              </div>
            </>
          )}

          {activeRole === "Agency" && (
            <>
              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Managed Creator Roster</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Users size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>38 Creators</div>
                <div style={styles.statTrendPositive}>
                  <TrendingUp size={14} style={{ marginRight: 4 }} />
                  <span>+6 newly signed talent contracts</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Network Total Reach</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Globe size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>18,450,000</div>
                <div style={styles.statTrendPositive}>
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                  <span>Across YouTube, Instagram & TikTok</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Monthly Gross Bookings</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <DollarSign size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>$342,000</div>
                <div style={styles.statTrendPositive}>
                  <ArrowUpRight size={14} style={{ marginRight: 4 }} />
                  <span>15% Agency Commission ($51.3k net)</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Deal Fulfillment Rate</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Award size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>98.7%</div>
                <div style={styles.statTrendNeutral}>
                  <span>24 campaigns currently active</span>
                </div>
              </div>
            </>
          )}

          {activeRole === "Marketing Team" && (
            <>
              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Active Influencer Campaigns</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Layers size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>12 Campaigns</div>
                <div style={styles.statTrendPositive}>
                  <TrendingUp size={14} style={{ marginRight: 4 }} />
                  <span>84 active creator partnerships</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Attribution ROAS</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Target size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>4.82x Return</div>
                <div style={styles.statTrendPositive}>
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                  <span>+$0.92 ROAS vs last campaign cycle</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Tracked Conversions</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <ArrowUpRight size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>14,820 Sales</div>
                <div style={styles.statTrendPositive}>
                  <TrendingUp size={14} style={{ marginRight: 4 }} />
                  <span>Attributed via UTM link tracking</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Total Media Budget</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <DollarSign size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>$118,500</div>
                <div style={styles.statTrendNeutral}>
                  <span>68% budget utilization this quarter</span>
                </div>
              </div>
            </>
          )}

          {activeRole === "Admin" && (
            <>
              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Total Platform Users</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Users size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>54,230</div>
                <div style={styles.statTrendPositive}>
                  <TrendingUp size={14} style={{ marginRight: 4 }} />
                  <span>+18.4% monthly user onboarding</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>System Health & Uptime</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <ShieldCheck size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>99.99%</div>
                <div style={styles.statTrendPositive}>
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                  <span>All 18 microservices operational</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>API Cloud Throughput</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Activity size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>4.8M Req/day</div>
                <div style={styles.statTrendPositive}>
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                  <span>Average latency 28ms</span>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statCardHeader}>
                  <span style={styles.statName}>Security & Compliance</span>
                  <div
                    style={{
                      ...styles.statIconBox,
                      backgroundColor: theme.kpiIconBg,
                    }}
                  >
                    <Lock size={18} color={theme.kpiIconColor} />
                  </div>
                </div>
                <div style={styles.statValue}>SOC2 Verified</div>
                <div style={styles.statTrendNeutral}>
                  <span>0 active security incidents</span>
                </div>
              </div>
            </>
          )}
          </div>
        )}

        {/* Role-Specific Thematic Main Section */}
        {activeRole === "Creator" && (
          <CreatorAnalyticsSection
            theme={theme}
            userHandle={userHandle}
            currentUser={user}
            userProfile={userProfile}
          />
        )}

        {activeRole === "Agency" && (
          <div style={styles.contentSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    ...styles.sectionIconBadge,
                    backgroundColor: theme.accentLight,
                    color: theme.accent,
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={styles.sectionTitle}>Talent Roster & Contract Management</h3>
                  <p style={styles.sectionSubtitle}>
                    Manage multi-creator representations, contract renewals, and gross bookings.
                  </p>
                </div>
              </div>
              <button
                style={{ ...styles.themeActionBtn, backgroundColor: theme.accent }}
              >
                + Add Creator to Roster
              </button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.dataTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Creator</th>
                    <th style={styles.th}>Niche</th>
                    <th style={styles.th}>Audience Size</th>
                    <th style={styles.th}>Contract Term</th>
                    <th style={styles.th}>Split</th>
                    <th style={styles.th}>30d Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tableRow}>
                    <td style={styles.tdBold}>Jordan Blake</td>
                    <td style={styles.td}>Tech & Productivity</td>
                    <td style={styles.td}>1.4M</td>
                    <td style={styles.td}>Through Dec 2027</td>
                    <td style={styles.td}>85% / 15%</td>
                    <td style={styles.tdBold}>$34,000</td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.tdBold}>Elena Rostova</td>
                    <td style={styles.td}>Travel & Lifestyle</td>
                    <td style={styles.td}>2.8M</td>
                    <td style={styles.td}>Through Jun 2027</td>
                    <td style={styles.td}>80% / 20%</td>
                    <td style={styles.tdBold}>$62,500</td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.tdBold}>Marcus & Leo</td>
                    <td style={styles.td}>Gaming & Esports</td>
                    <td style={styles.td}>3.1M</td>
                    <td style={styles.td}>Through Aug 2028</td>
                    <td style={styles.td}>85% / 15%</td>
                    <td style={styles.tdBold}>$88,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeRole === "Marketing Team" && (
          <MarketingSection
            user={user}
            userProfile={userProfile}
            theme={theme}
          />
        )}

        {activeRole === "Admin" && (
          <div style={styles.contentSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    ...styles.sectionIconBadge,
                    backgroundColor: theme.accentLight,
                    color: theme.accent,
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={styles.sectionTitle}>Global System Permissions & Security Audits</h3>
                  <p style={styles.sectionSubtitle}>
                    Platform-wide role-based access control, security policies, and user audits.
                  </p>
                </div>
              </div>
              <button
                style={{ ...styles.themeActionBtn, backgroundColor: theme.accent }}
              >
                Export Audit Logs
              </button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.dataTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Security Checkpoint</th>
                    <th style={styles.th}>Target</th>
                    <th style={styles.th}>Audit Result</th>
                    <th style={styles.th}>Latency</th>
                    <th style={styles.th}>Security Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tableRow}>
                    <td style={styles.tdBold}>Firestore Security Rules</td>
                    <td style={styles.td}>/users/{user?.uid}</td>
                    <td style={styles.td}>RBAC Enforced</td>
                    <td style={styles.td}>14ms</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusActive, color: "#5b21b6", backgroundColor: "#ede9fe" }}>
                        Pass (SOC2 Compliant)
                      </span>
                    </td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.tdBold}>OAuth 2.0 Token Vault</td>
                    <td style={styles.td}>Google Provider Auth</td>
                    <td style={styles.td}>Encrypted AES-256</td>
                    <td style={styles.td}>8ms</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusActive, color: "#5b21b6", backgroundColor: "#ede9fe" }}>
                        Operational
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Firestore Database Sync Details Card - Hidden on Marketing Team views to prioritize business reporting */}
        {activeRole !== "Marketing Team" && (
          <div style={styles.firestoreCard}>
            <div style={styles.firestoreHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    ...styles.dbIconWrapper,
                    backgroundColor: theme.accentLight,
                    borderColor: theme.accentBorder,
                  }}
                >
                  <Database size={20} color={theme.accent} />
                </div>
                <div>
                  <h3 style={styles.firestoreTitle}>Firestore Database Record</h3>
                  <p style={styles.firestoreSubtitle}>
                    Document stored in collection: <code style={styles.codeSnippet}>users/{user?.uid}</code>
                  </p>
                </div>
              </div>
              <span
                style={{
                  ...styles.liveBadge,
                  backgroundColor: theme.accentLight,
                  borderColor: theme.accentBorder,
                  color: theme.badgeColor,
                }}
              >
                <span
                  style={{
                    ...styles.liveDot,
                    backgroundColor: theme.accent,
                  }}
                ></span>
                Synchronized with Cloud
              </span>
            </div>

            <div style={styles.firestoreGrid}>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Document UID</span>
                <span style={styles.fieldValueMono}>{user?.uid || "N/A"}</span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Account Holder</span>
                <span style={styles.fieldValue}>{displayName}</span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Email Address</span>
                <span style={styles.fieldValue}>{displayEmail || "Unspecified"}</span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Active Theme Role</span>
                <span
                  style={{
                    ...styles.fieldValueHighlight,
                    color: theme.badgeColor,
                    backgroundColor: theme.badgeBg,
                    border: `1px solid ${theme.accentBorder}`,
                  }}
                >
                  {activeRole}
                </span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Auth Provider</span>
                <span style={styles.fieldValue}>
                  {provider === "google" ? "Google Identity (OAuth)" : "Email & Password"}
                </span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Account Status</span>
                <span style={styles.fieldValueStatus}>Active & Verified</span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Account Created</span>
                <span style={styles.fieldValue}>
                  {formatAccountTimestamp(userProfile?.createdAt || user?.metadata?.creationTime)}
                </span>
              </div>
              <div style={styles.docField}>
                <span style={styles.fieldLabel}>Last Authentication</span>
                <span style={styles.fieldValue}>
                  {formatAccountTimestamp(userProfile?.lastLogin || user?.metadata?.lastSignInTime)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  dashboardContainer: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    color: "#0f172a",
  },
  dashboardHeader: {
    height: "72px",
    backgroundColor: "#ffffff",
    padding: "0 36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 50,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoBadge: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
    transition: "background-color 0.25s ease",
  },
  brandTitle: {
    fontSize: "19px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  roleHeaderPill: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid",
    transition: "all 0.25s ease",
  },
  brandSubtitle: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  roleSwitcherWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f1f5f9",
    padding: "3px 6px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  switcherLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    paddingLeft: "4px",
  },
  roleBtnGroup: {
    display: "flex",
    gap: "4px",
  },
  miniRoleBtn: {
    padding: "4px 9px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "11px",
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "4px 12px 4px 6px",
    backgroundColor: "#ffffff",
    borderRadius: "30px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  avatarImg: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarFallback: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "600",
    transition: "background-color 0.25s ease",
  },
  userInfoText: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: "1.2",
  },
  userRoleTag: {
    fontSize: "10.5px",
    fontWeight: "600",
    lineHeight: "1.2",
  },
  signOutButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  dashboardMain: {
    flex: 1,
    padding: "32px 36px",
    maxWidth: "1340px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  welcomeBanner: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "26px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    transition: "all 0.25s ease",
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  rolePill: {
    padding: "3px 10px",
    borderRadius: "16px",
    fontSize: "11.5px",
    fontWeight: "600",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    transition: "all 0.25s ease",
  },
  firestorePill: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    padding: "3px 10px",
    borderRadius: "16px",
    fontSize: "11.5px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
  },
  demoPill: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "3px 10px",
    borderRadius: "16px",
    fontSize: "11.5px",
    fontWeight: "600",
  },
  welcomeTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.4px",
    marginBottom: "4px",
  },
  welcomeDesc: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  bannerAction: {
    display: "flex",
    alignItems: "center",
  },
  quickStat: {
    border: "1px solid",
    padding: "12px 18px",
    borderRadius: "12px",
    textAlign: "right",
    transition: "all 0.25s ease",
  },
  statLabel: {
    display: "block",
    fontSize: "10.5px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  statVal: {
    fontSize: "15px",
    fontWeight: "700",
    display: "block",
    marginTop: "1px",
  },
  statSub: {
    fontSize: "10px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "18px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  statCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statName: {
    fontSize: "12.5px",
    color: "#64748b",
    fontWeight: "600",
  },
  statIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.25s ease",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  statTrendPositive: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#16a34a",
    fontWeight: "600",
  },
  statTrendNeutral: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#64748b",
    fontWeight: "500",
  },
  contentSectionCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  sectionIconBadge: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "1px",
  },
  themeActionBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.1)",
    transition: "background-color 0.2s ease",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  tableHeaderRow: {
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    color: "#64748b",
    fontSize: "11.5px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px 14px",
    color: "#334155",
  },
  tdBold: {
    padding: "12px 14px",
    color: "#0f172a",
    fontWeight: "600",
  },
  channelTag: {
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontWeight: "600",
  },
  engagementBadge: {
    padding: "3px 8px",
    borderRadius: "12px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontWeight: "600",
    fontSize: "11.5px",
  },
  statusActive: {
    padding: "3px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "11.5px",
  },
  firestoreCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  firestoreHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  dbIconWrapper: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
  },
  firestoreTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  firestoreSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "1px",
  },
  codeSnippet: {
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "11.5px",
    fontFamily: "monospace",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: "600",
    transition: "all 0.25s ease",
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 0 6px rgba(15, 23, 42, 0.2)",
    transition: "background-color 0.25s ease",
  },
  firestoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  docField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  fieldValue: {
    fontSize: "13px",
    color: "#0f172a",
    fontWeight: "500",
  },
  fieldValueMono: {
    fontSize: "12px",
    color: "#475569",
    fontFamily: "monospace",
    backgroundColor: "#f8fafc",
    padding: "3px 6px",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
  },
  fieldValueHighlight: {
    fontSize: "12px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    display: "inline-block",
    width: "fit-content",
    transition: "all 0.25s ease",
  },
  fieldValueStatus: {
    fontSize: "12px",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "2px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    width: "fit-content",
  },
};

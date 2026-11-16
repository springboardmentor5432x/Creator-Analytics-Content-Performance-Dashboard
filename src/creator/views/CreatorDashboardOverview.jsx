import React, { useState, useEffect, useCallback } from "react";
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
  Eye,
  Video,
  ExternalLink,
  RefreshCw,
  Building2,
  Handshake,
} from "lucide-react";
import InteractiveLineChart from "../components/InteractiveLineChart";
import {
  getYouTubeChannelStatus,
  getYouTubeAnalytics,
  onYouTubeConnectionChange,
} from "../youtubeService";
import { getAgencyCreatorRelationships } from "../../agency/agencyService";

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

  const currentUser = userProfile?.uid ? userProfile : user;

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

  // Real YouTube Data States
  const [ytChannel, setYtChannel] = useState(null);
  const [ytSummary, setYtSummary] = useState(null);
  const [ytTimeSeries, setYtTimeSeries] = useState([]);
  const [ytTopVideos, setYtTopVideos] = useState([]);
  const [isYtConnected, setIsYtConnected] = useState(false);
  const [loadingYt, setLoadingYt] = useState(true);

  // Real Agency Status
  const [activeAgencyRel, setActiveAgencyRel] = useState(null);

  useEffect(() => {
    async function loadAgencyStatus() {
      try {
        const creatorId = currentUser?.uid || "usr_creator_demo";
        const creatorEmail = currentUser?.email || "creator@creatoriq.io";
        const rels = await getAgencyCreatorRelationships({ creatorId, creatorEmail });
        const active = (rels || []).find((r) => r.status === "active");
        setActiveAgencyRel(active || null);
      } catch (err) {
        console.warn("Agency relationship load note:", err);
      }
    }
    loadAgencyStatus();
  }, [currentUser]);

  const fetchLiveYouTube = useCallback(async () => {
    if (!currentUser) return;
    try {
      const statusRes = await getYouTubeChannelStatus(currentUser);
      if (statusRes.connected && statusRes.channel) {
        setIsYtConnected(true);
        setYtChannel(statusRes.channel);

        const analyticsRes = await getYouTubeAnalytics(currentUser, "28d");
        if (analyticsRes.connected) {
          if (analyticsRes.channel) setYtChannel(analyticsRes.channel);
          setYtSummary(analyticsRes.summary || null);
          setYtTimeSeries(analyticsRes.timeSeries || []);
          setYtTopVideos(analyticsRes.topVideos || []);
        }
      } else {
        setIsYtConnected(false);
        setYtChannel(null);
        setYtSummary(null);
        setYtTimeSeries([]);
        setYtTopVideos([]);
      }
    } catch (err) {
      console.warn("[CreatorDashboard] YouTube data fetch note:", err.message);
    } finally {
      setLoadingYt(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLiveYouTube();
    const unsubscribe = onYouTubeConnectionChange(() => {
      fetchLiveYouTube();
    });
    return () => unsubscribe();
  }, [fetchLiveYouTube]);

  const subscriberCount = Number(ytChannel?.subscriberCount) || Number(ytSummary?.subscribers) || 0;
  const viewCount = Number(ytChannel?.viewCount) || Number(ytSummary?.totalViews) || 0;
  const videoCount = Number(ytChannel?.videoCount) || Number(ytSummary?.totalVideos) || 0;
  const engagementRate = ytSummary?.engagementRate || "0.0%";

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

            {isYtConnected ? (
              <span
                style={{
                  ...styles.roleBadge,
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                }}
              >
                <Video size={12} style={{ marginRight: 4 }} />
                YouTube API Live: {ytChannel?.title || "Connected"}
              </span>
            ) : (
              <span
                style={{
                  ...styles.roleBadge,
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                }}
              >
                YouTube: Not Connected
              </span>
            )}

            <button
              onClick={() => onNavigate && onNavigate("agency")}
              style={{
                ...styles.roleBadge,
                backgroundColor: activeAgencyRel ? "#f0fdfa" : "#f5f3ff",
                color: activeAgencyRel ? "#0f766e" : "#6d28d9",
                border: `1px solid ${activeAgencyRel ? "#ccfbf1" : "#ddd6fe"}`,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: "700",
              }}
              title="Agency Collaboration"
            >
              <Building2 size={12} style={{ marginRight: 4 }} />
              {activeAgencyRel ? `Agency: ${activeAgencyRel.agencyName}` : "Agency Collaboration"}
              <ArrowRight size={11} style={{ marginLeft: 4 }} />
            </button>
          </div>

          <h1 style={styles.heroTitle}>Welcome back, {displayName}!</h1>
          <p style={styles.heroDesc}>
            Real-time channel performance, verified audience velocity & active brand partnerships.
          </p>
        </div>

        <div style={styles.heroRight}>
          <div style={{ ...styles.verifiedCard, backgroundColor: accentLight, borderColor: "#bfdbfe" }}>
            <span style={styles.verifiedLabel}>AUTHENTICATED CREATOR</span>
            <span style={{ ...styles.verifiedVal, color: accent }}>
              {isYtConnected ? (ytChannel?.title || "Creator") : displayName}
            </span>
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

      {/* Agency Collaboration & Representation Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: activeAgencyRel ? "#f0fdfa" : "#faf5ff",
          border: `1px solid ${activeAgencyRel ? "#a7f3d0" : "#e9d5ff"}`,
          borderRadius: "14px",
          padding: "16px 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: activeAgencyRel ? "#ccfbf1" : "#ede9fe",
              color: activeAgencyRel ? "#0d9488" : "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {activeAgencyRel ? <Building2 size={20} /> : <Handshake size={20} />}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              {activeAgencyRel ? (
                <>
                  <span>Represented by {activeAgencyRel.agencyName}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#065f46", backgroundColor: "#d1fae5", padding: "2px 8px", borderRadius: "10px" }}>
                    Active Agency
                  </span>
                </>
              ) : (
                <>
                  <span>Choose an Agency for Collaboration</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#6d28d9", backgroundColor: "#ede9fe", padding: "2px 8px", borderRadius: "10px" }}>
                    Independent Creator
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              {activeAgencyRel
                ? `Contracted representation via ${activeAgencyRel.agencyEmail}. View agency-assigned brand campaigns & deal terms.`
                : "Partner with an accredited talent agency on CreatorIQ to secure exclusive brand sponsorships, contract negotiation, and campaign assignments."}
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate("agency")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 16px",
            borderRadius: "8px",
            backgroundColor: activeAgencyRel ? "#0d9488" : "#7c3aed",
            color: "#ffffff",
            border: "none",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {activeAgencyRel ? "Agency Workspace" : "Choose an Agency"}
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 4 Core KPI Cards — 100% Real Time Data */}
      <div style={styles.kpiGrid}>
        {/* KPI 1: YouTube Subscribers */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>YouTube Subscribers</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#fee2e2" }}>
              <Users size={18} color="#dc2626" />
            </div>
          </div>
          <div style={styles.kpiValue}>
            {isYtConnected ? subscriberCount.toLocaleString() : "—"}
          </div>
          <div style={isYtConnected ? styles.kpiTrendPositive : styles.kpiTrendNeutral}>
            {isYtConnected ? (
              <>
                <ShieldCheck size={14} style={{ marginRight: 4 }} />
                <span>Live Google OAuth sync</span>
              </>
            ) : (
              <span
                style={{ cursor: "pointer", color: accent, textDecoration: "underline" }}
                onClick={() => onNavigate("analytics")}
              >
                Connect YouTube in Analytics →
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Total Channel Views */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Channel Views</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#eff6ff" }}>
              <Eye size={18} color="#2563eb" />
            </div>
          </div>
          <div style={styles.kpiValue}>
            {isYtConnected ? viewCount.toLocaleString() : "—"}
          </div>
          <div style={isYtConnected ? styles.kpiTrendPositive : styles.kpiTrendNeutral}>
            {isYtConnected ? (
              <span>{videoCount} total uploaded videos</span>
            ) : (
              <span>Awaiting channel connection</span>
            )}
          </div>
        </div>

        {/* KPI 3: Active Brand Campaigns (Strictly dynamic from accepted invitations) */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Active Brand Deals</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f0fdf4" }}>
              <DollarSign size={18} color="#15803d" />
            </div>
          </div>
          <div style={styles.kpiValue}>{acceptedInvites.length}</div>
          <div style={{ ...styles.kpiTrendPositive, color: "#15803d" }}>
            <span>
              {acceptedInvites.length === 1
                ? "1 contracted partnership"
                : `${acceptedInvites.length} contracted partnerships`}
            </span>
          </div>
        </div>

        {/* KPI 4: Content Deliverables Status (Strictly dynamic from deliverables) */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Deliverables</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: "#f5f3ff" }}>
              <CheckSquare size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={styles.kpiValue}>{deliverables.length}</div>
          <div style={{ ...styles.kpiTrendPositive, color: "#7c3aed" }}>
            <span>
              {awaitingReviewDeliverables.length} submitted • {actionRequiredDeliverables.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Velocity Chart — Real YouTube API Telemetry */}
      <InteractiveLineChart
        themeColor={accent}
        liveTimeSeries={ytTimeSeries}
        isLiveConnected={isYtConnected}
        channelTitle={ytChannel?.title}
      />

      {/* Real YouTube Channel Overview & Recent Uploads (Replacing fake mock cards) */}
      <div style={styles.twoColGrid}>
        {/* Left Card: Connected YouTube Channel Profile */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.sectionIconWrap, backgroundColor: "#fee2e2" }}>
                <Video size={16} color="#dc2626" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Connected YouTube Channel</h3>
                <p style={styles.sectionSubtitle}>
                  {isYtConnected
                    ? "Official Google Data API v3 live telemetry"
                    : "No social channel currently linked"}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("analytics")}
              style={{ ...styles.sectionLinkBtn, color: accent }}
            >
              {isYtConnected ? "Channel Settings →" : "Connect Channel →"}
            </button>
          </div>

          {isYtConnected && ytChannel ? (
            <div style={styles.ytChannelContent}>
              <div style={styles.ytChannelHead}>
                {ytChannel.thumbnail ? (
                  <img src={ytChannel.thumbnail} alt={ytChannel.title} style={styles.ytAvatar} />
                ) : (
                  <div style={styles.ytAvatarPlaceholder}>
                    {ytChannel.title?.charAt(0) || "Y"}
                  </div>
                )}
                <div>
                  <h4 style={styles.ytChannelName}>{ytChannel.title}</h4>
                  <span style={styles.ytChannelHandle}>
                    {ytChannel.customUrl || `@${ytChannel.title?.replace(/\s+/g, "")}`}
                  </span>
                  <div style={styles.liveTagRow}>
                    <span style={styles.liveTagBadge}>
                      <ShieldCheck size={11} style={{ marginRight: 3 }} />
                      OAuth 2.0 Live
                    </span>
                    {ytChannel.lastSynced && (
                      <span style={styles.lastSyncText}>
                        Synced: {new Date(ytChannel.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-Stat Mini Bar */}
              <div style={styles.miniStatsBar}>
                <div style={styles.miniStat}>
                  <span style={styles.miniStatLabel}>Subscribers</span>
                  <span style={styles.miniStatVal}>{subscriberCount.toLocaleString()}</span>
                </div>
                <div style={styles.miniStat}>
                  <span style={styles.miniStatLabel}>Views</span>
                  <span style={styles.miniStatVal}>{viewCount.toLocaleString()}</span>
                </div>
                <div style={styles.miniStat}>
                  <span style={styles.miniStatLabel}>Videos</span>
                  <span style={styles.miniStatVal}>{videoCount.toLocaleString()}</span>
                </div>
                <div style={styles.miniStat}>
                  <span style={styles.miniStatLabel}>Engagement</span>
                  <span style={styles.miniStatVal}>{engagementRate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptyCardBox}>
              <Video size={28} color="#94a3b8" />
              <p style={styles.emptyCardText}>No YouTube channel connected.</p>
              <button
                onClick={() => onNavigate("analytics")}
                style={{ ...styles.smallBtn, backgroundColor: accent }}
              >
                Connect YouTube Channel
              </button>
            </div>
          )}
        </div>

        {/* Right Card: Recent YouTube Uploads */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.sectionIconWrap, backgroundColor: "#eff6ff" }}>
                <Eye size={16} color="#2563eb" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Recent YouTube Uploads</h3>
                <p style={styles.sectionSubtitle}>
                  {ytTopVideos.length} recent public videos tracked
                </p>
              </div>
            </div>

            {ytTopVideos.length > 0 && (
              <button
                onClick={() => onNavigate("analytics")}
                style={{ ...styles.sectionLinkBtn, color: accent }}
              >
                View Analytics →
              </button>
            )}
          </div>

          {ytTopVideos.length > 0 ? (
            <div style={styles.miniList}>
              {ytTopVideos.slice(0, 3).map((v) => (
                <div key={v.id} style={styles.miniItem}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {v.thumbnail && (
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        style={{
                          width: "48px",
                          height: "32px",
                          borderRadius: "4px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div>
                      {v.url ? (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            ...styles.miniItemTitle,
                            textDecoration: "none",
                            color: "#0f172a",
                            display: "inline-block",
                            maxWidth: "240px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {v.title}
                          <ExternalLink size={10} style={{ marginLeft: 4, display: "inline" }} />
                        </a>
                      ) : (
                        <span style={styles.miniItemTitle}>{v.title}</span>
                      )}
                      <span style={styles.miniItemBrand}>
                        {Number(v.views || 0).toLocaleString()} views • {v.publishedDate || "Recent"}
                      </span>
                    </div>
                  </div>
                  <span style={styles.engagementMiniBadge}>
                    {v.engagement || "0.0%"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyCardBox}>
              <Video size={28} color="#94a3b8" />
              <p style={styles.emptyCardText}>
                {isYtConnected
                  ? "No video uploads found on connected channel."
                  : "Connect YouTube to view real-time uploads."}
              </p>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                {isYtConnected
                  ? "Publish content to YouTube to stream real-time view counts."
                  : "Syncs directly with Google YouTube Data API v3."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Campaign Invitations & Deliverables Sections */}
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
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "6px",
  },
  heroTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  heroDesc: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
    maxWidth: "540px",
    lineHeight: "1.4",
  },
  heroRight: {
    display: "flex",
    alignItems: "center",
  },
  verifiedCard: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid",
    display: "flex",
    flexDirection: "column",
    textAlign: "right",
  },
  verifiedLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  verifiedVal: {
    fontSize: "16px",
    fontWeight: "800",
    marginTop: "2px",
  },
  verifiedSub: {
    fontSize: "11px",
    color: "#64748b",
  },
  actionAlertBanner: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fef3c7",
    borderRadius: "10px",
    padding: "12px 18px",
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
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#92400e",
    marginRight: "4px",
  },
  alertText: {
    fontSize: "13px",
    color: "#b45309",
  },
  alertBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  kpiLabel: {
    fontSize: "12.5px",
    color: "#64748b",
    fontWeight: "600",
  },
  kpiIconBox: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "8px",
  },
  kpiTrendPositive: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#15803d",
    fontWeight: "600",
  },
  kpiTrendNeutral: {
    display: "flex",
    alignItems: "center",
    fontSize: "11.5px",
    color: "#64748b",
    fontWeight: "500",
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
    padding: "22px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionIconWrap: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
    marginBottom: 0,
  },
  sectionLinkBtn: {
    background: "none",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  ytChannelContent: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  ytChannelHead: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
  },
  ytAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #fee2e2",
  },
  ytAvatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "800",
  },
  ytChannelName: {
    fontSize: "14.5px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 2px 0",
  },
  ytChannelHandle: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
  },
  liveTagRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
  liveTagBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  lastSyncText: {
    fontSize: "10.5px",
    color: "#94a3b8",
  },
  miniStatsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    padding: "10px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    textAlign: "center",
  },
  miniStat: {
    display: "flex",
    flexDirection: "column",
  },
  miniStatLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  miniStatVal: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  miniList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  miniItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
  miniItemTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },
  miniItemBrand: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  engagementMiniBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  statusTag: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  emptyCardBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
    gap: "6px",
  },
  emptyCardText: {
    fontSize: "12.5px",
    color: "#64748b",
    margin: "4px 0",
  },
  smallBtn: {
    marginTop: "6px",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

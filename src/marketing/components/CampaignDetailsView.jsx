import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Target,
  Edit3,
  Play,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  ExternalLink,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { getCampaignTimeline, calculateROI } from "../campaignService";
import { getAgencyBrandAssignments } from "../../agency/agencyService";

export default function CampaignDetailsView({
  campaign,
  invitations = [],
  deliverables = [],
  onBack,
  onOpenEditModal,
  onStatusChange,
  onOpenInviteModal,
  onOpenDeliverableModal,
  onReviewDeliverable,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'creators' | 'deliverables' | 'metrics' | 'timeline'
  const [agencyAssignment, setAgencyAssignment] = useState(null);

  useEffect(() => {
    if (campaign?.id) {
      getAgencyBrandAssignments({ campaignId: campaign.id })
        .then((list) => {
          const active = list.find((a) => a.status === "accepted" || a.status === "pending");
          setAgencyAssignment(active || null);
        })
        .catch(() => {});
    }
  }, [campaign?.id]);

  if (!campaign) {
    return (
      <div style={styles.errorBox}>
        <AlertCircle size={20} color="#b91c1c" />
        <span>Campaign not found. Please return to the campaigns list.</span>
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={14} style={{ marginRight: 4 }} />
          Back to Campaigns
        </button>
      </div>
    );
  }

  // Related data
  const campaignInvitations = invitations.filter((inv) => inv.campaignId === campaign.id);
  const acceptedInvitations = campaignInvitations.filter((inv) => inv.status === "accepted");
  const pendingInvitations = campaignInvitations.filter((inv) => inv.status === "pending");
  const declinedInvitations = campaignInvitations.filter((inv) => inv.status === "declined");

  const campaignDeliverables = deliverables.filter((d) => d.campaignId === campaign.id);
  const approvedDeliverables = campaignDeliverables.filter((d) => d.status === "approved");
  const pendingReviewDeliverables = campaignDeliverables.filter(
    (d) => d.status === "submitted" || d.status === "resubmitted"
  );

  const timeline = getCampaignTimeline(campaign.id);
  const roi = calculateROI(campaign.attributedRevenue || 0, campaign.spend || campaign.budget || 0);

  return (
    <div style={styles.container}>
      {/* Top Navigation & Breadcrumb */}
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backLink}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} />
          Back to All Campaigns
        </button>

        <div style={styles.topActions}>
          <button
            onClick={() => onOpenEditModal(campaign)}
            style={styles.secondaryBtn}
          >
            <Edit3 size={14} style={{ marginRight: 6 }} />
            Edit Campaign
          </button>

          {campaign.status === "draft" && (
            <button
              onClick={() => onStatusChange(campaign.id, "active")}
              style={styles.activateBtn}
            >
              <Play size={14} style={{ marginRight: 6 }} />
              Activate Campaign
            </button>
          )}

          {campaign.status === "active" && (
            <button
              onClick={() => onStatusChange(campaign.id, "completed")}
              style={styles.completeBtn}
            >
              <CheckCircle size={14} style={{ marginRight: 6 }} />
              Mark Completed
            </button>
          )}

          {(campaign.status === "active" || campaign.status === "draft") && (
            <button
              onClick={() => onStatusChange(campaign.id, "cancelled", "Cancelled by Marketing")}
              style={styles.cancelBtn}
            >
              <XCircle size={14} style={{ marginRight: 6 }} />
              Cancel Campaign
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner Card */}
      <div style={styles.heroCard}>
        <div style={styles.heroContent}>
          <div style={styles.tagRow}>
            <span
              style={{
                ...styles.statusBadge,
                ...getStatusStyle(campaign.status),
              }}
            >
              {campaign.status.toUpperCase()}
            </span>

            <span style={styles.objectiveBadge}>
              <Target size={12} style={{ marginRight: 4 }} />
              {campaign.objective}
            </span>

            <span style={styles.nicheBadge}>
              {campaign.targetNiche}
            </span>
          </div>

          <h1 style={styles.heroTitle}>{campaign.name}</h1>
          <p style={styles.heroDesc}>{campaign.description || "No overview provided."}</p>

          <div style={styles.heroMetaRow}>
            <div style={styles.metaItem}>
              <Calendar size={14} color="#64748b" />
              <span>{campaign.startDate} to {campaign.endDate}</span>
            </div>
            <div style={styles.metaDivider}>•</div>
            <div style={styles.metaItem}>
              <DollarSign size={14} color="#64748b" />
              <span>Budget: <strong>${(Number(campaign.budget) || 0).toLocaleString()}</strong></span>
            </div>
            <div style={styles.metaDivider}>•</div>
            <div style={styles.metaItem}>
              <Users size={14} color="#64748b" />
              <span>{acceptedInvitations.length} Creators Accepted</span>
            </div>
          </div>
        </div>

        {campaign.imageUrl && (
          <img
            src={campaign.imageUrl}
            alt={campaign.name}
            style={styles.heroImage}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={styles.tabsWrap}>
        {[
          { id: "overview", label: "Overview & Brief", count: null },
          { id: "creators", label: "Creators & Invitations", count: campaignInvitations.length },
          { id: "deliverables", label: "Deliverables & Review", count: campaignDeliverables.length },
          { id: "metrics", label: "Performance & ROI", count: null },
          { id: "timeline", label: "Activity Timeline", count: timeline.length },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                color: isSelected ? accent : "#475569",
                borderBottomColor: isSelected ? accent : "transparent",
                fontWeight: isSelected ? 700 : 500,
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  style={{
                    ...styles.tabCount,
                    backgroundColor: isSelected ? "#e0f2fe" : "#f1f5f9",
                    color: isSelected ? accent : "#64748b",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & BRIEF */}
      {activeTab === "overview" && (
        <div style={styles.tabContentGrid}>
          {/* Left Column: Requirements & Platforms */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardHeaderTitle}>Campaign Requirements & Guidelines</h3>
            <p style={styles.bodyParagraph}>
              {campaign.requirements || "No specific instructions entered for this campaign."}
            </p>

            <h4 style={styles.subHeaderTitle}>Deliverable Specifications</h4>
            <p style={styles.bodyParagraph}>
              {campaign.deliverableRequirements || "Deliverables to be negotiated with individual creators."}
            </p>

            <h4 style={styles.subHeaderTitle}>Target Social Platforms</h4>
            <div style={styles.platformChipRow}>
              {(campaign.targetPlatforms || []).map((p) => (
                <span key={p} style={styles.platformChip}>
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Financial & Progress Card */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardHeaderTitle}>Budget & Spend Allocation</h3>

            <div style={styles.budgetRow}>
              <div>
                <span style={styles.statSubLabel}>Total Allocated Budget</span>
                <span style={styles.statLargeVal}>${(Number(campaign.budget) || 0).toLocaleString()}</span>
              </div>
              <div>
                <span style={styles.statSubLabel}>Recorded Spend</span>
                <span style={{ ...styles.statLargeVal, color: accent }}>
                  ${(Number(campaign.spend) || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Spend progress bar */}
            <div style={styles.progressContainer}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(100, Math.round(((Number(campaign.spend) || 0) / (Number(campaign.budget) || 1)) * 100))}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <div style={styles.progressMeta}>
              <span>
                {Math.round(((Number(campaign.spend) || 0) / (Number(campaign.budget) || 1)) * 100)}% budget utilized
              </span>
              <span>
                ${Math.max(0, (Number(campaign.budget) || 0) - (Number(campaign.spend) || 0)).toLocaleString()} remaining
              </span>
            </div>

            <div style={styles.statDivider} />

            <h4 style={styles.subHeaderTitle}>Creator Deliverable Progress</h4>
            <div style={styles.miniStatsRow}>
              <div style={styles.miniStatBox}>
                <span style={styles.miniStatNum}>{acceptedInvitations.length}</span>
                <span style={styles.miniStatLabel}>Creators Accepted</span>
              </div>
              <div style={styles.miniStatBox}>
                <span style={styles.miniStatNum}>{approvedDeliverables.length}</span>
                <span style={styles.miniStatLabel}>Approved Deliverables</span>
              </div>
              <div style={styles.miniStatBox}>
                <span style={{ ...styles.miniStatNum, color: pendingReviewDeliverables.length > 0 ? "#2563eb" : "#0f172a" }}>
                  {pendingReviewDeliverables.length}
                </span>
                <span style={styles.miniStatLabel}>In Review</span>
              </div>
            </div>

            {agencyAssignment && (
              <div style={{ marginTop: "20px", padding: "16px", borderRadius: "10px", backgroundColor: "#f0fdfa", border: "1px solid #ccfbf1" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={18} color="#0d9488" />
                    <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                      Managed by Agency: {agencyAssignment.agencyName}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", backgroundColor: agencyAssignment.status === "accepted" ? "#ccfbf1" : "#fef3c7", color: agencyAssignment.status === "accepted" ? "#0f766e" : "#92400e" }}>
                    {agencyAssignment.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#475569" }}>
                  <span>Agency Email: <strong>{agencyAssignment.agencyEmail}</strong></span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Terms: {agencyAssignment.managementFee || "15% Management Fee"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATORS & INVITATIONS */}
      {activeTab === "creators" && (
        <div style={styles.detailCard}>
          <div style={styles.cardHeaderFlex}>
            <div>
              <h3 style={styles.cardHeaderTitle}>Participating Creators & Invitations</h3>
              <p style={styles.cardHeaderSub}>
                Manage creator invitations, responses, and roster onboarding.
              </p>
            </div>
            <button
              onClick={() => onOpenInviteModal(campaign)}
              style={{ ...styles.primaryBtn, backgroundColor: accent }}
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              Invite More Creators
            </button>
          </div>

          {campaignInvitations.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={32} color="#94a3b8" />
              <h4 style={styles.emptyTitle}>No Creators Invited Yet</h4>
              <p style={styles.emptyText}>
                Use Creator Discovery to find relevant creators and invite them to this campaign.
              </p>
              <button
                onClick={() => onOpenInviteModal(campaign)}
                style={{ ...styles.primaryBtn, backgroundColor: accent, marginTop: 12 }}
              >
                <Plus size={15} style={{ marginRight: 6 }} />
                Invite Creators Now
              </button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Creator</th>
                    <th style={styles.th}>Proposed Compensation</th>
                    <th style={styles.th}>Invitation Status</th>
                    <th style={styles.th}>Sent Date</th>
                    <th style={styles.th}>Response Date</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignInvitations.map((inv) => (
                    <tr key={inv.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div>
                          <span style={styles.creatorNameText}>{inv.creatorName}</span>
                          <span style={styles.creatorEmailText}>{inv.creatorEmail}</span>
                        </div>
                      </td>
                      <td style={styles.tdBold}>{inv.compensation}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...getInvitationStatusStyle(inv.status),
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(inv.sentAt).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        {inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : "Awaiting response"}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {inv.status === "accepted" ? (
                          <button
                            onClick={() => onOpenDeliverableModal(campaign, inv)}
                            style={{ ...styles.actionPillBtn, color: accent }}
                          >
                            + Assign Deliverable
                          </button>
                        ) : (
                          <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                            {inv.status === "declined" ? "Declined" : "Pending acceptance"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELIVERABLES & REVIEW */}
      {activeTab === "deliverables" && (
        <div style={styles.detailCard}>
          <div style={styles.cardHeaderFlex}>
            <div>
              <h3 style={styles.cardHeaderTitle}>Campaign Deliverables & Content Review</h3>
              <p style={styles.cardHeaderSub}>
                Track deliverables across accepted creators, inspect submission links, and provide feedback.
              </p>
            </div>
            {acceptedInvitations.length > 0 && (
              <button
                onClick={() => onOpenDeliverableModal(campaign, acceptedInvitations[0])}
                style={{ ...styles.primaryBtn, backgroundColor: accent }}
              >
                <Plus size={15} style={{ marginRight: 6 }} />
                Assign New Deliverable
              </button>
            )}
          </div>

          {campaignDeliverables.length === 0 ? (
            <div style={styles.emptyState}>
              <CheckSquare size={32} color="#94a3b8" />
              <h4 style={styles.emptyTitle}>No Deliverables Defined</h4>
              <p style={styles.emptyText}>
                {acceptedInvitations.length > 0
                  ? "Assign specific content pieces (e.g. YouTube integrations, TikTok shorts) to accepted creators."
                  : "Invite creators and await their acceptance before assigning campaign deliverables."}
              </p>
              {acceptedInvitations.length > 0 && (
                <button
                  onClick={() => onOpenDeliverableModal(campaign, acceptedInvitations[0])}
                  style={{ ...styles.primaryBtn, backgroundColor: accent, marginTop: 12 }}
                >
                  <Plus size={15} style={{ marginRight: 6 }} />
                  Assign First Deliverable
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Deliverable Title & Format</th>
                    <th style={styles.th}>Creator</th>
                    <th style={styles.th}>Due Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Submission Proof</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignDeliverables.map((del) => {
                    const needsReview = del.status === "submitted" || del.status === "resubmitted";
                    return (
                      <tr key={del.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div>
                            <span style={styles.creatorNameText}>{del.title}</span>
                            <span style={styles.formatPill}>{del.contentType}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.creatorNameText}>{del.creatorName}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={12} color="#64748b" />
                            <span>{del.dueDate}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              ...getDeliverableStatusStyle(del.status),
                            }}
                          >
                            {formatDeliverableStatus(del.status)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {del.submissionUrl ? (
                            <a
                              href={del.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ ...styles.proofLink, color: accent }}
                            >
                              <ExternalLink size={12} style={{ marginRight: 4 }} />
                              View Work
                            </a>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Awaiting URL</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {needsReview ? (
                            <button
                              onClick={() => onReviewDeliverable(del)}
                              style={{ ...styles.reviewActionBtn, backgroundColor: accent }}
                            >
                              Inspect & Review
                            </button>
                          ) : del.status === "approved" ? (
                            <span style={styles.approvedLabel}>
                              <CheckCircle size={13} color="#15803d" style={{ marginRight: 4 }} />
                              Approved
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {del.status === "revision_requested" ? "Revisions pending" : "In production"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERFORMANCE & ROI */}
      {activeTab === "metrics" && (
        <div style={styles.detailCard}>
          <h3 style={styles.cardHeaderTitle}>Attributed Performance & Financial ROI</h3>
          <p style={styles.cardHeaderSub}>
            Multi-touch conversion metrics, attributed sales, and ROI formula verification.
          </p>

          <div style={styles.roiBanner}>
            <div>
              <span style={styles.roiFormulaLabel}>Formula Applied:</span>
              <code style={styles.roiCode}>
                ROI = ((Attributed Revenue - Campaign Cost) / Campaign Cost) × 100
              </code>
            </div>
            <div style={styles.roiScoreWrap}>
              <span style={styles.roiScoreLabel}>Net Return on Spend (ROI)</span>
              <span
                style={{
                  ...styles.roiScoreVal,
                  color: roi.isPositive ? "#15803d" : "#b91c1c",
                }}
              >
                {roi.formatted}
              </span>
            </div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricCardLabel}>Attributed Views</span>
              <span style={styles.metricCardVal}>{(campaign.views || 0).toLocaleString()}</span>
              <span style={styles.metricSub}>Across creator video integrations</span>
            </div>

            <div style={styles.metricCard}>
              <span style={styles.metricCardLabel}>Tracked Link Clicks</span>
              <span style={styles.metricCardVal}>{(campaign.clicks || 0).toLocaleString()}</span>
              <span style={styles.metricSub}>Via tagged UTM parameters</span>
            </div>

            <div style={styles.metricCard}>
              <span style={styles.metricCardLabel}>Direct Conversions</span>
              <span style={styles.metricCardVal}>{(campaign.conversions || 0).toLocaleString()}</span>
              <span style={styles.metricSub}>Purchases & enterprise signups</span>
            </div>

            <div style={styles.metricCard}>
              <span style={styles.metricCardLabel}>Attributed Revenue</span>
              <span style={{ ...styles.metricCardVal, color: "#15803d" }}>
                ${(campaign.attributedRevenue || 0).toLocaleString()}
              </span>
              <span style={styles.metricSub}>Verified attribution telemetry</span>
            </div>
          </div>

          <div style={styles.disclaimerBox}>
            <Sparkles size={14} color="#0284c7" />
            <span>
              Attribution metrics updated via CreatorIQ Platform Tracking & Webhooks. Source: Production Data Vault.
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === "timeline" && (
        <div style={styles.detailCard}>
          <h3 style={styles.cardHeaderTitle}>Campaign Audit Log & Activity Timeline</h3>
          <p style={styles.cardHeaderSub}>
            Complete chronological record of all campaign events, status changes, and creator actions.
          </p>

          {timeline.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No activity recorded yet.</p>
          ) : (
            <div style={styles.timelineList}>
              {timeline.map((event, idx) => (
                <div key={event.id || idx} style={styles.timelineItem}>
                  <div style={styles.timelinePoint}>
                    <div style={{ ...styles.timelineDot, backgroundColor: accent }} />
                    {idx < timeline.length - 1 && <div style={styles.timelineLine} />}
                  </div>
                  <div style={styles.timelineBody}>
                    <span style={styles.timelineText}>{event.text}</span>
                    <span style={styles.timelineTime}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case "active":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "draft":
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
    case "completed":
      return { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
    case "cancelled":
      return { backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" };
    default:
      return { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
  }
}

function getInvitationStatusStyle(status) {
  switch (status) {
    case "accepted":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "declined":
      return { backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" };
    case "pending":
    default:
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
  }
}

function getDeliverableStatusStyle(status) {
  switch (status) {
    case "approved":
      return { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
    case "submitted":
    case "resubmitted":
      return { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
    case "revision_requested":
      return { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
    case "pending":
    default:
      return { backgroundColor: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
  }
}

function formatDeliverableStatus(status) {
  switch (status) {
    case "revision_requested":
      return "Revision Requested";
    case "resubmitted":
      return "Resubmitted";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    default:
      return "Pending Submission";
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    background: "none",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  topActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  secondaryBtn: {
    padding: "7px 13px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  activateBtn: {
    padding: "7px 13px",
    borderRadius: "8px",
    border: "1px solid #86efac",
    backgroundColor: "#f0fdf4",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#15803d",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  completeBtn: {
    padding: "7px 13px",
    borderRadius: "8px",
    border: "1px solid #bfdbfe",
    backgroundColor: "#eff6ff",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#1d4ed8",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  cancelBtn: {
    padding: "7px 13px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px 28px",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },
  heroContent: {
    flex: "1 1 500px",
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  statusBadge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },
  objectiveBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "6px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "11.5px",
    fontWeight: "600",
  },
  nicheBadge: {
    padding: "3px 9px",
    borderRadius: "6px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "11.5px",
  },
  heroTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "6px",
    letterSpacing: "-0.4px",
  },
  heroDesc: {
    fontSize: "13.5px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "16px",
    maxWidth: "720px",
  },
  heroMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "12.5px",
    color: "#475569",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  metaDivider: {
    color: "#cbd5e1",
  },
  heroImage: {
    width: "200px",
    height: "120px",
    borderRadius: "12px",
    objectFit: "cover",
    border: "1px solid #e2e8f0",
    flexShrink: 0,
  },
  tabsWrap: {
    display: "flex",
    gap: "12px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "2px",
    overflowX: "auto",
  },
  tabBtn: {
    background: "none",
    border: "none",
    borderBottom: "2px solid",
    padding: "8px 14px",
    fontSize: "13px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  tabCount: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "10px",
  },
  tabContentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "20px",
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  cardHeaderTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "4px",
  },
  cardHeaderSub: {
    fontSize: "12.5px",
    color: "#64748b",
    marginBottom: "18px",
  },
  cardHeaderFlex: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px",
  },
  subHeaderTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
    marginTop: "16px",
    marginBottom: "6px",
  },
  bodyParagraph: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.6",
  },
  platformChipRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "6px",
  },
  platformChip: {
    padding: "4px 10px",
    borderRadius: "20px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid #e2e8f0",
  },
  budgetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "14px",
    marginBottom: "12px",
  },
  statSubLabel: {
    display: "block",
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  statLargeVal: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  progressContainer: {
    width: "100%",
    height: "8px",
    backgroundColor: "#f1f5f9",
    borderRadius: "10px",
    overflow: "hidden",
    margin: "8px 0",
  },
  progressBar: {
    height: "100%",
    borderRadius: "10px",
    transition: "width 0.3s ease",
  },
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11.5px",
    color: "#64748b",
  },
  statDivider: {
    height: "1px",
    backgroundColor: "#f1f5f9",
    margin: "18px 0",
  },
  miniStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "10px",
  },
  miniStatBox: {
    backgroundColor: "#f8fafc",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  miniStatNum: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    display: "block",
  },
  miniStatLabel: {
    fontSize: "10.5px",
    color: "#64748b",
    marginTop: "2px",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 15px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  thRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "12px 14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  creatorNameText: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  creatorEmailText: {
    fontSize: "11px",
    color: "#64748b",
  },
  actionPillBtn: {
    background: "none",
    border: "none",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  formatPill: {
    display: "inline-block",
    fontSize: "10.5px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    marginTop: "2px",
  },
  proofLink: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
  },
  reviewActionBtn: {
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  approvedLabel: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#15803d",
  },
  roiBanner: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
  },
  roiFormulaLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "4px",
    fontWeight: "600",
  },
  roiCode: {
    backgroundColor: "#f1f5f9",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#0f172a",
    fontFamily: "monospace",
  },
  roiScoreWrap: {
    textAlign: "right",
  },
  roiScoreLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  roiScoreVal: {
    fontSize: "24px",
    fontWeight: "800",
    display: "block",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
  },
  metricCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
  },
  metricCardLabel: {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: "0.5px",
    display: "block",
  },
  metricCardVal: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "4px",
    display: "block",
  },
  metricSub: {
    fontSize: "10.5px",
    color: "#64748b",
    marginTop: "2px",
    display: "block",
  },
  disclaimerBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11.5px",
    color: "#64748b",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "8px 14px",
    marginTop: "18px",
  },
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
  },
  timelineItem: {
    display: "flex",
    gap: "14px",
    position: "relative",
  },
  timelinePoint: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "16px",
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginTop: "4px",
    zIndex: 2,
  },
  timelineLine: {
    width: "2px",
    flex: 1,
    backgroundColor: "#e2e8f0",
    marginTop: "2px",
    marginBottom: "2px",
  },
  timelineBody: {
    paddingBottom: "18px",
    flex: 1,
  },
  timelineText: {
    fontSize: "13px",
    color: "#0f172a",
    display: "block",
    fontWeight: "500",
  },
  timelineTime: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "block",
    marginTop: "2px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "8px",
  },
  emptyText: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "4px",
    maxWidth: "400px",
    margin: "4px auto 0",
  },
  errorBox: {
    padding: "24px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  backBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
};

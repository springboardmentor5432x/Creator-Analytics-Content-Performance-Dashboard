import { fetchAllUsers } from "./adminService";
import { fetchAllCampaignsForAdmin } from "./campaignOversightService";
import { fetchAllReports } from "./moderationService";
import {
  getLocalInvitations,
  getLocalDeliverables,
} from "../marketing/campaignService";
import {
  getAgencyBrandAssignments,
  getAgencyCreatorRelationships,
} from "../agency/agencyService";

/**
 * Aggregates real platform analytics strictly from existing database and storage records.
 * Does not fabricate metrics, revenues, or phantom users.
 * Supports date-range filtering based on actual record timestamps.
 */
export async function fetchPlatformAnalytics(dateRange = "ALL") {
  const [users, campaigns, reports] = await Promise.all([
    fetchAllUsers(),
    fetchAllCampaignsForAdmin(),
    fetchAllReports(),
  ]);

  const invitations = getLocalInvitations();
  const deliverables = getLocalDeliverables();
  const assignments = getAgencyBrandAssignments();
  const relationships = getAgencyCreatorRelationships();

  // Compute time window cutoff
  let cutoffTimestamp = 0;
  const now = Date.now();
  if (dateRange === "today") {
    cutoffTimestamp = now - 24 * 60 * 60 * 1000;
  } else if (dateRange === "last_7d") {
    cutoffTimestamp = now - 7 * 24 * 60 * 60 * 1000;
  } else if (dateRange === "last_30d") {
    cutoffTimestamp = now - 30 * 24 * 60 * 60 * 1000;
  }

  const isWithinWindow = (isoDate) => {
    if (!isoDate || dateRange === "ALL") return true;
    const time = new Date(isoDate).getTime();
    return !isNaN(time) && time >= cutoffTimestamp;
  };

  // 1. User Metrics
  const filteredUsers = users.filter((u) => isWithinWindow(u.createdAt));
  const userRoleCounts = {
    Creator: 0,
    Agency: 0,
    "Marketing Team": 0,
    Admin: 0,
  };
  const userStatusCounts = {
    active: 0,
    suspended: 0,
  };
  const providerCounts = {
    email: 0,
    google: 0,
  };

  filteredUsers.forEach((u) => {
    if (userRoleCounts[u.role] !== undefined) userRoleCounts[u.role] += 1;
    const st = u.status === "suspended" ? "suspended" : "active";
    userStatusCounts[st] += 1;
    const prv = (u.provider || "").toLowerCase().includes("google") ? "google" : "email";
    providerCounts[prv] += 1;
  });

  // Group user registrations over time (e.g. by date string YYYY-MM-DD)
  const registrationsTimelineMap = new Map();
  filteredUsers.forEach((u) => {
    if (u.createdAt) {
      const day = new Date(u.createdAt).toISOString().split("T")[0];
      registrationsTimelineMap.set(day, (registrationsTimelineMap.get(day) || 0) + 1);
    }
  });

  const registrationsTimeline = Array.from(registrationsTimelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // 2. Campaign Metrics
  const filteredCampaigns = campaigns.filter((c) => isWithinWindow(c.createdAt));
  const campaignStatusCounts = {
    active: 0,
    restricted: 0,
    completed: 0,
    draft: 0,
  };
  let totalAllocatedBudget = 0;
  const nicheDistributionMap = new Map();

  filteredCampaigns.forEach((c) => {
    const st = (c.status || "active").toLowerCase();
    if (campaignStatusCounts[st] !== undefined) campaignStatusCounts[st] += 1;
    const b = Number(c.budget) || 0;
    totalAllocatedBudget += b;

    const n = c.targetNiche || "General / Unspecified";
    nicheDistributionMap.set(n, (nicheDistributionMap.get(n) || 0) + 1);
  });

  const nicheDistribution = Array.from(nicheDistributionMap.entries())
    .map(([niche, count]) => ({ niche, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Collaborations & Invitations
  const filteredInvitations = invitations.filter((inv) =>
    isWithinWindow(inv.sentAt || inv.createdAt)
  );
  const invitationStatusCounts = {
    accepted: 0,
    pending: 0,
    declined: 0,
  };

  filteredInvitations.forEach((inv) => {
    const st = (inv.status || "pending").toLowerCase();
    if (invitationStatusCounts[st] !== undefined) invitationStatusCounts[st] += 1;
  });

  const totalInvs = filteredInvitations.length;
  const acceptanceRate =
    totalInvs > 0
      ? Math.round((invitationStatusCounts.accepted / totalInvs) * 100)
      : 0;

  // 4. Deliverables Pipeline
  const filteredDeliverables = deliverables.filter((d) =>
    isWithinWindow(d.updatedAt || d.createdAt)
  );
  const deliverableStatusCounts = {
    approved: 0,
    submitted: 0,
    resubmitted: 0,
    revision_requested: 0,
    pending: 0,
  };

  filteredDeliverables.forEach((d) => {
    const st = (d.status || "pending").toLowerCase();
    if (deliverableStatusCounts[st] !== undefined) deliverableStatusCounts[st] += 1;
  });

  const totalDeliverablesCount = filteredDeliverables.length;
  const approvedDeliverablesCount = deliverableStatusCounts.approved;
  const deliverableFulfillmentRate =
    totalDeliverablesCount > 0
      ? Math.round((approvedDeliverablesCount / totalDeliverablesCount) * 100)
      : 0;

  // 5. Trust & Safety Reports
  const filteredReports = reports.filter((r) => isWithinWindow(r.createdAt));
  const reportStatusCounts = {
    open: 0,
    under_review: 0,
    resolved: 0,
    dismissed: 0,
  };
  const reportCategoryMap = new Map();

  filteredReports.forEach((r) => {
    const st = (r.status || "open").toLowerCase();
    if (reportStatusCounts[st] !== undefined) reportStatusCounts[st] += 1;

    const cat = r.categoryLabel || r.category || "General";
    reportCategoryMap.set(cat, (reportCategoryMap.get(cat) || 0) + 1);
  });

  const reportCategoryBreakdown = Array.from(reportCategoryMap.entries()).map(
    ([category, count]) => ({ category, count })
  );

  const totalReportsCount = filteredReports.length;
  const resolvedOrDismissed =
    reportStatusCounts.resolved + reportStatusCounts.dismissed;
  const reportResolutionRate =
    totalReportsCount > 0
      ? Math.round((resolvedOrDismissed / totalReportsCount) * 100)
      : 100;

  // 6. Agency Ecosystem
  const activeAgencyBrandAssignments = assignments.filter(
    (a) => a.status === "accepted" || a.status === "active"
  ).length;
  const activeCreatorRepresentations = relationships.filter(
    (rel) => rel.status === "active" || rel.status === "accepted"
  ).length;

  return {
    dateRange,
    cutoffTimestamp,
    lastComputedAt: new Date().toISOString(),

    // User metrics
    totalUsers: filteredUsers.length,
    userRoleCounts,
    userStatusCounts,
    providerCounts,
    registrationsTimeline,

    // Campaign metrics
    totalCampaigns: filteredCampaigns.length,
    campaignStatusCounts,
    totalAllocatedBudget,
    averageCampaignBudget:
      filteredCampaigns.length > 0
        ? Math.round(totalAllocatedBudget / filteredCampaigns.length)
        : 0,
    nicheDistribution,

    // Collaborations & Invitations
    totalInvitations: totalInvs,
    invitationStatusCounts,
    acceptanceRate,

    // Deliverables
    totalDeliverables: totalDeliverablesCount,
    deliverableStatusCounts,
    deliverableFulfillmentRate,

    // Safety & Reports
    totalReports: totalReportsCount,
    reportStatusCounts,
    reportCategoryBreakdown,
    reportResolutionRate,

    // Agency Ecosystem
    activeAgencyBrandAssignments,
    activeCreatorRepresentations,

    // Honest Data Tracking Disclaimers
    disclaimers: [
      {
        id: "active_users",
        note: "Account status reflects administrative provisioning (Active vs Suspended). Real-time DAU/MAU activity telemetry requires persistent session heartbeat tracking.",
      },
      {
        id: "revenue",
        note: "Budget figures reflect stated campaign media allocation. Attribution sales revenue is omitted unless verified webhook tracking is linked to the brand account.",
      },
    ],
  };
}

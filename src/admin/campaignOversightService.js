import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { recordAuditLog } from "./adminService";
import {
  getLocalCampaigns,
  getLocalInvitations,
  getLocalDeliverables,
  createNotification,
  emitDataChange,
} from "../marketing/campaignService";
import { fetchAllReports } from "./moderationService";

const STORAGE_KEYS_CAMPAIGNS = "creatoriq_campaigns_store";

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

/**
 * Fetches all platform campaigns enriched with moderation flags, reports, and collaborator summaries.
 * Strictly read-only oversight: does not allow admin to manipulate budgets or invite creators.
 */
export async function fetchAllCampaignsForAdmin() {
  const campaignMap = new Map();

  // 1. Pull local campaigns
  const localList = getLocalCampaigns();
  localList.forEach((c) => {
    if (c.id) campaignMap.set(c.id, { ...c });
  });

  // 2. Pull from Firestore if available
  if (db) {
    try {
      const snap = await getDocs(collection(db, "campaigns"));
      snap.forEach((d) => {
        const data = d.data();
        let createdTime = data.createdAt;
        if (data.createdAt?.toDate) {
          createdTime = data.createdAt.toDate().toISOString();
        }
        let updatedTime = data.updatedAt;
        if (data.updatedAt?.toDate) {
          updatedTime = data.updatedAt.toDate().toISOString();
        }

        const existing = campaignMap.get(d.id) || {};
        campaignMap.set(d.id, {
          ...existing,
          ...data,
          id: d.id,
          createdAt: createdTime || data.createdAt || existing.createdAt,
          updatedAt: updatedTime || data.updatedAt || existing.updatedAt,
        });
      });
    } catch (fsErr) {
      console.warn("[CampaignOversight] Firestore campaigns fetch note:", fsErr.message);
    }
  }

  // 3. Enrich with Reports
  const allReports = await fetchAllReports();
  const allInvitations = getLocalInvitations();
  const allDeliverables = getLocalDeliverables();

  const enriched = Array.from(campaignMap.values()).map((c) => {
    // Linked reports
    const linkedReports = allReports.filter(
      (r) =>
        r.targetType === "campaign" &&
        (r.targetId === c.id || r.targetTitle?.toLowerCase() === c.name?.toLowerCase())
    );

    const activeReports = linkedReports.filter(
      (r) => r.status === "open" || r.status === "under_review"
    );

    // Associated Collaborators
    const campInvs = allInvitations.filter((i) => i.campaignId === c.id);
    const acceptedInvs = campInvs.filter((i) => i.status === "accepted");

    // Associated Deliverables
    const campDelivs = allDeliverables.filter((d) => d.campaignId === c.id);
    const approvedDelivs = campDelivs.filter((d) => d.status === "approved");

    return {
      ...c,
      moderationStatus: c.status === "restricted" ? "restricted" : (c.moderationStatus || "normal"),
      restrictionReason: c.restrictionReason || null,
      restrictedAt: c.restrictedAt || null,
      restrictedBy: c.restrictedBy || null,
      reportsCount: linkedReports.length,
      activeReportsCount: activeReports.length,
      linkedReports,
      totalInvitations: campInvs.length,
      acceptedCreatorsCount: acceptedInvs.length,
      totalDeliverables: campDelivs.length,
      approvedDeliverablesCount: approvedDelivs.length,
    };
  });

  // Sort newest first
  enriched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return enriched;
}

/**
 * Restricts a campaign from public discovery and creator participation.
 * Explicit, reversible moderation action enforced by backend and audit-logged.
 */
export async function restrictCampaign({ adminUser, campaignId, reason }) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!campaignId) throw new Error("Campaign ID is required.");
  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required to restrict a campaign.");
  }

  const all = readStorage(STORAGE_KEYS_CAMPAIGNS, []);
  const index = all.findIndex((c) => c.id === campaignId);
  const existing = index !== -1 ? all[index] : null;

  const now = new Date().toISOString();
  const previousStatus = existing ? existing.status : "active";

  const updateData = {
    status: "restricted",
    moderationStatus: "restricted",
    restrictionReason: reason.trim(),
    restrictedAt: now,
    restrictedBy: adminUser.uid,
    updatedAt: now,
  };

  // 1. Update local storage
  if (index !== -1) {
    all[index] = { ...all[index], ...updateData };
    writeStorage(STORAGE_KEYS_CAMPAIGNS, all);
  }

  // 2. Update Firestore
  if (db) {
    try {
      const docRef = doc(db, "campaigns", campaignId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[CampaignOversight] Firestore restrict warning:", fsErr.message);
    }
  }

  // 3. Record in Append-Only Audit Log
  await recordAuditLog({
    adminUser,
    action: "CAMPAIGN_RESTRICTED",
    targetId: campaignId,
    targetType: "campaign",
    targetEmail: existing?.marketingEmail || "brand@creatoriq.io",
    reason: reason.trim(),
    metadata: {
      campaignName: existing?.name || campaignId,
      marketingId: existing?.marketingId,
      marketingEmail: existing?.marketingEmail,
      previousStatus,
      newStatus: "restricted",
    },
  });

  // 4. Notify Brand Owner
  if (existing?.marketingEmail) {
    try {
      await createNotification({
        recipientId: existing.marketingId || "brand",
        recipientEmail: existing.marketingEmail,
        recipientRole: "Marketing Team",
        type: "campaign_restricted",
        title: `Campaign Moderation Notice: "${existing.name || campaignId}" Restricted`,
        message: `Your campaign has been placed under administrative restriction by Platform Trust & Safety. Reason: ${reason.trim()}. Creators cannot accept invitations or submit deliverables while restricted.`,
        campaignId,
      });
    } catch (notifErr) {
      console.warn("Could not dispatch campaign restriction notification:", notifErr);
    }
  }

  emitDataChange("campaigns", { id: campaignId, status: "restricted" });
  return { id: campaignId, ...updateData };
}

/**
 * Reverses a campaign restriction, restoring it to 'active' or 'draft'.
 */
export async function unrestrictCampaign({
  adminUser,
  campaignId,
  reason,
  restoreStatus = "active",
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!campaignId) throw new Error("Campaign ID is required.");
  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required to restore a restricted campaign.");
  }

  const all = readStorage(STORAGE_KEYS_CAMPAIGNS, []);
  const index = all.findIndex((c) => c.id === campaignId);
  const existing = index !== -1 ? all[index] : null;

  const now = new Date().toISOString();

  const updateData = {
    status: restoreStatus,
    moderationStatus: "restored",
    restrictionReason: null,
    unrestrictedAt: now,
    unrestrictedBy: adminUser.uid,
    updatedAt: now,
  };

  // 1. Update local storage
  if (index !== -1) {
    all[index] = { ...all[index], ...updateData };
    writeStorage(STORAGE_KEYS_CAMPAIGNS, all);
  }

  // 2. Update Firestore
  if (db) {
    try {
      const docRef = doc(db, "campaigns", campaignId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[CampaignOversight] Firestore unrestrict warning:", fsErr.message);
    }
  }

  // 3. Record in Append-Only Audit Log
  await recordAuditLog({
    adminUser,
    action: "CAMPAIGN_UNRESTRICTED",
    targetId: campaignId,
    targetType: "campaign",
    targetEmail: existing?.marketingEmail || "brand@creatoriq.io",
    reason: reason.trim(),
    metadata: {
      campaignName: existing?.name || campaignId,
      previousStatus: "restricted",
      restoredStatus: restoreStatus,
    },
  });

  // 4. Notify Brand Owner
  if (existing?.marketingEmail) {
    try {
      await createNotification({
        recipientId: existing.marketingId || "brand",
        recipientEmail: existing.marketingEmail,
        recipientRole: "Marketing Team",
        type: "campaign_unrestricted",
        title: `Campaign Restriction Lifted: "${existing.name || campaignId}"`,
        message: `Administrative restriction on "${existing.name || campaignId}" has been lifted and status restored to ${restoreStatus}. Reason: ${reason.trim()}.`,
        campaignId,
      });
    } catch (notifErr) {
      console.warn("Could not dispatch campaign unrestrict notification:", notifErr);
    }
  }

  emitDataChange("campaigns", { id: campaignId, status: restoreStatus });
  return { id: campaignId, ...updateData };
}

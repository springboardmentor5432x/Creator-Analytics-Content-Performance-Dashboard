import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { fetchAllUsers, recordAuditLog } from "./adminService";
import { createNotification, emitDataChange } from "../marketing/campaignService";

const STORAGE_KEY_USERS = "creatoriq_registered_users";

/**
 * Fetches all Brand (Marketing Team) and Agency accounts for administrative verification review.
 */
export async function fetchAgencyAndBrandAccounts() {
  const users = await fetchAllUsers();

  const accounts = users
    .filter((u) => u.role === "Agency" || u.role === "Marketing Team")
    .map((u) => {
      // Default to 'verified' if legacy flag 'verified: true' was set, otherwise 'unverified'
      const status =
        u.verificationStatus || (u.verified ? "verified" : "unverified");

      return {
        uid: u.uid,
        fullName: u.fullName || u.displayName || (u.role === "Agency" ? "Talent Agency" : "Brand Marketer"),
        email: u.email,
        role: u.role,
        accountStatus: u.status || "active",
        verificationStatus: status, // 'unverified' | 'pending' | 'verified' | 'rejected'
        verificationReason: u.verificationReason || null,
        verifiedAt: u.verifiedAt || null,
        verifiedBy: u.verifiedBy || null,
        createdAt: u.createdAt,
        provider: u.provider || "email",
      };
    });

  // Sort: pending first, then newest
  accounts.sort((a, b) => {
    if (a.verificationStatus === "pending" && b.verificationStatus !== "pending") return -1;
    if (b.verificationStatus === "pending" && a.verificationStatus !== "pending") return 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return accounts;
}

/**
 * Updates an Agency or Brand account's verification status (e.g. approve, reject, revoke, or request info).
 * Requires mandatory reason, records in audit log, and notifies the account.
 */
export async function updateAccountVerification({
  adminUser,
  targetUser,
  newStatus,
  reason,
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!targetUser || !targetUser.uid) {
    throw new Error("Target account not found.");
  }

  if (!["verified", "rejected", "unverified", "pending"].includes(newStatus)) {
    throw new Error("Invalid verification status.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required for any verification decision.");
  }

  const now = new Date().toISOString();
  const previousStatus = targetUser.verificationStatus || "unverified";

  const updateFields = {
    verificationStatus: newStatus,
    verified: newStatus === "verified",
    verificationReason: reason.trim(),
    verifiedAt: newStatus === "verified" ? now : null,
    verifiedBy: adminUser.uid,
    verificationUpdatedAt: now,
  };

  // 1. Update Firestore user document
  if (db && targetUser.uid) {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, {
        ...updateFields,
        verificationUpdatedAt: serverTimestamp(),
        ...(newStatus === "verified" ? { verifiedAt: serverTimestamp() } : {}),
      });
    } catch (fsErr) {
      console.warn("[VerificationService] Firestore update warning:", fsErr.message);
    }
  }

  // 2. Update local storage registry mirror
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const emailKey = (targetUser.email || "").toLowerCase();
      if (parsed[emailKey]) {
        parsed[emailKey] = {
          ...parsed[emailKey],
          ...updateFields,
        };
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.warn("Could not mirror verification update to local storage:", err);
  }

  // 3. Record in Append-Only Audit Ledger
  let auditAction = "VERIFICATION_STATUS_UPDATED";
  if (newStatus === "verified") {
    auditAction = targetUser.role === "Agency" ? "AGENCY_VERIFIED" : "BRAND_VERIFIED";
  } else if (newStatus === "rejected") {
    auditAction = "VERIFICATION_REJECTED";
  } else if (newStatus === "unverified" && previousStatus === "verified") {
    auditAction = "VERIFICATION_REVOKED";
  }

  await recordAuditLog({
    adminUser,
    action: auditAction,
    targetId: targetUser.uid,
    targetType: targetUser.role === "Agency" ? "agency" : "brand",
    targetEmail: targetUser.email,
    reason: reason.trim(),
    metadata: {
      accountName: targetUser.fullName,
      role: targetUser.role,
      previousStatus,
      newStatus,
    },
  });

  // 4. Send official notification to the Brand or Agency account
  try {
    let notifTitle = "";
    let notifMessage = "";

    if (newStatus === "verified") {
      notifTitle = `Account Verified: Official ${targetUser.role} Badge Approved`;
      notifMessage = `Congratulations! Platform Administration has verified your ${targetUser.role} account on CreatorIQ. Reason: "${reason.trim()}". Your verified badge is now active.`;
    } else if (newStatus === "rejected") {
      notifTitle = `Verification Request Declined`;
      notifMessage = `Your verification request was reviewed and not approved. Reason: "${reason.trim()}". You may review compliance requirements and submit additional evidence.`;
    } else {
      notifTitle = `Verification Status Updated`;
      notifMessage = `Your account verification status has been updated to "${newStatus}". Note: "${reason.trim()}".`;
    }

    await createNotification({
      recipientId: targetUser.uid,
      recipientEmail: targetUser.email,
      recipientRole: targetUser.role,
      type: "verification_update",
      title: notifTitle,
      message: notifMessage,
    });
  } catch (notifErr) {
    console.warn("Failed to dispatch verification notification:", notifErr);
  }

  emitDataChange("users", { uid: targetUser.uid, ...updateFields });
  return { uid: targetUser.uid, ...updateFields };
}

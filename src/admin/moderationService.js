import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { recordAuditLog, updateUserAccountStatus, fetchAllUsers } from "./adminService";
import { createNotification, emitDataChange } from "../marketing/campaignService";
import { restrictCampaign } from "./campaignOversightService";

export const REPORT_CATEGORIES = [
  { id: "impersonation", label: "Impersonation / Fake Profile" },
  { id: "fraud", label: "Fraudulent or Misleading Campaign" },
  { id: "harassment", label: "Harassment, Hate Speech or Bullying" },
  { id: "spam", label: "Spam, Phishing, or Scam Links" },
  { id: "tos_violation", label: "Terms of Service or Contract Breach" },
  { id: "other", label: "Other Safety or Platform Issue" },
];

export const REPORT_TARGET_TYPES = [
  { id: "user", label: "User Account" },
  { id: "campaign", label: "Marketing Campaign" },
  { id: "platform", label: "Platform Issue" },
];

const STORAGE_KEY_REPORTS = "creatoriq_moderation_reports";

function readReportsStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeReportsStorage(reports) {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.warn("Could not save reports to local storage:", err);
  }
}

/**
 * Submits a new user report into Firestore /reports and local storage.
 * Enforces authenticated reporter identity and prevents duplicate active reports.
 */
export async function submitReport({
  reporterUser,
  category,
  targetType,
  targetId,
  targetTitle,
  reason,
}) {
  if (!reporterUser || (!reporterUser.uid && !reporterUser.email)) {
    throw new Error("Authentication required: You must be logged in to file a report.");
  }

  if (reporterUser.status === "suspended") {
    throw new Error("Suspended accounts cannot submit reports.");
  }

  if (!category || !REPORT_CATEGORIES.some((c) => c.id === category)) {
    throw new Error("Please select a valid report category.");
  }

  if (!targetType || !REPORT_TARGET_TYPES.some((t) => t.id === targetType)) {
    throw new Error("Please select a valid target type.");
  }

  if (!targetId || !targetId.trim()) {
    throw new Error("Target identifier is missing.");
  }

  if (!reason || reason.trim().length < 10) {
    throw new Error("Please provide a detailed reason (at least 10 characters).");
  }

  const reporterUid = reporterUser.uid || `usr_${Date.now()}`;
  const reporterEmail = (reporterUser.email || "").toLowerCase().trim();
  const reporterName =
    reporterUser.displayName ||
    reporterUser.fullName ||
    (reporterEmail ? reporterEmail.split("@")[0] : "CreatorIQ User");
  const reporterRole = reporterUser.role || "Creator";

  // Prevent duplicate active reports for the same target by this user
  const localReports = readReportsStorage();
  const existingActive = localReports.find(
    (r) =>
      (r.reporterId === reporterUid || r.reporterEmail === reporterEmail) &&
      r.targetType === targetType &&
      r.targetId === targetId.trim() &&
      (r.status === "open" || r.status === "under_review")
  );

  if (existingActive) {
    throw new Error(
      "You have already submitted an active report for this item. Our Trust & Safety team is reviewing it."
    );
  }

  const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const catObj = REPORT_CATEGORIES.find((c) => c.id === category);

  const reportDoc = {
    id: reportId,
    category,
    categoryLabel: catObj ? catObj.label : category,
    targetType,
    targetId: targetId.trim(),
    targetTitle: (targetTitle || targetId).trim(),
    reason: reason.trim(),
    reporterId: reporterUid,
    reporterEmail,
    reporterName,
    reporterRole,
    status: "open", // 'open' | 'under_review' | 'resolved' | 'dismissed'
    internalNotes: [],
    createdAt: now,
    updatedAt: now,
    resolutionReason: null,
    resolvedBy: null,
    resolvedAt: null,
    actionTaken: null,
  };

  // 1. Save to Local Storage
  localReports.unshift(reportDoc);
  writeReportsStorage(localReports);

  // 2. Persist to Firestore /reports
  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await setDoc(docRef, {
        ...reportDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[ModerationService] Firestore report write note:", fsErr.message);
    }
  }

  // 3. Dispatch real-time local event
  emitDataChange("reports", reportDoc);

  return reportDoc;
}

/**
 * Fetches all reports for Admin review.
 * Only accessible to verified Administrators.
 */
export async function fetchAllReports() {
  const reportMap = new Map();

  // 1. Pull from Firestore /reports
  if (db) {
    try {
      const colRef = collection(db, "reports");
      const q = query(colRef, orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(q);
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
        reportMap.set(d.id, {
          id: d.id,
          ...data,
          createdAt: createdTime || data.createdAt,
          updatedAt: updatedTime || data.updatedAt,
        });
      });
    } catch (fsErr) {
      console.warn("[ModerationService] Firestore reports fetch note:", fsErr.message);
    }
  }

  // 2. Merge local storage
  const localReports = readReportsStorage();
  localReports.forEach((item) => {
    if (!reportMap.has(item.id)) {
      reportMap.set(item.id, item);
    }
  });

  const list = Array.from(reportMap.values());
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

/**
 * Fetches reports submitted by a specific user.
 * Strips internalNotes to ensure privacy.
 */
export async function fetchUserReports(reporterUid, reporterEmail) {
  const reports = await fetchAllReports();
  const normalizedEmail = (reporterEmail || "").toLowerCase();

  return reports
    .filter(
      (r) =>
        r.reporterId === reporterUid ||
        (normalizedEmail && r.reporterEmail?.toLowerCase() === normalizedEmail)
    )
    .map((r) => {
      // Omit internal moderation notes from user-facing responses
      const { internalNotes, ...safeReport } = r;
      return safeReport;
    });
}

/**
 * Updates a report's status (e.g. mark under review, resolve, or dismiss).
 * Requires admin authorization and records to the append-only audit log.
 */
export async function updateReportStatus({
  adminUser,
  reportId,
  newStatus,
  reason,
  actionTaken = null,
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!["open", "under_review", "resolved", "dismissed"].includes(newStatus)) {
    throw new Error("Invalid status transition.");
  }

  if ((newStatus === "resolved" || newStatus === "dismissed") && (!reason || !reason.trim())) {
    throw new Error("A resolution or dismissal reason is mandatory.");
  }

  const reports = readReportsStorage();
  const reportIndex = reports.findIndex((r) => r.id === reportId);
  const existingReport = reportIndex !== -1 ? reports[reportIndex] : null;

  if (!existingReport) {
    throw new Error("Report record not found.");
  }

  const now = new Date().toISOString();
  const previousStatus = existingReport.status;

  const updateFields = {
    status: newStatus,
    updatedAt: now,
    ...(newStatus === "resolved" || newStatus === "dismissed"
      ? {
          resolutionReason: reason ? reason.trim() : null,
          resolvedBy: adminUser.uid,
          resolvedAt: now,
          actionTaken,
        }
      : {}),
    ...(newStatus === "under_review"
      ? {
          reviewedBy: adminUser.uid,
          reviewedAt: now,
        }
      : {}),
  };

  const updatedReport = {
    ...existingReport,
    ...updateFields,
  };

  // 1. Update local storage
  reports[reportIndex] = updatedReport;
  writeReportsStorage(reports);

  // 2. Update Firestore
  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        ...updateFields,
        updatedAt: serverTimestamp(),
        ...(newStatus === "resolved" || newStatus === "dismissed"
          ? { resolvedAt: serverTimestamp() }
          : {}),
      });
    } catch (fsErr) {
      console.warn("[ModerationService] Firestore update report note:", fsErr.message);
    }
  }

  // 3. Append to Audit Ledger
  let auditAction = "REPORT_STATUS_CHANGED";
  if (newStatus === "resolved") auditAction = "REPORT_RESOLVED";
  if (newStatus === "dismissed") auditAction = "REPORT_DISMISSED";
  if (newStatus === "under_review") auditAction = "REPORT_MARKED_UNDER_REVIEW";

  await recordAuditLog({
    adminUser,
    action: auditAction,
    targetId: reportId,
    targetType: "report",
    targetEmail: existingReport.reporterEmail,
    reason: reason || `Report status updated to ${newStatus}`,
    metadata: {
      category: existingReport.category,
      targetType: existingReport.targetType,
      targetId: existingReport.targetId,
      targetTitle: existingReport.targetTitle,
      previousStatus,
      newStatus,
      actionTaken,
    },
  });

  // 4. Send non-confidential notification to the reporter
  if (newStatus === "resolved" || newStatus === "dismissed") {
    try {
      await createNotification({
        recipientId: existingReport.reporterId,
        recipientEmail: existingReport.reporterEmail,
        recipientRole: existingReport.reporterRole || "Creator",
        type: "report_update",
        title: `Report ${newStatus === "resolved" ? "Resolved" : "Dismissed"}: ${existingReport.targetTitle}`,
        message: `Your report regarding "${existingReport.targetTitle}" has been reviewed by Platform Administration and marked as ${newStatus}. ${
          reason ? `Status note: "${reason}".` : ""
        } Thank you for maintaining platform safety.`,
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch reporter notification:", notifErr);
    }
  }

  emitDataChange("reports", updatedReport);
  return updatedReport;
}

/**
 * Adds an internal moderation note to a report.
 * Strictly protected: internal notes are never exposed to reporters or reported parties.
 */
export async function addInternalModerationNote({ adminUser, reportId, noteText }) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Only Platform Administrators can add internal moderation notes.");
  }

  if (!noteText || !noteText.trim()) {
    throw new Error("Internal note content cannot be empty.");
  }

  const reports = readReportsStorage();
  const reportIndex = reports.findIndex((r) => r.id === reportId);
  const existingReport = reportIndex !== -1 ? reports[reportIndex] : null;

  if (!existingReport) {
    throw new Error("Report record not found.");
  }

  const noteEntry = {
    id: `note_${Date.now().toString(36)}`,
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    adminName: adminUser.displayName || adminUser.fullName || "Administrator",
    text: noteText.trim(),
    createdAt: new Date().toISOString(),
  };

  const updatedNotes = [...(existingReport.internalNotes || []), noteEntry];
  const updatedReport = {
    ...existingReport,
    internalNotes: updatedNotes,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update local storage
  reports[reportIndex] = updatedReport;
  writeReportsStorage(reports);

  // 2. Update Firestore
  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        internalNotes: updatedNotes,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[ModerationService] Firestore add note warning:", fsErr.message);
    }
  }

  // 3. Record Audit Log
  await recordAuditLog({
    adminUser,
    action: "REPORT_NOTE_ADDED",
    targetId: reportId,
    targetType: "report",
    targetEmail: existingReport.reporterEmail,
    reason: "Internal moderation note added for review record",
    metadata: {
      reportCategory: existingReport.category,
      targetId: existingReport.targetId,
      noteLength: noteText.trim().length,
    },
  });

  emitDataChange("reports", updatedReport);
  return updatedReport;
}

/**
 * Executes an authorized moderation action linked to a report (e.g. suspend user, restrict campaign, warn user).
 * Never automatically suspends on report creation; requires explicit admin confirmation.
 */
export async function executeModerationAction({
  adminUser,
  report,
  actionType,
  reason,
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Admin privileges required.");
  }

  if (!report) throw new Error("Report context missing.");
  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required for any impactful moderation action.");
  }

  let actionOutcome = "";

  if (actionType === "suspend_user") {
    if (report.targetType !== "user") {
      throw new Error("Action 'suspend_user' can only be executed on user targets.");
    }

    // Look up target user by UID or email
    const users = await fetchAllUsers();
    const targetUser = users.find(
      (u) =>
        u.uid === report.targetId ||
        (u.email && u.email.toLowerCase() === report.targetId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === report.targetTitle.toLowerCase())
    );

    if (!targetUser) {
      throw new Error(`Target user "${report.targetId}" not found in user directory.`);
    }

    // Suspend using Phase 1 secure mechanism
    await updateUserAccountStatus({
      adminUser,
      targetUser,
      newStatus: "suspended",
      reason: `Moderation Action from Report #${report.id}: ${reason.trim()}`,
    });

    actionOutcome = `Suspended user account (${targetUser.email || targetUser.uid})`;
  } else if (actionType === "restrict_campaign") {
    if (report.targetType !== "campaign") {
      throw new Error("Action 'restrict_campaign' can only be executed on campaign targets.");
    }

    await restrictCampaign({
      adminUser,
      campaignId: report.targetId,
      reason: `Moderation Action from Report #${report.id}: ${reason.trim()}`,
    });

    actionOutcome = `Restricted campaign (${report.targetId})`;
  } else if (actionType === "warn_user") {
    // Official Compliance Warning: Send notification and log to audit ledger without suspension
    const users = await fetchAllUsers();
    const targetUser = users.find(
      (u) =>
        u.uid === report.targetId ||
        (u.email && u.email.toLowerCase() === report.targetId.toLowerCase())
    );

    const targetEmail = targetUser?.email || report.targetTitle;
    const targetUid = targetUser?.uid || report.targetId;

    await createNotification({
      recipientId: targetUid,
      recipientEmail: targetEmail,
      recipientRole: targetUser?.role || "Creator",
      type: "compliance_warning",
      title: "Official Compliance Notice: Content & Policy Warning",
      message: `An official warning has been issued to your account regarding "${report.targetTitle}". Reason: ${reason.trim()}. Further violations will lead to permanent account suspension.`,
    });

    await recordAuditLog({
      adminUser,
      action: "USER_WARNED",
      targetId: targetUid,
      targetType: "user",
      targetEmail,
      reason: reason.trim(),
      metadata: {
        reportId: report.id,
        category: report.category,
      },
    });

    actionOutcome = `Issued official compliance warning to ${targetEmail}`;
  } else {
    throw new Error(`Unsupported moderation action: ${actionType}`);
  }

  // Resolve the report with the action taken
  return await updateReportStatus({
    adminUser,
    reportId: report.id,
    newStatus: "resolved",
    reason: `Action completed: ${actionOutcome}. Justification: ${reason.trim()}`,
    actionTaken: actionOutcome,
  });
}

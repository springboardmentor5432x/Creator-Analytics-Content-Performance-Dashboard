import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { recordAuditLog } from "./adminService";
import { emitDataChange } from "../marketing/campaignService";

const STORAGE_KEY_ANNOUNCEMENTS = "creatoriq_platform_announcements";

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not write announcements to storage:", err);
  }
}

/**
 * Fetches all platform announcements for Admin management.
 */
export async function fetchAllAnnouncements() {
  const map = new Map();

  // 1. Pull from Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, "announcements"));
      snap.forEach((d) => {
        const data = d.data();
        let createdTime = data.createdAt;
        if (data.createdAt?.toDate) {
          createdTime = data.createdAt.toDate().toISOString();
        }
        map.set(d.id, {
          id: d.id,
          ...data,
          createdAt: createdTime || data.createdAt,
        });
      });
    } catch (fsErr) {
      console.warn("[AnnouncementService] Firestore fetch note:", fsErr.message);
    }
  }

  // 2. Merge local storage
  const local = readStorage();
  local.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  const list = Array.from(map.values());
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

/**
 * Fetches active announcements intended for a given user role.
 */
export async function fetchActiveAnnouncementsForRole(userRole) {
  const all = await fetchAllAnnouncements();
  return all.filter((a) => {
    if (a.status !== "active") return false;
    if (a.targetRole && a.targetRole !== "all" && a.targetRole !== userRole) {
      return false;
    }
    return true;
  });
}

/**
 * Creates and publishes a platform-wide or role-targeted announcement.
 * Enforces admin authorization and records to the append-only audit ledger.
 */
export async function publishAnnouncement({
  adminUser,
  title,
  message,
  priority = "info",
  targetRole = "all",
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!title || !title.trim()) {
    throw new Error("Announcement title is required.");
  }

  if (!message || !message.trim()) {
    throw new Error("Announcement message content is required.");
  }

  const announcementId = `anc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const announcementDoc = {
    id: announcementId,
    title: title.trim(),
    message: message.trim(),
    priority, // 'info' | 'warning' | 'critical'
    targetRole, // 'all' | 'Creator' | 'Marketing Team' | 'Agency'
    status: "active",
    createdBy: adminUser.uid,
    createdByName: adminUser.displayName || adminUser.fullName || "Administrator",
    createdAt: now,
    updatedAt: now,
  };

  // 1. Update local storage
  const local = readStorage();
  local.unshift(announcementDoc);
  writeStorage(local);

  // 2. Save to Firestore /announcements
  if (db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await setDoc(docRef, {
        ...announcementDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[AnnouncementService] Firestore write note:", fsErr.message);
    }
  }

  // 3. Record in Audit Ledger
  await recordAuditLog({
    adminUser,
    action: "ANNOUNCEMENT_PUBLISHED",
    targetId: announcementId,
    targetType: "announcement",
    targetEmail: "platform-broadcast",
    reason: `Published ${priority.toUpperCase()} announcement to [${targetRole}]: "${title.trim()}"`,
    metadata: {
      priority,
      targetRole,
      title: title.trim(),
    },
  });

  emitDataChange("announcements", announcementDoc);
  return announcementDoc;
}

/**
 * Deactivates a published announcement.
 */
export async function deactivateAnnouncement({
  adminUser,
  announcementId,
  reason,
}) {
  if (!adminUser || adminUser.role !== "Admin") {
    throw new Error("Unauthorized: Platform Administrator privileges required.");
  }

  if (!announcementId) throw new Error("Announcement ID is required.");
  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required to deactivate an announcement.");
  }

  const local = readStorage();
  const index = local.findIndex((a) => a.id === announcementId);
  const existing = index !== -1 ? local[index] : null;

  const now = new Date().toISOString();
  const updateFields = {
    status: "inactive",
    deactivatedBy: adminUser.uid,
    deactivatedAt: now,
    deactivationReason: reason.trim(),
    updatedAt: now,
  };

  // 1. Update local storage
  if (index !== -1) {
    local[index] = { ...local[index], ...updateFields };
    writeStorage(local);
  }

  // 2. Update Firestore
  if (db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await updateDoc(docRef, {
        ...updateFields,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("[AnnouncementService] Firestore deactivate warning:", fsErr.message);
    }
  }

  // 3. Record in Audit Log
  await recordAuditLog({
    adminUser,
    action: "ANNOUNCEMENT_DEACTIVATED",
    targetId: announcementId,
    targetType: "announcement",
    targetEmail: "platform-broadcast",
    reason: reason.trim(),
    metadata: {
      announcementTitle: existing ? existing.title : announcementId,
    },
  });

  emitDataChange("announcements", { id: announcementId, status: "inactive" });
  return { id: announcementId, ...updateFields };
}

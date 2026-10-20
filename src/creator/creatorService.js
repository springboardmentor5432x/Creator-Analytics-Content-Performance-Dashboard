/**
 * CreatorIQ — Creator Portal Data Service
 * ---------------------------------------
 * Handles real-time queries and updates for:
 *  - Creator Invitations (filtered by authenticated creator's UID / email)
 *  - Creator Deliverables (production and review pipelines)
 *  - Discoverable Brand Campaigns (active campaigns available for creator outreach)
 *  - Creator Profile Self-Service Management (updating niche, platforms, bio, discoverability in Firestore)
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  getLocalCampaigns,
  getLocalInvitations,
  getLocalDeliverables,
  respondToInvitation as baseRespondToInvitation,
  submitDeliverable as baseSubmitDeliverable,
  subscribeToDataChanges,
} from "../marketing/campaignService";
import { saveUserToLocalRegistry } from "../authService";

/**
 * Normalizes identity matching for creator accounts
 */
export function matchesCreator(record, user) {
  if (!record || !user) return false;
  const userEmail = (user.email || "").trim().toLowerCase();
  const userId = user.uid;

  const recEmail = (record.creatorEmail || record.email || "").trim().toLowerCase();
  const recId = record.creatorId || record.uid;

  if (userId && recId && recId === userId) return true;
  if (userEmail && recEmail && recEmail === userEmail) return true;

  // Exact demo account matching (strictly for creator@creatoriq.io or usr_creator_demo)
  if (
    (userEmail === "creator@creatoriq.io" || userId === "usr_creator_demo") &&
    (recEmail === "creator@creatoriq.io" || recId === "usr_creator_demo")
  ) {
    return true;
  }

  return false;
}

/**
 * Fetches invitations specifically belonging to the authenticated creator.
 * Queries Firestore first when available, falling back to cached local invitations.
 */
export async function getCreatorInvitations(user) {
  if (!user) return [];
  const userEmail = (user.email || "").trim().toLowerCase();
  const userId = user.uid;

  const foundMap = new Map();

  // 1. Try Firestore direct query
  if (db && (userId || userEmail)) {
    try {
      const invCol = collection(db, "campaign_invitations");
      const promises = [];

      if (userId) promises.push(getDocs(query(invCol, where("creatorId", "==", userId))));
      if (userEmail) promises.push(getDocs(query(invCol, where("creatorEmail", "==", userEmail))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore creator invitations query note:", err.message);
    }
  }

  // 2. Merge local invitations (preserves accepted demo invites or local offline items)
  const allLocal = getLocalInvitations();
  const localMatched = allLocal.filter((inv) => matchesCreator(inv, user));
  localMatched.forEach((inv) => {
    if (!foundMap.has(inv.id)) {
      foundMap.set(inv.id, inv);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Fetches deliverables belonging to this creator.
 */
export async function getCreatorDeliverables(user) {
  if (!user) return [];
  const userEmail = (user.email || "").trim().toLowerCase();
  const userId = user.uid;

  const foundMap = new Map();

  // 1. Try Firestore direct query across UID and email
  if (db && (userId || userEmail)) {
    try {
      const delCol = collection(db, "campaign_deliverables");
      const promises = [];

      if (userId) promises.push(getDocs(query(delCol, where("creatorId", "==", userId))));
      if (userEmail) promises.push(getDocs(query(delCol, where("creatorEmail", "==", userEmail))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore creator deliverables query note:", err.message);
    }
  }

  // 2. Merge local deliverables (preserves demo deliverables or local offline items)
  const allLocal = getLocalDeliverables();
  const localMatched = allLocal.filter((del) => matchesCreator(del, user));
  localMatched.forEach((del) => {
    if (!foundMap.has(del.id)) {
      foundMap.set(del.id, del);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Real-time Firestore subscription for Creator's deliverables
 */
export function subscribeToCreatorDeliverables(user, onUpdate) {
  if (!db || !user) return () => {};
  const userId = user.uid;
  const userEmail = (user.email || "").trim().toLowerCase();
  if (!userId && !userEmail) return () => {};

  try {
    const delCol = collection(db, "campaign_deliverables");
    const q = userId
      ? query(delCol, where("creatorId", "==", userId))
      : query(delCol, where("creatorEmail", "==", userEmail));

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (items.length > 0) onUpdate(items);
      },
      (err) => {
        console.warn("[CreatorIQ] Creator deliverables onSnapshot note:", err.message);
      }
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Fetches active campaigns available for creators to discover.
 */
export async function getDiscoverableCampaigns() {
  if (db) {
    try {
      const campCol = collection(db, "campaigns");
      const q = query(campCol, where("status", "==", "active"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const fromDb = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (fromDb.length > 0) return fromDb;
      }
    } catch (err) {
      console.warn("[CreatorIQ] Firestore discoverable campaigns note:", err.message);
    }
  }

  // Fall back to local campaigns
  const allCamp = getLocalCampaigns();
  return allCamp.filter((c) => c.status === "active" || c.status === "draft");
}

/**
 * Responds to a campaign invitation (accept or decline).
 */
export async function respondToInvitation(invitationId, status, user) {
  return baseRespondToInvitation(invitationId, status, user);
}

/**
 * Submits deliverable proof URL and creator notes.
 */
export async function submitDeliverable(deliverableId, { submissionUrl, submissionNotes }, user) {
  return baseSubmitDeliverable(deliverableId, { submissionUrl, submissionNotes }, user);
}

/**
 * Updates creator profile fields in Firestore and local registry.
 */
export async function saveCreatorProfile(uid, profileData) {
  if (!uid) return { success: false, error: "Missing user UID" };

  try {
    // 1. Update in Firestore
    if (db) {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Update in local registry
    if (profileData.email) {
      saveUserToLocalRegistry(profileData.email, {
        uid,
        ...profileData,
      });
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("[CreatorIQ] Profile save error:", err);
    return { success: false, error: err.message };
  }
}

export { subscribeToDataChanges };

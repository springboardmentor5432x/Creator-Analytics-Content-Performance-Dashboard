/**
 * CreatorIQ — Firestore-First Data Service
 * -----------------------------------------
 * Provides real data queries for:
 *   - Creator Discovery (real registered Creator users)
 *   - Workspace-scoped campaigns (per Marketing user UID)
 *   - Real invitations, deliverables scoped to workspace
 *
 * Fallback strategy: Firestore → LocalStorage registry → empty array
 * Never falls back to SEED_CREATORS when Firestore returns real data.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { getLocalRegisteredUsers } from "../authService";

// ─────────────────────────────────────────────
// CREATOR DISCOVERY — Real registered creators
// ─────────────────────────────────────────────

/**
 * Fetches registered Creator profiles from Firestore.
 * Falls back to local registry if Firestore is unavailable.
 * NEVER returns SEED_CREATORS — only real registered users.
 *
 * @returns {Promise<{creators: Array, source: 'firestore'|'local'|'empty', error: string|null}>}
 */
export async function fetchRegisteredCreators() {
  // Attempt 1: Firestore query on 'users' collection
  if (db) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "Creator"));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const creators = snapshot.docs
          .map((docSnap) => normalizeCreatorProfile(docSnap.data(), docSnap.id))
          .filter((c) => c !== null); // filter out incomplete profiles

        if (creators.length > 0) {
          return { creators, source: "firestore", error: null };
        }
      }
    } catch (err) {
      console.warn("[CreatorIQ] Firestore creator query failed:", err.message);
      // Fall through to local registry
    }
  }

  // Attempt 2: LocalStorage registry (registered during this session)
  try {
    const localUsers = getLocalRegisteredUsers();
    const localCreators = Object.values(localUsers)
      .filter((u) => u.role === "Creator" && u.status !== "suspended")
      .map((u) => normalizeCreatorProfile(u, u.uid));

    const valid = localCreators.filter((c) => c !== null);

    if (valid.length > 0) {
      return { creators: valid, source: "local", error: null };
    }
  } catch (err) {
    console.warn("[CreatorIQ] Local registry creator query failed:", err.message);
  }

  // No creators found
  return { creators: [], source: "empty", error: null };
}

/**
 * Normalizes a user record (from Firestore or local registry) into a
 * consistent Creator profile shape. Returns null if the record is
 * missing required fields (uid, email, role === Creator).
 */
function normalizeCreatorProfile(data, uid) {
  if (!data || data.role !== "Creator") return null;
  if (!data.email && !data.uid) return null;

  const resolvedUid = uid || data.uid;
  const name = data.fullName || data.displayName || (data.email ? data.email.split("@")[0] : "Creator");

  return {
    uid: resolvedUid,
    fullName: name,
    email: data.email || "",
    handle: data.handle || `@${(data.email || "").split("@")[0]}`,
    niche: data.niche || data.creatorNiche || null,
    category: data.category || null,
    platforms: Array.isArray(data.platforms) && data.platforms.length > 0 ? data.platforms : [],
    primaryPlatform: data.primaryPlatform || (data.platforms?.[0]) || null,
    location: data.location || null,
    bio: data.bio || null,
    photoURL: data.photoURL || null,
    status: data.status || "active",
    // Real metrics only — never fabricated
    followers: Number(data.followers) || null,
    formattedFollowers: data.formattedFollowers || (data.followers ? formatFollowers(data.followers) : null),
    engagementRate: data.engagementRate || null,
    // Profile completion indicator
    profileComplete: Boolean(data.niche || data.platforms?.length > 0 || data.bio),
    discoverable: data.discoverable !== false, // default: discoverable unless explicitly set false
    createdAt: data.createdAt || null,
    lastLogin: data.lastLogin || null,
  };
}

function formatFollowers(count) {
  const n = Number(count);
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

// ─────────────────────────────────────────────
// WORKSPACE MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Gets or creates the brand workspace for a Marketing user.
 * Workspace ID = user UID (one workspace per Marketing registration).
 */
export async function getOrCreateWorkspace(user) {
  if (!db || !user?.uid) return null;

  const wsRef = doc(db, "brand_workspaces", user.uid);

  try {
    const snap = await getDoc(wsRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // Create workspace on first access
    const wsData = {
      id: user.uid,
      brandName: user.fullName || user.displayName || "Brand Workspace",
      ownerUid: user.uid,
      ownerEmail: user.email || "",
      members: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(wsRef, wsData);
    return { ...wsData, id: user.uid };
  } catch (err) {
    console.warn("[CreatorIQ] Workspace fetch/create error:", err.message);
    return {
      id: user.uid,
      brandName: user.fullName || user.displayName || "Brand Workspace",
      ownerUid: user.uid,
      ownerEmail: user.email || "",
      members: [user.uid],
    };
  }
}

// ─────────────────────────────────────────────
// FIRESTORE CAMPAIGN QUERIES (workspace-scoped)
// ─────────────────────────────────────────────

/**
 * Fetches campaigns from Firestore that belong to this Marketing user.
 * Returns {campaigns, source, error}.
 */
export async function fetchWorkspaceCampaigns(marketingUid, marketingEmail) {
  if (!db || !marketingUid) {
    return { campaigns: [], source: "none", error: "Not authenticated" };
  }

  try {
    const colRef = collection(db, "campaigns");
    // Primary: query by UID
    const q = query(colRef, where("marketingId", "==", marketingUid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const campaigns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { campaigns, source: "firestore", error: null };
  } catch (err) {
    // Firestore may fail due to missing index or offline — fall through
    console.warn("[CreatorIQ] Firestore campaign query failed:", err.message);
    return { campaigns: [], source: "error", error: err.message };
  }
}

/**
 * Fetches invitations from Firestore for this workspace.
 */
export async function fetchWorkspaceInvitations(marketingUid) {
  if (!db || !marketingUid) return { invitations: [], source: "none", error: null };

  try {
    const colRef = collection(db, "campaign_invitations");
    const q = query(colRef, where("marketingId", "==", marketingUid), orderBy("sentAt", "desc"));
    const snapshot = await getDocs(q);

    const invitations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { invitations, source: "firestore", error: null };
  } catch (err) {
    console.warn("[CreatorIQ] Firestore invitations query failed:", err.message);
    return { invitations: [], source: "error", error: err.message };
  }
}

/**
 * Fetches deliverables from Firestore for this workspace.
 */
export async function fetchWorkspaceDeliverables(marketingUid) {
  if (!db || !marketingUid) return { deliverables: [], source: "none", error: null };

  try {
    const colRef = collection(db, "campaign_deliverables");
    // Try query with marketingId first
    let snapshot;
    try {
      const q = query(colRef, where("marketingId", "==", marketingUid), orderBy("createdAt", "desc"));
      snapshot = await getDocs(q);
    } catch (idxErr) {
      // Fallback query without orderBy if index is still generating
      const qFallback = query(colRef, where("marketingId", "==", marketingUid));
      snapshot = await getDocs(qFallback);
    }

    if (snapshot && !snapshot.empty) {
      const deliverables = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { deliverables, source: "firestore", error: null };
    }

    // Secondary fallback: fetch recent deliverables (security rules filter by user access)
    const allSnapshot = await getDocs(query(colRef, limit(200)));
    const deliverables = allSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.marketingId === marketingUid || !d.marketingId);

    return { deliverables, source: "firestore", error: null };
  } catch (err) {
    console.warn("[CreatorIQ] Firestore deliverables query failed:", err.message);
    return { deliverables: [], source: "error", error: err.message };
  }
}

/**
 * Real-time Firestore subscription for Workspace deliverables
 */
export function subscribeToWorkspaceDeliverables(marketingUid, onUpdate) {
  if (!db || !marketingUid) return () => {};
  try {
    const colRef = collection(db, "campaign_deliverables");
    const q = query(colRef, where("marketingId", "==", marketingUid));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (items.length > 0) onUpdate(items);
      },
      (err) => {
        console.warn("[CreatorIQ] Workspace deliverables onSnapshot note:", err.message);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// ─────────────────────────────────────────────
// INVITATION VALIDATION
// ─────────────────────────────────────────────

/**
 * Validates that a creator ID exists as a registered Creator user in Firestore.
 * Returns {valid: boolean, creator: object|null, reason: string}
 */
export async function validateCreatorExists(creatorId, creatorEmail) {
  if (!db) return { valid: true, creator: null, reason: "Firestore unavailable" };

  // Try by UID first
  if (creatorId) {
    try {
      const snap = await getDoc(doc(db, "users", creatorId));
      if (snap.exists() && snap.data().role === "Creator") {
        return { valid: true, creator: { id: snap.id, ...snap.data() }, reason: null };
      }
    } catch (err) {
      console.warn("[CreatorIQ] Creator validation by UID failed:", err.message);
    }
  }

  // Try by email via email_registry
  if (creatorEmail) {
    try {
      const safeEmail = encodeURIComponent(creatorEmail.trim().toLowerCase());
      const snap = await getDoc(doc(db, "email_registry", safeEmail));
      if (snap.exists() && snap.data().role === "Creator") {
        return { valid: true, creator: snap.data(), reason: null };
      }
    } catch (err) {
      console.warn("[CreatorIQ] Creator validation by email failed:", err.message);
    }
  }

  return { valid: false, creator: null, reason: "Creator not found in registry" };
}

// ─────────────────────────────────────────────
// CREATOR PROFILE UPDATE (self-service)
// ─────────────────────────────────────────────

/**
 * Updates a Creator's discoverable profile fields in Firestore.
 * Called from the Creator portal when they complete their profile.
 */
export async function updateCreatorProfile(uid, profileData) {
  if (!db || !uid) return false;

  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn("[CreatorIQ] Creator profile update failed:", err.message);
    return false;
  }
}

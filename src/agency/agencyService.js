/**
 * CreatorIQ — Agency Data & Relationship Service
 * ------------------------------------------------
 * Manages the two fundamental Agency relationships:
 *   1. Agency works for a Brand (Campaign Assignments & Recommendations)
 *   2. Agency represents a Creator (Talent Roster & Representation Requests)
 *
 * Persists to Firestore with fallback to LocalStorage for offline/demo reliability.
 * Emits reactive events for cross-tab and cross-component updates.
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
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { getLocalRegisteredUsers } from "../authService";
import {
  getLocalCampaigns,
  getLocalInvitations,
  getLocalDeliverables,
  createNotification,
  emitDataChange,
  subscribeToDataChanges,
} from "../marketing/campaignService";

const STORAGE_KEYS = {
  ASSIGNMENTS: "creatoriq_agency_brand_assignments",
  RELATIONSHIPS: "creatoriq_agency_creator_relationships",
  RECOMMENDATIONS: "creatoriq_agency_recommendations",
};

// -------------------------------------------------------------
// Seed / Initial Data for Demo Stability
// -------------------------------------------------------------
const INITIAL_ASSIGNMENTS = [
  {
    id: "aba-demo-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    status: "accepted", // 'pending' | 'accepted' | 'declined' | 'revoked'
    permissions: {
      canInviteCreators: true,
      canRecommend: true,
      viewBudget: true,
    },
    message: "We'd like Vanguard Talent Agency to coordinate tech creator reach and review deliverables for our spring launch.",
    createdAt: "2026-02-16T10:00:00.000Z",
    updatedAt: "2026-02-17T11:00:00.000Z",
  },
  {
    id: "aba-demo-002",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    status: "pending",
    permissions: {
      canInviteCreators: false,
      canRecommend: true,
      viewBudget: true,
    },
    message: "Seeking developer productivity influencer coordination.",
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z",
  },
];

const INITIAL_RELATIONSHIPS = [
  {
    id: "acr-demo-001",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    creatorHandle: "@alexrivers_tech",
    creatorNiche: "Tech & Software Engineering",
    creatorPlatforms: ["YouTube", "TikTok", "Instagram"],
    creatorFollowers: "1.4M",
    initiatedBy: "agency", // 'creator' | 'agency'
    status: "active", // 'pending' | 'active' | 'declined' | 'ended'
    terms: "Standard Exclusive Talent Management (15% commission on agency-sourced brand sponsorships)",
    message: "Excited to partner with you for enterprise tech and developer sponsorships.",
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-16T14:00:00.000Z",
  },
  {
    id: "acr-demo-002",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    creatorId: "usr_creator_jordan",
    creatorName: "Jordan Blake",
    creatorEmail: "jordan@creatoriq.io",
    creatorHandle: "@jordanblake_dev",
    creatorNiche: "Tech & Productivity",
    creatorPlatforms: ["YouTube", "LinkedIn"],
    creatorFollowers: "840K",
    initiatedBy: "creator",
    status: "pending",
    terms: "Representation proposal: 15% agency commission, guaranteed minimum deal volume",
    message: "Hi Vanguard, looking for full-service representation for Q2 SaaS launches.",
    createdAt: "2026-03-12T16:00:00.000Z",
    updatedAt: "2026-03-12T16:00:00.000Z",
  },
];

const INITIAL_RECOMMENDATIONS = [
  {
    id: "rec-demo-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    brandId: "usr_marketing_demo",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    matchScore: 95,
    matchReasons: [
      "Exact niche match: Tech & Software Engineering",
      "High YouTube engagement: 6.42%",
      "Audience demographic: 78% Developers & Engineers",
    ],
    pitchNotes: "Alex Rivers has exceptional credibility with senior software engineers and strong mid-roll walkthrough production quality.",
    status: "approved", // 'recommended' | 'invited' | 'approved' | 'rejected'
    createdAt: "2026-02-18T10:00:00.000Z",
    updatedAt: "2026-02-18T15:00:00.000Z",
  },
];

// -------------------------------------------------------------
// Storage Access Helpers
// -------------------------------------------------------------
function readStorage(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(defaultVal));
  } catch (err) {
    console.warn(`Storage read note for ${key}:`, err);
  }
  return defaultVal;
}

function writeStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`Storage write note for ${key}:`, err);
  }
}

export function initAgencyStore() {
  readStorage(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
  readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);
}

// -------------------------------------------------------------
// 1. ACTIVE AGENCY DIRECTORY
// -------------------------------------------------------------

/**
 * Fetches real registered Agency profiles from Firestore and local registry.
 * Used by Brands to select an Agency, and by Creators to browse representation.
 */
export async function fetchRegisteredAgencies() {
  const agencyMap = new Map();

  // 1. Check local demo agencies
  const localUsers = getLocalRegisteredUsers();
  Object.values(localUsers).forEach((u) => {
    if (u.role === "Agency") {
      agencyMap.set(u.email?.toLowerCase(), {
        uid: u.uid || "usr_agency_demo",
        email: u.email,
        fullName: u.fullName || u.displayName || "Talent Agency",
        role: "Agency",
        bio: u.bio || "Full-service creator representation and brand campaign management.",
        niches: u.niches || ["Tech & Software Engineering", "Gaming", "Lifestyle", "Productivity"],
        rosterSize: u.rosterSize || 24,
        location: u.location || "San Francisco, CA & New York, NY",
        rating: u.rating || 4.9,
        verified: true,
      });
    }
  });

  // 2. Query Firestore users where role == 'Agency'
  if (db) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "Agency"));
      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const email = (data.email || "").toLowerCase();
        if (email) {
          agencyMap.set(email, {
            uid: docSnap.id,
            email: data.email,
            fullName: data.fullName || data.displayName || email.split("@")[0],
            role: "Agency",
            bio: data.bio || "Full-service talent representation and campaign management.",
            niches: data.niches || ["Tech", "Digital Media"],
            rosterSize: data.rosterSize || 10,
            location: data.location || "United States",
            rating: data.rating || 4.8,
            verified: data.verified || false,
          });
        }
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore agency query note:", err.message);
    }
  }

  return Array.from(agencyMap.values());
}

// -------------------------------------------------------------
// 2. BRAND <-> AGENCY CAMPAIGN ASSIGNMENTS
// -------------------------------------------------------------

/**
 * Gets campaign assignments for an Agency or a Brand
 */
export async function getAgencyBrandAssignments({ agencyId, agencyEmail, brandId, campaignId } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  // 1. Try Firestore
  if (db && (agencyId || brandId || campaignId)) {
    try {
      const colRef = collection(db, "agency_brand_assignments");
      const promises = [];

      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (agencyEmail) promises.push(getDocs(query(colRef, where("agencyEmail", "==", agencyEmail.toLowerCase()))));
      if (brandId) promises.push(getDocs(query(colRef, where("brandId", "==", brandId))));
      if (campaignId) promises.push(getDocs(query(colRef, where("campaignId", "==", campaignId))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore agency assignments query note:", err.message);
    }
  }

  // 2. Merge local storage
  const allLocal = readStorage(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  allLocal.forEach((item) => {
    let matches = true;
    if (agencyId && item.agencyId !== agencyId && item.agencyEmail?.toLowerCase() !== agencyEmail?.toLowerCase()) matches = false;
    if (brandId && item.brandId !== brandId) matches = false;
    if (campaignId && item.campaignId !== campaignId) matches = false;
    if (matches && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Marketing assigns a Campaign to an Agency
 */
export async function createAgencyBrandAssignment({
  campaign,
  brandUser,
  agency,
  permissions = { canInviteCreators: true, canRecommend: true, viewBudget: true },
  message = "",
}) {
  initAgencyStore();
  if (!campaign || !agency) throw new Error("Campaign and Agency are required.");

  const allAssignments = readStorage(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);

  // Check if an active or pending assignment already exists for this campaign & agency
  const existing = allAssignments.find(
    (a) =>
      a.campaignId === campaign.id &&
      a.agencyId === agency.uid &&
      (a.status === "pending" || a.status === "accepted")
  );
  if (existing) {
    throw new Error(`An assignment for this campaign and agency already exists (Status: ${existing.status}).`);
  }

  const newId = `aba-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newAssignment = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name || campaign.title,
    brandId: brandUser?.uid || campaign.marketingId || "usr_marketing_demo",
    brandName: brandUser?.fullName || brandUser?.displayName || campaign.marketingName || "Brand Partner",
    brandEmail: brandUser?.email || campaign.marketingEmail || "marketing@creatoriq.io",
    agencyId: agency.uid,
    agencyName: agency.fullName || agency.name || "Agency Partner",
    agencyEmail: agency.email,
    status: "pending",
    permissions: {
      canInviteCreators: Boolean(permissions.canInviteCreators),
      canRecommend: Boolean(permissions.canRecommend !== false),
      viewBudget: Boolean(permissions.viewBudget !== false),
    },
    message: message.trim() || `We invite ${agency.fullName} to coordinate our campaign '${campaign.name}'.`,
    createdAt: now,
    updatedAt: now,
  };

  allAssignments.unshift(newAssignment);
  writeStorage(STORAGE_KEYS.ASSIGNMENTS, allAssignments);

  // Notify Agency
  await createNotification({
    recipientId: agency.uid,
    recipientEmail: agency.email,
    recipientRole: "Agency",
    type: "agency_campaign_assigned",
    title: "New Campaign Assignment Request",
    message: `${newAssignment.brandName} invited your agency to manage '${campaign.name}'.`,
    campaignId: campaign.id,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_brand_assignments", newId);
      await setDoc(docRef, { ...newAssignment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore agency assignment write note:", fsErr.message);
    }
  }

  emitDataChange("agency_assignments", newAssignment);
  return newAssignment;
}

/**
 * Agency responds to Brand assignment (accept or decline)
 */
export async function respondToAgencyBrandAssignment(assignmentId, responseStatus, agencyUser) {
  if (responseStatus !== "accepted" && responseStatus !== "declined") {
    throw new Error("Response must be 'accepted' or 'declined'.");
  }

  const allAssignments = readStorage(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  const index = allAssignments.findIndex((a) => a.id === assignmentId);
  if (index === -1) throw new Error("Assignment not found.");

  const assignment = allAssignments[index];
  const now = new Date().toISOString();

  assignment.status = responseStatus;
  assignment.updatedAt = now;
  allAssignments[index] = assignment;
  writeStorage(STORAGE_KEYS.ASSIGNMENTS, allAssignments);

  // Notify Brand
  await createNotification({
    recipientId: assignment.brandId,
    recipientEmail: assignment.brandEmail,
    recipientRole: "Marketing Team",
    type: responseStatus === "accepted" ? "agency_assignment_accepted" : "agency_assignment_declined",
    title: responseStatus === "accepted" ? "Agency Accepted Campaign Assignment" : "Agency Declined Campaign Assignment",
    message: `${assignment.agencyName} has ${responseStatus} the assignment for '${assignment.campaignTitle}'.`,
    campaignId: assignment.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_brand_assignments", assignmentId);
      await updateDoc(docRef, { status: responseStatus, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore assignment response update note:", fsErr.message);
    }
  }

  emitDataChange("agency_assignments", assignment);
  return assignment;
}

/**
 * Brand revokes/ends Agency assignment for a campaign
 */
export async function revokeAgencyBrandAssignment(assignmentId, brandUser, reason = "") {
  const allAssignments = readStorage(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  const index = allAssignments.findIndex((a) => a.id === assignmentId);
  if (index === -1) throw new Error("Assignment not found.");

  const assignment = allAssignments[index];
  const now = new Date().toISOString();

  assignment.status = "revoked";
  assignment.revocationReason = reason;
  assignment.updatedAt = now;
  allAssignments[index] = assignment;
  writeStorage(STORAGE_KEYS.ASSIGNMENTS, allAssignments);

  // Notify Agency
  await createNotification({
    recipientId: assignment.agencyId,
    recipientEmail: assignment.agencyEmail,
    recipientRole: "Agency",
    type: "agency_assignment_revoked",
    title: "Campaign Assignment Revoked",
    message: `${assignment.brandName} has revoked the assignment for '${assignment.campaignTitle}'.`,
    campaignId: assignment.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_brand_assignments", assignmentId);
      await updateDoc(docRef, { status: "revoked", revocationReason: reason, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore assignment revocation update note:", fsErr.message);
    }
  }

  emitDataChange("agency_assignments", assignment);
  return assignment;
}

// -------------------------------------------------------------
// 3. AGENCY <-> CREATOR REPRESENTATION RELATIONSHIPS
// -------------------------------------------------------------

/**
 * Gets representation relationships for an Agency or Creator
 */
export async function getAgencyCreatorRelationships({ agencyId, agencyEmail, creatorId, creatorEmail } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  // 1. Try Firestore
  if (db && (agencyId || creatorId || creatorEmail)) {
    try {
      const colRef = collection(db, "agency_creator_relationships");
      const promises = [];

      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (agencyEmail) promises.push(getDocs(query(colRef, where("agencyEmail", "==", agencyEmail.toLowerCase()))));
      if (creatorId) promises.push(getDocs(query(colRef, where("creatorId", "==", creatorId))));
      if (creatorEmail) promises.push(getDocs(query(colRef, where("creatorEmail", "==", creatorEmail.toLowerCase()))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore relationships query note:", err.message);
    }
  }

  // 2. Merge local storage
  const allLocal = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
  allLocal.forEach((item) => {
    let matches = true;
    if (agencyId && item.agencyId !== agencyId && item.agencyEmail?.toLowerCase() !== agencyEmail?.toLowerCase()) matches = false;
    if (creatorId && item.creatorId !== creatorId && item.creatorEmail?.toLowerCase() !== creatorEmail?.toLowerCase()) matches = false;
    if (matches && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Creator requests representation from an Agency (Creator -> Agency)
 */
export async function requestAgencyRepresentation({
  creatorUser,
  agency,
  message = "",
  proposedTerms = "Standard Talent Representation (15% agency commission)",
}) {
  initAgencyStore();
  if (!creatorUser || !agency) throw new Error("Creator and Agency are required.");

  const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);

  // Prevent duplicate active/pending requests
  const existing = allRel.find(
    (r) =>
      (r.creatorId === creatorUser.uid || r.creatorEmail?.toLowerCase() === creatorUser.email?.toLowerCase()) &&
      r.agencyId === agency.uid &&
      (r.status === "pending" || r.status === "active")
  );
  if (existing) {
    throw new Error(`A representation relationship with this agency is already ${existing.status}.`);
  }

  const newId = `acr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRelationship = {
    id: newId,
    agencyId: agency.uid,
    agencyName: agency.fullName || agency.name || "Agency Partner",
    agencyEmail: agency.email,
    creatorId: creatorUser.uid,
    creatorName: creatorUser.fullName || creatorUser.displayName || creatorUser.email.split("@")[0],
    creatorEmail: creatorUser.email,
    creatorHandle: creatorUser.handle || `@${creatorUser.email.split("@")[0]}`,
    creatorNiche: creatorUser.niche || creatorUser.category || "General Content",
    creatorPlatforms: creatorUser.platforms || ["YouTube"],
    creatorFollowers: creatorUser.formattedFollowers || "100K+",
    initiatedBy: "creator",
    status: "pending",
    terms: proposedTerms.trim(),
    message: message.trim() || `Hi ${agency.fullName}, I would love to explore representation with your agency roster.`,
    createdAt: now,
    updatedAt: now,
  };

  allRel.unshift(newRelationship);
  writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);

  // Notify Agency
  await createNotification({
    recipientId: agency.uid,
    recipientEmail: agency.email,
    recipientRole: "Agency",
    type: "creator_representation_request",
    title: "New Creator Representation Request",
    message: `${newRelationship.creatorName} requested to join your agency roster.`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_creator_relationships", newId);
      await setDoc(docRef, { ...newRelationship, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore relationship write note:", fsErr.message);
    }
  }

  emitDataChange("agency_relationships", newRelationship);
  return newRelationship;
}

/**
 * Agency invites a Creator to join roster (Agency -> Creator)
 */
export async function inviteCreatorToRoster({
  agencyUser,
  creator,
  terms = "Standard Non-Exclusive Representation (15% commission on agency deals)",
  message = "",
}) {
  initAgencyStore();
  if (!agencyUser || !creator) throw new Error("Agency and Creator are required.");

  const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);

  // Prevent duplicate active/pending invitations
  const existing = allRel.find(
    (r) =>
      r.agencyId === (agencyUser.uid || "usr_agency_demo") &&
      (r.creatorId === creator.uid || r.creatorEmail?.toLowerCase() === creator.email?.toLowerCase()) &&
      (r.status === "pending" || r.status === "active")
  );
  if (existing) {
    throw new Error(`A representation invitation or relationship with ${creator.fullName} is already ${existing.status}.`);
  }

  const newId = `acr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRelationship = {
    id: newId,
    agencyId: agencyUser.uid || "usr_agency_demo",
    agencyName: agencyUser.fullName || agencyUser.displayName || "Talent Agency",
    agencyEmail: agencyUser.email || "agency@creatoriq.io",
    creatorId: creator.uid,
    creatorName: creator.fullName || creator.displayName || creator.email.split("@")[0],
    creatorEmail: creator.email,
    creatorHandle: creator.handle || `@${creator.email.split("@")[0]}`,
    creatorNiche: creator.niche || creator.category || "Content Creation",
    creatorPlatforms: creator.platforms || ["YouTube"],
    creatorFollowers: creator.formattedFollowers || "100K+",
    initiatedBy: "agency",
    status: "pending",
    terms: terms.trim(),
    message: message.trim() || `We'd love to represent you and bring you sponsored brand deals at ${agencyUser.fullName || "our agency"}.`,
    createdAt: now,
    updatedAt: now,
  };

  allRel.unshift(newRelationship);
  writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);

  // Notify Creator
  await createNotification({
    recipientId: creator.uid,
    recipientEmail: creator.email,
    recipientRole: "Creator",
    type: "agency_roster_invitation",
    title: "Agency Roster Invitation",
    message: `${newRelationship.agencyName} invited you to join their talent roster (${terms}).`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_creator_relationships", newId);
      await setDoc(docRef, { ...newRelationship, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore relationship write note:", fsErr.message);
    }
  }

  emitDataChange("agency_relationships", newRelationship);
  return newRelationship;
}

/**
 * Responds to representation relationship (accept or decline)
 */
export async function respondToRepresentationRelationship(relationshipId, responseStatus, respondingUser) {
  if (responseStatus !== "active" && responseStatus !== "declined") {
    throw new Error("Status must be 'active' (accepted) or 'declined'.");
  }

  const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
  const index = allRel.findIndex((r) => r.id === relationshipId);
  if (index === -1) throw new Error("Relationship record not found.");

  const rel = allRel[index];
  const now = new Date().toISOString();

  rel.status = responseStatus;
  rel.updatedAt = now;
  allRel[index] = rel;
  writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);

  // Notify the other party
  const isAgencyResponder = rel.initiatedBy === "creator";
  const recipientId = isAgencyResponder ? rel.creatorId : rel.agencyId;
  const recipientEmail = isAgencyResponder ? rel.creatorEmail : rel.agencyEmail;
  const recipientRole = isAgencyResponder ? "Creator" : "Agency";

  await createNotification({
    recipientId,
    recipientEmail,
    recipientRole,
    type: responseStatus === "active" ? "agency_relationship_accepted" : "agency_relationship_declined",
    title: responseStatus === "active" ? "Talent Representation Activated! 🎉" : "Representation Request Declined",
    message: responseStatus === "active"
      ? `${isAgencyResponder ? rel.agencyName : rel.creatorName} accepted representation. The creator is now on the agency roster!`
      : `${isAgencyResponder ? rel.agencyName : rel.creatorName} declined the representation request.`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_creator_relationships", relationshipId);
      await updateDoc(docRef, { status: responseStatus, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore relationship response note:", fsErr.message);
    }
  }

  emitDataChange("agency_relationships", rel);
  return rel;
}

/**
 * Ends/terminates a representation relationship
 */
export async function endRepresentationRelationship(relationshipId, endingUser, reason = "") {
  const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
  const index = allRel.findIndex((r) => r.id === relationshipId);
  if (index === -1) throw new Error("Relationship not found.");

  const rel = allRel[index];
  const now = new Date().toISOString();

  rel.status = "ended";
  rel.endedAt = now;
  rel.endReason = reason;
  rel.updatedAt = now;
  allRel[index] = rel;
  writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);

  // Notify the other party
  const isCreatorEnding = endingUser?.role === "Creator" || endingUser?.email?.toLowerCase() === rel.creatorEmail?.toLowerCase();
  const recipientId = isCreatorEnding ? rel.agencyId : rel.creatorId;
  const recipientEmail = isCreatorEnding ? rel.agencyEmail : rel.creatorEmail;
  const recipientRole = isCreatorEnding ? "Agency" : "Creator";

  await createNotification({
    recipientId,
    recipientEmail,
    recipientRole,
    type: "agency_relationship_ended",
    title: "Talent Representation Ended",
    message: `Representation between ${rel.creatorName} and ${rel.agencyName} has ended${reason ? `: ${reason}` : "."}`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_creator_relationships", relationshipId);
      await updateDoc(docRef, { status: "ended", endedAt: serverTimestamp(), endReason: reason, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore relationship end note:", fsErr.message);
    }
  }

  emitDataChange("agency_relationships", rel);
  return rel;
}

// -------------------------------------------------------------
// 4. CREATOR MATCHING & RECOMMENDATIONS (Agency -> Brand)
// -------------------------------------------------------------

/**
 * Calculates a match score and reasons based on real campaign and creator profiles
 */
export function calculateCreatorMatch(campaign, creator) {
  let score = 50;
  const reasons = [];

  if (!campaign || !creator) return { score: 50, reasons: ["General creator profile"] };

  // 1. Niche match
  const campNiche = (campaign.targetNiche || "").toLowerCase();
  const creatorNiche = (creator.niche || creator.category || "").toLowerCase();
  if (campNiche && creatorNiche) {
    const campTokens = campNiche.split(/[\s,&]+/);
    const hasToken = campTokens.some((t) => t.length > 3 && creatorNiche.includes(t));
    if (hasToken || campNiche === creatorNiche) {
      score += 25;
      reasons.push(`Niche Alignment: matches target '${campaign.targetNiche}'`);
    }
  }

  // 2. Platform match
  const campPlatforms = campaign.targetPlatforms || [];
  const creatorPlatforms = creator.platforms || [creator.primaryPlatform].filter(Boolean);
  const commonPlatforms = campPlatforms.filter((p) =>
    creatorPlatforms.some((cp) => cp && cp.toLowerCase() === p.toLowerCase())
  );
  if (commonPlatforms.length > 0) {
    score += 15;
    reasons.push(`Platform Channel: active on ${commonPlatforms.join(", ")}`);
  }

  // 3. Verification & audience reach
  if (creator.verified) {
    score += 5;
    reasons.push("Verified Creator Badge");
  }
  if (creator.followers && creator.followers > 500000) {
    score += 5;
    reasons.push(`High Reach: ${creator.formattedFollowers || creator.followers.toLocaleString()} audience`);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons: reasons.length > 0 ? reasons : ["Profile active in CreatorIQ roster"],
  };
}

/**
 * Gets campaign recommendations
 */
export async function getAgencyRecommendations({ campaignId, agencyId, brandId } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  if (db && (campaignId || agencyId || brandId)) {
    try {
      const colRef = collection(db, "agency_campaign_recommendations");
      const promises = [];
      if (campaignId) promises.push(getDocs(query(colRef, where("campaignId", "==", campaignId))));
      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (brandId) promises.push(getDocs(query(colRef, where("brandId", "==", brandId))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore recommendations query note:", err.message);
    }
  }

  const allLocal = readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);
  allLocal.forEach((item) => {
    let matches = true;
    if (campaignId && item.campaignId !== campaignId) matches = false;
    if (agencyId && item.agencyId !== agencyId) matches = false;
    if (brandId && item.brandId !== brandId) matches = false;
    if (matches && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Agency recommends/shortlists a Creator for an assigned Campaign
 */
export async function recommendCreatorForCampaign({
  campaign,
  creator,
  agencyUser,
  pitchNotes = "",
}) {
  initAgencyStore();
  if (!campaign || !creator) throw new Error("Campaign and Creator are required.");

  const allRec = readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);

  // Check if already recommended
  const existing = allRec.find(
    (r) => r.campaignId === campaign.id && r.creatorId === creator.uid
  );
  if (existing) {
    throw new Error(`Creator ${creator.fullName} has already been recommended for this campaign.`);
  }

  const match = calculateCreatorMatch(campaign, creator);
  const newId = `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRecommendation = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name || campaign.title,
    brandId: campaign.marketingId || "usr_marketing_demo",
    agencyId: agencyUser?.uid || "usr_agency_demo",
    agencyName: agencyUser?.fullName || agencyUser?.displayName || "Talent Agency",
    creatorId: creator.uid,
    creatorName: creator.fullName || creator.displayName,
    creatorEmail: creator.email,
    creatorHandle: creator.handle,
    creatorNiche: creator.niche || creator.category,
    creatorPlatforms: creator.platforms || [creator.primaryPlatform],
    matchScore: match.score,
    matchReasons: match.reasons,
    pitchNotes: pitchNotes.trim() || `${creator.fullName} has strong audience alignment with ${campaign.name}.`,
    status: "recommended",
    createdAt: now,
    updatedAt: now,
  };

  allRec.unshift(newRecommendation);
  writeStorage(STORAGE_KEYS.RECOMMENDATIONS, allRec);

  // Notify Brand Marketing Team
  await createNotification({
    recipientId: campaign.marketingId,
    recipientEmail: campaign.marketingEmail || "marketing@creatoriq.io",
    recipientRole: "Marketing Team",
    type: "agency_creator_recommended",
    title: "Agency Recommended Creator",
    message: `${newRecommendation.agencyName} recommended ${creator.fullName} (${match.score}% Match) for '${campaign.name}'.`,
    campaignId: campaign.id,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_recommendations", newId);
      await setDoc(docRef, { ...newRecommendation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore recommendation write note:", fsErr.message);
    }
  }

  emitDataChange("agency_recommendations", newRecommendation);
  return newRecommendation;
}

/**
 * Brand reviews recommendation (approve or reject)
 */
export async function updateRecommendationStatus(recommendationId, newStatus, brandUser) {
  const allRec = readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);
  const index = allRec.findIndex((r) => r.id === recommendationId);
  if (index === -1) throw new Error("Recommendation not found.");

  const rec = allRec[index];
  const now = new Date().toISOString();

  rec.status = newStatus;
  rec.updatedAt = now;
  allRec[index] = rec;
  writeStorage(STORAGE_KEYS.RECOMMENDATIONS, allRec);

  // Notify Agency
  await createNotification({
    recipientId: rec.agencyId,
    recipientEmail: "agency@creatoriq.io",
    recipientRole: "Agency",
    type: "recommendation_reviewed",
    title: `Recommendation ${newStatus === "approved" ? "Approved" : "Reviewed"}`,
    message: `Brand team ${newStatus} your recommendation of ${rec.creatorName} for '${rec.campaignTitle}'.`,
    campaignId: rec.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_recommendations", recommendationId);
      await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore recommendation update note:", fsErr.message);
    }
  }

  emitDataChange("agency_recommendations", rec);
  return rec;
}

// -------------------------------------------------------------
// Real-time Firestore Subscriptions
// -------------------------------------------------------------
export function subscribeToAgencyAssignments(agencyId, onUpdate) {
  if (!db || !agencyId) return () => {};
  try {
    const colRef = collection(db, "agency_brand_assignments");
    const q = query(colRef, where("agencyId", "==", agencyId));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(items);
    }, () => {});
  } catch {
    return () => {};
  }
}

export function subscribeToAgencyRelationships(agencyId, onUpdate) {
  if (!db || !agencyId) return () => {};
  try {
    const colRef = collection(db, "agency_creator_relationships");
    const q = query(colRef, where("agencyId", "==", agencyId));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(items);
    }, () => {});
  } catch {
    return () => {};
  }
}

export { subscribeToDataChanges, emitDataChange };
export const getRegisteredAgencies = fetchRegisteredAgencies;
export const assignCampaignToAgency = createAgencyBrandAssignment;

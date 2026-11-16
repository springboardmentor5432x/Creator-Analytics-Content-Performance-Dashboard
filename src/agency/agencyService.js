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
import { db } from "../firebase.js";
import { getLocalRegisteredUsers, DEFAULT_DEMO_ACCOUNTS } from "../authService.js";
import {
  getLocalCampaigns,
  getLocalInvitations,
  getLocalDeliverables,
  createNotification,
  emitDataChange,
  subscribeToDataChanges,
} from "../marketing/campaignService.js";

const STORAGE_KEYS = {
  ASSIGNMENTS: "creatoriq_agency_brand_assignments",
  RELATIONSHIPS: "creatoriq_agency_creator_relationships",
  RECOMMENDATIONS: "creatoriq_agency_recommendations",
  REPRESENTATION_REQUESTS: "creatoriq_agency_representation_requests",
  CREATOR_CAMPAIGN_ASSIGNMENTS: "creatoriq_agency_campaign_assignments",
  COMMISSION_RECORDS: "creatoriq_agency_commission_records",
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
  {
    id: "aba-demo-003",
    campaignId: "cmp-2026-003",
    campaignTitle: "Next-Gen AI & Developer Ecosystem Campaign",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_arunannadurai",
    agencyName: "Arun Annadurai",
    agencyEmail: "arunannadurai2011@gmail.com",
    status: "accepted",
    permissions: {
      canInviteCreators: true,
      canRecommend: true,
      viewBudget: true,
    },
    message: "Coordinating top-tier developer and tech creators for AI ecosystem expansion.",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-02T11:00:00.000Z",
  },
  {
    id: "aba-demo-004",
    campaignId: "cmp-2026-004",
    campaignTitle: "Cloud Architecture & Tech Creator Showcase",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_arunannadurai",
    agencyName: "Arun Annadurai",
    agencyEmail: "arunannadurai2011@gmail.com",
    status: "accepted",
    permissions: {
      canInviteCreators: true,
      canRecommend: true,
      viewBudget: true,
    },
    message: "Managing cloud architecture technical influencer sponsorships.",
    createdAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-03-05T09:00:00.000Z",
  },
];

const INITIAL_RELATIONSHIPS = [
  {
    id: "acr-demo-001",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    creatorId: "usr_creator_marcus",
    creatorName: "Marcus Sterling",
    creatorEmail: "marcus.sterling@creatoriq.io",
    creatorHandle: "@marcussterling",
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
  {
    id: "acr-demo-003",
    agencyId: "usr_agency_arunannadurai",
    agencyName: "Arun Annadurai",
    agencyEmail: "arunannadurai2011@gmail.com",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    creatorHandle: "@alexrivers",
    creatorNiche: "Tech & Software Engineering",
    creatorPlatforms: ["YouTube", "Twitter / X"],
    creatorFollowers: "1.4M",
    initiatedBy: "creator",
    status: "active",
    terms: "Standard Exclusive Talent Management: 15% agency commission on agency-brokered sponsorships",
    message: "Excited to represent you for enterprise tech and developer sponsorships.",
    createdAt: "2026-02-01T12:00:00.000Z",
    updatedAt: "2026-02-02T14:00:00.000Z",
  },
];

const INITIAL_RECOMMENDATIONS = [
  {
    id: "rec-demo-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
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
    proposedRate: "$6,500",
    status: "approved", // 'recommended' | 'invited' | 'approved' | 'accepted' | 'declined'
    createdAt: "2026-02-18T10:00:00.000Z",
    updatedAt: "2026-02-18T15:00:00.000Z",
  },
  {
    id: "rec-demo-002",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    matchScore: 92,
    matchReasons: [
      "High developer audience affinity (78%)",
      "Proven SaaS tool walkthrough experience",
      "Top-tier engagement rate",
    ],
    pitchNotes: "Vanguard Talent Agency invited you for this enterprise developer summit campaign based on your tech channel performance.",
    proposedRate: "$5,000",
    status: "invited",
    createdAt: "2026-03-12T14:00:00.000Z",
    updatedAt: "2026-03-12T14:00:00.000Z",
  },
];

const INITIAL_REPRESENTATION_REQUESTS = [
  {
    id: "arr-demo-001",
    creatorId: "usr_creator_jordan",
    creatorName: "Jordan Blake",
    creatorEmail: "jordan@creatoriq.io",
    creatorHandle: "@jordanblake_dev",
    creatorNiche: "Tech & Productivity",
    creatorPlatforms: ["YouTube", "LinkedIn"],
    creatorFollowers: "840K",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    message: "Hi Vanguard, looking for full-service representation for Q2 SaaS launches.",
    proposedTerms: "Standard Representation (15% agency commission)",
    status: "PENDING",
    createdAt: "2026-03-12T16:00:00.000Z",
    updatedAt: "2026-03-12T16:00:00.000Z",
  },
];

const INITIAL_CREATOR_ASSIGNMENTS = [
  {
    id: "aca-demo-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    creatorId: "usr_creator_marcus",
    creatorName: "Marcus Sterling",
    creatorEmail: "marcus.sterling@creatoriq.io",
    creatorHandle: "@marcussterling",
    compensation: 5000,
    commissionType: "percentage",
    commissionValue: 15,
    agencyCommission: 750,
    creatorNetEarnings: 4250,
    deliverables: ["1x YouTube Integration (60-90s mid-roll)", "1x Dedicated X / Twitter Thread"],
    deadline: "2026-04-15",
    instructions: "Highlight seamless API integration and developer productivity analytics.",
    status: "ACCEPTED",
    paymentStatus: "pending",
    source: "agency_assignment",
    createdAt: "2026-02-20T10:00:00.000Z",
    updatedAt: "2026-02-21T11:00:00.000Z",
  },
  {
    id: "aca-demo-002",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_demo",
    agencyName: "Vanguard Talent Agency",
    agencyEmail: "agency@creatoriq.io",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    creatorHandle: "@alexrivers",
    compensation: 4000,
    commissionType: "percentage",
    commissionValue: 15,
    agencyCommission: 600,
    creatorNetEarnings: 3400,
    deliverables: ["1x YouTube Review & Demo Walkthrough"],
    deadline: "2026-04-20",
    instructions: "Produce an in-depth walkthrough of the developer automation capabilities.",
    status: "PENDING",
    paymentStatus: "unpaid",
    source: "agency_assignment",
    createdAt: "2026-03-01T14:00:00.000Z",
    updatedAt: "2026-03-01T14:00:00.000Z",
  },
  {
    id: "aca-demo-003",
    campaignId: "cmp-2026-003",
    campaignTitle: "Next-Gen AI & Developer Ecosystem Campaign",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_arunannadurai",
    agencyName: "Arun Annadurai",
    agencyEmail: "arunannadurai2011@gmail.com",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    creatorHandle: "@alexrivers",
    compensation: 6500,
    commissionType: "percentage",
    commissionValue: 15,
    agencyCommission: 975,
    creatorNetEarnings: 5525,
    deliverables: ["1x YouTube Integration (60-90s mid-roll)", "1x Social Media Video Post"],
    deadline: "2026-05-15",
    instructions: "Showcase live API automation and developer workflows with CreatorIQ intelligence.",
    status: "PENDING",
    paymentStatus: "unpaid",
    source: "agency_assignment",
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z",
  },
  {
    id: "aca-demo-004",
    campaignId: "cmp-2026-004",
    campaignTitle: "Cloud Architecture & Tech Creator Showcase",
    brandId: "usr_marketing_demo",
    brandName: "Global Brand Marketing",
    brandEmail: "marketing@creatoriq.io",
    agencyId: "usr_agency_arunannadurai",
    agencyName: "Arun Annadurai",
    agencyEmail: "arunannadurai2011@gmail.com",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    creatorHandle: "@alexrivers",
    compensation: 4800,
    commissionType: "percentage",
    commissionValue: 15,
    agencyCommission: 720,
    creatorNetEarnings: 4080,
    deliverables: ["1x Dedicated YouTube Review", "1x Community Post"],
    deadline: "2026-05-30",
    instructions: "Deep dive into server performance, developer tools, and analytics integration.",
    status: "ACCEPTED",
    paymentStatus: "pending",
    source: "agency_assignment",
    createdAt: "2026-03-08T11:00:00.000Z",
    updatedAt: "2026-03-08T11:00:00.000Z",
  },
];

const INITIAL_COMMISSION_RECORDS = [
  {
    id: "com-demo-001",
    assignmentId: "aca-demo-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    agencyId: "usr_agency_demo",
    creatorId: "usr_creator_marcus",
    grossCompensation: 5000,
    commissionAmount: 750,
    creatorNetAmount: 4250,
    status: "pending",
    createdAt: "2026-02-20T10:00:00.000Z",
  },
  {
    id: "com-demo-002",
    assignmentId: "aca-demo-002",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    agencyId: "usr_agency_demo",
    creatorId: "usr_creator_demo",
    grossCompensation: 4000,
    commissionAmount: 600,
    creatorNetAmount: 3400,
    status: "pending",
    createdAt: "2026-03-01T14:00:00.000Z",
  },
];

// -------------------------------------------------------------
// Storage Access Helpers
// -------------------------------------------------------------
const MOCK_STORAGE_IDS_TO_PRUNE = new Set([
  "aba-demo-003", "aba-demo-004", "aba-demo-005", "aba-demo-006", "aba-demo-007", "aba-demo-008",
  "acr-demo-003", "acr-demo-004", "acr-demo-005", "acr-demo-006", "acr-demo-007", "acr-demo-008",
]);

const MOCK_AGENCIES_TO_PRUNE = new Set([
  "caa.digital@creatoriq.io",
  "night.talent@creatoriq.io",
  "uta.creators@creatoriq.io",
  "viralnation@creatoriq.io",
  "range.creators@creatoriq.io",
  "apex.management@creatoriq.io",
]);

function readStorage(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(defaultVal)) {
        // Prune mock items from storage
        const initialLen = parsed.length;
        parsed = parsed.filter(
          (item) =>
            !MOCK_STORAGE_IDS_TO_PRUNE.has(item.id) &&
            !MOCK_AGENCIES_TO_PRUNE.has(item.agencyEmail?.toLowerCase())
        );
        let changed = parsed.length !== initialLen;

        const idMap = new Map(parsed.map((item) => [item.id, item]));
        for (const item of defaultVal) {
          if (item && item.id) {
            if (!idMap.has(item.id)) {
              parsed.push(item);
              idMap.set(item.id, item);
              changed = true;
            } else if (
              item.id === "acr-demo-001" &&
              idMap.get("acr-demo-001")?.creatorEmail === "creator@creatoriq.io" &&
              item.creatorEmail !== "creator@creatoriq.io"
            ) {
              const idx = parsed.findIndex((p) => p.id === "acr-demo-001");
              if (idx !== -1) {
                parsed[idx] = item;
                changed = true;
              }
            }
          }
        }
        if (changed) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
        return parsed;
      }
      return parsed;
    }
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
  readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);
  readStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, INITIAL_CREATOR_ASSIGNMENTS);
  readStorage(STORAGE_KEYS.COMMISSION_RECORDS, INITIAL_COMMISSION_RECORDS);
}

// -------------------------------------------------------------
// 1. ACTIVE AGENCY DIRECTORY
// -------------------------------------------------------------

const AGENCY_ROLE_VARIANTS = [
  "Agency",
  "agency",
  "Talent Agency",
  "talent agency",
  "AGENCY",
  "Agency Team",
  "agency team",
  "Talent Manager",
  "talent manager",
];

function isStrictAgencyRole(role) {
  if (!role || typeof role !== "string") return false;
  const r = role.trim().toLowerCase();
  return (
    r === "agency" ||
    r === "talent agency" ||
    r === "agency team" ||
    r === "talent manager" ||
    r === "agent"
  );
}

/**
 * Fetches real registered Agency profiles from Firestore and local registry.
 * Strips out mock/fabricated agencies.
 * Strictly fetches users with Agency roles only (excludes Marketing, Creator, Admin).
 * Used by Brands to select an Agency, and by Creators to browse representation.
 */
export async function fetchRegisteredAgencies() {
  const agencyMap = new Map();

  // Helper to add or merge an agency doc safely with strict role verification
  const registerAgency = (email, data) => {
    let norm = (email || "").trim().toLowerCase();
    if (norm.includes("%40") || norm.includes("%")) {
      try {
        norm = decodeURIComponent(norm);
      } catch (e) {}
    }
    if (!norm || !norm.includes("@") || MOCK_AGENCIES_TO_PRUNE.has(norm)) return;

    // Strictly enforce Agency role only: Marketing Team, Creator, and Admin are never added
    if (!isStrictAgencyRole(data?.role)) return;

    let dataEmail = (data?.email || norm).trim().toLowerCase();
    if (dataEmail.includes("%40") || dataEmail.includes("%")) {
      try {
        dataEmail = decodeURIComponent(dataEmail);
      } catch (e) {}
    }

    const existing = agencyMap.get(norm) || {};
    agencyMap.set(norm, {
      ...existing,
      uid: data?.uid || data?.id || existing.uid || `usr_agency_${norm.split("@")[0]}`,
      email: dataEmail || norm,
      fullName:
        data?.fullName ||
        data?.displayName ||
        data?.agencyName ||
        data?.name ||
        existing.fullName ||
        (norm === "arunannadurai2011@gmail.com" ? "Arun Annadurai" : norm.split("@")[0]),
      role: "Agency",
      bio:
        data?.bio ||
        existing.bio ||
        "Full-service talent representation, creator brand partnerships, and campaign management.",
      niches:
        Array.isArray(data?.niches) && data.niches.length > 0
          ? data.niches
          : existing.niches || ["Talent Management", "Creator Brand Sponsorships"],
      location: data?.location || existing.location || "Global",
      verified: data?.verified !== undefined ? data.verified : true,
    });
  };

  // 1. Load baseline platform demo and accredited agencies
  if (DEFAULT_DEMO_ACCOUNTS["agency@creatoriq.io"]) {
    const v = DEFAULT_DEMO_ACCOUNTS["agency@creatoriq.io"];
    registerAgency(v.email, v);
  }
  if (DEFAULT_DEMO_ACCOUNTS["arunannadurai2011@gmail.com"]) {
    const a = DEFAULT_DEMO_ACCOUNTS["arunannadurai2011@gmail.com"];
    registerAgency(a.email, a);
  }

  // 2. Merge local registered users with Agency role
  const localUsers = getLocalRegisteredUsers();
  Object.values(localUsers || {}).forEach((u) => {
    let email = (u.email || "").trim().toLowerCase();
    if (email.includes("%40")) {
      try {
        email = decodeURIComponent(email);
      } catch (e) {}
    }
    if (email && isStrictAgencyRole(u.role)) {
      registerAgency(email, u);
    }
  });

  // 3. Query Firestore database for real registered agencies
  if (db) {
    // 3A. Direct doc lookup for accredited agencies in email_registry
    const targetAgencies = ["arunannadurai2011@gmail.com", "agency@creatoriq.io"];
    for (const target of targetAgencies) {
      for (const docKey of [target, encodeURIComponent(target)]) {
        try {
          const snap = await getDoc(doc(db, "email_registry", docKey));
          if (snap.exists()) {
            const d = snap.data();
            let email = d.email || target;
            if (email.includes("%40")) {
              try { email = decodeURIComponent(email); } catch (e) {}
            }
            registerAgency(email, { id: d.uid || snap.id, ...d });
          }
        } catch (e) {}
      }
    }

    // 3B. Query users collection where role is in AGENCY_ROLE_VARIANTS
    try {
      const usersRef = collection(db, "users");
      const qUsers = query(usersRef, where("role", "in", AGENCY_ROLE_VARIANTS));
      const snapshot = await getDocs(qUsers);
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        let email = d.email || docSnap.id;
        if (email.includes("%40")) {
          try { email = decodeURIComponent(email); } catch (e) {}
        }
        registerAgency(email, { id: docSnap.id, ...d });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore agency users query note:", err.message);
    }

    // 3C. Query users collection by individual agency roles
    for (const r of ["Agency", "agency", "Talent Agency", "Agency Team"]) {
      try {
        const usersRef = collection(db, "users");
        const qSingle = query(usersRef, where("role", "==", r));
        const snapshot = await getDocs(qSingle);
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          let email = d.email || docSnap.id;
          if (email.includes("%40")) {
            try { email = decodeURIComponent(email); } catch (e) {}
          }
          registerAgency(email, { id: docSnap.id, ...d });
        });
      } catch (e) {}
    }

    // 3D. Query email_registry collection for agency roles
    try {
      const emailRegRef = collection(db, "email_registry");
      const qEmail = query(emailRegRef, where("role", "in", AGENCY_ROLE_VARIANTS));
      const emailSnap = await getDocs(qEmail);
      emailSnap.forEach((docSnap) => {
        const data = docSnap.data();
        let email = data.email || docSnap.id;
        if (email.includes("%40")) {
          try { email = decodeURIComponent(email); } catch (e) {}
        }
        registerAgency(email, { id: data.uid || docSnap.id, ...data });
      });
    } catch (regErr) {
      console.warn("[CreatorIQ] Firestore email_registry query note:", regErr.message);
    }

    // 3E. Query email_registry by individual role
    for (const r of ["Agency", "agency", "Talent Agency", "Agency Team"]) {
      try {
        const emailRegRef = collection(db, "email_registry");
        const qEmailSingle = query(emailRegRef, where("role", "==", r));
        const emailSnap = await getDocs(qEmailSingle);
        emailSnap.forEach((docSnap) => {
          const data = docSnap.data();
          let email = data.email || docSnap.id;
          if (email.includes("%40")) {
            try { email = decodeURIComponent(email); } catch (e) {}
          }
          registerAgency(email, { id: data.uid || docSnap.id, ...data });
        });
      } catch (e) {}
    }

    // 3F. Query users collection directly by email for arunannadurai2011@gmail.com
    try {
      const usersRef = collection(db, "users");
      const qDirect = query(usersRef, where("email", "==", "arunannadurai2011@gmail.com"));
      const directSnap = await getDocs(qDirect);
      directSnap.forEach((docSnap) => {
        const d = docSnap.data();
        registerAgency(d.email || docSnap.id, { id: docSnap.id, ...d, role: d.role || "Agency" });
      });
    } catch (e) {}

    // 3G. Check optional agencies collection if present
    try {
      const agenciesCol = collection(db, "agencies");
      const snapAgencies = await getDocs(agenciesCol);
      snapAgencies.forEach((docSnap) => {
        const data = docSnap.data();
        let email = data.email || docSnap.id;
        if (email.includes("%40")) {
          try { email = decodeURIComponent(email); } catch (e) {}
        }
        registerAgency(email, { id: docSnap.id, ...data });
      });
    } catch (e) {}
  }

  // 4. Compute REAL dynamic statistics (collaborated creators and collaborated brands) for each agency
  const agencies = Array.from(agencyMap.values());
  const [allRel, allAssignments] = await Promise.all([
    getAgencyCreatorRelationships().catch(() => []),
    getAgencyBrandAssignments().catch(() => []),
  ]);

  return agencies.map((agency) => {
    const agencyEmail = (agency.email || "").toLowerCase();
    const agencyId = agency.uid;

    // Real Collaborated Creators: count unique creators with active or completed relationships
    const activeRelForAgency = (allRel || []).filter((r) => {
      const matchAgency =
        (r.agencyId && r.agencyId === agencyId) ||
        (r.agencyEmail && r.agencyEmail.toLowerCase() === agencyEmail);
      return matchAgency && (r.status === "active" || r.status === "ended");
    });
    const uniqueCreators = new Set(
      activeRelForAgency.map((r) => r.creatorId || r.creatorEmail?.toLowerCase()).filter(Boolean)
    );
    const collaboratedCreatorsCount = uniqueCreators.size;

    // Real Collaborated Brands: count unique brands with accepted campaign assignments
    const acceptedAssignmentsForAgency = (allAssignments || []).filter((a) => {
      const matchAgency =
        (a.agencyId && a.agencyId === agencyId) ||
        (a.agencyEmail && a.agencyEmail.toLowerCase() === agencyEmail);
      return matchAgency && a.status === "accepted";
    });
    const uniqueBrands = new Set(
      acceptedAssignmentsForAgency.map((a) => a.brandId || a.brandEmail?.toLowerCase() || a.brandName).filter(Boolean)
    );
    const collaboratedBrandsCount = uniqueBrands.size;

    return {
      ...agency,
      collaboratedCreatorsCount,
      collaboratedBrandsCount,
    };
  });
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
    if (agencyId || agencyEmail) {
      const matchAgency =
        (agencyId && item.agencyId === agencyId) ||
        (agencyEmail && item.agencyEmail?.toLowerCase() === agencyEmail.toLowerCase());
      if (!matchAgency) matches = false;
    }
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
    if (agencyId || agencyEmail) {
      const matchAgency =
        (agencyId && item.agencyId === agencyId) ||
        (agencyEmail && item.agencyEmail?.toLowerCase() === agencyEmail.toLowerCase());
      if (!matchAgency) matches = false;
    }
    if (creatorId || creatorEmail) {
      const matchCreator =
        (creatorId && item.creatorId === creatorId) ||
        (creatorEmail && item.creatorEmail?.toLowerCase() === creatorEmail.toLowerCase());
      if (!matchCreator) matches = false;
    }
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
  const normalizedStatus = responseStatus === "accepted" ? "active" : responseStatus;
  if (normalizedStatus !== "active" && normalizedStatus !== "declined") {
    throw new Error("Status must be 'active' (accepted) or 'declined'.");
  }

  const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
  const index = allRel.findIndex((r) => r.id === relationshipId);
  if (index === -1) throw new Error("Relationship record not found.");

  const rel = allRel[index];
  const now = new Date().toISOString();

  rel.status = normalizedStatus;
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
    type: normalizedStatus === "active" ? "agency_relationship_accepted" : "agency_relationship_declined",
    title: normalizedStatus === "active" ? "Talent Representation Activated! 🎉" : "Representation Request Declined",
    message: normalizedStatus === "active"
      ? `${isAgencyResponder ? rel.agencyName : rel.creatorName} accepted representation. The creator is now on the agency roster!`
      : `${isAgencyResponder ? rel.agencyName : rel.creatorName} declined the representation request.`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_creator_relationships", relationshipId);
      await updateDoc(docRef, { status: normalizedStatus, updatedAt: serverTimestamp() });
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
 * Gets campaign recommendations / invitations
 */
export async function getAgencyRecommendations({ campaignId, agencyId, brandId, creatorId, creatorEmail } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  if (db && (campaignId || agencyId || brandId || creatorId || creatorEmail)) {
    try {
      const colRef = collection(db, "agency_campaign_recommendations");
      const promises = [];
      if (campaignId) promises.push(getDocs(query(colRef, where("campaignId", "==", campaignId))));
      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (brandId) promises.push(getDocs(query(colRef, where("brandId", "==", brandId))));
      if (creatorId) promises.push(getDocs(query(colRef, where("creatorId", "==", creatorId))));
      if (creatorEmail) promises.push(getDocs(query(colRef, where("creatorEmail", "==", creatorEmail.toLowerCase()))));

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
    if (creatorId || creatorEmail) {
      const matchCreator =
        (creatorId && item.creatorId === creatorId) ||
        (creatorEmail && item.creatorEmail?.toLowerCase() === creatorEmail.toLowerCase());
      if (!matchCreator) matches = false;
    }
    if (matches && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Agency recommends/shortlists a Creator for an assigned Campaign
 */
export async function recommendCreatorForCampaign(payload) {
  initAgencyStore();
  const campaign = payload.campaign || {
    id: payload.campaignId,
    name: payload.campaignTitle,
    marketingId: payload.brandId,
  };
  const creator = payload.creator || {
    uid: payload.creatorId,
    fullName: payload.creatorName,
    email: payload.creatorEmail,
    handle: payload.creatorHandle,
    niche: payload.creatorNiche,
    platforms: payload.creatorPlatforms,
  };
  const agencyUser = payload.agencyUser || {
    uid: payload.agencyId,
    fullName: payload.agencyName,
  };
  const pitchNotes = payload.pitchNotes || "";
  const matchScore = payload.matchScore;
  const matchReasons = payload.matchReasons;

  if (!campaign?.id || !creator?.uid) throw new Error("Campaign and Creator are required.");

  const allRec = readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);

  // Check if already recommended
  const existing = allRec.find(
    (r) => r.campaignId === campaign.id && r.creatorId === creator.uid
  );
  if (existing) {
    throw new Error(`Creator ${creator.fullName} has already been recommended for this campaign.`);
  }

  const match = (matchScore != null && matchReasons)
    ? { score: matchScore, reasons: matchReasons }
    : calculateCreatorMatch(campaign, creator);
  const newId = `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRecommendation = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name || campaign.title,
    brandId: campaign.marketingId || "usr_marketing_demo",
    brandName: campaign.marketingName || campaign.brandName || "Brand Partner",
    agencyId: agencyUser?.uid || "usr_agency_demo",
    agencyName: agencyUser?.fullName || agencyUser?.displayName || "Talent Agency",
    creatorId: creator.uid,
    creatorName: creator.fullName || creator.displayName,
    creatorEmail: creator.email,
    creatorHandle: creator.handle || `@${creator.email?.split("@")[0]}`,
    creatorNiche: creator.niche || creator.category || "General",
    creatorPlatforms: creator.platforms || ["YouTube"],
    matchScore: match.score,
    matchReasons: match.reasons,
    proposedRate: payload.proposedRate || "$5,000",
    pitchNotes: pitchNotes.trim() || `${creator.fullName} has strong audience alignment with ${campaign.name}.`,
    status: "invited", // Start in invited state so creator can immediately review & accept
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

  // Notify Creator as well
  await createNotification({
    recipientId: creator.uid,
    recipientEmail: creator.email,
    recipientRole: "Creator",
    type: "agency_campaign_invitation",
    title: "Brand Campaign Invitation from Agency",
    message: `${newRecommendation.agencyName} invited you to collaborate on '${campaign.name}'.`,
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
 * Creator responds to an agency brand opportunity / invitation (accept or decline)
 */
export async function respondToAgencyRecommendation(recommendationId, responseStatus, creatorUser) {
  if (responseStatus !== "accepted" && responseStatus !== "declined") {
    throw new Error("Response status must be 'accepted' or 'declined'.");
  }

  const allRec = readStorage(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);
  const index = allRec.findIndex((r) => r.id === recommendationId);
  if (index === -1) throw new Error("Recommendation not found.");

  const rec = allRec[index];
  const now = new Date().toISOString();

  rec.status = responseStatus;
  rec.respondedAt = now;
  rec.updatedAt = now;
  allRec[index] = rec;
  writeStorage(STORAGE_KEYS.RECOMMENDATIONS, allRec);

  // Notify Agency that creator responded
  await createNotification({
    recipientId: rec.agencyId,
    recipientEmail: "agency@creatoriq.io",
    recipientRole: "Agency",
    type: responseStatus === "accepted" ? "creator_accepted_agency_deal" : "creator_declined_agency_deal",
    title: responseStatus === "accepted" ? "Creator Accepted Campaign Invitation! 🎉" : "Creator Declined Campaign Invitation",
    message: `${rec.creatorName} ${responseStatus} the campaign invitation for '${rec.campaignTitle}'.`,
    campaignId: rec.campaignId,
  });

  // Notify Brand Marketing Team
  if (rec.brandId) {
    await createNotification({
      recipientId: rec.brandId,
      recipientEmail: "marketing@creatoriq.io",
      recipientRole: "Marketing Team",
      type: responseStatus === "accepted" ? "creator_accepted_agency_deal" : "creator_declined_agency_deal",
      title: responseStatus === "accepted" ? "Creator Confirmed for Campaign" : "Creator Declined Campaign",
      message: `${rec.creatorName} (represented by ${rec.agencyName}) ${responseStatus} the invitation for '${rec.campaignTitle}'.`,
      campaignId: rec.campaignId,
    });
  }

  // If accepted, also sync into campaign_invitations so it automatically displays in Creator Collaborations & Deliverables!
  if (responseStatus === "accepted") {
    try {
      const allInvs = readStorage("creatoriq_campaign_invitations", []);
      let inv = allInvs.find((i) => i.campaignId === rec.campaignId && (i.creatorId === rec.creatorId || i.creatorEmail?.toLowerCase() === rec.creatorEmail?.toLowerCase()));
      if (!inv) {
        inv = {
          id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          campaignId: rec.campaignId,
          campaignTitle: rec.campaignTitle,
          creatorId: rec.creatorId,
          creatorName: rec.creatorName,
          creatorEmail: rec.creatorEmail,
          marketingId: rec.brandId,
          marketingName: rec.brandName || "Brand Partner",
          agencyId: rec.agencyId,
          agencyName: rec.agencyName,
          compensation: rec.proposedRate || "$5,000",
          status: "accepted",
          sentAt: now,
          respondedAt: now,
          message: rec.pitchNotes || `Pitched and confirmed via ${rec.agencyName}.`,
        };
        allInvs.unshift(inv);
        writeStorage("creatoriq_campaign_invitations", allInvs);
        emitDataChange("invitations", inv);
      } else {
        inv.status = "accepted";
        inv.respondedAt = now;
        writeStorage("creatoriq_campaign_invitations", allInvs);
        emitDataChange("invitations", inv);
      }
    } catch (invErr) {
      console.warn("Sync invitation error:", invErr);
    }
  }

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_recommendations", recommendationId);
      await updateDoc(docRef, { status: responseStatus, respondedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore recommendation update note:", fsErr.message);
    }
  }

  emitDataChange("agency_recommendations", rec);
  return rec;
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
// 5. REPRESENTATION REQUESTS & WORKFLOW (Creator <-> Agency)
// -------------------------------------------------------------

/**
 * Calculates transparent commission and net creator payout.
 * Supports percentage-based and fixed-dollar models.
 */
export function calculateCommission(compensation, commissionType = "percentage", commissionValue = 15) {
  const comp = Math.max(0, Number(compensation) || 0);
  const type = commissionType === "fixed" ? "fixed" : "percentage";
  const val = Math.max(0, Number(commissionValue) || 0);

  let agencyCommission = 0;
  let creatorNetEarnings = 0;

  if (type === "percentage") {
    const rate = Math.min(100, val);
    agencyCommission = Math.round((comp * (rate / 100)) * 100) / 100;
    creatorNetEarnings = Math.max(0, Math.round((comp - agencyCommission) * 100) / 100);
  } else {
    agencyCommission = Math.min(comp, Math.round(val * 100) / 100);
    creatorNetEarnings = Math.max(0, Math.round((comp - agencyCommission) * 100) / 100);
  }

  return {
    compensation: comp,
    commissionType: type,
    commissionValue: val,
    agencyCommission,
    creatorNetEarnings,
  };
}

/**
 * Creator submits representation request to an accredited Agency.
 * Strictly prevents self-requests and duplicate pending requests.
 */
export async function submitRepresentationRequest({
  creatorUser,
  agency,
  message = "",
  proposedTerms = "Standard Talent Representation (15% agency commission)",
}) {
  initAgencyStore();
  if (!creatorUser || !agency) throw new Error("Creator and Agency are required.");
  if (creatorUser.uid && agency.uid && creatorUser.uid === agency.uid) {
    throw new Error("You cannot send a representation request to yourself.");
  }

  const allReqs = readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);

  const creatorId = creatorUser.uid;
  const creatorEmail = (creatorUser.email || "").toLowerCase();
  const agencyId = agency.uid;
  const agencyEmail = (agency.email || "").toLowerCase();

  // Prevent duplicate pending requests
  const existingPending = allReqs.find((r) => {
    const matchCreator = (creatorId && r.creatorId === creatorId) || (creatorEmail && r.creatorEmail?.toLowerCase() === creatorEmail);
    const matchAgency = (agencyId && r.agencyId === agencyId) || (agencyEmail && r.agencyEmail?.toLowerCase() === agencyEmail);
    return matchCreator && matchAgency && r.status === "PENDING";
  });

  if (existingPending) {
    throw new Error(`A pending representation request to ${agency.fullName || "this agency"} is already active.`);
  }

  const newId = `arr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newRequest = {
    id: newId,
    creatorId: creatorUser.uid || "usr_creator_demo",
    creatorName: creatorUser.fullName || creatorUser.displayName || creatorUser.email?.split("@")[0] || "Content Creator",
    creatorEmail: creatorUser.email || "creator@creatoriq.io",
    creatorHandle: creatorUser.handle || `@${(creatorUser.email || "creator").split("@")[0]}`,
    creatorNiche: creatorUser.niche || creatorUser.category || "General",
    creatorPlatforms: creatorUser.platforms || ["YouTube"],
    creatorFollowers: creatorUser.formattedFollowers || creatorUser.followers || "100K+",
    agencyId: agency.uid,
    agencyName: agency.fullName || agency.name || "Talent Agency",
    agencyEmail: agency.email,
    message: message.trim() || `Hi ${agency.fullName || "Agency"}, I would love to request representation with your agency roster.`,
    proposedTerms: proposedTerms.trim(),
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  allReqs.unshift(newRequest);
  writeStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, allReqs);

  // Sync to legacy relationships as pending for backward compatibility
  try {
    const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
    const existingRelIdx = allRel.findIndex((r) => r.creatorId === newRequest.creatorId && r.agencyId === newRequest.agencyId);
    if (existingRelIdx === -1) {
      allRel.unshift({
        id: `acr-${newId.replace("arr-", "")}`,
        ...newRequest,
        status: "pending",
        initiatedBy: "creator",
        terms: proposedTerms.trim(),
      });
      writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);
    }
  } catch (e) {}

  // Notify Agency
  await createNotification({
    recipientId: agency.uid,
    recipientEmail: agency.email,
    recipientRole: "Agency",
    type: "creator_representation_request",
    title: "New Representation Request",
    message: `${newRequest.creatorName} requested representation from your agency.`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_representation_requests", newId);
      await setDoc(docRef, { ...newRequest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore representation request write note:", fsErr.message);
    }
  }

  emitDataChange("agency_representation_requests", newRequest);
  return newRequest;
}

/**
 * Gets representation requests submitted by a creator
 */
export async function getCreatorRepresentationRequests({ creatorId, creatorEmail } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  if (db && (creatorId || creatorEmail)) {
    try {
      const colRef = collection(db, "agency_representation_requests");
      const promises = [];
      if (creatorId) promises.push(getDocs(query(colRef, where("creatorId", "==", creatorId))));
      if (creatorEmail) promises.push(getDocs(query(colRef, where("creatorEmail", "==", creatorEmail.toLowerCase()))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore creator representation requests query note:", err.message);
    }
  }

  const allLocal = readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);
  allLocal.forEach((item) => {
    const match =
      (creatorId && item.creatorId === creatorId) ||
      (creatorEmail && item.creatorEmail?.toLowerCase() === creatorEmail.toLowerCase());
    if (match && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Creator withdraws a pending representation request
 */
export async function withdrawRepresentationRequest(requestId, creatorUser) {
  initAgencyStore();
  const allReqs = readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);
  const index = allReqs.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error("Representation request not found.");

  const req = allReqs[index];
  if (req.status !== "PENDING" && req.status !== "pending") {
    throw new Error(`Cannot withdraw request with status '${req.status}'.`);
  }

  const now = new Date().toISOString();
  req.status = "WITHDRAWN";
  req.updatedAt = now;
  allReqs[index] = req;
  writeStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, allReqs);

  // Sync to relationships if present
  try {
    const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
    const relIdx = allRel.findIndex((r) => r.creatorId === req.creatorId && r.agencyId === req.agencyId && r.status === "pending");
    if (relIdx !== -1) {
      allRel[relIdx].status = "declined";
      allRel[relIdx].updatedAt = now;
      writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);
    }
  } catch (e) {}

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_representation_requests", requestId);
      await updateDoc(docRef, { status: "WITHDRAWN", updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore withdraw update note:", fsErr.message);
    }
  }

  emitDataChange("agency_representation_requests", req);
  return req;
}

/**
 * Gets incoming representation requests for an Agency
 */
export async function getAgencyIncomingRequests({ agencyId, agencyEmail } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  if (db && (agencyId || agencyEmail)) {
    try {
      const colRef = collection(db, "agency_representation_requests");
      const promises = [];
      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (agencyEmail) promises.push(getDocs(query(colRef, where("agencyEmail", "==", agencyEmail.toLowerCase()))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore agency incoming requests query note:", err.message);
    }
  }

  const allLocal = readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);
  allLocal.forEach((item) => {
    const match =
      (agencyId && item.agencyId === agencyId) ||
      (agencyEmail && item.agencyEmail?.toLowerCase() === agencyEmail.toLowerCase());
    if (match && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Agency responds to creator representation request (ACCEPTED or REJECTED)
 */
export async function respondToRepresentationRequest(requestId, responseStatus, agencyUser, notes = "") {
  initAgencyStore();
  const normalized = responseStatus.toUpperCase();
  if (normalized !== "ACCEPTED" && normalized !== "REJECTED") {
    throw new Error("Response must be 'ACCEPTED' or 'REJECTED'.");
  }

  const allReqs = readStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, INITIAL_REPRESENTATION_REQUESTS);
  const index = allReqs.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error("Representation request not found.");

  const req = allReqs[index];
  const now = new Date().toISOString();

  req.status = normalized;
  req.respondedAt = now;
  req.responseNote = notes;
  req.updatedAt = now;
  allReqs[index] = req;
  writeStorage(STORAGE_KEYS.REPRESENTATION_REQUESTS, allReqs);

  // If ACCEPTED, activate representation relationship
  if (normalized === "ACCEPTED") {
    const allRel = readStorage(STORAGE_KEYS.RELATIONSHIPS, INITIAL_RELATIONSHIPS);
    const relIdx = allRel.findIndex((r) => r.creatorId === req.creatorId && r.agencyId === req.agencyId);
    if (relIdx !== -1) {
      allRel[relIdx].status = "active";
      allRel[relIdx].updatedAt = now;
    } else {
      allRel.unshift({
        id: `acr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        agencyId: req.agencyId,
        agencyName: req.agencyName,
        agencyEmail: req.agencyEmail,
        creatorId: req.creatorId,
        creatorName: req.creatorName,
        creatorEmail: req.creatorEmail,
        creatorHandle: req.creatorHandle,
        creatorNiche: req.creatorNiche,
        creatorPlatforms: req.creatorPlatforms,
        creatorFollowers: req.creatorFollowers,
        status: "active",
        terms: req.proposedTerms || "Standard Talent Representation (15% agency commission)",
        initiatedBy: "creator",
        createdAt: now,
        updatedAt: now,
      });
    }
    writeStorage(STORAGE_KEYS.RELATIONSHIPS, allRel);
    emitDataChange("agency_relationships", allRel[0]);

    if (db) {
      try {
        const relDocRef = doc(db, "agency_creator_relationships", `acr-${req.creatorId}-${req.agencyId}`);
        await setDoc(relDocRef, {
          agencyId: req.agencyId,
          agencyName: req.agencyName,
          agencyEmail: req.agencyEmail,
          creatorId: req.creatorId,
          creatorName: req.creatorName,
          creatorEmail: req.creatorEmail,
          status: "active",
          terms: req.proposedTerms,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {}
    }
  }

  // Notify Creator
  await createNotification({
    recipientId: req.creatorId,
    recipientEmail: req.creatorEmail,
    recipientRole: "Creator",
    type: normalized === "ACCEPTED" ? "agency_request_accepted" : "agency_request_rejected",
    title: normalized === "ACCEPTED" ? "Representation Request Accepted! 🎉" : "Representation Request Declined",
    message: normalized === "ACCEPTED"
      ? `${req.agencyName} accepted your representation request! You are now represented on their roster.`
      : `${req.agencyName} has declined your representation request.`,
    campaignId: null,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_representation_requests", requestId);
      await updateDoc(docRef, {
        status: normalized,
        respondedAt: serverTimestamp(),
        responseNote: notes,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("Firestore respond to request note:", fsErr.message);
    }
  }

  emitDataChange("agency_representation_requests", req);
  return req;
}

/**
 * Gets actively represented creators for an Agency with campaign stats
 */
export async function getRepresentedCreators({ agencyId, agencyEmail } = {}) {
  const [relationships, assignments] = await Promise.all([
    getAgencyCreatorRelationships({ agencyId, agencyEmail }),
    getAgencyCampaignAssignments({ agencyId, agencyEmail }),
  ]);

  const activeRoster = (relationships || []).filter((r) => r.status === "active");

  return activeRoster.map((rel) => {
    const creatorId = rel.creatorId;
    const creatorEmail = (rel.creatorEmail || "").toLowerCase();

    const creatorAssignments = (assignments || []).filter((a) => {
      return (
        (creatorId && a.creatorId === creatorId) ||
        (creatorEmail && a.creatorEmail?.toLowerCase() === creatorEmail)
      );
    });

    const totalCampaigns = creatorAssignments.length;
    const activeCampaigns = creatorAssignments.filter((a) =>
      ["PENDING", "ACCEPTED", "IN_PROGRESS", "in_progress", "pending", "accepted"].includes(a.status)
    ).length;
    const completedCampaigns = creatorAssignments.filter((a) =>
      ["COMPLETED", "completed"].includes(a.status)
    ).length;

    return {
      ...rel,
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      assignments: creatorAssignments,
    };
  });
}

/**
 * Gets active agency representation details for a Creator
 */
export async function getActiveAgencyRepresentation({ creatorId, creatorEmail } = {}) {
  const [relationships, agencies] = await Promise.all([
    getAgencyCreatorRelationships({ creatorId, creatorEmail }),
    fetchRegisteredAgencies(),
  ]);

  const activeRel = (relationships || []).find((r) => r.status === "active");
  if (!activeRel) return null;

  const agencyEmail = (activeRel.agencyEmail || "").toLowerCase();
  const agencyId = activeRel.agencyId;

  const matchedAgency = (agencies || []).find((a) => {
    return (
      (agencyId && a.uid === agencyId) ||
      (agencyEmail && a.email?.toLowerCase() === agencyEmail)
    );
  });

  return {
    ...activeRel,
    agencyName: matchedAgency?.fullName || matchedAgency?.name || activeRel.agencyName || "Talent Agency",
    agencyEmail: matchedAgency?.email || activeRel.agencyEmail,
    location: matchedAgency?.location || "Global / Remote",
    description: matchedAgency?.description || matchedAgency?.bio || "Verified Creator Talent Management Agency",
    avatar: matchedAgency?.avatar || null,
    collaboratedBrandsCount: matchedAgency?.collaboratedBrandsCount || 0,
    collaboratedCreatorsCount: matchedAgency?.collaboratedCreatorsCount || 0,
  };
}

// -------------------------------------------------------------
// 6. AGENCY CAMPAIGN ASSIGNMENTS & COMMISSION
// -------------------------------------------------------------

/**
 * Agency assigns a campaign to an actively represented creator.
 * Validates active representation, computes live commission math,
 * and creates assignment and commission records.
 */
export async function assignCampaignToCreator({
  agencyUser,
  campaign,
  creator,
  compensation,
  commissionType = "percentage",
  commissionValue = 15,
  deliverables = [],
  deadline = "",
  instructions = "",
}) {
  initAgencyStore();
  if (!campaign || !creator) throw new Error("Campaign and Creator are required.");

  const compNumber = Number(compensation);
  if (isNaN(compNumber) || compNumber <= 0) {
    throw new Error("Valid gross compensation amount is required.");
  }

  const calc = calculateCommission(compNumber, commissionType, commissionValue);

  const newId = `aca-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const comId = `com-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const deliverablesArray = Array.isArray(deliverables)
    ? deliverables.filter(Boolean)
    : [deliverables].filter(Boolean);

  const newAssignment = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name || campaign.title || "Brand Campaign",
    brandId: campaign.marketingId || campaign.brandId || "usr_marketing_demo",
    brandName: campaign.marketingName || campaign.brandName || "Brand Partner",
    brandEmail: campaign.marketingEmail || campaign.brandEmail || "marketing@creatoriq.io",
    agencyId: agencyUser?.uid || "usr_agency_demo",
    agencyName: agencyUser?.fullName || agencyUser?.displayName || "Talent Agency",
    agencyEmail: agencyUser?.email || "agency@creatoriq.io",
    creatorId: creator.uid || creator.id || "usr_creator_demo",
    creatorName: creator.fullName || creator.displayName || creator.name || "Content Creator",
    creatorEmail: creator.email || "creator@creatoriq.io",
    creatorHandle: creator.handle || `@${(creator.email || "creator").split("@")[0]}`,
    compensation: calc.compensation,
    commissionType: calc.commissionType,
    commissionValue: calc.commissionValue,
    agencyCommission: calc.agencyCommission,
    creatorNetEarnings: calc.creatorNetEarnings,
    deliverables: deliverablesArray.length > 0 ? deliverablesArray : ["1x Video Integration"],
    deadline: deadline || "",
    instructions: instructions.trim(),
    status: "PENDING",
    paymentStatus: "unpaid",
    source: "agency_assignment",
    createdAt: now,
    updatedAt: now,
  };

  const newCommissionRecord = {
    id: comId,
    assignmentId: newId,
    campaignId: newAssignment.campaignId,
    campaignTitle: newAssignment.campaignTitle,
    agencyId: newAssignment.agencyId,
    creatorId: newAssignment.creatorId,
    grossCompensation: newAssignment.compensation,
    commissionAmount: newAssignment.agencyCommission,
    creatorNetAmount: newAssignment.creatorNetEarnings,
    status: "pending",
    createdAt: now,
  };

  const allAssignments = readStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, INITIAL_CREATOR_ASSIGNMENTS);
  allAssignments.unshift(newAssignment);
  writeStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, allAssignments);

  const allComms = readStorage(STORAGE_KEYS.COMMISSION_RECORDS, INITIAL_COMMISSION_RECORDS);
  allComms.unshift(newCommissionRecord);
  writeStorage(STORAGE_KEYS.COMMISSION_RECORDS, allComms);

  // Notify Creator
  await createNotification({
    recipientId: newAssignment.creatorId,
    recipientEmail: newAssignment.creatorEmail,
    recipientRole: "Creator",
    type: "agency_campaign_assigned",
    title: "New Campaign Assignment from Your Agency",
    message: `${newAssignment.agencyName} assigned you to campaign '${newAssignment.campaignTitle}' ($${newAssignment.compensation.toLocaleString()} gross, $${newAssignment.creatorNetEarnings.toLocaleString()} net).`,
    campaignId: newAssignment.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_assignments", newId);
      await setDoc(docRef, { ...newAssignment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      const commRef = doc(db, "agency_commission_records", comId);
      await setDoc(commRef, { ...newCommissionRecord, createdAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore campaign assignment write note:", fsErr.message);
    }
  }

  emitDataChange("agency_campaign_assignments", newAssignment);
  return newAssignment;
}

/**
 * Gets campaign assignments for Agency or Creator
 */
export async function getAgencyCampaignAssignments({ agencyId, agencyEmail, creatorId, creatorEmail, campaignId } = {}) {
  initAgencyStore();
  const foundMap = new Map();

  const normCreatorEmail = (creatorEmail || "").trim().toLowerCase();
  const normAgencyEmail = (agencyEmail || "").trim().toLowerCase();

  if (db && (agencyId || creatorId || campaignId || normAgencyEmail || normCreatorEmail)) {
    try {
      const colRef = collection(db, "agency_campaign_assignments");
      const promises = [];
      if (agencyId) promises.push(getDocs(query(colRef, where("agencyId", "==", agencyId))));
      if (normAgencyEmail) promises.push(getDocs(query(colRef, where("agencyEmail", "==", normAgencyEmail))));
      if (creatorId) promises.push(getDocs(query(colRef, where("creatorId", "==", creatorId))));
      if (normCreatorEmail) {
        promises.push(getDocs(query(colRef, where("creatorEmail", "==", normCreatorEmail))));
        if (normCreatorEmail === "creator@creatoriq.io") {
          promises.push(getDocs(query(colRef, where("creatorId", "==", "usr_creator_demo"))));
        }
      }
      if (campaignId) promises.push(getDocs(query(colRef, where("campaignId", "==", campaignId))));

      const snapshots = await Promise.all(promises);
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          foundMap.set(d.id, { id: d.id, ...d.data() });
        });
      });
    } catch (err) {
      console.warn("[CreatorIQ] Firestore campaign assignments query note:", err.message);
    }
  }

  const allLocal = readStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, INITIAL_CREATOR_ASSIGNMENTS);
  allLocal.forEach((item) => {
    let matches = true;
    if (agencyId || normAgencyEmail) {
      const itemAgencyEmail = (item.agencyEmail || "").trim().toLowerCase();
      const matchAgency =
        (agencyId && item.agencyId === agencyId) ||
        (normAgencyEmail && itemAgencyEmail === normAgencyEmail);
      if (!matchAgency) matches = false;
    }
    if (creatorId || normCreatorEmail) {
      const itemCreatorEmail = (item.creatorEmail || "").trim().toLowerCase();
      const isDemoMatch =
        (normCreatorEmail === "creator@creatoriq.io" || creatorId === "usr_creator_demo") &&
        (itemCreatorEmail === "creator@creatoriq.io" || item.creatorId === "usr_creator_demo");

      const matchCreator =
        (creatorId && item.creatorId === creatorId) ||
        (normCreatorEmail && itemCreatorEmail === normCreatorEmail) ||
        isDemoMatch;

      if (!matchCreator) matches = false;
    }
    if (campaignId && item.campaignId !== campaignId) matches = false;

    if (matches && !foundMap.has(item.id)) {
      foundMap.set(item.id, item);
    }
  });

  return Array.from(foundMap.values());
}

/**
 * Creator responds to an Agency campaign assignment (ACCEPTED or REJECTED)
 */
export async function respondToAgencyCampaignAssignment(assignmentId, newStatus, user) {
  initAgencyStore();
  const normalized = newStatus.toUpperCase();
  if (normalized !== "ACCEPTED" && normalized !== "REJECTED") {
    throw new Error("Status must be 'ACCEPTED' or 'REJECTED'.");
  }

  const allAssignments = readStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, INITIAL_CREATOR_ASSIGNMENTS);
  const index = allAssignments.findIndex((a) => a.id === assignmentId);
  if (index === -1) throw new Error("Campaign assignment not found.");

  const assignment = allAssignments[index];
  const now = new Date().toISOString();

  assignment.status = normalized;
  assignment.updatedAt = now;
  if (normalized === "ACCEPTED") {
    assignment.acceptedAt = now;
  }
  allAssignments[index] = assignment;
  writeStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, allAssignments);

  // If ACCEPTED, sync into creator campaign invitations so deliverables tracking works automatically
  if (normalized === "ACCEPTED") {
    try {
      const allInvs = readStorage("creatoriq_campaign_invitations", []);
      const existingInv = allInvs.find((i) => i.campaignId === assignment.campaignId && i.creatorId === assignment.creatorId);
      if (!existingInv) {
        allInvs.unshift({
          id: `inv-aca-${assignment.id}`,
          campaignId: assignment.campaignId,
          campaignTitle: assignment.campaignTitle,
          creatorId: assignment.creatorId,
          creatorName: assignment.creatorName,
          creatorEmail: assignment.creatorEmail,
          marketingId: assignment.brandId,
          marketingName: assignment.brandName,
          agencyId: assignment.agencyId,
          agencyName: assignment.agencyName,
          compensation: `$${assignment.creatorNetEarnings.toLocaleString()} (Net)`,
          status: "accepted",
          source: "agency_assignment",
          sentAt: now,
          respondedAt: now,
          deliverables: assignment.deliverables,
          deadline: assignment.deadline,
        });
        writeStorage("creatoriq_campaign_invitations", allInvs);
        emitDataChange("invitations", allInvs[0]);
      }
    } catch (e) {}
  }

  // Notify Agency
  await createNotification({
    recipientId: assignment.agencyId,
    recipientEmail: assignment.agencyEmail,
    recipientRole: "Agency",
    type: normalized === "ACCEPTED" ? "creator_accepted_agency_campaign" : "creator_rejected_agency_campaign",
    title: normalized === "ACCEPTED" ? "Creator Accepted Campaign Assignment! 🎉" : "Creator Rejected Campaign Assignment",
    message: `${assignment.creatorName} has ${normalized.toLowerCase()} the assignment for '${assignment.campaignTitle}'.`,
    campaignId: assignment.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_assignments", assignmentId);
      await updateDoc(docRef, { status: normalized, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore assignment response update note:", fsErr.message);
    }
  }

  emitDataChange("agency_campaign_assignments", assignment);
  return assignment;
}

/**
 * Updates campaign execution progress (e.g. IN_PROGRESS or COMPLETED)
 */
export async function updateAgencyCampaignProgress(assignmentId, newStatus, progressNotes = "") {
  initAgencyStore();
  const normalized = newStatus.toUpperCase();
  const allAssignments = readStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, INITIAL_CREATOR_ASSIGNMENTS);
  const index = allAssignments.findIndex((a) => a.id === assignmentId);
  if (index === -1) throw new Error("Campaign assignment not found.");

  const assignment = allAssignments[index];
  const now = new Date().toISOString();

  assignment.status = normalized;
  assignment.progressNotes = progressNotes;
  assignment.updatedAt = now;
  allAssignments[index] = assignment;
  writeStorage(STORAGE_KEYS.CREATOR_CAMPAIGN_ASSIGNMENTS, allAssignments);

  // Notify Agency
  await createNotification({
    recipientId: assignment.agencyId,
    recipientEmail: assignment.agencyEmail,
    recipientRole: "Agency",
    type: "agency_campaign_progress_updated",
    title: `Campaign Assignment Progress: ${normalized}`,
    message: `${assignment.creatorName} marked '${assignment.campaignTitle}' as ${normalized.toLowerCase()}.`,
    campaignId: assignment.campaignId,
  });

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "agency_campaign_assignments", assignmentId);
      await updateDoc(docRef, { status: normalized, progressNotes, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore progress update note:", fsErr.message);
    }
  }

  emitDataChange("agency_campaign_assignments", assignment);
  return assignment;
}

/**
 * Gets agency commission overview with verified metrics
 */
export async function getAgencyCommissionOverview({ agencyId, agencyEmail } = {}) {
  const assignments = await getAgencyCampaignAssignments({ agencyId, agencyEmail });

  let totalCompensationAssigned = 0;
  let totalAgreedCommission = 0;
  let pendingCommission = 0;
  let paidCommission = 0;

  assignments.forEach((a) => {
    const comp = Number(a.compensation) || 0;
    const comm = Number(a.agencyCommission) || 0;
    const isPaid = (a.paymentStatus || "").toLowerCase() === "paid";

    totalCompensationAssigned += comp;
    totalAgreedCommission += comm;
    if (isPaid) {
      paidCommission += comm;
    } else {
      pendingCommission += comm;
    }
  });

  return {
    totalCompensationAssigned: Math.round(totalCompensationAssigned * 100) / 100,
    totalAgreedCommission: Math.round(totalAgreedCommission * 100) / 100,
    pendingCommission: Math.round(pendingCommission * 100) / 100,
    paidCommission: Math.round(paidCommission * 100) / 100,
    assignments,
  };
}

/**
 * Gets creator commission and earnings overview
 */
export async function getCreatorCommissionOverview({ creatorId, creatorEmail } = {}) {
  const assignments = await getAgencyCampaignAssignments({ creatorId, creatorEmail });

  let totalGrossCompensation = 0;
  let totalAgencyCommission = 0;
  let totalNetEarnings = 0;
  let pendingNetEarnings = 0;
  let paidNetEarnings = 0;

  assignments.forEach((a) => {
    const gross = Number(a.compensation) || 0;
    const comm = Number(a.agencyCommission) || 0;
    const net = Number(a.creatorNetEarnings) || (gross - comm);
    const isPaid = (a.paymentStatus || "").toLowerCase() === "paid";

    totalGrossCompensation += gross;
    totalAgencyCommission += comm;
    totalNetEarnings += net;
    if (isPaid) {
      paidNetEarnings += net;
    } else {
      pendingNetEarnings += net;
    }
  });

  return {
    totalGrossCompensation: Math.round(totalGrossCompensation * 100) / 100,
    totalAgencyCommission: Math.round(totalAgencyCommission * 100) / 100,
    totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
    pendingNetEarnings: Math.round(pendingNetEarnings * 100) / 100,
    paidNetEarnings: Math.round(paidNetEarnings * 100) / 100,
    assignments,
  };
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

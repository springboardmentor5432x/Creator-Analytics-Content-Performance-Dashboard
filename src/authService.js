import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "./firebase";
import { Sparkles, Building2, TrendingUp, ShieldCheck } from "lucide-react";

export const ROLE_CONFIGS = [
  {
    id: "Creator",
    title: "Content Creator",
    shortTitle: "Creator",
    badge: "Creator Portal",
    icon: Sparkles,
    tagline: "Channel & Audience Intelligence",
    desc: "Track channel growth, audience metrics, and brand deals.",
    demoEmail: "creator@creatoriq.io",
    demoPassword: "Password123!",
    accentColor: "#2563eb",
    accentLight: "#eff6ff",
    badgeColor: "#1d4ed8",
    badgeBg: "#dbeafe",
  },
  {
    id: "Agency",
    title: "Talent Agency",
    shortTitle: "Agency",
    badge: "Agency Suite",
    icon: Building2,
    tagline: "Roster & Portfolio Management",
    desc: "Manage creator rosters, rate cards, and campaign ROI.",
    demoEmail: "agency@creatoriq.io",
    demoPassword: "Password123!",
    accentColor: "#0d9488",
    accentLight: "#f0fdfa",
    badgeColor: "#0f766e",
    badgeBg: "#ccfbf1",
  },
  {
    id: "Marketing Team",
    title: "Marketing Team",
    shortTitle: "Marketing",
    badge: "Attribution Suite",
    icon: TrendingUp,
    tagline: "Influencer Discovery & ROI",
    desc: "Discover influencers, track creator attribution & spend.",
    demoEmail: "marketing@creatoriq.io",
    demoPassword: "Password123!",
    accentColor: "#0284c7",
    accentLight: "#f0f9ff",
    badgeColor: "#0369a1",
    badgeBg: "#e0f2fe",
  },
  {
    id: "Admin",
    title: "Platform Admin",
    shortTitle: "Admin",
    badge: "System Security",
    icon: ShieldCheck,
    tagline: "System Oversight & Security",
    desc: "Manage permissions, user security, and global platform analytics.",
    demoEmail: "admin@creatoriq.io",
    demoPassword: "Password123!",
    accentColor: "#6366f1",
    accentLight: "#eef2ff",
    badgeColor: "#4f46e5",
    badgeBg: "#e0e7ff",
  },
];

export const DEFAULT_DEMO_ACCOUNTS = {
  "creator@creatoriq.io": {
    uid: "usr_creator_demo",
    email: "creator@creatoriq.io",
    fullName: "Alex Rivers (Content Creator)",
    role: "Creator",
    provider: "email",
    status: "active",
    createdAt: "2026-01-10T08:00:00.000Z",
    metrics: {
      totalReach: "1.4M",
      engagementRate: "6.42%",
      contentScore: 96,
      activeCampaigns: 4,
    },
  },
  "agency@creatoriq.io": {
    uid: "usr_agency_demo",
    email: "agency@creatoriq.io",
    fullName: "Vanguard Talent Agency",
    role: "Agency",
    provider: "email",
    status: "active",
    createdAt: "2026-01-10T08:00:00.000Z",
    metrics: {
      totalReach: "18.4M",
      engagementRate: "7.8%",
      contentScore: 94,
      activeCampaigns: 24,
    },
  },
  "marketing@creatoriq.io": {
    uid: "usr_marketing_demo",
    email: "marketing@creatoriq.io",
    fullName: "Global Brand Marketing",
    role: "Marketing Team",
    provider: "email",
    status: "active",
    createdAt: "2026-01-10T08:00:00.000Z",
    metrics: {
      totalReach: "6.8M",
      engagementRate: "5.4%",
      contentScore: 92,
      activeCampaigns: 12,
    },
  },
  "admin@creatoriq.io": {
    uid: "usr_admin_demo",
    email: "admin@creatoriq.io",
    fullName: "Platform Administrator",
    role: "Admin",
    provider: "email",
    status: "active",
    createdAt: "2026-01-10T08:00:00.000Z",
    metrics: {
      totalReach: "Platform-wide",
      engagementRate: "99.99%",
      contentScore: 99,
      activeCampaigns: 54,
    },
  },
};

const LOCAL_STORAGE_KEY = "creatoriq_registered_users";

export function initLocalRegistry() {
  try {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ACCOUNTS));
    } else {
      // Ensure default accounts are present
      const parsed = JSON.parse(existing);
      let updated = false;
      for (const [key, val] of Object.entries(DEFAULT_DEMO_ACCOUNTS)) {
        if (!parsed[key]) {
          parsed[key] = val;
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.warn("Local storage registry initialization note:", err);
  }
}

export function getLocalRegisteredUsers() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Error reading local registry:", err);
  }
  return { ...DEFAULT_DEMO_ACCOUNTS };
}

export function saveUserToLocalRegistry(email, userRecord) {
  try {
    const current = getLocalRegisteredUsers();
    const normalized = email.trim().toLowerCase();
    current[normalized] = {
      ...userRecord,
      email: normalized,
      lastLogin: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn("Error saving to local registry:", err);
  }
}

export function formatRoleTitle(roleId) {
  const found = ROLE_CONFIGS.find((r) => r.id === roleId);
  return found ? found.title : roleId || "Content Creator";
}

export function formatEmailToName(email) {
  if (!email || !email.includes("@")) return "";
  const prefix = email.split("@")[0];
  return prefix
    .split(/[._-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getRoleMetrics(role) {
  switch (role) {
    case "Admin":
      return {
        totalReach: "Platform-wide",
        engagementRate: "99.99%",
        contentScore: 99,
        activeCampaigns: 54,
      };
    case "Agency":
      return {
        totalReach: "18.4M",
        engagementRate: "7.8%",
        contentScore: 94,
        activeCampaigns: 24,
      };
    case "Marketing Team":
      return {
        totalReach: "6.8M",
        engagementRate: "5.4%",
        contentScore: 92,
        activeCampaigns: 12,
      };
    case "Creator":
    default:
      return {
        totalReach: "1.4M",
        engagementRate: "6.42%",
        contentScore: 96,
        activeCampaigns: 4,
      };
  }
}

/**
 * Saves a registered user into both Firestore and LocalStorage
 */
export async function registerUserProfile(userObj, assignedRole, isGoogle = false) {
  const normalizedEmail = (userObj.email || "").trim().toLowerCase();
  const resolvedRole = assignedRole || "Creator";
  const resolvedName =
    userObj.displayName ||
    userObj.fullName ||
    formatEmailToName(normalizedEmail) ||
    (resolvedRole === "Admin" ? "Administrator" : `${resolvedRole} User`);

  const profileData = {
    uid: userObj.uid,
    fullName: resolvedName,
    email: normalizedEmail,
    role: resolvedRole,
    provider: isGoogle ? "google" : "email",
    photoURL: userObj.photoURL || null,
    status: "active",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    metrics: getRoleMetrics(resolvedRole),
  };

  // 1. Save to Local Registry
  saveUserToLocalRegistry(normalizedEmail, profileData);

  // 2. Save to Firestore if available
  if (db && userObj.uid) {
    try {
      // Main user record by UID
      const userRef = doc(db, "users", userObj.uid);
      await setDoc(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      }, { merge: true });

      // Fast email-to-role lookup document
      if (normalizedEmail) {
        const safeEmailDocId = encodeURIComponent(normalizedEmail);
        const emailRef = doc(db, "email_registry", safeEmailDocId);
        await setDoc(emailRef, {
          uid: userObj.uid,
          email: normalizedEmail,
          role: resolvedRole,
          fullName: resolvedName,
          provider: isGoogle ? "google" : "email",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore user sync warning:", fsErr);
    }
  }

  return profileData;
}

/**
 * Multi-tier verification: Checks whether the email/user is registered
 * in Firestore, local registry, or demo accounts, and verifies role matching.
 *
 * @param {string} email - Email address to verify
 * @param {string|null} expectedRole - The role trying to log in (or null to only retrieve)
 * @param {string|null} uid - Firebase UID if authenticated
 * @returns {Promise<{success: boolean, reason?: string, registeredRole?: string, profile?: object, email: string}>}
 */
export async function verifyUserEmailAndRole(email, expectedRole = null, uid = null) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  let foundProfile = null;

  // Tier 1: Check Firestore by UID if user is already signed in (e.g. Google popup)
  if (db && uid) {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        foundProfile = snap.data();
      }
    } catch (err) {
      console.warn("Tier 1 UID check warning:", err);
    }
  }

  // Tier 2: Check Firestore email_registry by normalized email
  if (!foundProfile && db && normalizedEmail) {
    try {
      const safeEmailDocId = encodeURIComponent(normalizedEmail);
      const emailRef = doc(db, "email_registry", safeEmailDocId);
      const emailSnap = await getDoc(emailRef);
      if (emailSnap.exists()) {
        const emailData = emailSnap.data();
        foundProfile = {
          uid: emailData.uid || uid || `usr_${Date.now()}`,
          fullName: emailData.fullName,
          email: emailData.email || normalizedEmail,
          role: emailData.role,
          provider: emailData.provider || "email",
          status: "active",
        };
      }
    } catch (err) {
      console.warn("Tier 2 email check warning:", err);
    }
  }

  // Tier 2b: Fallback check on Firestore 'users' collection directly by email
  if (!foundProfile && db && normalizedEmail) {
    try {
      const usersCol = collection(db, "users");
      const q = query(usersCol, where("email", "==", normalizedEmail), limit(1));
      const userSnap = await getDocs(q);
      if (!userSnap.empty) {
        const uDoc = userSnap.docs[0];
        const uData = uDoc.data();
        foundProfile = {
          ...uData,
          uid: uDoc.id,
          role: uData.role,
          fullName: uData.fullName || uData.displayName || formatEmailToName(normalizedEmail),
          email: uData.email || normalizedEmail,
          provider: uData.provider || "google",
          status: uData.status || "active",
        };

        // Self-heal: backfill email_registry so future lookups are immediate
        try {
          const safeEmailDocId = encodeURIComponent(normalizedEmail);
          await setDoc(doc(db, "email_registry", safeEmailDocId), {
            uid: uDoc.id,
            email: normalizedEmail,
            role: foundProfile.role,
            fullName: foundProfile.fullName,
            provider: foundProfile.provider,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (healErr) {
          // ignore heal error
        }
      }
    } catch (err) {
      console.warn("Tier 2b users query warning:", err);
    }
  }

  // Tier 3: Check LocalStorage Registry
  if (!foundProfile && normalizedEmail) {
    const localUsers = getLocalRegisteredUsers();
    if (localUsers[normalizedEmail]) {
      foundProfile = localUsers[normalizedEmail];
    }
  }

  // Tier 4: Check Pre-configured Demo Accounts
  if (!foundProfile && normalizedEmail && DEFAULT_DEMO_ACCOUNTS[normalizedEmail]) {
    foundProfile = DEFAULT_DEMO_ACCOUNTS[normalizedEmail];
  }

  // Result Evaluation
  if (!foundProfile) {
    return {
      success: false,
      reason: "NOT_FOUND",
      email: normalizedEmail,
    };
  }

  const registeredRole = foundProfile.role;

  // If no expected role was specified (e.g. session recovery), return profile
  if (!expectedRole) {
    return {
      success: true,
      profile: foundProfile,
      registeredRole: registeredRole,
      email: normalizedEmail,
    };
  }

  // Check role match
  if (registeredRole !== expectedRole) {
    return {
      success: false,
      reason: "ROLE_MISMATCH",
      registeredRole: registeredRole,
      registeredRoleTitle: formatRoleTitle(registeredRole),
      expectedRole: expectedRole,
      expectedRoleTitle: formatRoleTitle(expectedRole),
      profile: foundProfile,
      email: normalizedEmail,
    };
  }

  return {
    success: true,
    profile: foundProfile,
    registeredRole: registeredRole,
    email: normalizedEmail,
  };
}

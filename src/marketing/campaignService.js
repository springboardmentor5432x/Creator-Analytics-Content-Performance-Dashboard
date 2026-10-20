import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getLocalRegisteredUsers } from "../authService";

// Local storage cache keys
const STORAGE_KEYS = {
  CAMPAIGNS: "creatoriq_campaigns_data",
  INVITATIONS: "creatoriq_campaign_invitations",
  DELIVERABLES: "creatoriq_campaign_deliverables",
  NOTIFICATIONS: "creatoriq_campaign_notifications",
  TIMELINES: "creatoriq_campaign_timelines",
};

// Event bus for instantaneous reactive UI updates across components
const EVENT_BUS = new EventTarget();
export const NOTIFY_UPDATE_EVENT = "creatoriq_data_change";

export function emitDataChange(entityType, payload) {
  try {
    const event = new CustomEvent(NOTIFY_UPDATE_EVENT, {
      detail: { entityType, payload, timestamp: Date.now() },
    });
    EVENT_BUS.dispatchEvent(event);
    window.dispatchEvent(
      new CustomEvent(NOTIFY_UPDATE_EVENT, {
        detail: { entityType, payload, timestamp: Date.now() },
      })
    );
  } catch (e) {
    console.warn("Event bus dispatch note:", e);
  }
}

export function subscribeToDataChanges(callback) {
  const handler = (e) => callback(e.detail);
  EVENT_BUS.addEventListener(NOTIFY_UPDATE_EVENT, handler);
  window.addEventListener(NOTIFY_UPDATE_EVENT, handler);
  return () => {
    EVENT_BUS.removeEventListener(NOTIFY_UPDATE_EVENT, handler);
    window.removeEventListener(NOTIFY_UPDATE_EVENT, handler);
  };
}

// -------------------------------------------------------------
// Seed Creator Profiles Directory
// Combines real registered users + CreatorIQ roster members
// -------------------------------------------------------------
export const SEED_CREATORS = [
  {
    uid: "usr_creator_demo",
    fullName: "Alex Rivers (Content Creator)",
    email: "creator@creatoriq.io",
    handle: "@alexrivers_tech",
    niche: "Tech & Software Engineering",
    category: "Technology",
    platforms: ["YouTube", "TikTok", "Instagram", "Twitch"],
    primaryPlatform: "YouTube",
    followers: 1428500,
    formattedFollowers: "1.4M",
    engagementRate: "6.42%",
    location: "San Francisco, CA, USA",
    verified: true,
    rating: 4.9,
    completedDeals: 18,
    rateEstimate: "$2,500 - $6,000",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "Full-stack developer & educator sharing architecture lessons, coding tutorials, and dev workstation gear.",
  },
  {
    uid: "usr_creator_jordan",
    fullName: "Jordan Blake",
    email: "jordan@creatoriq.io",
    handle: "@jordanblake_dev",
    niche: "Tech & Productivity",
    category: "Productivity",
    platforms: ["YouTube", "X / Twitter", "LinkedIn"],
    primaryPlatform: "YouTube",
    followers: 840000,
    formattedFollowers: "840K",
    engagementRate: "7.1%",
    location: "New York, NY, USA",
    verified: true,
    rating: 4.8,
    completedDeals: 14,
    rateEstimate: "$1,800 - $4,200",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Deep dives into engineering workflows, developer setups, and high-performance coding tools.",
  },
  {
    uid: "usr_creator_elena",
    fullName: "Elena Rostova",
    email: "elena@creatoriq.io",
    handle: "@elena_lifestyle",
    niche: "Lifestyle, Design & Creative Tech",
    category: "Lifestyle",
    platforms: ["Instagram", "YouTube", "TikTok"],
    primaryPlatform: "Instagram",
    followers: 2800000,
    formattedFollowers: "2.8M",
    engagementRate: "5.8%",
    location: "Miami, FL, USA",
    verified: true,
    rating: 4.95,
    completedDeals: 32,
    rateEstimate: "$4,000 - $10,000",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bio: "Visual storytelling, creative workspace design, and lifestyle vlogs for modern digital creators.",
  },
  {
    uid: "usr_creator_marcus",
    fullName: "Marcus & Leo",
    email: "marcusleo@creatoriq.io",
    handle: "@marcus_leo_gaming",
    niche: "Gaming & Interactive Entertainment",
    category: "Gaming",
    platforms: ["Twitch", "TikTok", "YouTube"],
    primaryPlatform: "Twitch",
    followers: 3100000,
    formattedFollowers: "3.1M",
    engagementRate: "8.4%",
    location: "Austin, TX, USA",
    verified: true,
    rating: 4.75,
    completedDeals: 26,
    rateEstimate: "$3,500 - $8,500",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "High-energy gaming livestreams, esports tournament commentary, and creator hardware reviews.",
  },
  {
    uid: "usr_creator_sarah",
    fullName: "Sarah Chen",
    email: "sarah@creatoriq.io",
    handle: "@sarahchen_saas",
    niche: "B2B SaaS, AI & Product Strategy",
    category: "Business",
    platforms: ["LinkedIn", "YouTube", "X / Twitter"],
    primaryPlatform: "LinkedIn",
    followers: 450000,
    formattedFollowers: "450K",
    engagementRate: "9.2%",
    location: "Seattle, WA, USA",
    verified: true,
    rating: 5.0,
    completedDeals: 21,
    rateEstimate: "$2,200 - $5,000",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    bio: "Product leader and tech advisor reviewing B2B SaaS software, AI dev tooling, and team workflows.",
  },
  {
    uid: "usr_creator_david",
    fullName: "David Miller",
    email: "david@creatoriq.io",
    handle: "@davidmiller_fitness",
    niche: "Fitness, Wellness & Wearable Tech",
    category: "Health & Fitness",
    platforms: ["Instagram", "TikTok", "YouTube"],
    primaryPlatform: "Instagram",
    followers: 920000,
    formattedFollowers: "920K",
    engagementRate: "6.9%",
    location: "Los Angeles, CA, USA",
    verified: true,
    rating: 4.85,
    completedDeals: 16,
    rateEstimate: "$1,800 - $4,500",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    bio: "Strength training coach & biohacking enthusiast evaluating wearable fitness gadgets and nutrition.",
  },
];

// Helper to retrieve all discoverable creators
export function getAllCreatorProfiles() {
  const profileMap = new Map();

  // 1. Seed creators
  SEED_CREATORS.forEach((c) => profileMap.set(c.email.toLowerCase(), c));

  // 2. Local registered creators
  try {
    const localUsers = getLocalRegisteredUsers();
    Object.values(localUsers).forEach((u) => {
      if (u.role === "Creator" && u.email) {
        const email = u.email.toLowerCase();
        if (profileMap.has(email)) {
          // Merge with custom registered name
          profileMap.set(email, {
            ...profileMap.get(email),
            fullName: u.fullName || profileMap.get(email).fullName,
            uid: u.uid || profileMap.get(email).uid,
          });
        } else {
          profileMap.set(email, {
            uid: u.uid || `usr_${Date.now()}`,
            fullName: u.fullName || u.email.split("@")[0],
            email: u.email,
            handle: `@${u.email.split("@")[0]}`,
            niche: "Digital Media & Tech",
            category: "General",
            platforms: ["YouTube", "Instagram"],
            primaryPlatform: "YouTube",
            followers: 125000,
            formattedFollowers: "125K",
            engagementRate: "5.4%",
            location: "United States",
            verified: false,
            rating: 4.8,
            completedDeals: 1,
            rateEstimate: "$800 - $2,000",
            avatar: null,
            bio: "Content creator in CreatorIQ network.",
          });
        }
      }
    });
  } catch (err) {
    console.warn("Creator profiles merge note:", err);
  }

  return Array.from(profileMap.values());
}

// -------------------------------------------------------------
// Initial Seed Data for Campaigns, Invitations & Deliverables
// EXPORTED so MarketingSection can identify demo-only seeds.
// -------------------------------------------------------------
export const INITIAL_CAMPAIGNS = [
  {
    id: "cmp-2026-001",
    name: "CreatorIQ 2026 Spring Launch Campaign",
    description: "Multi-channel influencer launch driving awareness and adoption for CreatorIQ's next-gen analytics suite.",
    objective: "Awareness",
    budget: 45000,
    currency: "USD",
    startDate: "2026-03-01",
    endDate: "2026-05-30",
    targetNiche: "Tech & Software Engineering",
    targetPlatforms: ["YouTube", "TikTok", "Instagram"],
    requirements: "Mention real-time telemetry, display dashboard walkthrough, include unique UTM referral link in description and bio.",
    deliverableRequirements: "1x 60s Dedicated YouTube integration, 1x TikTok vertical short, 1x Instagram carousel.",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    status: "active", // 'draft' | 'active' | 'completed' | 'cancelled'
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    marketingEmail: "marketing@creatoriq.io",
    spend: 28500,
    attributedRevenue: 138000,
    views: 894000,
    reach: 642000,
    clicks: 34200,
    conversions: 2450,
    engagementRate: "6.8%",
    createdAt: "2026-02-15T10:00:00.000Z",
    updatedAt: "2026-03-10T14:30:00.000Z",
  },
  {
    id: "cmp-2026-002",
    name: "Developer Productivity & SaaS Workflow Summit",
    description: "Targeting engineering leads and tech enthusiasts with hands-on tool reviews and workflow demos.",
    objective: "Engagement",
    budget: 25000,
    currency: "USD",
    startDate: "2026-04-10",
    endDate: "2026-06-15",
    targetNiche: "Productivity & B2B SaaS",
    targetPlatforms: ["YouTube", "LinkedIn", "X / Twitter"],
    requirements: "Focus on developer ergonomics, automated pipelines, and team collaboration. High-quality production required.",
    deliverableRequirements: "1x Dedicated deep-dive video (12+ min) + 2x LinkedIn thought leadership posts.",
    imageUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80",
    status: "active",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    marketingEmail: "marketing@creatoriq.io",
    spend: 12000,
    attributedRevenue: 54000,
    views: 312000,
    reach: 220000,
    clicks: 16800,
    conversions: 980,
    engagementRate: "7.4%",
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-14T11:00:00.000Z",
  },
  {
    id: "cmp-2026-003",
    name: "AI Tooling & Coding Assistants Q2 Sprint",
    description: "Highlighting intelligent dev assistants, code completion, and pair-programming speedups.",
    objective: "Traffic",
    budget: 35000,
    currency: "USD",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    targetNiche: "Artificial Intelligence & Dev",
    targetPlatforms: ["YouTube", "Twitch", "TikTok"],
    requirements: "Demonstrate live coding scenarios, showcasing realistic productivity gains and code safety checks.",
    deliverableRequirements: "1x Livestream dedicated demo (30 min) + 1x Short viral highlight reel.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    status: "draft",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    marketingEmail: "marketing@creatoriq.io",
    spend: 0,
    attributedRevenue: 0,
    views: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
    engagementRate: "0%",
    createdAt: "2026-03-12T16:00:00.000Z",
    updatedAt: "2026-03-12T16:00:00.000Z",
  },
  {
    id: "cmp-2026-004",
    name: "Q1 Global Creator Attribution Benchmark",
    description: "Retrospective enterprise attribution campaign across top engineering and design creators.",
    objective: "Sales",
    budget: 50000,
    currency: "USD",
    startDate: "2026-01-05",
    endDate: "2026-03-05",
    targetNiche: "Tech & Software Engineering",
    targetPlatforms: ["YouTube", "LinkedIn"],
    requirements: "Enterprise conversion tracking via coupon code 'CREATORIQ2026' and attribution webhooks.",
    deliverableRequirements: "2x Dedicated integrations per creator + full performance recap.",
    imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80",
    status: "completed",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    marketingEmail: "marketing@creatoriq.io",
    spend: 48000,
    attributedRevenue: 274000,
    views: 1420000,
    reach: 980000,
    clicks: 72400,
    conversions: 5600,
    engagementRate: "8.1%",
    createdAt: "2026-01-02T08:00:00.000Z",
    updatedAt: "2026-03-06T12:00:00.000Z",
  },
];

const INITIAL_INVITATIONS = [
  {
    id: "inv-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    compensation: "$6,500",
    status: "accepted", // 'pending' | 'accepted' | 'declined'
    sentAt: "2026-02-18T10:30:00.000Z",
    respondedAt: "2026-02-19T14:15:00.000Z",
    message: "We'd love to partner with you for our flagship Spring 2026 launch video!",
  },
  {
    id: "inv-002",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_jordan",
    creatorName: "Jordan Blake",
    creatorEmail: "jordan@creatoriq.io",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    compensation: "$4,200",
    status: "accepted",
    sentAt: "2026-02-18T11:00:00.000Z",
    respondedAt: "2026-02-20T09:30:00.000Z",
    message: "Partner with us for a productivity integration focusing on creator analytics.",
  },
  {
    id: "inv-003",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    compensation: "$5,000",
    status: "pending", // Pending so creator can test Accept/Decline!
    sentAt: "2026-03-12T15:00:00.000Z",
    respondedAt: null,
    message: "Exclusive invite to lead the productivity & dev setup track for our SaaS summit.",
  },
  {
    id: "inv-004",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    creatorId: "usr_creator_sarah",
    creatorName: "Sarah Chen",
    creatorEmail: "sarah@creatoriq.io",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    compensation: "$3,800",
    status: "accepted",
    sentAt: "2026-03-02T11:00:00.000Z",
    respondedAt: "2026-03-03T16:20:00.000Z",
    message: "We love your B2B SaaS architecture breakdowns and would be honored to have you.",
  },
  {
    id: "inv-005",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_marcus",
    creatorName: "Marcus & Leo",
    creatorEmail: "marcusleo@creatoriq.io",
    marketingId: "usr_marketing_demo",
    marketingName: "Global Brand Marketing",
    compensation: "$5,500",
    status: "declined",
    sentAt: "2026-02-18T12:00:00.000Z",
    respondedAt: "2026-02-21T18:00:00.000Z",
    message: "Stream integration for our new launch campaign.",
  },
];

const INITIAL_DELIVERABLES = [
  {
    id: "del-001",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    contentType: "YouTube Video",
    title: "60-Second Mid-Roll Dedicated Integration & Setup Demo",
    requirements: "Feature CreatorIQ's real-time growth analytics screen. Highlight multi-platform sync. Provide UTM link.",
    dueDate: "2026-04-15",
    status: "submitted", // 'pending' | 'submitted' | 'revision_requested' | 'resubmitted' | 'approved'
    submissionUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    submissionNotes: "Mid-roll integration rendered at 04:32 mark with high-contrast screen capture and voiceover.",
    revisionFeedback: null,
    submittedAt: "2026-03-11T16:45:00.000Z",
    reviewedAt: null,
    createdAt: "2026-02-20T10:00:00.000Z",
  },
  {
    id: "del-002",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_demo",
    creatorName: "Alex Rivers (Content Creator)",
    creatorEmail: "creator@creatoriq.io",
    contentType: "TikTok Short",
    title: "Viral Behind-the-Scenes Micro-Tutorial on Creator Metrics",
    requirements: "Short-form vertical video (9:16), 45-60 seconds, hook in first 3 seconds, display UI demo.",
    dueDate: "2026-04-20",
    status: "approved",
    submissionUrl: "https://www.tiktok.com/@alexrivers_tech/video/73210984712",
    submissionNotes: "Finished vertical export with dynamic captions and animated highlight zoom.",
    revisionFeedback: null,
    submittedAt: "2026-03-08T12:00:00.000Z",
    reviewedAt: "2026-03-09T15:30:00.000Z",
    createdAt: "2026-02-20T10:00:00.000Z",
  },
  {
    id: "del-003",
    campaignId: "cmp-2026-001",
    campaignTitle: "CreatorIQ 2026 Spring Launch Campaign",
    creatorId: "usr_creator_jordan",
    creatorName: "Jordan Blake",
    creatorEmail: "jordan@creatoriq.io",
    contentType: "YouTube Video",
    title: "Ergonomic Developer Workstation & Tool Suite Showcase",
    requirements: "Dedicated walkthrough showing CreatorIQ attribution metrics on secondary monitor.",
    dueDate: "2026-04-25",
    status: "pending",
    submissionUrl: "",
    submissionNotes: "",
    revisionFeedback: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-02-21T11:00:00.000Z",
  },
  {
    id: "del-004",
    campaignId: "cmp-2026-002",
    campaignTitle: "Developer Productivity & SaaS Workflow Summit",
    creatorId: "usr_creator_sarah",
    creatorName: "Sarah Chen",
    creatorEmail: "sarah@creatoriq.io",
    contentType: "LinkedIn Article & Carousel",
    title: "10 Metrics Every Enterprise Engineering Leader Must Track",
    requirements: "8-slide carousel with high-resolution CreatorIQ graphics and case study breakdown.",
    dueDate: "2026-05-05",
    status: "revision_requested",
    submissionUrl: "https://linkedin.com/posts/sarahchen_saas_metrics_preview_v1",
    submissionNotes: "First draft carousel uploaded to Google Drive / LinkedIn preview link.",
    revisionFeedback: "Great flow! Please adjust Slide 4 to clarify the ROI attribution equation and use our brand blue (#0284c7).",
    submittedAt: "2026-03-10T14:00:00.000Z",
    reviewedAt: "2026-03-11T09:20:00.000Z",
    createdAt: "2026-03-04T12:00:00.000Z",
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-001",
    recipientId: "usr_creator_demo",
    recipientEmail: "creator@creatoriq.io",
    recipientRole: "Creator",
    type: "invitation_received",
    title: "New Campaign Invitation",
    message: "Global Brand Marketing invited you to participate in 'Developer Productivity & SaaS Workflow Summit' ($5,000 compensation).",
    campaignId: "cmp-2026-002",
    read: false,
    createdAt: "2026-03-12T15:00:00.000Z",
  },
  {
    id: "notif-002",
    recipientId: "usr_marketing_demo",
    recipientEmail: "marketing@creatoriq.io",
    recipientRole: "Marketing Team",
    type: "deliverable_submitted",
    title: "Deliverable Ready for Review",
    message: "Alex Rivers submitted '60-Second Mid-Roll Dedicated Integration & Setup Demo' for review.",
    campaignId: "cmp-2026-001",
    read: false,
    createdAt: "2026-03-11T16:45:00.000Z",
  },
  {
    id: "notif-003",
    recipientId: "usr_marketing_demo",
    recipientEmail: "marketing@creatoriq.io",
    recipientRole: "Marketing Team",
    type: "invitation_accepted",
    title: "Creator Accepted Invitation",
    message: "Jordan Blake accepted your invitation for 'CreatorIQ 2026 Spring Launch Campaign'.",
    campaignId: "cmp-2026-001",
    read: true,
    createdAt: "2026-02-20T09:30:00.000Z",
  },
];

const INITIAL_TIMELINES = {
  "cmp-2026-001": [
    { id: "tm-1", type: "campaign_created", text: "Campaign created by Global Brand Marketing with $45,000 budget", timestamp: "2026-02-15T10:00:00.000Z" },
    { id: "tm-2", type: "campaign_activated", text: "Campaign status transitioned to Active", timestamp: "2026-02-16T08:00:00.000Z" },
    { id: "tm-3", type: "invitations_sent", text: "Invitations dispatched to Alex Rivers, Jordan Blake, and Marcus & Leo", timestamp: "2026-02-18T10:30:00.000Z" },
    { id: "tm-4", type: "invitation_accepted", text: "Alex Rivers accepted invitation ($6,500 contracted)", timestamp: "2026-02-19T14:15:00.000Z" },
    { id: "tm-5", type: "invitation_accepted", text: "Jordan Blake accepted invitation ($4,200 contracted)", timestamp: "2026-02-20T09:30:00.000Z" },
    { id: "tm-6", type: "deliverable_assigned", text: "2 deliverables assigned to Alex Rivers (YouTube + TikTok)", timestamp: "2026-02-20T10:00:00.000Z" },
    { id: "tm-7", type: "deliverable_approved", text: "TikTok Short approved for Alex Rivers", timestamp: "2026-03-09T15:30:00.000Z" },
    { id: "tm-8", type: "deliverable_submitted", text: "Alex Rivers submitted YouTube 60s integration for review", timestamp: "2026-03-11T16:45:00.000Z" },
  ],
  "cmp-2026-002": [
    { id: "tm-21", type: "campaign_created", text: "Campaign created with $25,000 budget", timestamp: "2026-03-01T09:00:00.000Z" },
    { id: "tm-22", type: "campaign_activated", text: "Campaign status transitioned to Active", timestamp: "2026-03-01T12:00:00.000Z" },
    { id: "tm-23", type: "invitation_accepted", text: "Sarah Chen accepted invitation ($3,800 contracted)", timestamp: "2026-03-03T16:20:00.000Z" },
    { id: "tm-24", type: "invitation_sent", text: "Invitation sent to Alex Rivers ($5,000 proposed)", timestamp: "2026-03-12T15:00:00.000Z" },
  ],
};

// -------------------------------------------------------------
// Storage Access Helpers (Local + Firestore Sync)
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

// Ensure initial data is seeded
export function initCampaignStore() {
  readStorage(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  readStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
  readStorage(STORAGE_KEYS.DELIVERABLES, INITIAL_DELIVERABLES);
  readStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  readStorage(STORAGE_KEYS.TIMELINES, INITIAL_TIMELINES);
}

// -------------------------------------------------------------
// CAMPAIGN OPERATIONS
// -------------------------------------------------------------
export function getLocalCampaigns() {
  initCampaignStore();
  return readStorage(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
}

export function getCampaignById(campaignId) {
  const campaigns = getLocalCampaigns();
  return campaigns.find((c) => c.id === campaignId) || null;
}

export async function createCampaign(campaignData, marketingUser) {
  initCampaignStore();
  const campaigns = getLocalCampaigns();

  const newId = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newCampaign = {
    id: newId,
    name: campaignData.name.trim(),
    description: campaignData.description?.trim() || "",
    objective: campaignData.objective || "Awareness",
    budget: Math.max(0, Number(campaignData.budget) || 0),
    currency: campaignData.currency || "USD",
    startDate: campaignData.startDate,
    endDate: campaignData.endDate,
    targetNiche: campaignData.targetNiche?.trim() || "General",
    targetPlatforms: Array.isArray(campaignData.targetPlatforms) && campaignData.targetPlatforms.length > 0
      ? campaignData.targetPlatforms
      : ["YouTube", "Instagram"],
    requirements: campaignData.requirements?.trim() || "",
    deliverableRequirements: campaignData.deliverableRequirements?.trim() || "",
    imageUrl: campaignData.imageUrl?.trim() || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    status: campaignData.status || "draft",
    marketingId: marketingUser?.uid || "usr_marketing_demo",
    marketingName: marketingUser?.displayName || marketingUser?.fullName || "Global Brand Marketing",
    marketingEmail: marketingUser?.email || "marketing@creatoriq.io",
    spend: 0,
    attributedRevenue: 0,
    views: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
    engagementRate: "0%",
    createdAt: now,
    updatedAt: now,
  };

  campaigns.unshift(newCampaign);
  writeStorage(STORAGE_KEYS.CAMPAIGNS, campaigns);

  // Add timeline entry
  addCampaignTimelineEvent(newId, "campaign_created", `Campaign created by ${newCampaign.marketingName} (${newCampaign.status === "active" ? "Active" : "Draft"})`);

  // Sync to Firestore if available
  if (db) {
    try {
      const docRef = doc(db, "campaigns", newId);
      await setDoc(docRef, { ...newCampaign, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore campaign write note:", fsErr.message);
    }
  }

  emitDataChange("campaigns", newCampaign);
  return newCampaign;
}

export async function updateCampaign(campaignId, patchData) {
  const campaigns = getLocalCampaigns();
  const index = campaigns.findIndex((c) => c.id === campaignId);
  if (index === -1) throw new Error("Campaign not found");

  const now = new Date().toISOString();
  const updated = {
    ...campaigns[index],
    ...patchData,
    updatedAt: now,
  };

  campaigns[index] = updated;
  writeStorage(STORAGE_KEYS.CAMPAIGNS, campaigns);

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, "campaigns", campaignId);
      await updateDoc(docRef, { ...patchData, updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore campaign update note:", fsErr.message);
    }
  }

  emitDataChange("campaigns", updated);
  return updated;
}

export async function setCampaignStatus(campaignId, newStatus, reason = "") {
  const campaign = getCampaignById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const updated = await updateCampaign(campaignId, { status: newStatus });
  const eventMsg =
    newStatus === "active"
      ? "Campaign activated and open for creator collaborations"
      : newStatus === "completed"
      ? "Campaign marked as successfully completed"
      : newStatus === "cancelled"
      ? `Campaign cancelled${reason ? `: ${reason}` : ""}`
      : `Campaign status changed to ${newStatus}`;

  addCampaignTimelineEvent(campaignId, `campaign_${newStatus}`, eventMsg);
  return updated;
}

// -------------------------------------------------------------
// INVITATIONS OPERATIONS
// -------------------------------------------------------------
export function getLocalInvitations(filter = {}) {
  initCampaignStore();
  const all = readStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
  return all.filter((inv) => {
    if (filter.campaignId && inv.campaignId !== filter.campaignId) return false;
    if (filter.creatorId && inv.creatorId !== filter.creatorId) return false;
    if (filter.creatorEmail && inv.creatorEmail?.toLowerCase() !== filter.creatorEmail.toLowerCase()) return false;
    if (filter.status && inv.status !== filter.status) return false;
    return true;
  });
}

export async function sendCampaignInvitation({
  campaignId,
  creator,
  compensation = "$3,000",
  message = "",
  marketingUser,
}) {
  const campaign = getCampaignById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const existingInvitations = getLocalInvitations({ campaignId, creatorId: creator.uid });
  const activeExisting = existingInvitations.find((inv) => inv.status === "pending" || inv.status === "accepted");
  if (activeExisting) {
    throw new Error(`Creator ${creator.fullName} already has an active invitation (${activeExisting.status}) for this campaign.`);
  }

  const allInvitations = readStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
  const newId = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newInvitation = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name,
    creatorId: creator.uid,
    creatorName: creator.fullName,
    creatorEmail: creator.email,
    marketingId: marketingUser?.uid || campaign.marketingId,
    marketingName: marketingUser?.displayName || marketingUser?.fullName || campaign.marketingName,
    compensation: compensation || "$3,000",
    status: "pending",
    sentAt: now,
    respondedAt: null,
    message: message || `We invite you to collaborate on our campaign '${campaign.name}'.`,
  };

  allInvitations.unshift(newInvitation);
  writeStorage(STORAGE_KEYS.INVITATIONS, allInvitations);

  // Send Notification to Creator
  await createNotification({
    recipientId: creator.uid,
    recipientEmail: creator.email,
    recipientRole: "Creator",
    type: "invitation_received",
    title: "New Campaign Invitation",
    message: `${newInvitation.marketingName} invited you to join '${campaign.name}' with ${newInvitation.compensation} compensation.`,
    campaignId: campaign.id,
  });

  // Timeline entry
  addCampaignTimelineEvent(campaign.id, "invitation_sent", `Invitation sent to ${creator.fullName} (${newInvitation.compensation})`);

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, "campaign_invitations", newId);
      await setDoc(docRef, { ...newInvitation, sentAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore invitation write note:", fsErr.message);
    }
  }

  emitDataChange("invitations", newInvitation);
  return newInvitation;
}

export async function respondToInvitation(invitationId, responseStatus, creatorUser) {
  if (responseStatus !== "accepted" && responseStatus !== "declined") {
    throw new Error("Invalid response status. Must be 'accepted' or 'declined'.");
  }

  const allInvitations = readStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
  const index = allInvitations.findIndex((inv) => inv.id === invitationId);
  if (index === -1) throw new Error("Invitation not found");

  const inv = allInvitations[index];
  const now = new Date().toISOString();

  inv.status = responseStatus;
  inv.respondedAt = now;
  allInvitations[index] = inv;
  writeStorage(STORAGE_KEYS.INVITATIONS, allInvitations);

  // Notify Marketing team
  await createNotification({
    recipientId: inv.marketingId,
    recipientEmail: "marketing@creatoriq.io",
    recipientRole: "Marketing Team",
    type: responseStatus === "accepted" ? "invitation_accepted" : "invitation_declined",
    title: responseStatus === "accepted" ? "Creator Accepted Campaign Invite" : "Creator Declined Invitation",
    message: `${inv.creatorName} has ${responseStatus} the invitation for '${inv.campaignTitle}'.`,
    campaignId: inv.campaignId,
  });

  // Timeline entry
  addCampaignTimelineEvent(
    inv.campaignId,
    `invitation_${responseStatus}`,
    `${inv.creatorName} ${responseStatus} the campaign invitation`
  );

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, "campaign_invitations", invitationId);
      await updateDoc(docRef, { status: responseStatus, respondedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore invitation response note:", fsErr.message);
    }
  }

  emitDataChange("invitations", inv);
  return inv;
}

// -------------------------------------------------------------
// DELIVERABLES OPERATIONS
// -------------------------------------------------------------
export function getLocalDeliverables(filter = {}) {
  initCampaignStore();
  const all = readStorage(STORAGE_KEYS.DELIVERABLES, INITIAL_DELIVERABLES);
  return all.filter((del) => {
    if (filter.campaignId && del.campaignId !== filter.campaignId) return false;
    if (filter.creatorId && del.creatorId !== filter.creatorId) return false;
    if (filter.creatorEmail && del.creatorEmail?.toLowerCase() !== filter.creatorEmail.toLowerCase()) return false;
    if (filter.status && del.status !== filter.status) return false;
    return true;
  });
}

export async function createDeliverable({
  campaignId,
  creatorId,
  creatorName,
  creatorEmail,
  contentType = "YouTube Video",
  title,
  requirements,
  dueDate,
}) {
  const campaign = getCampaignById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  // Verify creator has accepted invitation
  const allInvs = getLocalInvitations();
  const invite = allInvs.find(
    (inv) =>
      inv.campaignId === campaignId &&
      inv.status === "accepted" &&
      (inv.creatorId === creatorId || (creatorEmail && inv.creatorEmail?.toLowerCase() === creatorEmail.toLowerCase()))
  );
  if (!invite) {
    throw new Error("Only accepted creators can be assigned campaign deliverables.");
  }

  const allDeliverables = readStorage(STORAGE_KEYS.DELIVERABLES, INITIAL_DELIVERABLES);
  const newId = `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newDeliverable = {
    id: newId,
    campaignId: campaign.id,
    campaignTitle: campaign.name,
    marketingId: campaign.marketingId || "usr_marketing_demo",
    marketingName: campaign.marketingName || "Global Brand Marketing",
    brandName: campaign.marketingName || "Global Brand Marketing",
    creatorId,
    creatorName: creatorName || invite.creatorName,
    creatorEmail: creatorEmail || invite.creatorEmail,
    contentType,
    title: title.trim(),
    requirements: requirements?.trim() || "",
    campaignBrief: campaign.description || campaign.requirements || "",
    compensation: invite?.compensation || (campaign.budget ? `$${campaign.budget.toLocaleString()}` : "$3,000"),
    dueDate,
    status: "pending",
    submissionUrl: "",
    submissionNotes: "",
    submissionHistory: [],
    revisionFeedback: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  allDeliverables.unshift(newDeliverable);
  writeStorage(STORAGE_KEYS.DELIVERABLES, allDeliverables);

  // Notify Creator
  await createNotification({
    recipientId: creatorId,
    recipientEmail: creatorEmail,
    recipientRole: "Creator",
    type: "deliverable_assigned",
    title: "New Deliverable Assigned",
    message: `You have been assigned '${newDeliverable.title}' for campaign '${campaign.name}' (Due: ${dueDate}).`,
    campaignId: campaign.id,
  });

  // Timeline entry
  addCampaignTimelineEvent(campaign.id, "deliverable_assigned", `Deliverable '${newDeliverable.title}' assigned to ${creatorName}`);

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, "campaign_deliverables", newId);
      await setDoc(docRef, { ...newDeliverable, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore deliverable write note:", fsErr.message);
    }
  }

  emitDataChange("deliverables", newDeliverable);
  return newDeliverable;
}

export async function submitDeliverable(deliverableId, { submissionUrl, submissionNotes }, creatorUser) {
  if (!submissionUrl || !submissionUrl.trim()) {
    throw new Error("Please provide a valid content URL or stage link.");
  }
  const urlTrimmed = submissionUrl.trim();
  if (!urlTrimmed.startsWith("http://") && !urlTrimmed.startsWith("https://")) {
    throw new Error("Content URL must be a valid web link starting with http:// or https://");
  }

  const allDeliverables = readStorage(STORAGE_KEYS.DELIVERABLES, INITIAL_DELIVERABLES);
  const index = allDeliverables.findIndex((d) => d.id === deliverableId);
  if (index === -1) throw new Error("Deliverable not found");

  const deliverable = allDeliverables[index];
  const now = new Date().toISOString();
  // State machine: if revision_requested, transition to resubmitted; otherwise to submitted
  const nextStatus = deliverable.status === "revision_requested" ? "resubmitted" : "submitted";

  const historyEntry = {
    submittedAt: now,
    submissionUrl: urlTrimmed,
    submissionNotes: submissionNotes?.trim() || "",
    status: nextStatus,
    previousRevisionFeedback: deliverable.revisionFeedback || null,
  };
  const submissionHistory = Array.isArray(deliverable.submissionHistory)
    ? [...deliverable.submissionHistory, historyEntry]
    : [historyEntry];

  deliverable.submissionUrl = urlTrimmed;
  deliverable.submissionNotes = submissionNotes?.trim() || "";
  deliverable.status = nextStatus;
  deliverable.submittedAt = now;
  deliverable.submissionHistory = submissionHistory;
  deliverable.updatedAt = now;

  allDeliverables[index] = deliverable;
  writeStorage(STORAGE_KEYS.DELIVERABLES, allDeliverables);

  // Notify the actual campaign's Marketing owner (not hardcoded demo)
  const ownerCampaign = getCampaignById(deliverable.campaignId);
  await createNotification({
    recipientId: ownerCampaign?.marketingId || deliverable.marketingId || "usr_marketing_demo",
    recipientEmail: ownerCampaign?.marketingEmail || "marketing@creatoriq.io",
    recipientRole: "Marketing Team",
    type: nextStatus === "resubmitted" ? "deliverable_resubmitted" : "deliverable_submitted",
    title: nextStatus === "resubmitted" ? "Deliverable Resubmitted with Revisions" : "New Deliverable Submitted",
    message: `${deliverable.creatorName || "Creator"} submitted '${deliverable.title}' for review.`,
    campaignId: deliverable.campaignId,
  });

  // Timeline
  addCampaignTimelineEvent(
    deliverable.campaignId,
    `deliverable_${nextStatus}`,
    `${deliverable.creatorName || "Creator"} ${nextStatus === "resubmitted" ? "resubmitted" : "submitted"} deliverable '${deliverable.title}'`
  );

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, "campaign_deliverables", deliverableId);
      await updateDoc(docRef, {
        submissionUrl: deliverable.submissionUrl,
        submissionNotes: deliverable.submissionNotes,
        status: nextStatus,
        submittedAt: serverTimestamp(),
        submissionHistory: deliverable.submissionHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("Firestore deliverable submit note:", fsErr.message);
    }
  }

  emitDataChange("deliverables", deliverable);
  return deliverable;
}

export async function reviewDeliverable(deliverableId, { action, feedback = "" }, marketingUser) {
  if (action !== "approve" && action !== "request_revision") {
    throw new Error("Action must be 'approve' or 'request_revision'.");
  }

  const allDeliverables = readStorage(STORAGE_KEYS.DELIVERABLES, INITIAL_DELIVERABLES);
  const index = allDeliverables.findIndex((d) => d.id === deliverableId);
  if (index === -1) throw new Error("Deliverable not found");

  const deliverable = allDeliverables[index];
  const now = new Date().toISOString();

  if (action === "approve") {
    deliverable.status = "approved";
    deliverable.revisionFeedback = null;
    deliverable.reviewedAt = now;
    deliverable.updatedAt = now;
  } else {
    if (!feedback.trim()) {
      throw new Error("Please provide specific revision instructions for the creator.");
    }
    deliverable.status = "revision_requested";
    deliverable.revisionFeedback = feedback.trim();
    deliverable.reviewedAt = now;
    deliverable.updatedAt = now;
  }

  allDeliverables[index] = deliverable;
  writeStorage(STORAGE_KEYS.DELIVERABLES, allDeliverables);

  // Notify Creator
  await createNotification({
    recipientId: deliverable.creatorId,
    recipientEmail: deliverable.creatorEmail,
    recipientRole: "Creator",
    type: action === "approve" ? "deliverable_approved" : "revision_requested",
    title: action === "approve" ? "Deliverable Approved! 🎉" : "Revision Requested on Deliverable",
    message: action === "approve"
      ? `Your submission for '${deliverable.title}' has been approved by the marketing team!`
      : `Revisions requested for '${deliverable.title}': "${feedback.trim()}"`,
    campaignId: deliverable.campaignId,
  });

  // Timeline
  addCampaignTimelineEvent(
    deliverable.campaignId,
    action === "approve" ? "deliverable_approved" : "revision_requested",
    action === "approve"
      ? `Deliverable '${deliverable.title}' approved by Marketing`
      : `Revisions requested for '${deliverable.title}': ${feedback.trim()}`
  );

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, "campaign_deliverables", deliverableId);
      await updateDoc(docRef, {
        status: deliverable.status,
        revisionFeedback: deliverable.revisionFeedback,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("Firestore deliverable review note:", fsErr.message);
    }
  }

  emitDataChange("deliverables", deliverable);
  return deliverable;
}

// -------------------------------------------------------------
// NOTIFICATIONS OPERATIONS
// -------------------------------------------------------------
export function getLocalNotifications(filter = {}) {
  initCampaignStore();
  const all = readStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  return all.filter((n) => {
    if (filter.recipientId && n.recipientId !== filter.recipientId) return false;
    if (filter.recipientEmail && n.recipientEmail?.toLowerCase() !== filter.recipientEmail.toLowerCase()) return false;
    if (filter.recipientRole && n.recipientRole !== filter.recipientRole) return false;
    if (filter.unreadOnly && n.read) return false;
    return true;
  });
}

export async function createNotification(notifData) {
  initCampaignStore();
  const all = readStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const newId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const item = {
    id: newId,
    recipientId: notifData.recipientId,
    recipientEmail: notifData.recipientEmail,
    recipientRole: notifData.recipientRole || "Creator",
    type: notifData.type,
    title: notifData.title,
    message: notifData.message,
    campaignId: notifData.campaignId || null,
    read: false,
    createdAt: now,
  };

  all.unshift(item);
  writeStorage(STORAGE_KEYS.NOTIFICATIONS, all);

  if (db) {
    try {
      const docRef = doc(db, "notifications", newId);
      await setDoc(docRef, { ...item, createdAt: serverTimestamp() });
    } catch (fsErr) {
      console.warn("Firestore notification write note:", fsErr.message);
    }
  }

  emitDataChange("notifications", item);
  return item;
}

export function markNotificationRead(notifId) {
  const all = readStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const found = all.find((n) => n.id === notifId);
  if (found) {
    found.read = true;
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, all);
    if (db) {
      try {
        const docRef = doc(db, "notifications", notifId);
        updateDoc(docRef, { read: true }).catch(() => {});
      } catch (e) {}
    }
    emitDataChange("notifications", found);
  }
}

export function markAllNotificationsRead(recipientEmail) {
  const all = readStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  all.forEach((n) => {
    if (!recipientEmail || n.recipientEmail?.toLowerCase() === recipientEmail.toLowerCase()) {
      n.read = true;
    }
  });
  writeStorage(STORAGE_KEYS.NOTIFICATIONS, all);
  emitDataChange("notifications", { allRead: true });
}

// -------------------------------------------------------------
// TIMELINES OPERATIONS
// -------------------------------------------------------------
export function getCampaignTimeline(campaignId) {
  initCampaignStore();
  const timelines = readStorage(STORAGE_KEYS.TIMELINES, INITIAL_TIMELINES);
  return timelines[campaignId] || [];
}

export function addCampaignTimelineEvent(campaignId, type, text) {
  initCampaignStore();
  const timelines = readStorage(STORAGE_KEYS.TIMELINES, INITIAL_TIMELINES);
  if (!timelines[campaignId]) {
    timelines[campaignId] = [];
  }
  const event = {
    id: `tm-${Date.now().toString(36)}`,
    type,
    text,
    timestamp: new Date().toISOString(),
  };
  timelines[campaignId].unshift(event);
  writeStorage(STORAGE_KEYS.TIMELINES, timelines);
  emitDataChange("timelines", { campaignId, event });
  return event;
}

// -------------------------------------------------------------
// FINANCIAL ROI CALCULATION
// ROI = ((Attributed revenue - Campaign cost) / Campaign cost) * 100
// -------------------------------------------------------------
export function calculateROI(revenue, cost) {
  const rev = Number(revenue) || 0;
  const cst = Number(cost) || 0;

  if (cst <= 0) {
    return {
      roiPercentage: 0,
      formatted: "N/A (Zero Cost)",
      isPositive: false,
      profit: rev,
      revenue: rev,
      cost: cst,
      hasValidData: false,
    };
  }

  const profit = rev - cst;
  const roi = ((profit) / cst) * 100;
  const isPositive = roi >= 0;

  return {
    roiPercentage: Number(roi.toFixed(1)),
    formatted: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`,
    isPositive,
    profit,
    revenue: rev,
    cost: cst,
    hasValidData: true,
  };
}

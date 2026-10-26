// Dummy data for the UI. Replaced by API data in later modules.
export const KPIS = [
  { key: "followers", label: "Total Followers", value: "125,430", delta: "12.4%", sub: "+13,800 from last month", icon: "users", tone: "violet" },
  { key: "views", label: "Total Views", value: "1.8M", delta: "18.7%", sub: "+285K from last month", icon: "eye", tone: "indigo" },
  { key: "likes", label: "Total Likes", value: "98,240", delta: "15.3%", sub: "+13K from last month", icon: "heart", tone: "rose" },
  { key: "comments", label: "Comments", value: "8,932", delta: "11.6%", sub: "+930 from last month", icon: "message", tone: "blue" },
  { key: "shares", label: "Shares", value: "6,120", delta: "9.8%", sub: "+550 from last month", icon: "share", tone: "purple" },
  { key: "eng", label: "Engagement Rate", value: "6.8%", delta: "1.2%", sub: "vs last month", icon: "crown", tone: "amber" },
];

export const GROWTH = [
  { d: "Aug 17", YouTube: 32000, Instagram: 22000, TikTok: 12000, LinkedIn: 4000 },
  { d: "Aug 22", YouTube: 52000, Instagram: 36000, TikTok: 20000, LinkedIn: 7000 },
  { d: "Aug 27", YouTube: 74000, Instagram: 50000, TikTok: 28000, LinkedIn: 10000 },
  { d: "Sep 1", YouTube: 98000, Instagram: 66000, TikTok: 38000, LinkedIn: 13000 },
  { d: "Sep 6", YouTube: 118000, Instagram: 80000, TikTok: 47000, LinkedIn: 17000 },
  { d: "Sep 11", YouTube: 148000, Instagram: 100000, TikTok: 58000, LinkedIn: 21000 },
  { d: "Sep 16", YouTube: 176000, Instagram: 124000, TikTok: 78000, LinkedIn: 27000 },
];
export const PLATFORM_COLORS = { YouTube: "#ef4444", Instagram: "#d946a8", TikTok: "#111827", LinkedIn: "#2563eb" };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mk = (arr) => DAYS.map((day, i) => ({ day, value: arr[i] }));
export const PERFORMANCE = {
  Views: mk([40000, 75000, 100000, 125000, 190000, 120000, 80000]),
  Likes: mk([5200, 7800, 9100, 11800, 16200, 12400, 8400]),
  Comments: mk([510, 740, 880, 1100, 1560, 1180, 760]),
  Shares: mk([380, 560, 690, 840, 1200, 900, 590]),
};

export const POSTS = [
  { title: "5 AI Tools Every Student Sh...", type: "Video", platform: "YouTube", views: "125K", likes: "8.4K", comments: "620", eng: "7.9%", date: "Sep 12, 2026", grad: ["#334155", "#64748b"] },
  { title: "A Day in My Life at NIT Rour...", type: "Reel", platform: "Instagram", views: "98K", likes: "6.1K", comments: "340", eng: "6.8%", date: "Sep 10, 2026", grad: ["#0ea5e9", "#22c55e"] },
  { title: "Healthy Meal Prep Ideas", type: "Video", platform: "TikTok", views: "76K", likes: "5.2K", comments: "410", eng: "7.4%", date: "Sep 8, 2026", grad: ["#f59e0b", "#ef4444"] },
  { title: "My Study Setup 2026", type: "Image", platform: "Instagram", views: "62K", likes: "4.3K", comments: "290", eng: "6.1%", date: "Sep 5, 2026", grad: ["#475569", "#94a3b8"] },
  { title: "How I Manage College, Work...", type: "Video", platform: "YouTube", views: "58K", likes: "3.9K", comments: "210", eng: "5.8%", date: "Sep 2, 2026", grad: ["#7c3aed", "#ec4899"] },
];

export const AUDIENCE = {
  Age: [["18-24", 48], ["25-34", 32], ["13-17", 12], ["35-44", 6], ["45+", 2]],
  Gender: [["Female", 54], ["Male", 43], ["Other", 3]],
  Location: [["India", 62], ["USA", 14], ["UK", 8], ["UAE", 6], ["Other", 10]],
  Device: [["Mobile", 78], ["Desktop", 17], ["Tablet", 5]],
};
export const AUDIENCE_SHADES = ["#5b3fd6", "#7c63ee", "#a396f5", "#c8bff9", "#e2dcfc"];

export const REVENUE_BARS = [18, 26, 20, 34, 30, 42, 36, 52, 46, 60, 55, 72];

// Nav items. `to` is a real page; everything else opens a "coming soon" page (/m/<slug>).
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const N = (label, icon, to, chevron = false) => ({ label, icon, to: to || `/m/${slug(label)}`, chevron });

export const NAV_BY_ROLE = {
  creator: [
    N("Dashboard", "dash", "/dashboard"), N("My Profile", "user", "/profile"), N("Social Accounts", "link"),
    N("Content", "content"), N("Analytics", "analytics", null, true), N("Audience", "audience", null, true),
    N("Revenue", "revenue", null, true), N("Reports", "reports"), N("Notifications", "bell"), N("Settings", "settings", "/settings"),
  ],
  agency: [
    N("Dashboard", "dash", "/dashboard"), N("Agency Profile", "user", "/profile"), N("Creators", "audience"),
    N("Campaigns", "campaign"), N("Analytics", "analytics", null, true), N("Content Library", "library"),
    N("Reports", "reports"), N("Notifications", "bell"), N("Settings", "settings", "/settings"),
  ],
  marketing_team: [
    N("Dashboard", "dash", "/dashboard"), N("Campaigns", "campaign"), N("Content", "content"),
    N("Analytics", "analytics", null, true), N("Audience", "audience", null, true), N("Reports", "reports"),
    N("Notifications", "bell"), N("Settings", "settings", "/settings"),
  ],
  admin: [
    N("Dashboard", "dash", "/dashboard"), N("User Management", "shield", "/admin/users"), N("Content Moderation", "moderation"),
    N("Platform Integrations", "plug"), N("Analytics Overview", "analytics"), N("Reports", "reports"),
    N("Activity Logs", "activity"), N("System Settings", "settings"), N("Account Settings", "user", "/settings"),
  ],
};

// ---------- Agency (sample) ----------
export const AGENCY_KPIS = [
  { label: "Total Creators", value: "24", delta: "3", sub: "+3 this month", icon: "audience", tone: "violet" },
  { label: "Total Followers", value: "2.4M", delta: "8.2%", sub: "+182K from last month", icon: "users", tone: "indigo" },
  { label: "Total Views", value: "18.6M", delta: "14.5%", sub: "+2.4M from last month", icon: "eye", tone: "blue" },
  { label: "Active Campaigns", value: "12", delta: "2", sub: "+2 from last month", icon: "campaign", tone: "rose" },
  { label: "Total Revenue", value: "₹3,49,600", delta: "16.9%", sub: "+₹50,200 from last month", icon: "wallet", tone: "amber" },
];
export const AGENCY_PERF = [
  { d: "Aug 19", Views: 420, Engagement: 52 }, { d: "Aug 26", Views: 560, Engagement: 64 }, { d: "Sep 2", Views: 610, Engagement: 70 },
  { d: "Sep 9", Views: 780, Engagement: 88 }, { d: "Sep 16", Views: 940, Engagement: 104 }, { d: "Sep 23", Views: 1180, Engagement: 131 },
  { d: "Sep 30", Views: 1420, Engagement: 152 },
];
export const PLATFORM_DIST = [
  { name: "YouTube", value: 38, color: "#ef4444" }, { name: "Instagram", value: 29, color: "#d946a8" },
  { name: "TikTok", value: 21, color: "#111827" }, { name: "Others", value: 12, color: "#6d4ae8" },
];
export const AGENCY_CREATORS = [
  { name: "Ipsita Priyadarshini", platform: "YouTube", followers: "125.4K", views: "1.8M", eng: "6.8%", growth: "12.4%" },
  { name: "Rohan Mehta", platform: "Instagram", followers: "84.2K", views: "1.1M", eng: "5.9%", growth: "9.1%" },
  { name: "Ananya Rao", platform: "TikTok", followers: "61.7K", views: "920K", eng: "7.4%", growth: "15.8%" },
  { name: "Vikram Singh", platform: "YouTube", followers: "38.9K", views: "540K", eng: "5.1%", growth: "6.3%" },
  { name: "Meera Nair", platform: "Instagram", followers: "29.3K", views: "410K", eng: "6.2%", growth: "8.7%" },
];

// ---------- Marketing team (sample) ----------
export const MKT_KPIS = [
  { label: "Active Campaigns", value: "12", delta: "2", sub: "+2 from last month", icon: "campaign", tone: "violet" },
  { label: "Total Reach", value: "3.2M", delta: "11.8%", sub: "+337K from last month", icon: "users", tone: "indigo" },
  { label: "Impressions", value: "8.4M", delta: "14.2%", sub: "+1.0M from last month", icon: "eye", tone: "blue" },
  { label: "Avg. Engagement", value: "6.4%", delta: "0.8%", sub: "vs last month", icon: "heart", tone: "rose" },
  { label: "Conversions", value: "18.2K", delta: "9.6%", sub: "+1.6K from last month", icon: "target", tone: "amber" },
];
export const CAMPAIGN_PERF = [
  { d: "Aug 19", Reach: 310, Engagement: 28 }, { d: "Aug 26", Reach: 380, Engagement: 36 }, { d: "Sep 2", Reach: 450, Engagement: 41 },
  { d: "Sep 9", Reach: 520, Engagement: 52 }, { d: "Sep 16", Reach: 610, Engagement: 60 }, { d: "Sep 23", Reach: 700, Engagement: 71 },
  { d: "Sep 30", Reach: 820, Engagement: 84 },
];
export const TOP_CAMPAIGNS = [
  { name: "Diwali Launch", value: 92 }, { name: "Summer Sale", value: 78 }, { name: "Brand Awareness", value: 64 },
  { name: "Festive Offer", value: 51 }, { name: "Product Teaser", value: 39 },
];
export const RECENT_CAMPAIGNS = [
  { name: "Diwali Launch", platform: "Instagram", status: "Active", reach: "92K", eng: "7.2%", ends: "Oct 30, 2026" },
  { name: "Summer Sale", platform: "YouTube", status: "Completed", reach: "78K", eng: "6.5%", ends: "Aug 31, 2026" },
  { name: "Brand Awareness", platform: "TikTok", status: "Active", reach: "64K", eng: "5.9%", ends: "Nov 15, 2026" },
  { name: "Festive Offer", platform: "Instagram", status: "Scheduled", reach: "-", eng: "-", ends: "Nov 20, 2026" },
  { name: "Product Teaser", platform: "YouTube", status: "Completed", reach: "39K", eng: "5.2%", ends: "Sep 12, 2026" },
];
export const CONTENT_DIST = [
  { name: "Videos", value: 46, color: "#6d4ae8" }, { name: "Reels", value: 28, color: "#a396f5" },
  { name: "Images", value: 18, color: "#c8bff9" }, { name: "Text", value: 8, color: "#e2dcfc" },
];
export const AUDIENCE_INSIGHTS = {
  age: [["18-24", 48], ["25-34", 32], ["13-17", 12], ["35+", 8]],
  places: [["India", 62], ["USA", 14], ["UK", 8], ["UAE", 6]],
};

// ---------- Admin (sample parts) ----------
export const USER_GROWTH = [
  { d: "Aug 17", Users: 120 }, { d: "Aug 22", Users: 190 }, { d: "Aug 27", Users: 260 }, { d: "Sep 1", Users: 340 },
  { d: "Sep 6", Users: 410 }, { d: "Sep 11", Users: 490 }, { d: "Sep 16", Users: 570 },
];
export const PLATFORM_USAGE = [
  { name: "YouTube", value: 82 }, { name: "Instagram", value: 74 }, { name: "TikTok", value: 61 },
  { name: "LinkedIn", value: 38 }, { name: "Facebook", value: 29 },
];
export const SYSTEM_ACTIVITY = [
  { text: "New creator account registered", time: "2 min ago", tone: "#22c55e" },
  { text: "Agency linked 3 creators", time: "18 min ago", tone: "#6d4ae8" },
  { text: "Weekly analytics report generated", time: "1 hour ago", tone: "#2563eb" },
  { text: "Multiple failed logins from one IP", time: "3 hours ago", tone: "#ef4444" },
  { text: "YouTube data sync completed", time: "5 hours ago", tone: "#22c55e" },
];

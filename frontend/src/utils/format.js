export const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "x", "linkedin"];
export const PLATFORM_LABEL = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", x: "X", linkedin: "LinkedIn" };
export const PLATFORM_COLOR = { youtube: "#D4553E", instagram: "#B5479B", tiktok: "#143A41", facebook: "#3B6FD4", x: "#6B7C80", linkedin: "#1F7FA8" };
export const ROLE_LABEL = {
  creator: "Creator",
  agency: "Agency",
  marketing: "Marketing Team",
  admin: "Administrator",
  administrator: "Administrator",
};
export const ROLE_BADGE_STYLE = {
  creator: "bg-teal-50 text-teal-700 border-teal-200",
  agency: "bg-purple-50 text-purple-700 border-purple-200",
  marketing: "bg-rose-50 text-rose-700 border-rose-200",
  admin: "bg-amber-50 text-amber-700 border-amber-200",
  administrator: "bg-amber-50 text-amber-700 border-amber-200",
};

export const normalizeRole = (role) => {
  if (!role) return "creator";
  const r = String(role).toLowerCase().trim();
  if (r === "administrator" || r === "admin") return "admin";
  if (r === "agency") return "agency";
  if (r === "marketing") return "marketing";
  return "creator";
};

export const getRoleDashboardPath = (role) => {
  const r = normalizeRole(role);
  switch (r) {
    case "admin":
      return "/admin-dashboard";
    case "agency":
      return "/agency-dashboard";
    case "marketing":
      return "/marketing-dashboard";
    case "creator":
    default:
      return "/creator-dashboard";
  }
};

export const REVENUE_SOURCES = ["sponsorships", "ad_revenue", "affiliate", "brand_collaborations", "subscriptions"];
export const REVENUE_SOURCE_LABEL = {
  sponsorships: "Sponsorships",
  ad_revenue: "Ad Revenue",
  affiliate: "Affiliate Marketing",
  brand_collaborations: "Brand Collaborations",
  subscriptions: "Subscriptions",
};
export const REVENUE_SOURCE_COLOR = {
  sponsorships: "#143A41",
  ad_revenue: "#E8A317",
  affiliate: "#2E8B6A",
  brand_collaborations: "#D4553E",
  subscriptions: "#B5479B",
};

export const currency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);

export const num = (n) => new Intl.NumberFormat("en", { notation: n >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n ?? 0);
export const compact = (n) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n ?? 0);
export const pct = (n) => `${(n ?? 0).toFixed(2)}%`;
export const shortDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
export const isoDate = (d) => d.toISOString().slice(0, 10);
export const RANGES = [{ label: "Last 7 days", days: 7 }, { label: "Last 30 days", days: 30 }, { label: "Last 90 days", days: 90 }];
export function rangeParams(days, custom) {
  if (days === "custom" && custom?.start && custom?.end) return { start_date: custom.start, end_date: custom.end };
  return { days: days === "custom" ? 30 : days };
}

export const NOTIFICATION_CATEGORIES = ["performance", "engagement", "revenue", "system"];
export const NOTIFICATION_CATEGORY_LABEL = {
  performance: "Performance",
  engagement: "Engagement",
  revenue: "Revenue",
  system: "System",
};
export const NOTIFICATION_CATEGORY_COLOR = {
  performance: "bg-rose-50 text-rose-700 border-rose-200",
  engagement: "bg-indigo-50 text-indigo-700 border-indigo-200",
  revenue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  system: "bg-amber-50 text-amber-700 border-amber-200",
};

export function timeAgo(d) {
  if (!d) return "";
  const dt = new Date(d);
  const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

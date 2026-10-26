import {
  LayoutDashboard, User, Link2, FileText, BarChart3, Users, CircleDollarSign, FileBarChart,
  Bell, Settings, Eye, Heart, MessageSquare, Share2, Crown, Youtube, Instagram, Search,
  CalendarDays, ChevronDown, LogOut, ArrowUp, ArrowRight, Info, Plus, ShieldCheck,
  Megaphone, FolderOpen, ShieldAlert, Plug, Activity, TrendingUp, Target, Wallet, MousePointerClick, Briefcase,
} from "lucide-react";

const MAP = {
  dash: LayoutDashboard, user: User, link: Link2, content: FileText, analytics: BarChart3,
  audience: Users, revenue: CircleDollarSign, reports: FileBarChart, bell: Bell, settings: Settings,
  users: Users, eye: Eye, heart: Heart, message: MessageSquare, share: Share2, crown: Crown,
  search: Search, calendar: CalendarDays, chevron: ChevronDown, logout: LogOut, up: ArrowUp,
  right: ArrowRight, info: Info, plus: Plus, shield: ShieldCheck,
  campaign: Megaphone, library: FolderOpen, moderation: ShieldAlert, plug: Plug, activity: Activity,
  trend: TrendingUp, target: Target, wallet: Wallet, click: MousePointerClick, briefcase: Briefcase,
};

export function Icon({ name, size = 18, ...rest }) {
  const C = MAP[name];
  return C ? <C size={size} strokeWidth={1.8} aria-hidden="true" {...rest} /> : null;
}

export function PlatformBadge({ name, size = 28 }) {
  const style = { width: size, height: size };
  if (name === "YouTube")
    return <span className="pbadge" style={{ ...style, background: "#fee2e2", color: "#dc2626" }}><Youtube size={size * 0.6} /></span>;
  if (name === "Instagram")
    return <span className="pbadge" style={{ ...style, background: "#fce7f3", color: "#c026d3" }}><Instagram size={size * 0.6} /></span>;
  if (name === "TikTok")
    return <span className="pbadge" style={{ ...style, background: "#111827", color: "#fff", fontWeight: 800, fontSize: size * 0.5 }}>♪</span>;
  return <span className="pbadge" style={{ ...style, background: "#dbeafe", color: "#2563eb", fontWeight: 800, fontSize: size * 0.42 }}>in</span>;
}

import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Link2,
  UserCircle,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Activity,
  ShieldCheck,
  Briefcase,
  Megaphone,
  Layers,
  Target,
  UserCog,
  Server,
  History,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABEL, ROLE_BADGE_STYLE, getRoleDashboardPath, normalizeRole } from "../utils/format";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const initials = user?.full_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "U";
  const userRole = normalizeRole(user?.role);
  const isAdmin = userRole === "admin";

  // Build navigation items tailored specifically to the user's role
  const getNavItems = () => {
    switch (userRole) {
      case "agency":
        return [
          { to: "/agency-dashboard", label: "Agency Overview", icon: Briefcase },
          { to: "/agency-dashboard#creators", label: "Creator Roster", icon: Users },
          { to: "/agency-dashboard#campaigns", label: "Campaigns", icon: Target },
          { to: "/agency-dashboard#reports", label: "Reports & Analytics", icon: BarChart3 },
          { to: "/profile", label: "Profile", icon: UserCircle },
          { to: "/settings", label: "Settings", icon: Settings },
        ];
      case "marketing":
        return [
          { to: "/marketing-dashboard", label: "Marketing Overview", icon: Megaphone },
          { to: "/marketing-dashboard#campaigns", label: "Active Campaigns", icon: Target },
          { to: "/marketing-dashboard#audience", label: "Audience Insights", icon: Users },
          { to: "/marketing-dashboard#reports", label: "Reports & ROI", icon: TrendingUp },
          { to: "/profile", label: "Profile", icon: UserCircle },
          { to: "/settings", label: "Settings", icon: Settings },
        ];
      case "admin":
        return [
          { to: "/admin-dashboard", label: "Admin Console", icon: ShieldCheck },
          { to: "/admin-dashboard#users", label: "User Management", icon: UserCog },
          { to: "/admin-dashboard#system", label: "System Overview", icon: Server },
          { to: "/admin-dashboard#activities", label: "Audit & Logs", icon: History },
          { to: "/profile", label: "Profile", icon: UserCircle },
          { to: "/settings", label: "Settings", icon: Settings },
        ];
      case "creator":
      default:
        return [
          { to: "/creator-dashboard", label: "Creator Dashboard", icon: LayoutDashboard },
          { to: "/content", label: "Content Analytics", icon: BarChart3 },
          { to: "/audience", label: "Audience Analytics", icon: Users },
          { to: "/connections", label: "Social Connections", icon: Link2 },
          { to: "/profile", label: "Profile", icon: UserCircle },
          { to: "/settings", label: "Settings", icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();
  const roleStyle = ROLE_BADGE_STYLE[userRole] || "bg-ink-100 text-ink-700 border-ink-200";

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col bg-ink-950 text-ink-100 shadow-xl">
      <Link to={getRoleDashboardPath(user?.role)} className="flex items-center gap-2.5 px-6 py-6 font-display text-xl font-extrabold tracking-tight text-white transition hover:opacity-95">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-signal text-ink-950 shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <span>CreatorIQ</span>
          <span className="block text-[10px] font-medium tracking-wider text-ink-400 uppercase">Analytics Pro</span>
        </div>
      </Link>

      <div className="mx-4 mb-4 rounded-xl border border-ink-900 bg-ink-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-400">ACTIVE ROLE</span>
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${roleStyle}`}>
            {ROLE_LABEL[userRole] || user?.role}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-white">{user?.full_name}</p>
      </div>

      <div className="px-3">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">Navigation</p>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isHash = to.includes("#");
          const basePath = to.split("#")[0];
          const isActive = isHash ? loc.pathname === basePath && loc.hash === `#${to.split("#")[1]}` : loc.pathname === to;

          return (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-signal font-bold text-ink-950 shadow-sm"
                    : "text-ink-300 hover:bg-ink-900/80 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-ink-950" : "text-ink-400"}`} />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* Admin Quick Switcher for College Demonstration */}
      {isAdmin && (
        <div className="mx-3 my-3 rounded-xl border border-amber-900/40 bg-amber-950/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Demo Role Switcher</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Preview all 4 dashboards:</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <Link to="/creator-dashboard" className="rounded border border-ink-800 bg-ink-900 px-2 py-1 text-center font-medium hover:border-signal hover:text-white">Creator</Link>
            <Link to="/agency-dashboard" className="rounded border border-ink-800 bg-ink-900 px-2 py-1 text-center font-medium hover:border-signal hover:text-white">Agency</Link>
            <Link to="/marketing-dashboard" className="rounded border border-ink-800 bg-ink-900 px-2 py-1 text-center font-medium hover:border-signal hover:text-white">Marketing</Link>
            <Link to="/admin-dashboard" className="rounded border border-amber-700/50 bg-amber-900/40 px-2 py-1 text-center font-bold text-amber-200">Admin</Link>
          </div>
        </div>
      )}

      <div className="border-t border-ink-900 p-4">
        <button
          onClick={async () => {
            await logout();
            nav("/login");
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-coral transition hover:bg-coral/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost p-2 lg:hidden"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-xs text-ink-500">
                Welcome back, <b className="font-semibold text-ink-950">{user?.full_name?.split(" ")[0]}</b>
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${roleStyle}`}>
                  {ROLE_LABEL[userRole] || user?.role} Dashboard
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick role preview for admin evaluator */}
            {isAdmin && (
              <div className="hidden items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-600 sm:flex">
                <span className="text-[11px] font-semibold text-ink-500">Quick view:</span>
                <Link to="/creator-dashboard" className="rounded px-1.5 py-0.5 hover:bg-ink-100">Creator</Link>
                <Link to="/agency-dashboard" className="rounded px-1.5 py-0.5 hover:bg-ink-100">Agency</Link>
                <Link to="/marketing-dashboard" className="rounded px-1.5 py-0.5 hover:bg-ink-100">Marketing</Link>
                <Link to="/admin-dashboard" className="rounded bg-ink-950 px-1.5 py-0.5 font-semibold text-white">Admin</Link>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setMenu(!menu)}
                className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 transition hover:border-ink-200 hover:bg-ink-50"
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal font-display text-xs font-extrabold text-ink-950 shadow-sm">
                  {initials}
                </span>
                <span className="hidden text-left text-xs sm:block">
                  <b className="block font-bold leading-tight text-ink-950">{user?.full_name}</b>
                  <span className="text-[11px] text-ink-500">{ROLE_LABEL[user?.role]}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-ink-400" />
              </button>

              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-ink-100 bg-white p-1.5 shadow-xl"
                >
                  <div className="border-b border-ink-50 px-3 py-2 text-xs">
                    <p className="font-bold text-ink-950">{user?.full_name}</p>
                    <p className="truncate text-ink-500">{user?.email}</p>
                  </div>
                  <Link
                    role="menuitem"
                    to="/profile"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-ink-50 hover:text-ink-950"
                  >
                    <UserCircle className="h-4 w-4 text-ink-400" /> Profile Details
                  </Link>
                  <Link
                    role="menuitem"
                    to="/settings"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-ink-50 hover:text-ink-950"
                  >
                    <Settings className="h-4 w-4 text-ink-400" /> Settings & Data
                  </Link>
                  <div className="my-1 border-t border-ink-50" />
                  <button
                    role="menuitem"
                    onClick={async () => {
                      await logout();
                      nav("/login");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-coral transition hover:bg-coral/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

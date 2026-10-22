import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Bell, 
  ChevronDown, 
  Menu, 
  X, 
  BarChart2, 
  Server, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  Shield,
  KeyRound,
  Palette,
  Building,
  Target,
  Users,
  Check,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { BackendStatusModal } from '../common/BackendStatusModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedDateRange?: string;
  onDateRangeChange?: (range: string) => void;
  selectedPlatform?: string;
  onPlatformChange?: (platform: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleSidebar, 
  currentPage, 
  onNavigate,
  onShowToast,
  searchQuery = '',
  onSearchChange,
  selectedDateRange = '30d',
  onDateRangeChange,
  selectedPlatform = 'all',
  onPlatformChange
}) => {
  const { user, login, logout, switchWorkspace, activeBackendUrl } = useAuth();
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Avatar matching creator
  const creatorAvatar = user?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80';
  const creatorName = user?.name || 'HARSHITHA S';
  const activeRole = user?.role || 'creator';

  const roleConfigs: {
    id: UserRole;
    title: string;
    email: string;
    pass: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    {
      id: 'creator',
      title: 'Creator (Ipsita Priyadarshini)',
      email: 'creator@creatoriq.com',
      pass: 'CreatorPass123!',
      badge: 'Creator',
      icon: Palette,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      id: 'admin',
      title: 'Administrator (System Admin)',
      email: 'admin@creatoriq.com',
      pass: 'AdminPass123!',
      badge: 'Admin',
      icon: Shield,
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
      id: 'agency',
      title: 'Agency (Growth Agency)',
      email: 'agency@creatoriq.com',
      pass: 'AgencyPass123!',
      badge: 'Agency',
      icon: Building,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      id: 'marketing',
      title: 'Marketing Team (Brand Studio)',
      email: 'marketing@creatoriq.com',
      pass: 'MarketingPass123!',
      badge: 'Marketing',
      icon: Target,
      color: 'text-sky-600 bg-sky-50 border-sky-200'
    }
  ];

  const handleRoleSwitch = async (roleId: UserRole) => {
    setShowRoleMenu(false);
    if (!user) return;

    if (user.role === roleId) {
      onShowToast?.(`Already in ${roleId.toUpperCase()} workspace`, 'info');
      return;
    }

    try {
      const res = await switchWorkspace(roleId);
      if (res.success) {
        onShowToast?.(`Switched active workspace to ${roleId.toUpperCase()}`, 'success');
        onNavigate('dashboard');
      } else {
        onShowToast?.(res.message || 'Workspace switch failed', 'error');
      }
    } catch (err: any) {
      onShowToast?.(`Role switch failed: ${err.message}`, 'error');
    }
  };

  const handleSignOut = async () => {
    setShowUserDropdown(false);
    setShowRoleMenu(false);
    await logout();
    onShowToast?.('Signed out successfully. See you again!', 'info');
    onNavigate('login');
  };

  const currentRoleConfig = roleConfigs.find(r => r.id === activeRole) || roleConfigs[0];
  const CurrentRoleIcon = currentRoleConfig.icon;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
        <div className="px-4 sm:px-6 py-2.5 max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center space-x-3 shrink-0">
            {user && (
              <button 
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                aria-label="Toggle Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* CreatorHub Logo */}
            <div 
              onClick={() => onNavigate(user ? 'dashboard' : 'login')} 
              className="flex items-center space-x-2.5 cursor-pointer select-none group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <rect x="3" y="10" width="3.5" height="11" rx="1.75" />
                  <rect x="10.25" y="4" width="3.5" height="17" rx="1.75" />
                  <rect x="17.5" y="7" width="3.5" height="14" rx="1.75" />
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                CreatorHub
              </span>
            </div>
          </div>

          {/* Center: Search Bar (when logged in) */}
          {user ? (
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search content, analytics, reports..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-900 bg-slate-50/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute inset-y-0 right-2.5 my-auto text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CreatorIQ Authentication &amp; User Management</span>
            </div>
          )}

          {/* Right Controls: Role Dropdown, Date filter, Profile, Log Out */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {user ? (
              <>
                {/* WORKSPACE BADGE & SWITCHER IN NAVBAR */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      const userRoles = (user?.roles && user.roles.length) ? user.roles.slice(0, 2) : (user?.role ? [user.role] : ['creator']);
                      if (userRoles.length > 1) {
                        setShowRoleMenu(!showRoleMenu);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs font-bold shadow-2xs transition-all ${
                      (user?.roles && user.roles.length > 1) ? 'hover:bg-purple-100/70 cursor-pointer' : 'cursor-default'
                    }`}
                    title={(user?.roles && user.roles.length > 1) ? 'Click to switch between authorized workspaces' : 'Authorized Workspace'}
                  >
                    <CurrentRoleIcon className="w-3.5 h-3.5 text-purple-700" />
                    <span className="hidden sm:inline text-purple-700 font-medium">Workspace:</span>
                    <span className="capitalize text-purple-900 font-extrabold">{currentRoleConfig.badge} Team</span>
                    {(user?.roles && user.roles.length > 1) ? (
                      <span className="inline-flex items-center space-x-0.5 ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-200 text-purple-900">
                        <span>Switch</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    )}
                  </button>

                  {/* Multi-role Workspace Switch Dropdown */}
                  {showRoleMenu && (user?.roles && user.roles.length > 1) && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-purple-100 p-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Switch Workspace</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email} (Max 2 Roles)</p>
                      </div>
                      <div className="space-y-1">
                        {user.roles.slice(0, 2).map((rId) => {
                          const conf = roleConfigs.find(rc => rc.id === rId) || roleConfigs[0];
                          const ConfIcon = conf.icon;
                          const isActive = user.role === rId;
                          return (
                            <button
                              key={rId}
                              type="button"
                              onClick={() => handleRoleSwitch(rId)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                isActive 
                                  ? 'bg-purple-100/60 text-purple-900 border border-purple-200 shadow-2xs' 
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-purple-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <ConfIcon className="w-4 h-4 text-purple-600" />
                                <span>{conf.badge} Team</span>
                              </div>
                              {isActive ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-semibold">Active</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">Switch &rarr;</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Date filter dropdown pill */}
                <div className="relative hidden md:block">
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {selectedDateRange === '7d' ? 'Last 7 Days' : 
                       selectedDateRange === '90d' ? 'Last 90 Days' : 
                       selectedDateRange === '1y' ? 'This Year' : 'Last 30 Days'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => onDateRangeChange?.(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">This Year</option>
                  </select>
                </div>

                {/* Notifications Bell */}
                <div 
                  onClick={() => onNavigate('notifications')}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                </div>

                {/* Creator Profile Header with Dropdown */}
                <div className="relative">
                  <div 
                    onClick={() => {
                      setShowUserDropdown(!showUserDropdown);
                      setShowRoleMenu(false);
                    }}
                    className="flex items-center space-x-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-slate-50 cursor-pointer transition-colors select-none border border-slate-200/80 shadow-2xs"
                  >
                    <img 
                      src={creatorAvatar} 
                      alt={creatorName} 
                      className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-2xs"
                    />
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {creatorName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-0.5">
                        <span className="capitalize">{activeRole}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* User Profile Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{creatorName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email || 'sharshitha28007@gmail.com'}</p>
                        <span className="mt-1 inline-block text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {user?.role || 'creator'} Pro
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate('profile-view');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center space-x-2 transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate('profile-edit');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center space-x-2 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                        <span>Settings &amp; Media Kit</span>
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onNavigate('admin-users');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-purple-700 hover:bg-purple-50 flex items-center space-x-2 font-medium"
                        >
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span>Admin Portal</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate('reset-password');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                        <span>Reset Password (Email Verification)</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowBackendModal(true);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Server className="w-3.5 h-3.5 text-slate-400" />
                        <span>API &amp; Backend Settings</span>
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* DEDICATED PROMINENT LOG OUT BUTTON */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs"
                  title="Sign out of CreatorIQ"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden md:inline">Log Out</span>
                </button>
              </>
            ) : (
              /* Unauthenticated Controls */
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('reset-password')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Reset Password</span>
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Backend Status Diagnostics Modal */}
      <BackendStatusModal 
        isOpen={showBackendModal} 
        onClose={() => setShowBackendModal(false)} 
      />
    </>
  );
};

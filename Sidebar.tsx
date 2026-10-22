import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Share2, 
  FileText, 
  BarChart2, 
  Users, 
  DollarSign, 
  Bell, 
  Settings, 
  ChevronDown, 
  Crown, 
  Shield, 
  LogOut,
  Target,
  Building,
  Layers,
  Activity,
  Globe,
  Sliders,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onNavigate, 
  isOpen, 
  onClose 
}) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'creator';

  // Dynamic role-specific navigation items matching screenshot exactly
  const getNavItemsByRole = () => {
    switch (role) {
      case 'agency':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasChevron: false },
          { id: 'profile-view', label: 'My Profile', icon: User, hasChevron: false },
          { id: 'agency-creators', label: 'Creators', icon: Users, hasChevron: false },
          { id: 'agency-campaigns', label: 'Campaigns', icon: Target, hasChevron: false },
          { id: 'analytics', label: 'Analytics', icon: BarChart2, hasChevron: false },
          { id: 'content-library', label: 'Content Library', icon: Layers, hasChevron: false },
          { id: 'reports', label: 'Reports', icon: FileText, hasChevron: false },
          { id: 'team-members', label: 'Team Members', icon: Users, hasChevron: false },
          { id: 'settings', label: 'Settings', icon: Settings, hasChevron: false },
        ];
      case 'marketing':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasChevron: false },
          { id: 'profile-view', label: 'My Profile', icon: User, hasChevron: false },
          { id: 'marketing-campaigns', label: 'Campaigns', icon: Target, hasChevron: false },
          { id: 'influencers', label: 'Influencers', icon: Users, hasChevron: false },
          { id: 'content', label: 'Content', icon: FileText, hasChevron: false },
          { id: 'analytics', label: 'Analytics', icon: BarChart2, hasChevron: false },
          { id: 'reports', label: 'Reports', icon: FileText, hasChevron: false },
          { id: 'brand-deals', label: 'Brand Deals', icon: DollarSign, hasChevron: false },
          { id: 'settings', label: 'Settings', icon: Settings, hasChevron: false },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasChevron: false },
          { id: 'profile-view', label: 'My Profile', icon: User, hasChevron: false },
          { id: 'admin-users', label: 'User Management', icon: Users, hasChevron: false },
          { id: 'content-monitoring', label: 'Content Monitoring', icon: Layers, hasChevron: false },
          { id: 'platform-integrations', label: 'Platform Integrations', icon: Globe, hasChevron: false },
          { id: 'analytics-overview', label: 'Analytics Overview', icon: BarChart2, hasChevron: false },
          { id: 'reports', label: 'Reports', icon: FileText, hasChevron: false },
          { id: 'system-settings', label: 'System Settings', icon: Sliders, hasChevron: false },
          { id: 'activity-logs', label: 'Activity Logs', icon: Activity, hasChevron: false },
        ];
      case 'creator':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasChevron: false },
          { id: 'profile-view', label: 'My Profile', icon: User, hasChevron: false },
          { id: 'social-accounts', label: 'Social Accounts', icon: Share2, hasChevron: false },
          { id: 'content', label: 'Content', icon: FileText, hasChevron: false },
          { id: 'analytics', label: 'Analytics', icon: BarChart2, hasChevron: true },
          { id: 'audience', label: 'Audience', icon: Users, hasChevron: true },
          { id: 'revenue', label: 'Revenue', icon: DollarSign, hasChevron: true },
          { id: 'reports', label: 'Reports', icon: FileText, hasChevron: false },
          { id: 'notifications', label: 'Notifications', icon: Bell, hasChevron: false },
          { id: 'settings', label: 'Settings', icon: Settings, hasChevron: false },
        ];
    }
  };

  const navItems = getNavItemsByRole();

  // Bottom user badge info matching screenshot
  const getBottomUserCard = () => {
    switch (role) {
      case 'agency':
        return {
          title: 'Agency',
          subtitle: 'Growth Agency',
          initial: 'A',
          color: 'bg-indigo-600 text-white'
        };
      case 'marketing':
        return {
          title: 'Marketing Team',
          subtitle: 'Brand Studio',
          initial: 'M',
          color: 'bg-blue-600 text-white'
        };
      case 'admin':
        return {
          title: 'Administrator',
          subtitle: 'System Admin',
          initial: 'A',
          color: 'bg-purple-700 text-white'
        };
      case 'creator':
      default:
        return {
          title: user?.name || 'Ipsita Priyadarshini',
          subtitle: 'Creator',
          avatar: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        };
    }
  };

  const bottomCard = getBottomUserCard();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-56 bg-white border-r border-slate-100 pt-16 pb-4 px-3 flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Navigation items list */}
        <div className="space-y-1 mt-1 overflow-y-auto pr-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group
                  ${isActive 
                    ? 'bg-indigo-50/80 text-indigo-600 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}
                `}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.hasChevron && (
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Section: User Profile Card & Sign Out */}
        <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
          {/* User Card Matching Screenshot Bottom Left */}
          <div 
            onClick={() => {
              onNavigate('profile-view');
              onClose();
            }}
            className="p-2 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 cursor-pointer transition-colors flex items-center space-x-2.5 shadow-2xs"
            title="Open My Profile"
          >
            {'avatar' in bottomCard && bottomCard.avatar ? (
              <img 
                src={bottomCard.avatar} 
                alt={bottomCard.title} 
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
              />
            ) : (
              <div className={`w-8 h-8 rounded-full ${bottomCard.color} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                {bottomCard.initial}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-bold text-slate-900 truncate">{bottomCard.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{bottomCard.subtitle}</div>
            </div>
          </div>

          {/* Dedicated Sign Out / Log Out button */}
          <button
            onClick={async () => {
              onClose?.();
              await logout();
              onNavigate('login');
            }}
            className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

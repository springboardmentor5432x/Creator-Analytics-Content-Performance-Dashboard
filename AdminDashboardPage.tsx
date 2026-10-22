import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Search, 
  Calendar, 
  ChevronDown, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Plus, 
  BarChart2, 
  Globe, 
  Lock, 
  Settings, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/api';
import { AdminStats, User } from '../../types/auth';

interface AdminDashboardPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate, onShowToast }) => {
  const { user } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveStats, setLiveStats] = useState<AdminStats | null>(null);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, usersRes] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers()
        ]);
        if (statsRes.success && statsRes.stats) setLiveStats(statsRes.stats);
        if (usersRes.success && usersRes.users) setLiveUsers(usersRes.users);
      } catch (err) {
        console.warn('Failed to load admin dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  // 5 KPI Metric Cards matching screenshot
  const kpis = [
    {
      id: 'total_users',
      label: 'Total Users',
      value: liveStats ? String(liveStats.total_users) : '148',
      badge: '+2 this month',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Users,
      iconColor: 'text-indigo-600 bg-indigo-50'
    },
    {
      id: 'creators',
      label: 'Creators',
      value: liveStats ? String(liveStats.roles.creator) : '120',
      badge: null,
      icon: Users,
      iconColor: 'text-rose-600 bg-rose-50'
    },
    {
      id: 'agencies',
      label: 'Agencies',
      value: liveStats ? String(liveStats.roles.agency) : '18',
      badge: null,
      icon: Users,
      iconColor: 'text-purple-600 bg-purple-50'
    },
    {
      id: 'marketing',
      label: 'Marketing Teams',
      value: liveStats ? String(liveStats.roles.marketing) : '7',
      badge: null,
      icon: Users,
      iconColor: 'text-sky-600 bg-sky-50'
    },
    {
      id: 'active',
      label: 'Active Users',
      value: liveStats ? String(liveStats.active_users) : '132',
      badge: '+8.2%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: UserCheck,
      iconColor: 'text-emerald-600 bg-emerald-50'
    }
  ];

  // User Growth Chart data (Aug 17 - Sep 14)
  const growthData = [
    { date: 'Aug 17', creators: 65, agencies: 12, marketing: 4 },
    { date: 'Aug 24', creators: 82, agencies: 14, marketing: 5 },
    { date: 'Aug 31', creators: 95, agencies: 15, marketing: 6 },
    { date: 'Sep 7',  creators: 110, agencies: 17, marketing: 6 },
    { date: 'Sep 14', creators: 120, agencies: 18, marketing: 7 }
  ];

  // Platform Usage data
  const platformUsage = [
    { platform: 'YouTube', val: 150, label: '150K' },
    { platform: 'Instagram', val: 85, label: '85K' },
    { platform: 'TikTok', val: 55, label: '55K' },
    { platform: 'LinkedIn', val: 30, label: '30K' },
    { platform: 'Others', val: 15, label: '15K' }
  ];

  // Recent Users Table matching screenshot
  const recentUsers = [
    {
      id: 1,
      name: 'Riya Sharma',
      email: 'riya@example.com',
      role: 'Creator',
      roleBadge: 'bg-blue-50 text-blue-700 border-blue-200',
      joinedAt: 'Sep 15, 2026',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Growth Agency',
      email: 'agency@example.com',
      role: 'Agency',
      roleBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      joinedAt: 'Sep 14, 2026',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Brand Studio',
      email: 'marketing@example.com',
      role: 'Marketing Team',
      roleBadge: 'bg-pink-50 text-pink-700 border-pink-200',
      joinedAt: 'Sep 13, 2026',
      status: 'Active'
    },
    {
      id: 4,
      name: 'Arjun Mehta',
      email: 'arjun@example.com',
      role: 'Creator',
      roleBadge: 'bg-blue-50 text-blue-700 border-blue-200',
      joinedAt: 'Sep 12, 2026',
      status: 'Inactive'
    },
    {
      id: 5,
      name: 'Content Co.',
      email: 'content@example.com',
      role: 'Agency',
      roleBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      joinedAt: 'Sep 11, 2026',
      status: 'Active'
    }
  ];

  // System Activity Feed matching screenshot
  const systemActivities = [
    { id: 1, title: 'New creator registered', time: '10 mins ago', color: 'bg-emerald-500' },
    { id: 2, title: 'Campaign created', time: '25 mins ago', color: 'bg-blue-500' },
    { id: 3, title: 'User role updated', time: '1 hour ago', color: 'bg-amber-500' },
    { id: 4, title: 'Platform integration added', time: '2 hours ago', color: 'bg-purple-500' },
    { id: 5, title: 'Report generated', time: '3 hours ago', color: 'bg-emerald-500' }
  ];

  // Line chart SVG coordinates
  const chartW = 520;
  const chartH = 170;
  const padLeft = 35;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;
  const maxVal = 200; // 0 to 200 users

  const getX = (idx: number) => padLeft + (idx / (growthData.length - 1)) * innerW;
  const getY = (val: number) => padTop + innerH - (val / maxVal) * innerH;

  const creatorsPath = growthData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.creators);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const agenciesPath = growthData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.agencies);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const marketingPath = growthData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.marketing);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-10">
      {/* Header Banner Subtitle matching screenshot */}
      <div className="text-center py-2 bg-purple-50/70 border border-purple-200/60 rounded-2xl">
        <h1 className="text-sm font-black text-purple-950 tracking-tight">Admin Dashboard</h1>
        <p className="text-[11px] text-purple-700">For administrators to manage users, monitor platform usage and system settings.</p>
      </div>

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, content..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="relative">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">This Year</option>
            </select>
          </div>

          <button
            onClick={() => onNavigate('admin-users')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => onNavigate('my-profile')}
            className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            title="Edit Admin Personal and Professional details"
          >
            <Shield className="w-3.5 h-3.5 text-purple-700" />
            <span>My Profile: Personal &amp; Professional</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards matching screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={kpi.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold text-slate-600 truncate">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.iconColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.value}
                </div>
                {kpi.badge ? (
                  <div className="mt-1">
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {kpi.badge}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center space-x-1 text-[10px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span>Platform registered</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: User Growth (Left) + Platform Usage (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: User Growth Line Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">User Growth</h2>
              <p className="text-[11px] text-slate-400">New user signups across roles</p>
            </div>
            {/* Legend */}
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Creators</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <span>Agencies</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span>Marketing Teams</span>
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 select-none">
              {[0, 50, 100, 150, 200].map((v) => {
                const y = getY(v);
                return (
                  <g key={v}>
                    <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                      {v}
                    </text>
                  </g>
                );
              })}

              <path d={creatorsPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
              <path d={agenciesPath} fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
              <path d={marketingPath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />

              {growthData.map((d, i) => {
                const x = getX(i);
                return (
                  <g key={d.date}>
                    <text x={x} y={chartH - 6} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                      {d.date}
                    </text>
                    <circle cx={x} cy={getY(d.creators)} r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.agencies)} r="3.5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.marketing)} r="3.5" fill="#0ea5e9" stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Platform Usage Vertical Bar Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Platform Usage</h2>
            <p className="text-[11px] text-slate-400">Monthly active user sessions by platform</p>
          </div>

          <div className="h-40 flex items-end justify-between px-4 pt-4 border-b border-slate-100">
            {platformUsage.map((p) => {
              const hPct = (p.val / 160) * 100;
              return (
                <div key={p.platform} className="flex flex-col items-center flex-1 max-w-[60px] group">
                  <span className="text-[10px] font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.label}
                  </span>
                  <div className="w-8 sm:w-10 bg-indigo-600 rounded-t-lg transition-all duration-500 hover:bg-indigo-700" style={{ height: `${hPct}%` }} />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-4 pt-2 text-[10px] text-slate-500 font-semibold">
            {platformUsage.map(p => (
              <span key={p.platform} className="flex-1 text-center truncate">{p.platform}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Users Table (Left) + System Activity Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recent Users Table (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Users</h2>
              <p className="text-[11px] text-slate-400">Newly onboarded platform accounts across roles</p>
            </div>
            <button 
              onClick={() => onNavigate('admin-users')}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Joined At</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-500">{u.email}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${u.roleBadge}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">{u.joinedAt}</td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: System Activity Feed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">System Activity</h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="space-y-3 pt-1">
            {systemActivities.map((act) => (
              <div key={act.id} className="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <span className={`w-2 h-2 rounded-full ${act.color} mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">{act.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

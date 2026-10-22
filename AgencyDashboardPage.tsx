import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  Eye, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Youtube, 
  Instagram, 
  Video, 
  Linkedin, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowUpRight, 
  Search, 
  ChevronDown, 
  HelpCircle,
  Briefcase,
  Layers,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AgencyDashboardPageProps {
  onNavigate: (page: string) => void;
}

export const AgencyDashboardPage: React.FC<AgencyDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [activePlatformFilter, setActivePlatformFilter] = useState('all');

  // KPI metrics matching Agency Dashboard screenshot
  const kpis = [
    {
      id: 'creators',
      label: 'Total Creators',
      value: '12',
      badge: '+3 this month',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Users,
      iconColor: 'text-indigo-600 bg-indigo-50'
    },
    {
      id: 'followers',
      label: 'Total Followers',
      value: '2.4M',
      badge: '+18.5%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Users,
      iconColor: 'text-blue-600 bg-blue-50'
    },
    {
      id: 'views',
      label: 'Total Views',
      value: '18.7M',
      badge: '+22.1%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Eye,
      iconColor: 'text-sky-600 bg-sky-50'
    },
    {
      id: 'campaigns',
      label: 'Active Campaigns',
      value: '5',
      badge: null,
      icon: Calendar,
      iconColor: 'text-indigo-600 bg-indigo-50'
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: '₹3,48,600',
      badge: '+27.3%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: DollarSign,
      iconColor: 'text-amber-600 bg-amber-50'
    }
  ];

  // Overall Performance Line Chart (Followers, Views, Engagement over Aug 17 - Sep 14)
  const performanceData = [
    { date: 'Aug 17', followers: 1.8, views: 12.0, engagement: 4.8 },
    { date: 'Aug 24', followers: 2.0, views: 13.5, engagement: 5.2 },
    { date: 'Aug 31', followers: 2.1, views: 15.0, engagement: 5.8 },
    { date: 'Sep 7',  followers: 2.3, views: 16.8, engagement: 6.2 },
    { date: 'Sep 14', followers: 2.4, views: 18.7, engagement: 6.8 }
  ];

  // Chart coordinate mapping
  const chartW = 560;
  const chartH = 180;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;
  const maxVal = 20; // 0 to 20M

  const getX = (idx: number) => padLeft + (idx / (performanceData.length - 1)) * innerW;
  const getY = (val: number) => padTop + innerH - (val / maxVal) * innerH;

  const followersPath = performanceData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.followers * 3); // scaled for visual distinction
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const viewsPath = performanceData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.views);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const engagementPath = performanceData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.engagement * 1.8);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Creators Overview List matching screenshot
  const creatorsList = [
    {
      id: 1,
      name: 'Tech With Riya',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      platforms: ['youtube', 'instagram'],
      followers: '450K',
      views: '5.2M',
      engagement: '7.8%',
      revenue: '₹85,000',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Foodie Diaries',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      platforms: ['instagram', 'tiktok'],
      followers: '320K',
      views: '3.1M',
      engagement: '6.4%',
      revenue: '₹62,000',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Travel With Arjun',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      platforms: ['youtube', 'instagram'],
      followers: '280K',
      views: '4.8M',
      engagement: '8.1%',
      revenue: '₹70,000',
      status: 'Active'
    },
    {
      id: 4,
      name: 'Fitness Hub',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      platforms: ['instagram', 'tiktok'],
      followers: '210K',
      views: '2.4M',
      engagement: '5.9%',
      revenue: '₹45,000',
      status: 'Inactive'
    },
    {
      id: 5,
      name: 'Study Capsule',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      platforms: ['youtube', 'instagram'],
      followers: '190K',
      views: '2.1M',
      engagement: '6.7%',
      revenue: '₹38,000',
      status: 'Active'
    }
  ];

  const filteredCreators = creatorsList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-10">
      {/* Dashboard Identifier Title matching screenshot */}
      <div className="text-center py-2 bg-indigo-50/70 border border-indigo-200/60 rounded-2xl">
        <h1 className="text-sm font-black text-indigo-950 tracking-tight">Agency Dashboard</h1>
        <p className="text-[11px] text-indigo-700">For agencies to manage multiple creators and compare their performance.</p>
      </div>

      {/* Top Controls: Search, Date Filter, Profile Quick Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, campaigns..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
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
            onClick={() => onNavigate('my-profile')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            title="Edit Agency Personal and Professional details"
          >
            <Building className="w-3.5 h-3.5" />
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
                {kpi.badge && (
                  <div className="mt-1">
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ↑ {kpi.badge}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Overall Performance & Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Overall Performance (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Overall Performance</h2>
              <p className="text-[11px] text-slate-400">Total reach across represented creator portfolio</p>
            </div>
            {/* Legend */}
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Followers</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                <span>Views</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Engagement</span>
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-48 select-none">
              {/* Horizontal Grid lines */}
              {[0, 5, 10, 15, 20].map((v) => {
                const y = getY(v);
                return (
                  <g key={v}>
                    <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                      {v === 0 ? '0' : `${v / 3 > 1 ? Math.round(v / 3) : v}M`}
                    </text>
                  </g>
                );
              })}

              {/* Paths */}
              <path d={viewsPath} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" />
              <path d={followersPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
              <path d={engagementPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data points & X Labels */}
              {performanceData.map((d, i) => {
                const x = getX(i);
                return (
                  <g key={d.date}>
                    <text x={x} y={chartH - 6} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                      {d.date}
                    </text>
                    <circle cx={x} cy={getY(d.views)} r="3.5" fill="#ec4899" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.followers * 3)} r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.engagement * 1.8)} r="3.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Platform Distribution Donut (1 Column) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Platform Distribution</h2>
            <p className="text-[11px] text-slate-400">Audience share by social platform</p>
          </div>

          <div className="my-3 flex items-center justify-center relative">
            {/* Donut SVG */}
            <svg viewBox="0 0 160 160" className="w-36 h-36 -rotate-90">
              {/* Instagram 42% */}
              <circle cx="80" cy="80" r="54" fill="transparent" stroke="#ec4899" strokeWidth="20" strokeDasharray="142 340" strokeDashoffset="0" />
              {/* YouTube 28% */}
              <circle cx="80" cy="80" r="54" fill="transparent" stroke="#ef4444" strokeWidth="20" strokeDasharray="95 340" strokeDashoffset="-142" />
              {/* TikTok 18% */}
              <circle cx="80" cy="80" r="54" fill="transparent" stroke="#0f172a" strokeWidth="20" strokeDasharray="61 340" strokeDashoffset="-237" />
              {/* LinkedIn 8% */}
              <circle cx="80" cy="80" r="54" fill="transparent" stroke="#2563eb" strokeWidth="20" strokeDasharray="27 340" strokeDashoffset="-298" />
              {/* Others 4% */}
              <circle cx="80" cy="80" r="54" fill="transparent" stroke="#94a3b8" strokeWidth="20" strokeDasharray="14 340" strokeDashoffset="-325" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-black text-slate-900 leading-none">2.4M</span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total Followers</span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                <span>Instagram</span>
              </span>
              <span className="font-bold text-slate-900">42%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>YouTube</span>
              </span>
              <span className="font-bold text-slate-900">28%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                <span>TikTok</span>
              </span>
              <span className="font-bold text-slate-900">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>LinkedIn</span>
              </span>
              <span className="font-bold text-slate-900">8%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Others</span>
              </span>
              <span className="font-bold text-slate-900">4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Creators Overview matching screenshot */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Creators Overview</h2>
            <p className="text-[11px] text-slate-400">Individual performance comparison for represented talents</p>
          </div>
          <button 
            onClick={() => onNavigate('profile-view')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View All</span>
            <span>→</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Creator</th>
                <th className="pb-3">Platforms</th>
                <th className="pb-3">Followers</th>
                <th className="pb-3">Views</th>
                <th className="pb-3">Engagement</th>
                <th className="pb-3">Revenue</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredCreators.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pl-2 flex items-center space-x-3">
                    <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                    <span className="font-bold text-slate-900">{c.name}</span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center space-x-1.5">
                      {c.platforms.includes('youtube') && (
                        <div className="p-1 rounded bg-red-50 text-red-600">
                          <Youtube className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {c.platforms.includes('instagram') && (
                        <div className="p-1 rounded bg-pink-50 text-pink-600">
                          <Instagram className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {c.platforms.includes('tiktok') && (
                        <div className="p-1 rounded bg-slate-100 text-slate-800">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 font-bold text-slate-900">{c.followers}</td>
                  <td className="py-3.5 text-slate-600">{c.views}</td>
                  <td className="py-3.5 font-semibold text-emerald-600">{c.engagement}</td>
                  <td className="py-3.5 font-bold text-slate-900">{c.revenue}</td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

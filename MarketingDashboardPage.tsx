import React, { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Eye, 
  BarChart2, 
  Youtube, 
  Instagram, 
  Video, 
  Sparkles, 
  Briefcase, 
  Award, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MarketingDashboardPageProps {
  onNavigate: (page: string) => void;
}

export const MarketingDashboardPage: React.FC<MarketingDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // 5 KPI Metric Cards matching screenshot
  const kpis = [
    {
      id: 'campaigns',
      label: 'Total Campaigns',
      value: '8',
      badge: '2 active',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Target,
      iconColor: 'text-indigo-600 bg-indigo-50'
    },
    {
      id: 'reach',
      label: 'Total Reach',
      value: '12.4M',
      badge: '+25.3%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Users,
      iconColor: 'text-blue-600 bg-blue-50'
    },
    {
      id: 'engagement',
      label: 'Total Engagement',
      value: '986K',
      badge: '+18.7%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: TrendingUp,
      iconColor: 'text-purple-600 bg-purple-50'
    },
    {
      id: 'spend',
      label: 'Total Spend',
      value: '₹4,20,000',
      badge: null,
      icon: DollarSign,
      iconColor: 'text-amber-600 bg-amber-50'
    },
    {
      id: 'roi',
      label: 'ROI',
      value: '3.2x',
      badge: '+12.5%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Award,
      iconColor: 'text-emerald-600 bg-emerald-50'
    }
  ];

  // Campaign Performance line chart data (Aug 17 - Sep 14)
  const lineData = [
    { date: 'Aug 17', reach: 2.1, engagement: 2.4, conversions: 1.2 },
    { date: 'Aug 24', reach: 3.8, engagement: 3.2, conversions: 2.1 },
    { date: 'Aug 31', reach: 5.6, engagement: 4.8, conversions: 3.6 },
    { date: 'Sep 7',  reach: 7.4, engagement: 6.2, conversions: 4.8 },
    { date: 'Sep 14', reach: 8.0, engagement: 6.8, conversions: 5.4 }
  ];

  // Top Performing Campaigns horizontal bar data
  const topCampaigns = [
    { name: 'Summer Sale 2026', value: 3.8, label: '3.8M' },
    { name: 'Back to College', value: 2.5, label: '2.5M' },
    { name: 'New Product', value: 2.1, label: '2.1M' },
    { name: 'Festive Offer', value: 1.4, label: '1.4M' },
    { name: 'Brand Awareness', value: 0.9, label: '0.9M' }
  ];

  // Recent Campaigns Table data matching screenshot
  const recentCampaigns = [
    {
      id: 1,
      name: 'Summer Sale 2026',
      creators: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80'
      ],
      extraCreators: '+3',
      platforms: ['instagram', 'youtube'],
      reach: '4.2M',
      engagement: '320K',
      spend: '₹1,20,000',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Back to College',
      creators: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'
      ],
      extraCreators: '+5',
      platforms: ['youtube'],
      reach: '3.1M',
      engagement: '240K',
      spend: '₹1,00,000',
      status: 'Active'
    },
    {
      id: 3,
      name: 'New Product Launch',
      creators: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80'
      ],
      extraCreators: '+4',
      platforms: ['tiktok'],
      reach: '2.8M',
      engagement: '180K',
      spend: '₹80,000',
      status: 'Completed'
    },
    {
      id: 4,
      name: 'Festive Offer',
      creators: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'
      ],
      extraCreators: '+2',
      platforms: ['instagram'],
      reach: '1.9M',
      engagement: '120K',
      spend: '₹60,000',
      status: 'Active'
    },
    {
      id: 5,
      name: 'Brand Awareness',
      creators: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80'
      ],
      extraCreators: '+6',
      platforms: ['youtube', 'instagram'],
      reach: '1.5M',
      engagement: '98K',
      spend: '₹40,000',
      status: 'Planning'
    }
  ];

  // SVG coordinate calculations for line chart
  const chartW = 520;
  const chartH = 170;
  const padLeft = 30;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;
  const maxVal = 8; // 0 to 8

  const getX = (idx: number) => padLeft + (idx / (lineData.length - 1)) * innerW;
  const getY = (val: number) => padTop + innerH - (val / maxVal) * innerH;

  const reachPath = lineData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.reach);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const engagementPath = lineData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.engagement);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const conversionsPath = lineData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.conversions);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-10">
      {/* Header Banner Subtitle matching screenshot */}
      <div className="text-center py-2 bg-sky-50/70 border border-sky-200/60 rounded-2xl">
        <h1 className="text-sm font-black text-sky-950 tracking-tight">Marketing Team Dashboard</h1>
        <p className="text-[11px] text-sky-700">For marketing teams to manage campaigns, track performance and analyze content.</p>
      </div>

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, influencers..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
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
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            title="Edit Brand Personal and Professional details"
          >
            <Target className="w-3.5 h-3.5" />
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
                    <span>Allocated Q4</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Campaign Performance & Top Performing Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Campaign Performance Line Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Campaign Performance</h2>
              <p className="text-[11px] text-slate-400">Live multi-campaign flight metrics</p>
            </div>
            {/* Legend */}
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Reach (M)</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <span>Engagement (K)</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                <span>Conversions (K)</span>
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 select-none">
              {[0, 2, 4, 6, 8].map((v) => {
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

              <path d={reachPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
              <path d={engagementPath} fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
              <path d={conversionsPath} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" />

              {lineData.map((d, i) => {
                const x = getX(i);
                return (
                  <g key={d.date}>
                    <text x={x} y={chartH - 6} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                      {d.date}
                    </text>
                    <circle cx={x} cy={getY(d.reach)} r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.engagement)} r="3.5" fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={x} cy={getY(d.conversions)} r="3.5" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Top Performing Campaigns Horizontal Bar Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Top Performing Campaigns</h2>
            <p className="text-[11px] text-slate-400">Ranked by total impressions &amp; conversions</p>
          </div>

          <div className="space-y-2.5 my-2">
            {topCampaigns.map((camp) => (
              <div key={camp.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate">{camp.name}</span>
                  <span className="font-bold text-slate-900">{camp.label}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(camp.value / 4.0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* X Axis scale */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
            <span>0</span>
            <span>1M</span>
            <span>2M</span>
            <span>3M</span>
            <span>4M</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Campaigns Table (Left) + Distribution / Audience (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recent Campaigns Table (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Campaigns</h2>
              <p className="text-[11px] text-slate-400">Live active influencer contracts and deliverable status</p>
            </div>
            <button 
              onClick={() => onNavigate('profile-view')}
              className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Campaign</th>
                  <th className="pb-3">Creators</th>
                  <th className="pb-3">Platform</th>
                  <th className="pb-3">Reach</th>
                  <th className="pb-3">Engagement</th>
                  <th className="pb-3">Spend</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {recentCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3.5">
                      <div className="flex items-center -space-x-1.5">
                        {c.creators.map((img, i) => (
                          <img key={i} src={img} alt="creator" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                        ))}
                        <span className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-[9px] font-bold text-slate-600 flex items-center justify-center">
                          {c.extraCreators}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center space-x-1">
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
                    <td className="py-3.5 font-bold text-slate-900">{c.reach}</td>
                    <td className="py-3.5 text-slate-600">{c.engagement}</td>
                    <td className="py-3.5 font-bold text-slate-900">{c.spend}</td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : c.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
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

        {/* Right Stack: Content Distribution & Audience by Location */}
        <div className="space-y-4">
          {/* Content Distribution Donut */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Content Distribution</h2>
            <div className="flex items-center justify-between mt-2">
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-24 h-24 -rotate-90">
                  {/* Video 52% */}
                  <circle cx="60" cy="60" r="42" fill="transparent" stroke="#2563eb" strokeWidth="16" strokeDasharray="137 264" strokeDashoffset="0" />
                  {/* Image 28% */}
                  <circle cx="60" cy="60" r="42" fill="transparent" stroke="#38bdf8" strokeWidth="16" strokeDasharray="74 264" strokeDashoffset="-137" />
                  {/* Reel/Shorts 15% */}
                  <circle cx="60" cy="60" r="42" fill="transparent" stroke="#6366f1" strokeWidth="16" strokeDasharray="40 264" strokeDashoffset="-211" />
                  {/* Carousel 5% */}
                  <circle cx="60" cy="60" r="42" fill="transparent" stroke="#93c5fd" strokeWidth="16" strokeDasharray="13 264" strokeDashoffset="-251" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-slate-900">278</span>
                  <span className="text-[8px] text-slate-400 uppercase font-semibold">Total Posts</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="text-slate-600">Video</span>
                  <span className="font-bold text-slate-900 ml-auto">52%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="text-slate-600">Image</span>
                  <span className="font-bold text-slate-900 ml-auto">28%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="text-slate-600">Reel/Shorts</span>
                  <span className="font-bold text-slate-900 ml-auto">15%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                  <span className="text-slate-600">Carousel</span>
                  <span className="font-bold text-slate-900 ml-auto">5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audience by Location */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Audience by Location</h2>
            <div className="space-y-1.5 text-xs">
              {[
                { country: 'India', pct: 49 },
                { country: 'USA', pct: 22 },
                { country: 'UK', pct: 12 },
                { country: 'Canada', pct: 9 },
                { country: 'Others', pct: 8 }
              ].map((loc) => (
                <div key={loc.country} className="flex items-center space-x-2">
                  <span className="w-14 text-slate-600 truncate">{loc.country}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${loc.pct}%` }} />
                  </div>
                  <span className="text-slate-900 font-bold w-7 text-right">{loc.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

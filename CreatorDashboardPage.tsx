import React, { useState, useMemo } from 'react';
import { 
  Users, 
  User,
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Crown, 
  HelpCircle, 
  Plus, 
  Youtube, 
  Instagram, 
  Video, 
  ArrowUp,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  Award,
  Layers,
  Sparkles,
  DollarSign,
  Activity,
  Calendar,
  Check,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService, creatorService } from '../../services/api';
import { ContentItem } from '../../types/auth';

interface CreatorDashboardPageProps {
  onNavigate: (page: string) => void;
  searchQuery?: string;
  selectedDateRange?: string;
  selectedPlatform?: string;
}

export const CreatorDashboardPage: React.FC<CreatorDashboardPageProps> = ({ 
  onNavigate,
  searchQuery = '',
  selectedDateRange = '30d',
  selectedPlatform = 'all'
}) => {
  const { user, token } = useAuth();

  // Active tabs state
  const [activePlatformFilter, setActivePlatformFilter] = useState<string>('all');
  const [contentMetricTab, setContentMetricTab] = useState<'views' | 'likes' | 'comments' | 'shares'>('views');
  const [demographicsTab, setDemographicsTab] = useState<'age' | 'gender' | 'location' | 'device'>('age');
  const [growthTimeRange, setGrowthTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [contentViewMode, setContentViewMode] = useState<'daily' | 'weekly'>('daily');

  // Content Table vs Calendar Tab
  const [contentViewTab, setContentViewTab] = useState<'posts' | 'calendar'>('posts');
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostPlatform, setNewPostPlatform] = useState('youtube');
  const [newPostType, setNewPostType] = useState('video');
  const [newPostStatus, setNewPostStatus] = useState<'published' | 'scheduled'>('published');
  const [newPostDate, setNewPostDate] = useState('');
  const [liveContent, setLiveContent] = useState<ContentItem[]>([]);

  // Hover state for interactive tooltips
  const [hoveredGrowthIndex, setHoveredGrowthIndex] = useState<number | null>(null);
  const [hoveredContentBarIndex, setHoveredContentBarIndex] = useState<number | null>(null);
  const [hoveredEngagementIndex, setHoveredEngagementIndex] = useState<number | null>(null);
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState<number | null>(null);

  // Backend connection verification state
  const [isVerifyingBackend, setIsVerifyingBackend] = useState(false);
  const [backendPingResult, setBackendPingResult] = useState<{
    status: 'idle' | 'success' | 'error';
    latencyMs?: number;
    message?: string;
    verifiedUser?: string;
  }>({ status: 'idle' });

  // Creator identity for HARSHITHA S
  const creatorFullName = user?.name || 'HARSHITHA S';
  const creatorFirstName = creatorFullName.split(' ')[0] || 'HARSHITHA';
  const creatorEmail = user?.email || 'sharshitha28007@gmail.com';

  // Test live backend JWT authentication ping
  const handleVerifyBackend = async () => {
    setIsVerifyingBackend(true);
    const start = performance.now();
    try {
      const res = await authService.getMe();
      const latency = Math.round(performance.now() - start);
      if (res.success && res.user) {
        setBackendPingResult({
          status: 'success',
          latencyMs: latency,
          message: `Backend JWT 200 OK (${latency}ms)`,
          verifiedUser: res.user.name
        });
      } else {
        setBackendPingResult({
          status: 'error',
          message: 'Backend session unverified'
        });
      }
    } catch (err: any) {
      setBackendPingResult({
        status: 'error',
        message: err.message || 'Backend connection error'
      });
    } finally {
      setIsVerifyingBackend(false);
    }
  };

  // Fetch live creator content on mount
  React.useEffect(() => {
    creatorService.getContent().then(res => {
      if (res.success && res.content) setLiveContent(res.content);
    }).catch(console.warn);
  }, []);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;
    try {
      const res = await creatorService.createContent({
        title: newPostTitle.trim(),
        platform: newPostPlatform,
        type: newPostType,
        status: newPostStatus,
        scheduledDate: newPostStatus === 'scheduled' ? newPostDate || new Date(Date.now() + 86400000 * 3).toISOString() : undefined
      });
      if (res.success) {
        setShowAddContentModal(false);
        setNewPostTitle('');
        const refreshed = await creatorService.getContent();
        if (refreshed.success) setLiveContent(refreshed.content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1. SIX STATISTIC CARDS
  const statsCards = [
    {
      id: 'followers',
      label: 'Total Followers',
      value: '125,430',
      growth: '12.4%',
      subtext: '+13,800 from last month',
      iconColor: 'bg-purple-50 text-purple-600',
      icon: Users
    },
    {
      id: 'views',
      label: 'Total Views',
      value: '1.8M',
      growth: '18.7%',
      subtext: '+285K from last month',
      iconColor: 'bg-blue-50 text-blue-600',
      icon: Eye
    },
    {
      id: 'likes',
      label: 'Total Likes',
      value: '98,240',
      growth: '15.3%',
      subtext: '+13K from last month',
      iconColor: 'bg-rose-50 text-rose-500',
      icon: Heart
    },
    {
      id: 'comments',
      label: 'Comments',
      value: '8,932',
      growth: '11.6%',
      subtext: '+930 from last month',
      iconColor: 'bg-sky-50 text-sky-600',
      icon: MessageSquare
    },
    {
      id: 'shares',
      label: 'Shares',
      value: '6,120',
      growth: '9.8%',
      subtext: '+550 from last month',
      iconColor: 'bg-purple-50 text-purple-600',
      icon: Share2
    },
    {
      id: 'engagement',
      label: 'Engagement Rate',
      value: '6.8%',
      growth: '1.2%',
      subtext: 'vs last month',
      iconColor: 'bg-amber-50 text-amber-500',
      icon: Crown
    }
  ];

  // 2. FOLLOWER GROWTH LINE CHART DATA (YouTube, Instagram, TikTok, LinkedIn)
  const growthDataByRange = {
    '7d': [
      { date: 'Sep 10', youtube: 142000, instagram: 101000, tiktok: 63000, linkedin: 21000 },
      { date: 'Sep 11', youtube: 145000, instagram: 104000, tiktok: 66000, linkedin: 22000 },
      { date: 'Sep 12', youtube: 151000, instagram: 109000, tiktok: 70000, linkedin: 23500 },
      { date: 'Sep 13', youtube: 158000, instagram: 114000, tiktok: 74000, linkedin: 25000 },
      { date: 'Sep 14', youtube: 164000, instagram: 118000, tiktok: 78000, linkedin: 26200 },
      { date: 'Sep 15', youtube: 170000, instagram: 122000, tiktok: 81000, linkedin: 27100 },
      { date: 'Sep 16', youtube: 176000, instagram: 125000, tiktok: 84000, linkedin: 28000 }
    ],
    '30d': [
      { date: 'Aug 17', youtube: 25000, instagram: 18000, tiktok: 14000, linkedin: 8000 },
      { date: 'Aug 22', youtube: 45000, instagram: 30000, tiktok: 20000, linkedin: 11000 },
      { date: 'Aug 27', youtube: 65000, instagram: 42000, tiktok: 26000, linkedin: 13000 },
      { date: 'Sep 1',  youtube: 82000, instagram: 60000, tiktok: 34000, linkedin: 15000 },
      { date: 'Sep 6',  youtube: 115000, instagram: 82000, tiktok: 48000, linkedin: 17000 },
      { date: 'Sep 11', youtube: 145000, instagram: 104000, tiktok: 66000, linkedin: 22000 },
      { date: 'Sep 16', youtube: 176000, instagram: 125000, tiktok: 84000, linkedin: 28000 }
    ],
    '90d': [
      { date: 'Jun 15', youtube: 15000, instagram: 12000, tiktok: 9000, linkedin: 5000 },
      { date: 'Jul 01', youtube: 32000, instagram: 24000, tiktok: 16000, linkedin: 8500 },
      { date: 'Jul 15', youtube: 55000, instagram: 39000, tiktok: 24000, linkedin: 11500 },
      { date: 'Aug 01', youtube: 78000, instagram: 56000, tiktok: 32000, linkedin: 14500 },
      { date: 'Aug 15', youtube: 108000, instagram: 78000, tiktok: 46000, linkedin: 17200 },
      { date: 'Sep 01', youtube: 142000, instagram: 102000, tiktok: 64000, linkedin: 21500 },
      { date: 'Sep 16', youtube: 176000, instagram: 125000, tiktok: 84000, linkedin: 28000 }
    ],
    '1y': [
      { date: 'Q4 25', youtube: 8000, instagram: 6500, tiktok: 4200, linkedin: 2400 },
      { date: 'Q1 26', youtube: 28000, instagram: 22000, tiktok: 15000, linkedin: 7800 },
      { date: 'Q2 26', youtube: 72000, instagram: 54000, tiktok: 35000, linkedin: 14200 },
      { date: 'Q3 26', youtube: 176000, instagram: 125000, tiktok: 84000, linkedin: 28000 }
    ]
  };

  const growthPoints = growthDataByRange[growthTimeRange];

  // SVG dimensions for Follower Growth Chart
  const lineW = 600;
  const lineH = 200;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const chartW = lineW - padLeft - padRight;
  const chartH = lineH - padTop - padBottom;
  const maxFollowers = 200000;

  const getLineX = (i: number) => padLeft + (i / (growthPoints.length - 1)) * chartW;
  const getLineY = (val: number) => padTop + chartH - (val / maxFollowers) * chartH;

  const buildPath = (key: 'youtube' | 'instagram' | 'tiktok' | 'linkedin') => {
    return growthPoints.reduce((acc, curr, idx) => {
      const x = getLineX(idx);
      const y = getLineY(curr[key]);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  // 3. CONTENT PERFORMANCE BAR CHART DATA
  const dailyContentPerformanceBars = [
    { day: 'Mon', views: 35000, likes: 4200, comments: 450, shares: 620 },
    { day: 'Tue', views: 68000, likes: 8100, comments: 720, shares: 980 },
    { day: 'Wed', views: 95000, likes: 11200, comments: 980, shares: 1400 },
    { day: 'Thu', views: 118000, likes: 14500, comments: 1250, shares: 1850 },
    { day: 'Fri', views: 178000, likes: 21400, comments: 1950, shares: 2900 },
    { day: 'Sat', views: 110000, likes: 13800, comments: 1100, shares: 1720 },
    { day: 'Sun', views: 72000, likes: 8900, comments: 840, shares: 1150 }
  ];

  const weeklyContentPerformanceBars = [
    { day: 'Week 1', views: 145000, likes: 18200, comments: 1650, shares: 2400 },
    { day: 'Week 2', views: 162000, likes: 20400, comments: 1980, shares: 2950 },
    { day: 'Week 3', views: 192000, likes: 24500, comments: 2420, shares: 3600 },
    { day: 'Week 4', views: 215000, likes: 27800, comments: 2850, shares: 4120 }
  ];

  const contentPerformanceBars = contentViewMode === 'daily' 
    ? dailyContentPerformanceBars 
    : weeklyContentPerformanceBars;

  const maxContentVal = contentViewMode === 'daily' ? 200000 : 250000;

  // 4. NEW: 30-DAY ENGAGEMENT RATE TREND DATA (Area Trend Chart)
  const engagementTrendPoints = [
    { date: 'Aug 18', rate: 4.8, impressions: 42000 },
    { date: 'Aug 23', rate: 5.2, impressions: 58000 },
    { date: 'Aug 28', rate: 5.6, impressions: 75000 },
    { date: 'Sep 02', rate: 6.1, impressions: 92000 },
    { date: 'Sep 07', rate: 7.9, impressions: 164000, note: 'Viral Tech Reel' },
    { date: 'Sep 12', rate: 6.9, impressions: 128000 },
    { date: 'Sep 16', rate: 6.8, impressions: 145000 }
  ];

  const engW = 600;
  const engH = 160;
  const engPadL = 40;
  const engPadR = 20;
  const engPadT = 15;
  const engPadB = 25;
  const engChartW = engW - engPadL - engPadR;
  const engChartH = engH - engPadT - engPadB;
  const maxEngRate = 10.0;

  const getEngX = (i: number) => engPadL + (i / (engagementTrendPoints.length - 1)) * engChartW;
  const getEngY = (rate: number) => engPadT + engChartH - (rate / maxEngRate) * engChartH;

  const engLinePath = engagementTrendPoints.reduce((acc, curr, idx) => {
    const x = getEngX(idx);
    const y = getEngY(curr.rate);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const engAreaPath = `${engLinePath} L ${getEngX(engagementTrendPoints.length - 1)} ${engPadT + engChartH} L ${engPadL} ${engPadT + engChartH} Z`;

  // 5. NEW: MULTI-PLATFORM REACH COMPARISON DATA (Horizontal Bar Chart)
  const platformComparison = [
    { platform: 'YouTube', followers: '185K', reach: '1.2M', share: 42, color: 'bg-red-500', barColor: '#ef4444' },
    { platform: 'TikTok', followers: '310K', reach: '820K', share: 28, color: 'bg-slate-900', barColor: '#0f172a' },
    { platform: 'Instagram', followers: '94.2K', reach: '540K', share: 19, color: 'bg-pink-500', barColor: '#ec4899' },
    { platform: 'LinkedIn', followers: '28.0K', reach: '180K', share: 7, color: 'bg-sky-600', barColor: '#0284c7' },
    { platform: 'Twitter / X', followers: '45.0K', reach: '110K', share: 4, color: 'bg-indigo-600', barColor: '#4f46e5' }
  ];

  // 6. NEW: CONTENT FORMAT PERFORMANCE DATA (Bar comparison)
  const formatBreakdown = [
    { type: 'Shorts & Reels', views: '890K', engagement: '8.4%', count: 18, pct: 85, color: '#8b5cf6' },
    { type: 'Long-Form Tutorials', views: '540K', engagement: '7.1%', count: 6, pct: 60, color: '#3b82f6' },
    { type: 'Tech Carousels', views: '280K', engagement: '5.9%', count: 12, pct: 38, color: '#ec4899' },
    { type: 'Live Code Streams', views: '140K', engagement: '9.2%', count: 3, pct: 24, color: '#10b981' }
  ];

  // 7. TOP PERFORMING POSTS (Curated for HARSHITHA S)
  const topPosts = [
    {
      id: 1,
      title: 'Full-Stack AI Dashboard in 2026: Architecting Scalable Web Apps',
      type: 'Video',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=120&auto=format&fit=crop&q=80',
      platform: 'youtube',
      views: '145K',
      likes: '11.4K',
      comments: '820',
      engagement: '8.4%',
      published: 'Sep 12, 2026'
    },
    {
      id: 2,
      title: 'A Day in My Life as a Tech Creator in Bangalore 💻✨',
      type: 'Reel',
      thumbnail: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=120&auto=format&fit=crop&q=80',
      platform: 'instagram',
      views: '112K',
      likes: '8.2K',
      comments: '490',
      engagement: '7.6%',
      published: 'Sep 10, 2026'
    },
    {
      id: 3,
      title: 'Top 5 VS Code AI Extensions You Actually Need in 2026',
      type: 'Video',
      thumbnail: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120&auto=format&fit=crop&q=80',
      platform: 'tiktok',
      views: '95K',
      likes: '7.4K',
      comments: '580',
      engagement: '7.8%',
      published: 'Sep 8, 2026'
    },
    {
      id: 4,
      title: 'How I Landed My First ₹2 Lakh Tech Brand Sponsorship',
      type: 'Carousel',
      thumbnail: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=120&auto=format&fit=crop&q=80',
      platform: 'instagram',
      views: '78K',
      likes: '5.9K',
      comments: '390',
      engagement: '6.9%',
      published: 'Sep 5, 2026'
    },
    {
      id: 5,
      title: 'Python Flask REST API vs Node TypeScript: Complete Benchmark',
      type: 'Video',
      thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=120&auto=format&fit=crop&q=80',
      platform: 'youtube',
      views: '68K',
      likes: '4.8K',
      comments: '310',
      engagement: '6.5%',
      published: 'Sep 2, 2026'
    }
  ];

  // Filter posts based on header search or active platform
  const displayedPosts = useMemo(() => {
    return topPosts.filter(p => {
      const matchPlat = activePlatformFilter === 'all' || p.platform === activePlatformFilter;
      const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPlat && matchSearch;
    });
  }, [topPosts, activePlatformFilter, searchQuery]);

  // 8. AUDIENCE DEMOGRAPHICS DATA
  const demographicsBreakdown = {
    age: [
      { label: '18-24', percent: 48, dotColor: '#3b82f6' },
      { label: '25-34', percent: 32, dotColor: '#8b5cf6' },
      { label: '13-17', percent: 12, dotColor: '#06b6d4' },
      { label: '35-44', percent: 6, dotColor: '#cbd5e1' },
      { label: '45+', percent: 2, dotColor: '#94a3b8' }
    ],
    gender: [
      { label: 'Female', percent: 54, dotColor: '#ec4899' },
      { label: 'Male', percent: 41, dotColor: '#3b82f6' },
      { label: 'Other', percent: 5, dotColor: '#8b5cf6' }
    ],
    location: [
      { label: 'India', percent: 64, dotColor: '#8b5cf6' },
      { label: 'United States', percent: 18, dotColor: '#3b82f6' },
      { label: 'UK & Europe', percent: 11, dotColor: '#06b6d4' },
      { label: 'Others', percent: 7, dotColor: '#94a3b8' }
    ],
    device: [
      { label: 'Mobile App', percent: 78, dotColor: '#8b5cf6' },
      { label: 'Desktop / Web', percent: 18, dotColor: '#3b82f6' },
      { label: 'Tablet / TV', percent: 4, dotColor: '#cbd5e1' }
    ]
  };

  const currentDemographics = demographicsBreakdown[demographicsTab];

  // Monthly revenue breakdown
  const monthlyRevenueData = [
    { month: 'Apr', amount: 28400, height: 42 },
    { month: 'May', amount: 32600, height: 55 },
    { month: 'Jun', amount: 37900, height: 68 },
    { month: 'Jul', amount: 41200, height: 75 },
    { month: 'Aug', amount: 44800, height: 86 },
    { month: 'Sep', amount: 48250, height: 100 }
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-10">
      
      {/* 0. LIVE BACKEND AUTHENTICATION STATUS BANNER */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-3.5 shadow-sm border border-purple-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xs tracking-wide text-white uppercase flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Backend Authentication Connected</span>
              </span>
              <span className="text-[10px] bg-purple-400/20 text-purple-200 border border-purple-300/30 px-2 py-0.2 rounded-full font-mono">
                JWT Active
              </span>
            </div>
            <p className="text-[11px] text-purple-200/90 truncate mt-0.5">
              Creator Account: <strong className="text-white">{creatorFullName}</strong> ({creatorEmail}) • Role: <strong>Creator Pro</strong> • Base URL: <code className="text-purple-300 font-mono">/api</code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {backendPingResult.status === 'success' && (
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{backendPingResult.message}</span>
            </span>
          )}

          <button
            onClick={handleVerifyBackend}
            disabled={isVerifyingBackend}
            className="px-3 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Ping GET /api/auth/me to verify backend token session"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingBackend ? 'animate-spin' : ''}`} />
            <span>{isVerifyingBackend ? 'Verifying...' : 'Test Backend Auth Ping'}</span>
          </button>

          <button
            onClick={() => onNavigate('my-profile')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md"
            title="Edit Personal and Professional details"
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile: Personal &amp; Professional</span>
          </button>

          <button
            onClick={() => onNavigate('reset-password')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            title="Open Email Verification & Password Reset workflow"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-300" />
            <span>Reset Password</span>
          </button>
        </div>
      </div>

      {/* 1. GREETING & PLATFORM FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Good evening, {creatorFirstName}!</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here's an overview of your content performance, trend analysis, and revenue across all platforms.
          </p>
        </div>

        {/* Platform Filter Buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActivePlatformFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activePlatformFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Platforms
          </button>

          <button
            onClick={() => setActivePlatformFilter('youtube')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
              activePlatformFilter === 'youtube'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-3.5 h-3.5 bg-red-600 rounded-sm flex items-center justify-center text-white text-[8px] font-bold">
              ▶
            </span>
            <span>YouTube</span>
          </button>

          <button
            onClick={() => setActivePlatformFilter('instagram')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
              activePlatformFilter === 'instagram'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-[9px]">
              📷
            </span>
            <span>Instagram</span>
          </button>

          <button
            onClick={() => setActivePlatformFilter('tiktok')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
              activePlatformFilter === 'tiktok'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-3.5 h-3.5 bg-slate-900 rounded-sm flex items-center justify-center text-white text-[9px] font-bold">
              ♪
            </span>
            <span>TikTok</span>
          </button>

          <button
            onClick={() => onNavigate('social-accounts')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-800 transition-all shrink-0"
          >
            + Add Platform
          </button>
        </div>
      </div>

      {/* 2. ROW OF 6 STATISTIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-2 mb-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${card.iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">
                    {card.label}
                  </span>
                </div>

                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {card.value}
                  </span>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                    <ArrowUp className="w-2.5 h-2.5 mr-0.5 stroke-[3]" />
                    {card.growth}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-normal mt-2">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. ROW 2: FOLLOWER GROWTH TREND LINE CHART (65%) & CONTENT PERFORMANCE BAR CHART (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: Follower Growth (Line Chart) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>Follower Growth Trend</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </h3>
                  <p className="text-[10px] text-slate-400">Total reach expansion across connected platforms</p>
                </div>
              </div>

              {/* Time Range Filter & Legend */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Time Range Pills */}
                <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg text-[10px] font-semibold">
                  {(['7d', '30d', '90d', '1y'] as const).map(tr => (
                    <button
                      key={tr}
                      onClick={() => setGrowthTimeRange(tr)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        growthTimeRange === tr
                          ? 'bg-purple-600 text-white shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tr.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center space-x-2.5 text-xs text-slate-600 pl-1">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-1 bg-red-500 rounded-full inline-block"></span>
                    <span className="text-[10px] font-medium">YouTube</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-1 bg-pink-500 rounded-full inline-block"></span>
                    <span className="text-[10px] font-medium">Instagram</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-1 bg-slate-900 rounded-full inline-block"></span>
                    <span className="text-[10px] font-medium">TikTok</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-1 bg-sky-500 rounded-full inline-block"></span>
                    <span className="text-[10px] font-medium">LinkedIn</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="relative mt-2">
              <svg viewBox={`0 0 ${lineW} ${lineH}`} className="w-full h-48 select-none">
                {/* Horizontal gridlines */}
                {[0, 50000, 100000, 150000, 200000].map((val, i) => {
                  const y = getLineY(val);
                  return (
                    <g key={i}>
                      <line 
                        x1={padLeft} 
                        y1={y} 
                        x2={lineW - padRight} 
                        y2={y} 
                        stroke="#f1f5f9" 
                        strokeWidth="1" 
                      />
                      <text 
                        x={padLeft - 8} 
                        y={y + 3} 
                        textAnchor="end" 
                        fontSize="9" 
                        fill="#94a3b8" 
                        fontFamily="sans-serif"
                      >
                        {val === 0 ? '0' : `${val / 1000}K`}
                      </text>
                    </g>
                  );
                })}

                {/* Red line - YouTube */}
                <path 
                  d={buildPath('youtube')} 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {growthPoints.map((p, i) => (
                  <circle
                    key={`yt-${i}`}
                    cx={getLineX(i)}
                    cy={getLineY(p.youtube)}
                    r="3.5"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-5 transition-all"
                    onMouseEnter={() => setHoveredGrowthIndex(i)}
                    onMouseLeave={() => setHoveredGrowthIndex(null)}
                  />
                ))}

                {/* Pink line - Instagram */}
                <path 
                  d={buildPath('instagram')} 
                  fill="none" 
                  stroke="#ec4899" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {growthPoints.map((p, i) => (
                  <circle
                    key={`ig-${i}`}
                    cx={getLineX(i)}
                    cy={getLineY(p.instagram)}
                    r="3.5"
                    fill="#ec4899"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-5 transition-all"
                    onMouseEnter={() => setHoveredGrowthIndex(i)}
                    onMouseLeave={() => setHoveredGrowthIndex(null)}
                  />
                ))}

                {/* Black line - TikTok */}
                <path 
                  d={buildPath('tiktok')} 
                  fill="none" 
                  stroke="#0f172a" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {growthPoints.map((p, i) => (
                  <circle
                    key={`tt-${i}`}
                    cx={getLineX(i)}
                    cy={getLineY(p.tiktok)}
                    r="3.5"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-5 transition-all"
                    onMouseEnter={() => setHoveredGrowthIndex(i)}
                    onMouseLeave={() => setHoveredGrowthIndex(null)}
                  />
                ))}

                {/* Blue line - LinkedIn */}
                <path 
                  d={buildPath('linkedin')} 
                  fill="none" 
                  stroke="#0284c7" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {growthPoints.map((p, i) => (
                  <circle
                    key={`li-${i}`}
                    cx={getLineX(i)}
                    cy={getLineY(p.linkedin)}
                    r="3.5"
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-5 transition-all"
                    onMouseEnter={() => setHoveredGrowthIndex(i)}
                    onMouseLeave={() => setHoveredGrowthIndex(null)}
                  />
                ))}

                {/* X-axis date labels */}
                {growthPoints.map((p, i) => (
                  <text 
                    key={i} 
                    x={getLineX(i)} 
                    y={lineH - 6} 
                    textAnchor="middle" 
                    fontSize="9" 
                    fill="#94a3b8"
                  >
                    {p.date}
                  </text>
                ))}
              </svg>

              {/* Tooltip on hover */}
              {hoveredGrowthIndex !== null && (
                <div className="absolute top-2 right-4 bg-slate-900/95 backdrop-blur-xs text-white px-3 py-2 rounded-xl text-[10px] shadow-xl pointer-events-none space-y-1 z-10 border border-slate-700">
                  <div className="font-bold text-purple-300 border-b border-slate-700 pb-1">
                    {growthPoints[hoveredGrowthIndex].date} ({growthTimeRange.toUpperCase()})
                  </div>
                  <div className="text-red-400 font-semibold flex items-center justify-between space-x-3">
                    <span>YouTube:</span>
                    <span>{growthPoints[hoveredGrowthIndex].youtube.toLocaleString()}</span>
                  </div>
                  <div className="text-pink-400 font-semibold flex items-center justify-between space-x-3">
                    <span>Instagram:</span>
                    <span>{growthPoints[hoveredGrowthIndex].instagram.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 font-semibold flex items-center justify-between space-x-3">
                    <span>TikTok:</span>
                    <span>{growthPoints[hoveredGrowthIndex].tiktok.toLocaleString()}</span>
                  </div>
                  <div className="text-sky-400 font-semibold flex items-center justify-between space-x-3">
                    <span>LinkedIn:</span>
                    <span>{growthPoints[hoveredGrowthIndex].linkedin.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Content Performance (Bar Chart) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Content Performance Bar Chart</h3>
              </div>

              {/* Daily / Weekly View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  onClick={() => setContentViewMode('daily')}
                  className={`px-2 py-0.5 rounded-md ${contentViewMode === 'daily' ? 'bg-white font-bold text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  Days
                </button>
                <button
                  onClick={() => setContentViewMode('weekly')}
                  className={`px-2 py-0.5 rounded-md ${contentViewMode === 'weekly' ? 'bg-white font-bold text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  Weeks
                </button>
              </div>
            </div>

            {/* Segmented tabs (Views, Likes, Comments, Shares) */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg text-[11px] mb-3">
              {(['views', 'likes', 'comments', 'shares'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setContentMetricTab(tab)}
                  className={`flex-1 py-1 text-center font-semibold rounded-md capitalize transition-all ${
                    contentMetricTab === tab
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Bar Chart Visualization */}
            <div className="relative pt-2">
              <div className="flex items-end justify-between h-36 px-2 border-b border-slate-100">
                {contentPerformanceBars.map((bar, i) => {
                  const val = bar[contentMetricTab];
                  const heightPct = Math.round((val / maxContentVal) * 100);

                  return (
                    <div 
                      key={i} 
                      className="flex-1 flex flex-col items-center justify-end h-full group px-1"
                      onMouseEnter={() => setHoveredContentBarIndex(i)}
                      onMouseLeave={() => setHoveredContentBarIndex(null)}
                    >
                      {hoveredContentBarIndex === i && (
                        <span className="text-[10px] font-bold text-indigo-700 mb-1 animate-bounce">
                          {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        </span>
                      )}
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[28px] rounded-t-md transition-all cursor-pointer ${
                          i === 4 && contentViewMode === 'daily'
                            ? 'bg-gradient-to-t from-purple-600 to-indigo-500 shadow-sm'
                            : 'bg-indigo-500/80 group-hover:bg-indigo-600'
                        }`}
                      />
                      <span className="text-[10px] text-slate-400 font-medium mt-2">
                        {bar.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Ticks on Y-axis */}
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 px-1">
                <span>0</span>
                <span>{contentViewMode === 'daily' ? '50K' : '60K'}</span>
                <span>{contentViewMode === 'daily' ? '100K' : '120K'}</span>
                <span>{contentViewMode === 'daily' ? '150K' : '180K'}</span>
                <span>{contentViewMode === 'daily' ? '200K' : '250K'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. ROW 3: NEW ENGAGEMENT TREND SPLINE CHART (50%) & CROSS-PLATFORM HORIZONTAL BAR CHART (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: 30-Day Virality & Engagement Rate Trend Chart (Area Trend) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Engagement Rate &amp; Virality Trend</h3>
                <p className="text-[10px] text-slate-400">Daily average engagement trajectory (Industry benchmark: 3.2%)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Peak 7.9%</span>
              </span>
            </div>
          </div>

          {/* SVG Area & Trend Line */}
          <div className="relative mt-2">
            <svg viewBox={`0 0 ${engW} ${engH}`} className="w-full h-36 select-none">
              <defs>
                <linearGradient id="engGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 2.5, 5.0, 7.5, 10.0].map((rate, i) => {
                const y = getEngY(rate);
                return (
                  <g key={i}>
                    <line x1={engPadL} y1={y} x2={engW - engPadR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={engPadL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                      {rate}%
                    </text>
                  </g>
                );
              })}

              {/* Benchmark dashed line at 5.0% */}
              <line 
                x1={engPadL} 
                y1={getEngY(5.0)} 
                x2={engW - engPadR} 
                y2={getEngY(5.0)} 
                stroke="#cbd5e1" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />
              <text x={engW - engPadR - 5} y={getEngY(5.0) - 4} textAnchor="end" fontSize="8" fill="#94a3b8">
                Target Benchmark (5.0%)
              </text>

              {/* Area fill */}
              <path d={engAreaPath} fill="url(#engGrad)" />

              {/* Curve line */}
              <path 
                d={engLinePath} 
                fill="none" 
                stroke="#8b5cf6" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />

              {/* Points */}
              {engagementTrendPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={getEngX(i)}
                  cy={getEngY(p.rate)}
                  r={p.note ? '5' : '3.5'}
                  fill={p.note ? '#10b981' : '#8b5cf6'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="cursor-pointer transition-all hover:scale-125"
                  onMouseEnter={() => setHoveredEngagementIndex(i)}
                  onMouseLeave={() => setHoveredEngagementIndex(null)}
                />
              ))}

              {/* X-axis labels */}
              {engagementTrendPoints.map((p, i) => (
                <text key={i} x={getEngX(i)} y={engH - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {p.date}
                </text>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredEngagementIndex !== null && (
              <div className="absolute top-2 right-4 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] shadow-lg pointer-events-none">
                <div className="font-bold text-purple-300">
                  {engagementTrendPoints[hoveredEngagementIndex].date}
                </div>
                <div>Engagement: {engagementTrendPoints[hoveredEngagementIndex].rate}%</div>
                <div>Impressions: {engagementTrendPoints[hoveredEngagementIndex].impressions.toLocaleString()}</div>
                {engagementTrendPoints[hoveredEngagementIndex].note && (
                  <div className="text-emerald-400 font-bold">★ {engagementTrendPoints[hoveredEngagementIndex].note}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Multi-Platform Reach Comparison (Horizontal Bar Chart) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Reach &amp; Share Bar Chart</h3>
                  <p className="text-[10px] text-slate-400">Total monthly impressions across channels</p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-900">Total Reach: 1.85M</span>
            </div>

            {/* Horizontal comparison bars */}
            <div className="space-y-2.5 mt-2">
              {platformComparison.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                      <span>{item.platform}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      <strong>{item.reach}</strong> reach ({item.share}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${item.share}%`, backgroundColor: item.barColor }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Highest conversion channel: <strong>YouTube (42%)</strong></span>
            <button 
              onClick={() => onNavigate('social-accounts')}
              className="text-indigo-600 font-bold hover:underline"
            >
              Sync Accounts →
            </button>
          </div>
        </div>

      </div>

      {/* 5. ROW 4: TOP PERFORMING POSTS (65%) & DEMOGRAPHICS + REVENUE (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: Top Performing Posts Table & Content Calendar */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Content Performance &amp; Calendar</h3>
              <p className="text-[10px] text-slate-400">Scheduled releases, published analytics &amp; content calendar</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setContentViewTab('posts')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    contentViewTab === 'posts' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Posts Table
                </button>
                <button
                  onClick={() => setContentViewTab('calendar')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                    contentViewTab === 'calendar' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Content Calendar</span>
                </button>
              </div>

              <button
                onClick={() => setShowAddContentModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Post</span>
              </button>
            </div>
          </div>

          {contentViewTab === 'posts' ? (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold text-[11px] border-b border-slate-100 pb-2">
                    <th className="py-2.5 pl-1 font-normal">Content</th>
                    <th className="py-2.5 font-normal text-center">Platform</th>
                    <th className="py-2.5 font-normal text-right">Views</th>
                    <th className="py-2.5 font-normal text-right">Likes</th>
                    <th className="py-2.5 font-normal text-right">Comments</th>
                    <th className="py-2.5 font-normal text-center">Engagement</th>
                    <th className="py-2.5 font-normal text-right pr-1">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Content Thumbnail & Title */}
                      <td className="py-3 pl-1 max-w-[240px]">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            src={post.thumbnail} 
                            alt={post.title} 
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate leading-snug">{post.title}</p>
                            <span className="text-[10px] text-slate-400 font-normal">{post.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Platform Icon */}
                      <td className="py-3 text-center">
                        {post.platform === 'youtube' && (
                          <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center mx-auto text-[9px]">
                            ▶
                          </div>
                        )}
                        {post.platform === 'instagram' && (
                          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto text-[10px]">
                            📷
                          </div>
                        )}
                        {post.platform === 'tiktok' && (
                          <div className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center mx-auto text-[10px] font-bold">
                            ♪
                          </div>
                        )}
                      </td>

                      <td className="py-3 text-right font-medium text-slate-800">{post.views}</td>
                      <td className="py-3 text-right font-medium text-slate-800">{post.likes}</td>
                      <td className="py-3 text-right font-medium text-slate-800">{post.comments}</td>
                      
                      {/* Engagement Rate (Green) */}
                      <td className="py-3 text-center font-bold text-emerald-600">
                        {post.engagement}
                      </td>

                      <td className="py-3 text-right pr-1 text-slate-400 text-[11px]">
                        {post.published}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-[10px] font-semibold text-slate-400 uppercase py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: 14, post: 'YouTube: AI Workflow 2026', platform: 'youtube', type: 'Video', status: 'published', time: '10:00 AM' },
                  { day: 15, post: null },
                  { day: 16, post: 'Instagram: Carousel - 5 Pro Tips', platform: 'instagram', type: 'Carousel', status: 'published', time: '2:30 PM' },
                  { day: 17, post: 'TikTok: Behind the Scenes Vlog', platform: 'tiktok', type: 'Short', status: 'published', time: '6:00 PM' },
                  { day: 18, post: null },
                  { day: 19, post: 'YouTube: Sponsor Review & Unboxing', platform: 'youtube', type: 'Review', status: 'scheduled', time: '11:00 AM' },
                  { day: 20, post: 'Instagram: Brand Collab Story series', platform: 'instagram', type: 'Story', status: 'scheduled', time: '4:00 PM' },
                  { day: 21, post: null },
                  { day: 22, post: 'YouTube Short: Micro-hacks for editors', platform: 'youtube', type: 'Short', status: 'scheduled', time: '1:00 PM' },
                  { day: 23, post: null },
                  { day: 24, post: 'TikTok: Live Q&A Announcement', platform: 'tiktok', type: 'Live', status: 'scheduled', time: '7:00 PM' },
                  { day: 25, post: 'Instagram Reel: Weekly Wrap-up', platform: 'instagram', type: 'Reel', status: 'scheduled', time: '3:00 PM' },
                  { day: 26, post: null },
                  { day: 27, post: 'YouTube: Monthly Deep-dive Podcast', platform: 'youtube', type: 'Podcast', status: 'scheduled', time: '12:00 PM' },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`min-h-[78px] p-2 rounded-xl border text-left transition-all ${
                      item.post 
                        ? item.status === 'published' 
                          ? 'bg-purple-50/50 border-purple-200 hover:border-purple-300' 
                          : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Oct {item.day}</span>
                      {item.post && (
                        <span className={`px-1 rounded text-[8px] font-bold uppercase ${
                          item.status === 'published' ? 'bg-purple-200 text-purple-800' : 'bg-amber-200 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    {item.post ? (
                      <div>
                        <div className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight">
                          {item.post}
                        </div>
                        <div className="text-[8px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{item.time}</span>
                          <span className="font-semibold text-purple-600 capitalize">{item.platform}</span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setNewPostDate(`2026-10-${item.day < 10 ? '0' + item.day : item.day}`);
                          setShowAddContentModal(true);
                        }}
                        className="w-full h-8 flex items-center justify-center text-slate-300 hover:text-purple-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Stack: Audience Demographics & Revenue Overview */}
        <div className="lg:col-span-4 space-y-3.5 flex flex-col justify-between">
          
          {/* Card 1: Audience Demographics (Donut Chart) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-slate-900">Audience Demographics</h3>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <button 
                onClick={() => onNavigate('audience')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View All →
              </button>
            </div>

            {/* Demographics Tabs */}
            <div className="flex items-center space-x-1 my-2 bg-slate-100/70 p-0.5 rounded-lg text-[11px]">
              {(['age', 'gender', 'location', 'device'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDemographicsTab(tab)}
                  className={`flex-1 py-1 rounded-md text-center capitalize font-semibold transition-all ${
                    demographicsTab === tab
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Donut Chart & Legend */}
            <div className="flex items-center justify-between pt-2">
              {/* SVG Donut */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                  {(() => {
                    let acc = 0;
                    return currentDemographics.map((seg, i) => {
                      const dash = `${seg.percent * 2.26} 226`;
                      const offset = -acc * 2.26;
                      acc += seg.percent;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke={seg.dotColor}
                          strokeWidth="16"
                          strokeDasharray={dash}
                          strokeDashoffset={offset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black text-slate-900 leading-tight">125.4K</span>
                  <span className="text-[9px] text-slate-400 font-medium">Followers</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 pl-4 flex-1">
                {currentDemographics.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.dotColor }}></span>
                      <span className="text-slate-600 text-[11px]">{seg.label}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[11px]">{seg.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Revenue Overview (Green Bar Chart) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-slate-900">Revenue Overview</h3>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <button 
                onClick={() => onNavigate('revenue')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View All →
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">Total Monthly Earnings</div>

            <div className="flex items-center justify-between mt-1">
              {/* Revenue Numbers on the left */}
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-900">₹48,250</span>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                    <ArrowUp className="w-2.5 h-2.5 mr-0.5 stroke-[3]" />
                    20.6%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  + ₹8,240 from last month (Brand sponsorships)
                </div>
              </div>

              {/* Mini Green Bar Chart on the right */}
              <div className="flex items-end space-x-1.5 h-12">
                {monthlyRevenueData.map((m, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-col items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredRevenueIndex(idx)}
                    onMouseLeave={() => setHoveredRevenueIndex(null)}
                  >
                    <div 
                      style={{ height: `${m.height * 0.45}px` }}
                      className={`w-2.5 rounded-t-sm transition-all ${
                        idx === monthlyRevenueData.length - 1
                          ? 'bg-emerald-500 group-hover:bg-emerald-600'
                          : 'bg-emerald-300 group-hover:bg-emerald-400'
                      }`}
                    />
                    <span className="text-[8px] text-slate-400 mt-1">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Stream Breakdown Pills */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">Sponsorships</span>
                <span className="font-bold text-slate-800">₹29,800</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">AdSense</span>
                <span className="font-bold text-slate-800">₹11,550</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block">Affiliates</span>
                <span className="font-bold text-slate-800">₹6,900</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Schedule / Add Content Modal */}
      {showAddContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Schedule or Publish Content</h3>
                  <p className="text-xs text-slate-500">Add to your creator analytics and content calendar</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddContentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContent} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content Title / Hook</label>
                <input 
                  type="text" 
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. 10 Tools That Replaced My Entire Workflow"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Platform</label>
                  <select
                    value={newPostPlatform}
                    onChange={(e) => setNewPostPlatform(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">X (Twitter)</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format Type</label>
                  <select
                    value={newPostType}
                    onChange={(e) => setNewPostType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="video">Long-form Video</option>
                    <option value="reel">Reel / Short</option>
                    <option value="carousel">Carousel Post</option>
                    <option value="story">Story</option>
                    <option value="live">Live Stream</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={newPostStatus}
                    onChange={(e) => setNewPostStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="published">Already Published</option>
                    <option value="scheduled">Scheduled for Later</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input 
                    type="date"
                    value={newPostDate}
                    onChange={(e) => setNewPostDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddContentModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs"
                >
                  Save &amp; Track Content
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Globe, 
  Mail, 
  DollarSign, 
  Calendar, 
  Edit3, 
  Youtube, 
  Instagram, 
  Video, 
  Twitter, 
  Share2, 
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CreatorProfileViewPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CreatorProfileViewPage: React.FC<CreatorProfileViewPageProps> = ({ onNavigate, onShowToast }) => {
  const { user, creatorProfile } = useAuth();

  const handle = creatorProfile?.handle || `@${user?.name?.toLowerCase().replace(/\s+/g, '') || 'harshitha_s'}`;
  const bio = creatorProfile?.bio || 'Tech innovator, content creator & AI engineer based in Bangalore. Building data-driven creator analytics and sharing tech lifestyle content.';
  const niche = creatorProfile?.niche || 'Technology, AI & Digital Innovation';
  const location = creatorProfile?.location || 'Bangalore, India';
  const website = creatorProfile?.website || 'https://harshithas.dev';
  const contactEmail = creatorProfile?.contactEmail || user?.email || 'sharshitha28007@gmail.com';
  const baseRate = creatorProfile?.baseRate || 3500;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    onShowToast('Public Media Kit link copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyProfileLink}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Media Kit</span>
          </button>
          
          {(user?.role === 'creator' || user?.role === 'admin') && (
            <button
              onClick={() => onNavigate('profile-edit')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Cover / Header Banner */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verified Creator Media Kit</span>
            </span>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-10 pb-8 pt-0 relative">
          {/* Avatar and Primary Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-5">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                alt={user?.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white shadow-xl object-cover bg-slate-100"
              />
              <div className="mb-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black text-slate-900">{user?.name}</h1>
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs font-mono font-bold text-slate-500">{handle}</p>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{location}</span>
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-100">
                    {niche}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={`mailto:${contactEmail}`}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Partnerships</span>
              </a>
            </div>
          </div>

          {/* Bio text */}
          <div className="max-w-3xl mb-8">
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {bio}
            </p>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{website}</span>
              </a>
            )}
          </div>

          {/* Connected Social Channel Highlights */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Connected Platforms &amp; Audience Size
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* YouTube */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">YouTube Subscribers</div>
                  <div className="text-base font-black text-slate-900">
                    {creatorProfile?.youtubeSubscribers ? `${(creatorProfile.youtubeSubscribers / 1000).toFixed(0)}K` : '185K'}
                  </div>
                  <div className="text-[10px] text-rose-700 font-mono">
                    {creatorProfile?.youtubeHandle || '@HarshithaTech'}
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div className="p-4 rounded-2xl bg-fuchsia-50/60 border border-fuchsia-100 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-fuchsia-600 text-white shadow-xs">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Instagram Followers</div>
                  <div className="text-base font-black text-slate-900">
                    {creatorProfile?.instagramFollowers ? `${(creatorProfile.instagramFollowers / 1000).toFixed(0)}K` : '94.2K'}
                  </div>
                  <div className="text-[10px] text-fuchsia-700 font-mono">
                    {creatorProfile?.instagramHandle || '@harshitha.codes'}
                  </div>
                </div>
              </div>

              {/* TikTok */}
              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">TikTok Community</div>
                  <div className="text-base font-black text-slate-900">
                    {creatorProfile?.tiktokFollowers ? `${(creatorProfile.tiktokFollowers / 1000).toFixed(0)}K` : '310K'}
                  </div>
                  <div className="text-[10px] text-slate-700 font-mono">
                    {creatorProfile?.tiktokHandle || '@harshitha_dev'}
                  </div>
                </div>
              </div>

              {/* Engagement Rate */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Verified Engagement</div>
                  <div className="text-base font-black text-indigo-900">
                    {creatorProfile?.engagementRate ? `${creatorProfile.engagementRate}%` : '6.8%'}
                  </div>
                  <div className="text-[10px] text-indigo-700 font-medium">Top 5% in Niche</div>
                </div>
              </div>
            </div>
          </div>

          {/* Media Kit & Pricing Cards */}
          <div className="border-t border-slate-100 pt-8 mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Partnership Rate Card &amp; Deliverables</h3>
                <p className="text-xs text-slate-500">Standard rates for brand integrations and media sponsorships</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                ● Ready for Q4 2026 Campaigns
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Standard</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Dedicated YouTube Video</h4>
                  <p className="text-xs text-slate-500 mt-2">
                    60-90 second dedicated sponsor integration with pinned comment, link in description, and story promo.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/70">
                  <div className="text-lg font-black text-slate-900">${baseRate.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400">Includes 30-day usage rights</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/30 flex flex-col justify-between relative shadow-xs">
                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Multi-Channel</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Cross-Platform Campaign Pack</h4>
                  <p className="text-xs text-slate-500 mt-2">
                    1 Dedicated YouTube video + 1 TikTok Short + 1 Instagram Reel with organic engagement booster.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200/50">
                  <div className="text-lg font-black text-blue-700">${(baseRate * 1.8).toLocaleString()}</div>
                  <span className="text-[11px] text-slate-500">Maximum organic reach guarantee</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Short-Form</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Viral TikTok / Reel Short</h4>
                  <p className="text-xs text-slate-500 mt-2">
                    Fast-paced product breakdown or lifestyle integration tailored specifically to vertical video algorithm.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/70">
                  <div className="text-lg font-black text-slate-900">${(baseRate * 0.6).toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400">Quick 5-day turnaround</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

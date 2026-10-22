import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  Languages, 
  Clock, 
  Save, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Palette, 
  Building, 
  Target, 
  Shield, 
  Youtube, 
  Instagram, 
  Video, 
  Twitter, 
  DollarSign, 
  Briefcase, 
  KeyRound, 
  ArrowLeft,
  Lock,
  RefreshCw,
  ExternalLink,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';
import { UserRole, PersonalDetails, CreatorProfile, AgencyProfile, MarketingProfile, AdminProfile } from '../../types/auth';

interface MyProfilePageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MyProfilePage: React.FC<MyProfilePageProps> = ({ onNavigate, onShowToast }) => {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'security'>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Common personal details
  const [fullName, setFullName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [personalData, setPersonalData] = useState<PersonalDetails>({
    phone: '',
    location: '',
    bio: '',
    language: 'English',
    timezone: 'Asia/Kolkata (IST)'
  });

  // Role-specific professional details
  const [creatorProf, setCreatorProf] = useState<CreatorProfile>({
    handle: '@ipsitacodes',
    bio: 'Tech & student lifestyle creator at NIT Rourkela. Creating productivity, dev guides and AI reviews.',
    niche: 'Technology, AI & Student Lifestyle',
    location: 'Rourkela, India',
    website: 'https://ipsitapriyadarshini.me',
    contactEmail: user?.email || 'creator@creatoriq.com',
    baseRate: 3500,
    collaborationStatus: 'open',
    youtubeHandle: '@IpsitaTech',
    youtubeSubscribers: 125430,
    instagramHandle: '@ipsita.study',
    instagramFollowers: 98240,
    tiktokHandle: '@ipsita_dev',
    tiktokFollowers: 76000,
    twitterHandle: '@ipsita_codes',
    engagementRate: 6.8,
    monthlyReach: 1800000,
    verified: true
  });

  const [agencyProf, setAgencyProf] = useState<AgencyProfile>({
    agencyName: 'Growth Agency',
    licenseNumber: 'AGY-IN-2026-8841',
    rosterSize: 12,
    commissionRate: 15,
    specialties: 'Tech, Food & Travel Creators',
    businessAddress: '100 Feet Road, Indiranagar, Bangalore, India',
    website: 'https://growthagency.co',
    phone: '+91 80 4123 9900',
    keyClients: 'Tech With Riya, Foodie Diaries, Travel With Arjun, Fitness Hub, Study Capsule',
    taxId: '29AABCU9603R1ZM'
  });

  const [marketingProf, setMarketingProf] = useState<MarketingProfile>({
    brandName: 'Brand Studio',
    industrySector: 'D2C Consumer Tech & E-Commerce',
    annualBudget: 4200000,
    targetAudience: 'Ages 18-34, Metro & Tier 1 Cities, India & Global',
    campaignKPIs: '3.2x ROAS, 12.4M Reach, 986K Engagement',
    corporateWebsite: 'https://brandstudio.io',
    phone: '+91 22 6150 4400',
    taxId: '27AAACB2234K1ZV',
    headOfGrowth: 'Kavita Rao'
  });

  const [adminProf, setAdminProf] = useState<AdminProfile>({
    department: 'IT & Security Operations',
    clearanceLevel: 'Level 4 - Super Admin',
    accessScopes: ['User Management', 'Platform Integrations', 'Content Monitoring', 'Analytics Overview', 'System Settings', 'Activity Logs'],
    twoFactorStatus: true,
    emergencyContact: '+91 99000 11222',
    complianceAuditDate: '2026-10-01',
    employeeId: 'ADM-8801'
  });

  // Load profile from server
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await profileService.getMyProfile();
        if (res.success && isMounted) {
          if (res.user) {
            setFullName(res.user.name || '');
            setAvatarUrl(res.user.avatar_url || '');
          }
          if (res.personal) {
            setPersonalData(res.personal);
          }
          if (res.professional) {
            if (res.role === 'creator') setCreatorProf(prev => ({ ...prev, ...res.professional }));
            else if (res.role === 'agency') setAgencyProf(prev => ({ ...prev, ...res.professional }));
            else if (res.role === 'marketing') setMarketingProf(prev => ({ ...prev, ...res.professional }));
            else if (res.role === 'admin') setAdminProf(prev => ({ ...prev, ...res.professional }));
          }
        }
      } catch (err) {
        // Fallback to initial seeds
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [user?.role]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    let professionalPayload: any = {};
    if (user?.role === 'creator') professionalPayload = creatorProf;
    else if (user?.role === 'agency') professionalPayload = agencyProf;
    else if (user?.role === 'marketing') professionalPayload = marketingProf;
    else if (user?.role === 'admin') professionalPayload = adminProf;

    try {
      const res = await profileService.updateMyProfile({
        name: fullName,
        avatarUrl,
        personal: personalData,
        professional: professionalPayload
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Personal and professional profile details saved successfully!' });
        onShowToast('Profile details updated successfully!', 'success');
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to update profile.' });
        onShowToast(res.message || 'Update failed', 'error');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to communicate with profile server.' });
      onShowToast(err.message || 'Save error', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleHeader = () => {
    switch (user?.role) {
      case 'creator':
        return {
          title: 'Creator Profile & Media Kit',
          badge: 'Creator Persona',
          color: 'from-purple-600 to-indigo-600',
          desc: 'Manage your individual creator identity, content platforms, engagement metrics, and rate cards.',
          icon: Palette
        };
      case 'agency':
        return {
          title: 'Agency Company Profile & Roster',
          badge: 'Talent Agency',
          color: 'from-indigo-600 to-blue-600',
          desc: 'Configure agency licensing, represented creator rosters, commission splits, and official business contacts.',
          icon: Building
        };
      case 'marketing':
        return {
          title: 'Marketing Studio & Brand Profile',
          badge: 'Brand Marketing',
          color: 'from-sky-600 to-indigo-600',
          desc: 'Set up your enterprise brand profile, annual influencer budgets, target demographics, and campaign guidelines.',
          icon: Target
        };
      case 'admin':
        return {
          title: 'System Administrator Profile',
          badge: 'System Admin',
          color: 'from-purple-700 to-slate-900',
          desc: 'Review administrative security scopes, emergency escalation contacts, compliance reviews, and 2FA credentials.',
          icon: Shield
        };
      default:
        return {
          title: 'Account Profile',
          badge: 'User',
          color: 'from-purple-600 to-indigo-600',
          desc: 'Manage your personal and professional profile details.',
          icon: User
        };
    }
  };

  const roleInfo = getRoleHeader();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Return to Dashboard */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-purple-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''} Dashboard</span>
        </button>

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-semibold">
          <RoleIcon className="w-3.5 h-3.5" />
          <span>{roleInfo.badge}</span>
          <span className="text-slate-400">•</span>
          <span className="font-mono text-[11px] text-purple-900 font-bold">{user?.email}</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-r ${roleInfo.color} text-white shadow-xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <img 
              src={avatarUrl || user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'} 
              alt={fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/60 object-cover shadow-lg bg-white/20"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName || user?.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 max-w-xl">{roleInfo.desc}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-white/90">
                <span className="inline-flex items-center space-x-1 bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/10">
                  <Mail className="w-3 h-3" />
                  <span>{user?.email}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/10">
                  <MapPin className="w-3 h-3" />
                  <span>{personalData.location || 'Location Not Set'}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-emerald-500/30 px-2.5 py-0.5 rounded-lg border border-emerald-400/30 text-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Unique Role Account Verified</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('reset-password')}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition-all flex items-center space-x-2 shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'personal'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>1. Personal Details</span>
        </button>

        <button
          onClick={() => setActiveTab('professional')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'professional'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>2. Professional Details ({user?.role ? user.role.toUpperCase() : ''})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'security'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>3. Security &amp; Credentials</span>
        </button>
      </div>

      {/* Status feedback banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs flex items-center space-x-3 border animate-in fade-in duration-150 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: PERSONAL DETAILS */}
        {activeTab === 'personal' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <User className="w-4 h-4 text-purple-600" />
                <span>Personal Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your primary contact information and personal details for your account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name / Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Ipsita Priyadarshini"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address (Unique to Role) <span className="text-purple-600 text-[10px]">(Permanent)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Each role must have a unique email address. Email cannot be shared across multiple roles.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={personalData.phone || ''}
                    onChange={(e) => setPersonalData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. +91 94370 55442"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  City, State &amp; Country
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={personalData.location || ''}
                    onChange={(e) => setPersonalData(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Rourkela, Odisha, India"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Preferred Languages
                </label>
                <div className="relative">
                  <Languages className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={personalData.language || ''}
                    onChange={(e) => setPersonalData(p => ({ ...p, language: e.target.value }))}
                    placeholder="e.g. English, Hindi, Odia"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={personalData.timezone || ''}
                    onChange={(e) => setPersonalData(p => ({ ...p, timezone: e.target.value }))}
                    placeholder="e.g. Asia/Kolkata (IST)"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Personal Bio &amp; About Summary
              </label>
              <textarea
                rows={3}
                value={personalData.bio || ''}
                onChange={(e) => setPersonalData(p => ({ ...p, bio: e.target.value }))}
                placeholder="Share a short bio summarizing your background, mission, and activities..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Avatar Photo URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* TAB 2: PROFESSIONAL DETAILS (DIFFERENT FOR ALL 4 ROLES) */}
        {activeTab === 'professional' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
            {/* ROLE 1: CREATOR PROFESSIONAL DETAILS */}
            {user?.role === 'creator' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <span>Creator Professional Details &amp; Media Kit</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your content niches, social handles, audience reach, and sponsorship rate cards.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    Individual Creator
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Primary Content Niche
                    </label>
                    <input
                      type="text"
                      value={creatorProf.niche || ''}
                      onChange={(e) => setCreatorProf(c => ({ ...c, niche: e.target.value }))}
                      placeholder="e.g. Technology, AI & Student Lifestyle"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Base Sponsorship Rate (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 my-auto flex items-center text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={creatorProf.baseRate || 3500}
                        onChange={(e) => setCreatorProf(c => ({ ...c, baseRate: Number(e.target.value) }))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Collaboration Status
                    </label>
                    <select
                      value={creatorProf.collaborationStatus || 'open'}
                      onChange={(e) => setCreatorProf(c => ({ ...c, collaborationStatus: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="open">Open for Brand Deals &amp; Sponsorships</option>
                      <option value="selective">Selective Partnerships Only</option>
                      <option value="booked">Fully Booked for Q4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Creator Handle / Alias
                    </label>
                    <input
                      type="text"
                      value={creatorProf.handle || ''}
                      onChange={(e) => setCreatorProf(c => ({ ...c, handle: e.target.value }))}
                      placeholder="e.g. @ipsitacodes"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                {/* Social Channel Metrics */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Connected Social Platform Handles &amp; Audience</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Youtube className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">YouTube Channel</div>
                          <input
                            type="text"
                            value={creatorProf.youtubeHandle || ''}
                            onChange={(e) => setCreatorProf(c => ({ ...c, youtubeHandle: e.target.value }))}
                            placeholder="@IpsitaTech"
                            className="text-xs font-mono text-red-700 bg-transparent border-b border-red-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Subscribers</span>
                        <div className="text-xs font-black text-slate-900">125,430</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Instagram className="w-5 h-5 text-pink-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Instagram Profile</div>
                          <input
                            type="text"
                            value={creatorProf.instagramHandle || ''}
                            onChange={(e) => setCreatorProf(c => ({ ...c, instagramHandle: e.target.value }))}
                            placeholder="@ipsita.study"
                            className="text-xs font-mono text-pink-700 bg-transparent border-b border-pink-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Followers</span>
                        <div className="text-xs font-black text-slate-900">98,240</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Video className="w-5 h-5 text-slate-800 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">TikTok Handle</div>
                          <input
                            type="text"
                            value={creatorProf.tiktokHandle || ''}
                            onChange={(e) => setCreatorProf(c => ({ ...c, tiktokHandle: e.target.value }))}
                            placeholder="@ipsita_dev"
                            className="text-xs font-mono text-slate-800 bg-transparent border-b border-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Followers</span>
                        <div className="text-xs font-black text-slate-900">76,000</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Twitter className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Twitter / X</div>
                          <input
                            type="text"
                            value={creatorProf.twitterHandle || ''}
                            onChange={(e) => setCreatorProf(c => ({ ...c, twitterHandle: e.target.value }))}
                            placeholder="@ipsita_codes"
                            className="text-xs font-mono text-blue-700 bg-transparent border-b border-blue-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Engagement</span>
                        <div className="text-xs font-black text-emerald-600">6.8%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ROLE 2: AGENCY PROFESSIONAL DETAILS */}
            {user?.role === 'agency' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                      <Building className="w-4 h-4 text-indigo-600" />
                      <span>Talent Agency Corporate &amp; Roster Details</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your agency credentials, licensing, represented roster size, and commission terms.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    Agency Partner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Agency Name
                    </label>
                    <input
                      type="text"
                      value={agencyProf.agencyName || ''}
                      onChange={(e) => setAgencyProf(a => ({ ...a, agencyName: e.target.value }))}
                      placeholder="e.g. Growth Agency"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Business License / Reg Number
                    </label>
                    <input
                      type="text"
                      value={agencyProf.licenseNumber || ''}
                      onChange={(e) => setAgencyProf(a => ({ ...a, licenseNumber: e.target.value }))}
                      placeholder="e.g. AGY-IN-2026-8841"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Exclusive Roster Size (# of Creators)
                    </label>
                    <input
                      type="number"
                      value={agencyProf.rosterSize || 12}
                      onChange={(e) => setAgencyProf(a => ({ ...a, rosterSize: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Standard Agency Commission (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={agencyProf.commissionRate || 15}
                        onChange={(e) => setAgencyProf(a => ({ ...a, commissionRate: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute inset-y-0 right-3.5 my-auto flex items-center text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Primary Creator Verticals
                    </label>
                    <input
                      type="text"
                      value={agencyProf.specialties || ''}
                      onChange={(e) => setAgencyProf(a => ({ ...a, specialties: e.target.value }))}
                      placeholder="e.g. Tech, Food & Travel Creators"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Corporate Tax ID / GSTIN
                    </label>
                    <input
                      type="text"
                      value={agencyProf.taxId || ''}
                      onChange={(e) => setAgencyProf(a => ({ ...a, taxId: e.target.value }))}
                      placeholder="e.g. 29AABCU9603R1ZM"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Featured Talents / Key Represented Clients
                  </label>
                  <textarea
                    rows={2}
                    value={agencyProf.keyClients || ''}
                    onChange={(e) => setAgencyProf(a => ({ ...a, keyClients: e.target.value }))}
                    placeholder="e.g. Tech With Riya, Foodie Diaries, Travel With Arjun, Fitness Hub, Study Capsule"
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* ROLE 3: MARKETING PROFESSIONAL DETAILS */}
            {user?.role === 'marketing' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                      <Target className="w-4 h-4 text-sky-600" />
                      <span>Marketing Studio &amp; Campaign Objectives</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your brand identity, annual influencer budget, target demographics, and ROAS benchmarks.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                    Marketing Team
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Brand / Studio Name
                    </label>
                    <input
                      type="text"
                      value={marketingProf.brandName || ''}
                      onChange={(e) => setMarketingProf(m => ({ ...m, brandName: e.target.value }))}
                      placeholder="e.g. Brand Studio"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Industry Sector
                    </label>
                    <input
                      type="text"
                      value={marketingProf.industrySector || ''}
                      onChange={(e) => setMarketingProf(m => ({ ...m, industrySector: e.target.value }))}
                      placeholder="e.g. D2C Consumer Tech & E-Commerce"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Annual Influencer Budget (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 my-auto flex items-center text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={marketingProf.annualBudget || 4200000}
                        onChange={(e) => setMarketingProf(m => ({ ...m, annualBudget: Number(e.target.value) }))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Primary Campaign ROAS Target
                    </label>
                    <input
                      type="text"
                      value={marketingProf.campaignKPIs || '3.2x ROAS, 12.4M Reach, 986K Engagement'}
                      onChange={(e) => setMarketingProf(m => ({ ...m, campaignKPIs: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Target Audience Demographics
                    </label>
                    <input
                      type="text"
                      value={marketingProf.targetAudience || ''}
                      onChange={(e) => setMarketingProf(m => ({ ...m, targetAudience: e.target.value }))}
                      placeholder="e.g. Ages 18-34, Urban Metro, India & Global"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Head of Growth / Marketing Lead
                    </label>
                    <input
                      type="text"
                      value={marketingProf.headOfGrowth || ''}
                      onChange={(e) => setMarketingProf(m => ({ ...m, headOfGrowth: e.target.value }))}
                      placeholder="e.g. Kavita Rao"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ROLE 4: ADMIN PROFESSIONAL DETAILS */}
            {user?.role === 'admin' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Administrator Operations &amp; Clearance Scopes</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review security clearance levels, compliance audit dates, 2FA status, and system operations scopes.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-900 text-white">
                    Super Administrator
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Department / Division
                    </label>
                    <input
                      type="text"
                      value={adminProf.department || ''}
                      onChange={(e) => setAdminProf(a => ({ ...a, department: e.target.value }))}
                      placeholder="e.g. IT & Security Operations"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Security Clearance Level
                    </label>
                    <input
                      type="text"
                      value={adminProf.clearanceLevel || ''}
                      onChange={(e) => setAdminProf(a => ({ ...a, clearanceLevel: e.target.value }))}
                      placeholder="e.g. Level 4 - Super Admin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Administrator Employee ID
                    </label>
                    <input
                      type="text"
                      value={adminProf.employeeId || ''}
                      onChange={(e) => setAdminProf(a => ({ ...a, employeeId: e.target.value }))}
                      placeholder="e.g. ADM-8801"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Emergency Escalation Contact
                    </label>
                    <input
                      type="text"
                      value={adminProf.emergencyContact || ''}
                      onChange={(e) => setAdminProf(a => ({ ...a, emergencyContact: e.target.value }))}
                      placeholder="e.g. +91 99000 11222"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Active System Permissions Scopes</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      2FA Enforced
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['User Management', 'Platform Integrations', 'Content Monitoring', 'Analytics Overview', 'System Settings', 'Activity Logs'].map((scope) => (
                      <span key={scope} className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-semibold text-purple-800">
                        ✓ {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SECURITY & CREDENTIALS */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <span>Security &amp; Account Protection</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your active session details, unique email verification, and password change options.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Email Address Policy</div>
                  <div className="text-[11px] text-slate-500">Each role has its own dedicated email address for strict segregation</div>
                </div>
                <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">
                  {user?.email}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Password Management</div>
                  <div className="text-[11px] text-slate-500">Reset your password via 6-digit email OTP verification</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('reset-password')}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-bold transition-colors"
                >
                  Change Password
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Authentication Token</div>
                  <div className="text-[11px] text-slate-500">Signed with HMAC-SHA256 REST API JWT Bearer token</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Active (24h validity)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

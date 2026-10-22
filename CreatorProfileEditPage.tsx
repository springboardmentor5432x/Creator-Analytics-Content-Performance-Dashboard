import React, { useState, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  Globe, 
  MapPin, 
  DollarSign, 
  Youtube, 
  Instagram, 
  Video, 
  Twitter,
  RefreshCw,
  Sliders,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileUpdatePayload } from '../../types/auth';

interface CreatorProfileEditPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CreatorProfileEditPage: React.FC<CreatorProfileEditPageProps> = ({ 
  onNavigate, 
  onShowToast 
}) => {
  const { user, creatorProfile, updateCreatorProfile, isActionLoading } = useAuth();

  const [formData, setFormData] = useState<ProfileUpdatePayload>({
    name: user?.name || '',
    handle: creatorProfile?.handle || '',
    bio: creatorProfile?.bio || '',
    niche: creatorProfile?.niche || '',
    location: creatorProfile?.location || '',
    website: creatorProfile?.website || '',
    contact_email: creatorProfile?.contactEmail || user?.email || '',
    base_rate: creatorProfile?.baseRate || 2400,
    collaboration_status: creatorProfile?.collaborationStatus || 'open',
    youtube_handle: creatorProfile?.youtubeHandle || '',
    instagram_handle: creatorProfile?.instagramHandle || '',
    tiktok_handle: creatorProfile?.tiktokHandle || '',
    twitter_handle: creatorProfile?.twitterHandle || ''
  });

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  useEffect(() => {
    if (user && creatorProfile) {
      setFormData({
        name: user.name || '',
        handle: creatorProfile.handle || '',
        bio: creatorProfile.bio || '',
        niche: creatorProfile.niche || '',
        location: creatorProfile.location || '',
        website: creatorProfile.website || '',
        contact_email: creatorProfile.contactEmail || user.email || '',
        base_rate: creatorProfile.baseRate || 2400,
        collaboration_status: creatorProfile.collaborationStatus || 'open',
        youtube_handle: creatorProfile.youtubeHandle || '',
        instagram_handle: creatorProfile.instagramHandle || '',
        tiktok_handle: creatorProfile.tiktokHandle || '',
        twitter_handle: creatorProfile.twitterHandle || ''
      });
    }
  }, [user, creatorProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'base_rate' ? (parseFloat(value) || 0) : value
    }));
    if (statusMessage) setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!formData.name?.trim()) {
      setStatusMessage({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }

    const res = await updateCreatorProfile(formData);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Profile changes successfully synchronized with the backend!' });
      onShowToast('Creator profile updated successfully!', 'success');
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Failed to update creator profile.' });
      onShowToast(res.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Edit Creator Profile &amp; Media Kit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Update your public persona, collaboration terms, and connected channels
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => onNavigate('reset-password')}
            className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-700 flex items-center space-x-1.5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            <span>Reset Password</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
          </button>

          <button
            onClick={() => onNavigate('profile-view')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <span>View Public Page</span>
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Live Preview Card (if toggled) */}
      {showLivePreview && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Public Preview</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Status: {formData.collaboration_status}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <img 
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
              alt={formData.name} 
              className="w-14 h-14 rounded-2xl border border-white shadow-md object-cover bg-white"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-slate-900">{formData.name || 'Your Name'}</span>
                <span className="font-mono text-xs text-blue-600">{formData.handle || '@handle'}</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{formData.bio || 'Add a bio below...'}</p>
              <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                <span>📍 {formData.location || 'Global'}</span>
                <span>•</span>
                <span className="font-semibold text-indigo-700">🏷️ {formData.niche || 'Niche'}</span>
                <span>•</span>
                <span className="font-bold text-slate-800">💰 ${formData.base_rate?.toLocaleString()} base</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Creator Identity &amp; Niche
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Public Handle (@username)
              </label>
              <input
                type="text"
                name="handle"
                value={formData.handle}
                onChange={handleChange}
                placeholder="@harshitha_s"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Content Niche
              </label>
              <input
                type="text"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                placeholder="e.g. AI & Tech, Design, Finance"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. San Francisco, CA / Remote"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Creator Bio &amp; Channel Summary
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell brands and agencies about your audience, style, and content focus..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          </div>
        </div>

        {/* Section 2: Sponsorship & Commercial Rates */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Partnership Terms &amp; Rates
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Base Sponsorship Rate (USD)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  name="base_rate"
                  value={formData.base_rate}
                  onChange={handleChange}
                  min="0"
                  step="50"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Collaboration Availability Status
              </label>
              <select
                name="collaboration_status"
                value={formData.collaboration_status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="open">🟢 Open for Brand Sponsorships</option>
                <option value="selective">🟡 Selective (High-Affinity Only)</option>
                <option value="booked">🔴 Fully Booked for Current Quarter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Partnership Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                placeholder="partnerships@creator.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Portfolio / Website URL
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://creator.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Social Media Handles */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Connected Channels &amp; Social Handles
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <Youtube className="w-3.5 h-3.5 text-rose-600" />
                <span>YouTube Channel Handle</span>
              </label>
              <input
                type="text"
                name="youtube_handle"
                value={formData.youtube_handle}
                onChange={handleChange}
                placeholder="@AlexRiveraTech"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <Instagram className="w-3.5 h-3.5 text-fuchsia-600" />
                <span>Instagram Profile Handle</span>
              </label>
              <input
                type="text"
                name="instagram_handle"
                value={formData.instagram_handle}
                onChange={handleChange}
                placeholder="@harshitha.codes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-slate-800" />
                <span>TikTok Channel Handle</span>
              </label>
              <input
                type="text"
                name="tiktok_handle"
                value={formData.tiktok_handle}
                onChange={handleChange}
                placeholder="@harshitha_dev"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <Twitter className="w-3.5 h-3.5 text-sky-500" />
                <span>Twitter / X Handle</span>
              </label>
              <input
                type="text"
                name="twitter_handle"
                value={formData.twitter_handle}
                onChange={handleChange}
                placeholder="@harshitha_s"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isActionLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isActionLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Backend...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

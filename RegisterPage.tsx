import React, { useState } from 'react';
import { 
  Sparkles, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  Target,
  Shield,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onShowToast }) => {
  const { register, isActionLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'creator' as UserRole,
    niche: 'Tech & Digital Media'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage(null);
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const getStrengthLabel = (score: number) => {
    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
    if (score === 2 || score === 3) return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strengthInfo = getStrengthLabel(passwordStrength);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setErrorMessage('Passwords do not match. Please verify your confirm password.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must accept the CreatorIQ Terms of Service to proceed.');
      return;
    }

    const res = await register(formData);
    if (res.success) {
      if (res.requiresVerification) {
        onShowToast(`Account registered! A verification email has been sent to ${formData.email}.`, 'success');
      } else {
        onShowToast(`Account created! Welcome to CreatorIQ, ${formData.name}`, 'success');
      }
      onNavigate('dashboard');
    } else {
      setErrorMessage(res.message || 'Registration failed');
      onShowToast(res.message || 'Registration failed', 'error');
    }
  };

  const roles = [
    {
      id: 'creator',
      title: 'Creator',
      desc: 'Content metrics, media kit, profile view & sponsorship rates',
      icon: Palette,
      color: 'border-blue-500 bg-blue-50/50 text-blue-700'
    },
    {
      id: 'agency',
      title: 'Agency',
      desc: 'Roster management, creator discovery, client deliverables',
      icon: Building,
      color: 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
    },
    {
      id: 'marketing',
      title: 'Marketing Team',
      desc: 'Brand campaigns, creator outreach, ROI performance',
      icon: Target,
      color: 'border-sky-500 bg-sky-50/50 text-sky-700'
    },
    {
      id: 'admin',
      title: 'Administrator',
      desc: 'Full user management, permissions, and security audit logs',
      icon: Shield,
      color: 'border-purple-500 bg-purple-50/50 text-purple-700'
    }
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Create Your CreatorIQ Account
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 1: User Management &amp; Creator Profiles with JWT Authentication
          </p>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Alex Rivera"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. alex@creatoriq.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Your Platform Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = formData.role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: r.id as UserRole }))}
                    className={`
                      p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                      ${isSelected 
                        ? `${r.color} border-2 shadow-sm` 
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-current' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">{r.title}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-current bg-current text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {r.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Creator Niche (if Creator) */}
          {formData.role === 'creator' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Primary Content Niche / Specialty
              </label>
              <input
                type="text"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                placeholder="e.g. AI & Tech, Gaming, Fitness, Fashion, Personal Finance"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          )}

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                {formData.password && (
                  <span className={`text-[10px] font-bold ${strengthInfo.text}`}>
                    {strengthInfo.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 characters"
                  required
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Strength Bars */}
              {formData.password && (
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  <div className={`h-1 rounded-full ${passwordStrength >= 1 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`h-1 rounded-full ${passwordStrength >= 2 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`h-1 rounded-full ${passwordStrength >= 3 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`h-1 rounded-full ${passwordStrength >= 4 ? strengthInfo.color : 'bg-slate-200'}`} />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                {formData.confirm_password && (
                  <span className={`text-[10px] font-bold ${formData.password === formData.confirm_password ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formData.password === formData.confirm_password ? 'Matches' : 'Mismatch'}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                  className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 bg-slate-50/50 ${
                    formData.confirm_password && formData.password !== formData.confirm_password
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="terms" className="text-xs text-slate-600 leading-snug">
              I agree to the <span className="text-blue-600 font-medium">Terms of Service</span> and acknowledge that passwords are securely hashed with bcrypt / PBKDF2 on the backend.
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isActionLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {isActionLoading ? (
              <span>Registering Account &amp; Issuing JWT...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer: Link to login */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Sign In to Your Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

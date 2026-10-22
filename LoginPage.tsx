import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound,
  Shield, 
  Palette, 
  Building, 
  Target, 
  ChevronDown,
  Info,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onShowToast }) => {
  const { login, isActionLoading } = useAuth();

  // Target Workspace selection dropdown with the 4 required workspaces
  const [selectedWorkspace, setSelectedWorkspace] = useState<UserRole>('creator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(true);

  // Available workspaces definition
  const workspaceOptions: {
    id: UserRole;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    lightBg: string;
    textColor: string;
    borderColor: string;
  }[] = [
    {
      id: 'creator',
      label: 'Creator',
      description: 'Analytics, audience metrics, top content, rate card & sponsorships',
      icon: Palette,
      accentColor: 'from-purple-600 to-indigo-600',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200'
    },
    {
      id: 'agency',
      label: 'Agency Team',
      description: 'Talent roster, creator discovery, client deliverables & campaign budgets',
      icon: Building,
      accentColor: 'from-indigo-600 to-purple-700',
      lightBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'marketing',
      label: 'Marketing Team',
      description: 'Campaign outreach, ROI performance, brand sponsorships & conversions',
      icon: Target,
      accentColor: 'from-sky-600 to-indigo-600',
      lightBg: 'bg-sky-50',
      textColor: 'text-sky-700',
      borderColor: 'border-sky-200'
    },
    {
      id: 'admin',
      label: 'Administrator',
      description: 'User management, multi-role assignments, system settings & security audits',
      icon: Shield,
      accentColor: 'from-purple-700 to-indigo-800',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-900',
      borderColor: 'border-purple-300'
    }
  ];

  const currentWorkspaceConfig = workspaceOptions.find(w => w.id === selectedWorkspace) || workspaceOptions[0];
  const CurrentIcon = currentWorkspaceConfig.icon;

  const validateEmail = (val: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your actual email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // Call login with credentials and requested workspace.
    // The backend / Firebase verifies credentials and strictly checks authorized roles.
    // If the user selected an unauthorized role, the backend rejects with HTTP 403.
    const res = await login(cleanEmail, password, selectedWorkspace);
    if (res.success) {
      onShowToast(`Signed in successfully! Entering ${selectedWorkspace.toUpperCase()} Workspace.`, 'success');
      onNavigate('dashboard');
    } else if (res.requiresVerification) {
      setErrorMessage(res.message || 'Please verify your email address to access your dashboard.');
      onShowToast('Email verification required. Verification prompt opened.', 'info');
      onNavigate('dashboard');
    } else {
      setErrorMessage(res.message || 'Incorrect email address or password.');
      onShowToast(res.message || 'Authentication failed', 'error');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 relative">
        {/* Connection status badge */}
        <div className="mb-4 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[11px] text-purple-700 font-semibold w-full justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Verified Multi-Role Authentication Active</span>
        </div>

        {/* Header with CreatorIQ Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-purple-500/25 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Sign In to CreatorIQ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role-specific workspaces for Creators, Agencies, Marketing &amp; Administrators
          </p>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Simple Secure Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Workspace Selection Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="workspace-select" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Target Workspace</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentWorkspaceConfig.lightBg} ${currentWorkspaceConfig.textColor} ${currentWorkspaceConfig.borderColor}`}>
                {currentWorkspaceConfig.label}
              </span>
            </div>
            
            <div className="relative">
              <select
                id="workspace-select"
                value={selectedWorkspace}
                onChange={(e) => {
                  setSelectedWorkspace(e.target.value as UserRole);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 bg-slate-50/80 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="creator">Creator</option>
                <option value="agency">Agency Team</option>
                <option value="marketing">Marketing Team</option>
                <option value="admin">Administrator</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-purple-600">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
              <span>{currentWorkspaceConfig.description}</span>
            </p>
          </div>

          {/* Email input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your actual registered email"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('reset-password')}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold flex items-center space-x-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Forgot password?</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your account password"
                required
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember me & security badge */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 select-none">
                Remember this session
              </label>
            </div>
            <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Backend RBAC Validated</span>
            </span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isActionLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 mt-2"
          >
            {isActionLoading ? (
              <span className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Account &amp; Workspace Authorization...</span>
              </span>
            ) : (
              <>
                <span>Sign In to {currentWorkspaceConfig.label} Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Multi-role Workspace Policy Note */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-purple-600" />
              <span>Multi-Role Workspace Authorization:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowWorkspaceInfo(!showWorkspaceInfo)}
              className="text-[10px] text-purple-700 font-semibold hover:underline"
            >
              {showWorkspaceInfo ? 'Hide' : 'Details'}
            </button>
          </div>

          {showWorkspaceInfo && (
            <div className="text-[11px] text-slate-600 space-y-1 leading-relaxed">
              <p>
                • An account may be authorized for a maximum of two roles (e.g., Creator + Agency Team).
              </p>
              <p>
                • Role assignments are verified through trusted backend data. Selecting an unauthorized workspace in the dropdown will be safely rejected.
              </p>
              <p>
                • Users with dual roles can switch workspaces seamlessly after signing in.
              </p>
            </div>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-600">
            Forgot your password?{' '}
            <button
              onClick={() => onNavigate('reset-password')}
              className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Reset via Real Email Verification
            </button>
          </p>
          <p className="text-xs text-slate-600">
            Need a new account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Register New Role Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

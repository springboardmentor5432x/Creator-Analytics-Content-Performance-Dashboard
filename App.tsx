import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CreatorDashboardPage } from './pages/creator/CreatorDashboardPage';
import { CreatorProfileViewPage } from './pages/creator/CreatorProfileViewPage';
import { CreatorProfileEditPage } from './pages/creator/CreatorProfileEditPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUserManagementPage } from './pages/admin/AdminUserManagementPage';
import { AgencyDashboardPage } from './pages/agency/AgencyDashboardPage';
import { MarketingDashboardPage } from './pages/marketing/MarketingDashboardPage';
import { MyProfilePage } from './pages/profile/MyProfilePage';
import { UnauthorizedPage } from './pages/common/UnauthorizedPage';
import { EmailVerificationPrompt } from './components/auth/EmailVerificationPrompt';
import { 
  RefreshCw, 
  Sparkles, 
  Share2, 
  Youtube, 
  Instagram, 
  Video, 
  Linkedin, 
  CheckCircle2, 
  FileText, 
  Download, 
  Bell, 
  Check, 
  ArrowLeft,
  DollarSign 
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, isVerificationPending, isEmailVerified } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Header Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Toast dispatch helper
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check URL query parameters for reset token or Firebase action links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('page') === 'reset-password' || 
      params.get('page') === 'forgot-password' || 
      params.get('mode') === 'resetPassword' || 
      params.get('mode') === 'verifyEmail' || 
      params.has('oobCode') || 
      params.has('token') || 
      params.has('reset_token')
    ) {
      setCurrentPage('reset-password');
    }
  }, []);

  // Route & redirect synchronization
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        if (
          currentPage !== 'register' && 
          currentPage !== 'login' && 
          currentPage !== 'reset-password' && 
          currentPage !== 'forgot-password'
        ) {
          setCurrentPage('login');
        }
      } else {
        if (currentPage === 'login' || currentPage === 'register') {
          setCurrentPage('dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, user?.role, currentPage]);

  // Loading state during initial session verification
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-purple-50/50 text-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/25 mb-4 animate-bounce">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-sm font-bold text-purple-900">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>Verifying CreatorIQ JWT Authentication...</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Connecting to Backend REST API</p>
      </div>
    );
  }

  // Render role-appropriate dashboard view
  const renderDashboardByRole = () => {
    if (!user) return <LoginPage onNavigate={setCurrentPage} onShowToast={showToast} />;

    switch (user.role) {
      case 'creator':
        return (
          <CreatorDashboardPage 
            onNavigate={setCurrentPage} 
            searchQuery={searchQuery}
            selectedDateRange={selectedDateRange}
            selectedPlatform={selectedPlatform}
          />
        );
      case 'agency':
        return <AgencyDashboardPage onNavigate={setCurrentPage} />;
      case 'marketing':
        return <MarketingDashboardPage onNavigate={setCurrentPage} />;
      case 'admin':
        return <AdminDashboardPage onNavigate={setCurrentPage} onShowToast={showToast} />;
      default:
        return (
          <CreatorDashboardPage 
            onNavigate={setCurrentPage} 
            searchQuery={searchQuery}
            selectedDateRange={selectedDateRange}
            selectedPlatform={selectedPlatform}
          />
        );
    }
  };

  // Render main page
  const renderPage = () => {
    // Action code links (password reset, email verify) always take precedence
    if (currentPage === 'reset-password' || currentPage === 'forgot-password') {
      return <ResetPasswordPage onNavigate={setCurrentPage} onShowToast={showToast} initialEmail={user?.email} />;
    }

    // If user is authenticated but email is unverified, block dashboards and display verification prompt!
    if (user && (!isEmailVerified || isVerificationPending)) {
      return <EmailVerificationPrompt onShowToast={showToast} />;
    }

    // Public unauthenticated pages
    if (!isAuthenticated) {
      if (currentPage === 'register') {
        return <RegisterPage onNavigate={setCurrentPage} onShowToast={showToast} />;
      }
      return <LoginPage onNavigate={setCurrentPage} onShowToast={showToast} />;
    }

    // Authenticated pages
    switch (currentPage) {
      case 'dashboard':
        return renderDashboardByRole();

      case 'my-profile':
      case 'profile-view':
      case 'profile-edit':
      case 'settings':
        return <MyProfilePage onNavigate={setCurrentPage} onShowToast={showToast} />;

      case 'creator-media-kit':
        return <CreatorProfileViewPage onNavigate={setCurrentPage} onShowToast={showToast} />;

      case 'social-accounts':
        return (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-purple-100">
              <div>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Connected Social Accounts</h1>
                <p className="text-xs text-slate-500">Live API integrations across YouTube, Instagram, TikTok, and LinkedIn</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-red-100 shadow-xs flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-sm">YouTube Channel</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
                    </div>
                    <p className="text-xs font-mono text-red-600 mt-0.5">@HarshithaTech</p>
                    <p className="text-xs text-slate-500 mt-2">185,000 Subscribers • 48 Videos Analyzed</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-pink-100 shadow-xs flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-xl bg-pink-50 text-pink-600 border border-pink-200">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-sm">Instagram Profile</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
                    </div>
                    <p className="text-xs font-mono text-pink-600 mt-0.5">@harshitha.codes</p>
                    <p className="text-xs text-slate-500 mt-2">94,200 Followers • 112 Posts Tracked</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-900 border border-slate-300">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-sm">TikTok Account</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
                    </div>
                    <p className="text-xs font-mono text-slate-800 mt-0.5">@harshitha_dev</p>
                    <p className="text-xs text-slate-500 mt-2">310,000 Followers • 84 Shorts Synced</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                    <Linkedin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-sm">LinkedIn Creator Page</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
                    </div>
                    <p className="text-xs font-mono text-sky-600 mt-0.5">@harshitha-s-tech</p>
                    <p className="text-xs text-slate-500 mt-2">28,000 Followers • 36 Articles Published</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-purple-100">
              <div>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performance Reports &amp; Exports</h1>
                <p className="text-xs text-slate-500">Download executive PDF and CSV summaries for brands and sponsors</p>
              </div>

              <button
                onClick={() => showToast('Full Q4 Performance Report generated and downloaded!', 'success')}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Latest Q4 Report</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Monthly Summary</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">October 2026 Creator Statement</h3>
                  <p className="text-xs text-slate-500 mt-2">Comprehensive 30-day breakdown of reach, growth rate, and monetization.</p>
                </div>
                <button
                  onClick={() => showToast('Downloading October 2026 Statement (PDF)...', 'info')}
                  className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center justify-between"
                >
                  <span>Download PDF</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Sponsorship Kit</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">Brand Pitch &amp; Media Kit PDF</h3>
                  <p className="text-xs text-slate-500 mt-2">Audience demographics, verified engagement rate, and standard rate card.</p>
                </div>
                <button
                  onClick={() => showToast('Downloading Brand Media Kit...', 'info')}
                  className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center justify-between"
                >
                  <span>Download PDF</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Raw Data</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">Raw Post Metrics (CSV)</h3>
                  <p className="text-xs text-slate-500 mt-2">All release timestamps, view counts, like ratios, comments, and shares.</p>
                </div>
                <button
                  onClick={() => showToast('Exporting Post Metrics (CSV)...', 'info')}
                  className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center justify-between"
                >
                  <span>Download CSV</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-purple-100">
              <div>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications Center</h1>
                <p className="text-xs text-slate-500">Real-time alerts for viral spikes, brand partnership offers, and system events</p>
              </div>
              <button
                onClick={() => showToast('All notifications marked as read.', 'success')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100"
              >
                Mark All as Read
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex items-start space-x-3.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Viral Engagement Alert on TikTok</h4>
                    <span className="text-[10px] text-slate-400 font-mono">15m ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Your video "Day in the Life of a Full-Time Creative Technologist" passed 480K views with a 7.8% engagement rate!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-start space-x-3.5">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">New Brand Sponsorship Proposal</h4>
                    <span className="text-[10px] text-slate-400 font-mono">2h ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Synthetix AI offered a $3,500 dedicated integration for your upcoming YouTube camera gear review.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-start space-x-3.5">
                <span className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                  <Linkedin className="w-4 h-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Milestone Reached: 45K LinkedIn Followers</h4>
                    <span className="text-[10px] text-slate-400 font-mono">1d ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Your professional network grew by +18.4% this quarter with verified high-income tech demographics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'content':
      case 'analytics':
      case 'audience':
      case 'revenue':
        // These tabs render with customized focus in the CreatorDashboard
        return (
          <CreatorDashboardPage 
            onNavigate={setCurrentPage} 
            searchQuery={searchQuery}
            selectedDateRange={selectedDateRange}
            selectedPlatform={selectedPlatform}
          />
        );

      case 'admin-dashboard':
      case 'admin-users':
      case 'admin-roles':
      case 'admin-audit':
        if (user?.role !== 'admin') {
          return <UnauthorizedPage requiredRoles={['Admin Team']} onNavigate={setCurrentPage} />;
        }
        return currentPage === 'admin-dashboard' 
          ? <AdminDashboardPage onNavigate={setCurrentPage} onShowToast={showToast} /> 
          : <AdminUserManagementPage onShowToast={showToast} onNavigate={setCurrentPage} />;

      case 'agency-dashboard':
      case 'talent-roster':
      case 'creator-discovery':
      case 'campaign-tracking':
        if (user?.role !== 'agency' && user?.role !== 'admin') {
          return <UnauthorizedPage requiredRoles={['Agency Team', 'Admin Team']} onNavigate={setCurrentPage} />;
        }
        return <AgencyDashboardPage onNavigate={setCurrentPage} />;

      case 'marketing-dashboard':
      case 'campaign-hub':
      case 'creator-sourcing':
      case 'budget-roi':
        if (user?.role !== 'marketing' && user?.role !== 'admin') {
          return <UnauthorizedPage requiredRoles={['Marketing Team', 'Admin Team']} onNavigate={setCurrentPage} />;
        }
        return <MarketingDashboardPage onNavigate={setCurrentPage} />;

      case 'creator-dashboard':
      case 'creator-media-kit':
        if (user?.role !== 'creator' && user?.role !== 'admin') {
          return <UnauthorizedPage requiredRoles={['Creator Team', 'Admin Team']} onNavigate={setCurrentPage} />;
        }
        return currentPage === 'creator-media-kit'
          ? <CreatorProfileViewPage onNavigate={setCurrentPage} onShowToast={showToast} />
          : <CreatorDashboardPage 
              onNavigate={setCurrentPage} 
              searchQuery={searchQuery}
              selectedDateRange={selectedDateRange}
              selectedPlatform={selectedPlatform}
            />;

      case 'reset-password':
      case 'forgot-password':
        return <ResetPasswordPage onNavigate={setCurrentPage} onShowToast={showToast} initialEmail={user?.email} />;

      default:
        return renderDashboardByRole();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col selection:bg-indigo-100 selection:text-indigo-950">
      {/* Top Navbar */}
      <Navbar 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onShowToast={showToast}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
      />

      <div className="flex-1 flex">
        {/* Role-Specific Sidebar (when logged in & verified) */}
        {isAuthenticated && isEmailVerified && !isVerificationPending && (
          <Sidebar
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Viewport */}
        <main className={`flex-1 transition-all duration-200 ${isAuthenticated && isEmailVerified && !isVerificationPending ? 'lg:pl-56' : ''}`}>
          <div className="p-3.5 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

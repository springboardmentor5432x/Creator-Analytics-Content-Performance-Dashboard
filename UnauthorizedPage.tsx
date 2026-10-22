import React from 'react';
import { ShieldAlert, ArrowLeft, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UnauthorizedPageProps {
  requiredRoles?: string[];
  onNavigate: (page: string) => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ 
  requiredRoles = ['admin'], 
  onNavigate 
}) => {
  const { user, login } = useAuth();

  const handleAdminLogin = async () => {
    await login('admin@example.com', 'Admin123!Secure');
    onNavigate('admin-users');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-100/60 px-2.5 py-1 rounded-full">
          HTTP 403 Forbidden
        </span>

        <h2 className="text-xl font-extrabold text-slate-900 mt-3 mb-2">
          Access Restricted
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Your current account role is <strong className="text-slate-800 capitalize">{user?.role || 'Guest'}</strong>.
          This administrative page requires elevated authorization ({requiredRoles.join(' or ')}).
          Private profile data and administrative actions are protected by backend role-based checks.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your Dashboard</span>
          </button>

          <button
            onClick={handleAdminLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-sm"
          >
            <Key className="w-4 h-4" />
            <span>Log In as Demo Administrator</span>
          </button>
        </div>
      </div>
    </div>
  );
};

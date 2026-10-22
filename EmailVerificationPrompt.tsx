import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Send, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EmailVerificationPromptProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const EmailVerificationPrompt: React.FC<EmailVerificationPromptProps> = ({ onShowToast }) => {
  const { user, resendVerificationEmail, checkVerificationStatus, logout } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setStatusMessage(null);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setStatusMessage('Verification email dispatched! Please check your inbox and spam folder.');
        setCooldown(45);
        onShowToast('Verification email resent successfully.', 'success');
      } else {
        setStatusMessage(res.message);
        onShowToast(res.message, 'error');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to resend verification email.');
      onShowToast(err.message || 'Failed to send verification email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const verified = await checkVerificationStatus();
      if (verified) {
        onShowToast('Email verified successfully! Welcome to your dashboard.', 'success');
      } else {
        setStatusMessage('Email is not yet verified. Please click the confirmation link in the email sent to your inbox.');
        onShowToast('Email still unverified. Please check your inbox.', 'info');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Could not verify status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-purple-100 p-8 text-center animate-in fade-in">
        {/* Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          Verify Your Email Address
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          A genuine verification email has been sent to:
        </p>

        <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 mb-5 font-mono text-xs font-bold text-purple-900 break-all">
          {user?.email || 'your registered email'}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          To protect account security and access the <span className="font-bold text-purple-700 capitalize">{user?.role || 'authorized'} Team Dashboard</span>, please open the verification link in your inbox or spam folder.
        </p>

        {statusMessage && (
          <div className="mb-5 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs font-medium flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCheckNow}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking Verification Status...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Clicked The Verification Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="w-full py-2.5 px-4 rounded-xl border border-purple-200 hover:bg-purple-50/50 text-purple-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all disabled:text-slate-400 disabled:border-slate-200"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending Email...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{cooldown > 0 ? `Resend Email in ${cooldown}s` : 'Resend Verification Email'}</span>
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
            <button
              onClick={() => logout()}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out and use another account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

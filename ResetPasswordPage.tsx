import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send,
  ShieldCheck,
  Check,
  HelpCircle,
  Clock
} from 'lucide-react';
import { firebaseAuthService } from '../../services/firebaseAuthService';

interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  initialEmail?: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigate,
  onShowToast,
  initialEmail = ''
}) => {
  // Step: 'request' | 'sent' | 'reset' | 'success' | 'emailVerified' | 'error'
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'success' | 'emailVerified' | 'error'>('request');
  
  // Form inputs
  const [email, setEmail] = useState(initialEmail || '');
  const [oobCode, setOobCode] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Check URL parameters on mount for Firebase action codes (oobCode, mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const actionCode = params.get('oobCode') || params.get('token') || params.get('reset_token');

    // Case 1: Verify Email link opened
    if (mode === 'verifyEmail' && actionCode) {
      setIsValidatingCode(true);
      firebaseAuthService.applyEmailVerification(actionCode)
        .then(() => {
          setStep('emailVerified');
          if (onShowToast) onShowToast('Email verified successfully! You can now log in.', 'success');
        })
        .catch((err) => {
          setErrorMessage(firebaseAuthService.getFriendlyErrorMessage(err));
          setStep('error');
        })
        .finally(() => {
          setIsValidatingCode(false);
        });
      return;
    }

    // Case 2: Reset Password link opened
    if ((mode === 'resetPassword' || actionCode) && actionCode) {
      setOobCode(actionCode);
      setIsValidatingCode(true);
      firebaseAuthService.verifyResetCode(actionCode)
        .then((targetEmail) => {
          setVerifiedEmail(targetEmail);
          setEmail(targetEmail);
          setStep('reset');
        })
        .catch((err) => {
          setErrorMessage(firebaseAuthService.getFriendlyErrorMessage(err));
          setStep('error');
        })
        .finally(() => {
          setIsValidatingCode(false);
        });
    }
  }, [onShowToast]);

  // Step 1: Request Password Reset via Real Firebase Authentication
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await firebaseAuthService.sendPasswordReset(cleanEmail);
      setSuccessInfo(`Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`);
      if (onShowToast) onShowToast(`Reset email sent to ${cleanEmail}`, 'success');
      setStep('sent');
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.getFriendlyErrorMessage(err));
      if (onShowToast) onShowToast('Failed to send reset email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm New Password using real Firebase Auth
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (!oobCode) {
      setErrorMessage('Missing password reset verification code. Please request a new link.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await firebaseAuthService.confirmResetPassword(oobCode, newPassword);
      if (onShowToast) onShowToast('Password updated successfully! Please log in.', 'success');
      setStep('success');
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.getFriendlyErrorMessage(err));
      if (onShowToast) onShowToast('Password update failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  // Loading state while checking code validity
  if (isValidatingCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-purple-100 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Verifying Security Code...</h2>
          <p className="text-xs text-slate-500 mt-1">Contacting Firebase Authentication to validate your link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-purple-100 p-8">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white shadow-lg shadow-purple-500/25 mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {step === 'reset' ? 'Set New Password' : step === 'emailVerified' ? 'Email Confirmed' : 'Password Recovery'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            CreatorIQ Real Firebase Authentication
          </p>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: Enter Email to Request Reset */}
        {step === 'request' && (
          <div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Enter your registered CreatorIQ email address. We will send a genuine password reset link directly to your inbox.
            </p>

            <form onSubmit={handleRequestReset} className="space-y-4">
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
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Real Reset Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Password Reset Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Email Sent Confirmation */}
        {step === 'sent' && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <Mail className="w-7 h-7" />
            </div>

            <h2 className="text-base font-bold text-slate-900 mb-2">
              Check Your Inbox
            </h2>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              We have dispatched a real password reset email to:
            </p>

            <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 mb-4 font-mono text-xs font-bold text-purple-900 break-all">
              {email}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] text-left space-y-1 mb-6">
              <div className="font-bold text-slate-800 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>Next steps:</span>
              </div>
              <div>• Open the email from Firebase / CreatorIQ.</div>
              <div>• Check your spam or junk folder if you don't see it within a minute.</div>
              <div>• Click the link to open the password reset page and set your new password.</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('login')}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full py-2 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
              >
                Enter a different email address
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Enter New Password (Valid link opened) */}
        {step === 'reset' && (
          <div>
            <div className="mb-4 p-3 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs">
              <span className="text-slate-500">Resetting password for:</span>
              <div className="font-mono font-bold text-purple-950 mt-0.5">{verifiedEmail || email}</div>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                      <span>Password Strength:</span>
                      <span className="font-bold">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex space-x-0.5">
                      <div className={`h-full flex-1 ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 ${strength.score >= 4 ? strength.color : 'bg-slate-200'}`} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Confirm new password"
                    required
                    className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 bg-slate-50/50 ${
                      confirmPassword && confirmPassword === newPassword 
                        ? 'border-emerald-500 focus:ring-emerald-500' 
                        : 'border-slate-300 focus:ring-purple-500'
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
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Passwords match</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password in Firebase...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reset Password &amp; Save</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: Success Message (Exact requirement) */}
        {step === 'success' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Password reset successful. Please log in with your new password.
            </p>

            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all"
            >
              <span>Log In With New Password</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 5: Email Verified Confirmation */}
        {step === 'emailVerified' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Email Verified Successfully
            </h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Your email address has been confirmed with Firebase Authentication. You can now log into CreatorIQ and access your authorized dashboard.
            </p>

            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 6: Expired or Invalid link Error */}
        {step === 'error' && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Link Expired or Invalid
            </h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {errorMessage || 'This action link has expired or has already been used. For your security, reset links can only be used once.'}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setStep('request');
                }}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all"
              >
                <span>Request a New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('login')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        {step !== 'success' && step !== 'emailVerified' && step !== 'error' && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('login')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center justify-center space-x-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

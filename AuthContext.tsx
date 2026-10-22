import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  User, 
  CreatorProfile, 
  UserRole, 
  RegisterPayload, 
  ProfileUpdatePayload 
} from '../types/auth';
import { 
  authService, 
  creatorService 
} from '../services/api';
import { 
  getToken, 
  setToken, 
  clearToken, 
  getApiBaseUrl, 
  setApiBaseUrl as saveApiBaseUrl 
} from '../config/api';
import { auth, db } from '../config/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';

interface AuthContextType {
  user: User | null;
  creatorProfile: CreatorProfile | null;
  token: string | null;
  isLoading: boolean;
  isActionLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isVerificationPending: boolean;
  activeBackendUrl: string;
  updateBackendUrl: (url: string) => void;
  login: (email: string, password: string, requestedWorkspace?: string) => Promise<{ 
    success: boolean; 
    message?: string; 
    user?: User; 
    requiresVerification?: boolean 
  }>;
  switchWorkspace: (role: UserRole) => Promise<{ success: boolean; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ 
    success: boolean; 
    message?: string; 
    user?: User; 
    requiresVerification?: boolean 
  }>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ success: boolean; message: string }>;
  checkVerificationStatus: () => Promise<boolean>;
  updateCreatorProfile: (payload: ProfileUpdatePayload) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [isVerificationPending, setIsVerificationPending] = useState<boolean>(false);
  const [activeBackendUrl, setActiveBackendUrlState] = useState<string>(getApiBaseUrl());

  // Helper to load user profile from Firestore or API
  const syncFirebaseUser = useCallback(async (fbUser: FirebaseUser) => {
    try {
      await fbUser.reload().catch(() => {});
      const verified = fbUser.emailVerified;
      setIsEmailVerified(verified);
      setIsVerificationPending(!verified);

      // Fetch user profile from Firestore
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      let currentUserData: User;

      if (snap.exists()) {
        const d = snap.data();
        currentUserData = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: d.name || fbUser.displayName || 'User',
          email: d.email || fbUser.email || '',
          role: (d.role as UserRole) || 'creator',
          status: d.status || 'active',
          avatar_url: d.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name || 'User')}`,
          created_at: d.createdAt || new Date().toISOString(),
          last_login: new Date().toISOString(),
          email_verified: verified
        };

        if (verified && !d.emailVerified) {
          updateDoc(doc(db, 'users', fbUser.uid), {
            emailVerified: true,
            updatedAt: new Date().toISOString()
          }).catch(console.warn);
        }
      } else {
        // Fallback profile
        currentUserData = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          role: (fbUser.email?.includes('admin') ? 'admin' : 'creator') as UserRole,
          status: 'active',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.email || 'User')}`,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          email_verified: verified
        };
      }

      setUser(currentUserData);
      const token = await fbUser.getIdToken();
      setToken(token);
      setTokenState(token);

      // Load creator profile if creator
      if (currentUserData.role === 'creator') {
        try {
          const profSnap = await getDoc(doc(db, 'creatorProfiles', fbUser.uid));
          if (profSnap.exists()) {
            setCreatorProfile(profSnap.data() as CreatorProfile);
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.warn('[AuthContext] syncFirebaseUser error:', err);
    }
  }, []);

  // Listen to real Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await syncFirebaseUser(fbUser);
        setIsLoading(false);
      } else {
        // If not in Firebase Auth, check local REST JWT session
        const existingToken = getToken();
        if (existingToken && !existingToken.startsWith('eyJ')) {
          // Token is invalid/expired
          clearToken();
          setTokenState(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (existingToken) {
          try {
            const response = await authService.getMe();
            if (response && response.user) {
              setUser(response.user);
              setIsEmailVerified(true);
              setIsVerificationPending(false);
              if (response.user.creator_profile) {
                setCreatorProfile(response.user.creator_profile);
              }
            } else {
              clearToken();
              setTokenState(null);
              setUser(null);
            }
          } catch {
            clearToken();
            setTokenState(null);
            setUser(null);
          }
        } else {
          setUser(null);
          setCreatorProfile(null);
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [syncFirebaseUser]);

  const updateBackendUrl = (url: string) => {
    saveApiBaseUrl(url);
    setActiveBackendUrlState(url);
  };

  /**
   * Login using Firebase Authentication with verification checks & fallback
   */
  const login = async (
    email: string, 
    password: string,
    requestedWorkspace?: string
  ): Promise<{ success: boolean; message?: string; user?: User; requiresVerification?: boolean }> => {
    setIsActionLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Firebase Authentication first
    try {
      const fbResult = await firebaseAuthService.login(cleanEmail, password, requestedWorkspace);
      const isVerified = fbResult.emailVerified;

      if (!isVerified) {
        setUser(fbResult.user);
        setIsEmailVerified(false);
        setIsVerificationPending(true);
        setIsActionLoading(false);
        return {
          success: false,
          requiresVerification: true,
          message: 'Email verification required. We have sent a verification link to your email.'
        };
      }

      // User is authenticated and verified with role from Firestore
      setUser(fbResult.user);
      setIsEmailVerified(true);
      setIsVerificationPending(false);
      const token = await fbResult.firebaseUser.getIdToken();
      setToken(token);
      setTokenState(token);
      setIsActionLoading(false);
      return { 
        success: true, 
        message: `Signed in successfully! Active workspace: ${fbResult.user.role.toUpperCase()}`, 
        user: fbResult.user 
      };
    } catch (fbErr: any) {
      if (fbErr.message && fbErr.message.startsWith('Access Denied:')) {
        setIsActionLoading(false);
        return { success: false, message: fbErr.message };
      }
      console.log('[AuthContext] Firebase Auth note:', fbErr?.code || fbErr?.message);

      // If user is a seeded dev account or local REST user, attempt backend REST login
      try {
        const restResponse = await authService.login({ 
          email: cleanEmail, 
          password, 
          role: requestedWorkspace && requestedWorkspace !== 'auto' ? requestedWorkspace : undefined 
        });
        if (restResponse.token && restResponse.user) {
          setToken(restResponse.token);
          setTokenState(restResponse.token);
          setUser(restResponse.user);
          setIsEmailVerified(true);
          setIsVerificationPending(false);
          setCreatorProfile(restResponse.user.creator_profile || null);
          setIsActionLoading(false);
          return { success: true, message: restResponse.message, user: restResponse.user };
        }
      } catch (restErr: any) {
        setIsActionLoading(false);
        return { 
          success: false, 
          message: restErr.message || firebaseAuthService.getFriendlyErrorMessage(fbErr)
        };
      }

      const friendlyMessage = firebaseAuthService.getFriendlyErrorMessage(fbErr);
      setIsActionLoading(false);
      return { success: false, message: friendlyMessage };
    }
  };

  /**
   * Switch active workspace between authorized roles (max 2 roles per account)
   */
  const switchWorkspace = async (role: UserRole): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'No active session' };
    const userRoles = (user.roles && user.roles.length) ? user.roles.slice(0, 2) : [user.role];

    if (!userRoles.includes(role)) {
      return {
        success: false,
        message: `Access Denied: You are not authorized for the '${role}' workspace. Authorized workspaces: ${userRoles.join(', ')}`
      };
    }

    setIsActionLoading(true);
    try {
      try {
        const res = await authService.switchWorkspace(role);
        if (res.success && res.user) {
          setUser(res.user);
          if (res.token) {
            setToken(res.token);
            setTokenState(res.token);
          }
        } else {
          setUser({ ...user, role });
        }
      } catch {
        setUser({ ...user, role });
      }

      setIsActionLoading(false);
      return { success: true, message: `Switched active workspace to ${role.toUpperCase()}` };
    } catch (err: any) {
      setIsActionLoading(false);
      return { success: false, message: err.message || 'Workspace switch failed' };
    }
  };

  /**
   * Register using real Firebase Authentication and send genuine verification email
   */
  const register = async (
    payload: RegisterPayload
  ): Promise<{ success: boolean; message?: string; user?: User; requiresVerification?: boolean }> => {
    setIsActionLoading(true);
    try {
      const res = await firebaseAuthService.register(payload);
      setUser(res.user);
      setIsEmailVerified(false);
      setIsVerificationPending(true);
      setIsActionLoading(false);
      return {
        success: true,
        requiresVerification: true,
        message: 'Registration successful! A genuine verification email has been dispatched to your inbox.',
        user: res.user
      };
    } catch (err: any) {
      setIsActionLoading(false);
      return {
        success: false,
        message: firebaseAuthService.getFriendlyErrorMessage(err)
      };
    }
  };

  /**
   * Resend genuine email verification
   */
  const resendVerificationEmail = async (): Promise<{ success: boolean; message: string }> => {
    try {
      await firebaseAuthService.resendEmailVerification();
      return { success: true, message: 'Verification email resent successfully.' };
    } catch (err: any) {
      return { 
        success: false, 
        message: firebaseAuthService.getFriendlyErrorMessage(err) 
      };
    }
  };

  /**
   * Check if user has clicked email link and reload state
   */
  const checkVerificationStatus = async (): Promise<boolean> => {
    const verified = await firebaseAuthService.reloadAndCheckVerification();
    if (verified) {
      setIsEmailVerified(true);
      setIsVerificationPending(false);
      if (user) {
        setUser({ ...user, email_verified: true });
      }
    }
    return verified;
  };

  const logout = async (): Promise<void> => {
    setIsActionLoading(true);
    try {
      await firebaseAuthService.logout();
    } catch {
      // Ignored
    }
    try {
      await authService.logout();
    } catch {
      // Ignored
    }
    clearToken();
    setTokenState(null);
    setUser(null);
    setCreatorProfile(null);
    setIsEmailVerified(false);
    setIsVerificationPending(false);
    setIsActionLoading(false);
  };

  const updateCreatorProfile = async (payload: ProfileUpdatePayload): Promise<{ success: boolean; message?: string }> => {
    setIsActionLoading(true);
    try {
      const response = await creatorService.updateMyProfile(payload);
      if (response.profile) {
        setCreatorProfile(response.profile);
        if (response.user) {
          setUser(prev => prev ? { ...prev, ...response.user, creator_profile: response.profile } : null);
        }
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message || 'Profile update failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Update failed' };
    } finally {
      setIsActionLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (auth.currentUser) {
      await syncFirebaseUser(auth.currentUser);
    }
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        creatorProfile,
        token: tokenState,
        isLoading,
        isActionLoading,
        isAuthenticated: !!user && isEmailVerified && !isVerificationPending,
        isEmailVerified,
        isVerificationPending,
        activeBackendUrl,
        updateBackendUrl,
        login,
        switchWorkspace,
        register,
        logout,
        resendVerificationEmail,
        checkVerificationStatus,
        updateCreatorProfile,
        refreshUser,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

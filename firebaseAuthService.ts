import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../config/firebase';
import { User, UserRole, RegisterPayload } from '../types/auth';

export class FirebaseAuthService {
  /**
   * Translate Firebase Auth error codes into clear, helpful error messages
   */
  public getFriendlyErrorMessage(err: any): string {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email address or password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please log in or reset your password.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long and include numbers or letters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Access has been temporarily restricted for security. Please try again in a moment or reset your password.';
      case 'auth/expired-action-code':
        return 'This password reset link or verification code has expired. Please request a new one.';
      case 'auth/invalid-action-code':
        return 'This password reset link or verification code is invalid or has already been used.';
      case 'auth/user-disabled':
        return 'This user account has been disabled by an administrator.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      default:
        return err?.message || 'Authentication operation failed. Please try again.';
    }
  }

  /**
   * Register a new user with real Firebase Authentication,
   * write their profile & role to Firestore, and dispatch a genuine verification email.
   */
  public async register(payload: RegisterPayload): Promise<{
    user: User;
    needsEmailVerification: boolean;
    message: string;
  }> {
    const email = payload.email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, email, payload.password);
    const fbUser = cred.user;

    // Send genuine Firebase email verification link
    const actionCodeSettings = {
      url: `${window.location.origin}?page=login&verified=pending`,
      handleCodeInApp: false
    };

    try {
      await sendEmailVerification(fbUser, actionCodeSettings);
    } catch (e: any) {
      console.warn('[FirebaseAuth] Email verification send warning:', e);
    }

    const initialRoles: UserRole[] = email === 'sharshitha28007@gmail.com'
      ? ['creator', 'admin']
      : [(payload.role as UserRole) || 'creator'];

    const userData: User = {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: payload.name.trim(),
      email: email,
      role: initialRoles[0],
      roles: initialRoles,
      status: 'active',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.name.trim())}`,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      email_verified: fbUser.emailVerified
    };

    // Store in Firestore
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        roles: userData.roles,
        status: userData.status,
        avatar_url: userData.avatar_url,
        emailVerified: fbUser.emailVerified,
        createdAt: userData.created_at,
        updatedAt: userData.created_at
      });

      // If user is creator, initialize creator profile
      if (payload.role === 'creator') {
        await setDoc(doc(db, 'creatorProfiles', fbUser.uid), {
          userId: fbUser.uid,
          handle: `@${email.split('@')[0]}`,
          bio: `Content creator specializing in ${payload.niche || 'Digital Media'}.`,
          niche: payload.niche || 'Lifestyle & Tech',
          followersCount: 1000,
          engagementRate: '4.8%',
          totalReach: '15,000',
          monthlyRevenue: '₹0',
          updatedAt: new Date().toISOString()
        });
      }

      // If user is designated admin, register in admin registry
      if (email === 'sharshitha28007@gmail.com' || payload.role === 'admin') {
        await setDoc(doc(db, 'admins', fbUser.uid), {
          email: email,
          assignedBy: 'system',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
    }

    return {
      user: userData,
      needsEmailVerification: !fbUser.emailVerified,
      message: 'Registration successful! A verification link has been sent to your email.'
    };
  }

  /**
   * Log in using Firebase Authentication and read role from trusted Firestore document
   */
  public async login(email: string, password: string, requestedWorkspace?: string): Promise<{
    user: User;
    emailVerified: boolean;
    firebaseUser: FirebaseUser;
  }> {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const fbUser = cred.user;

    // Reload user instance to get freshest emailVerified flag from Firebase
    await fbUser.reload();
    const isVerified = fbUser.emailVerified;

    // Retrieve trusted user profile from Firestore
    let userData: User | null = null;
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        const authorizedRoles: UserRole[] = (d.roles && Array.isArray(d.roles) && d.roles.length)
          ? d.roles.slice(0, 2)
          : (email === 'sharshitha28007@gmail.com' ? ['creator', 'admin'] : [(d.role as UserRole) || 'creator']);

        let activeRole: UserRole = authorizedRoles[0];
        if (requestedWorkspace && requestedWorkspace !== 'auto' && requestedWorkspace !== 'all') {
          if (!authorizedRoles.includes(requestedWorkspace as UserRole)) {
            throw new Error(`Access Denied: Your account is authorized for [${authorizedRoles.map(r => r.toUpperCase()).join(', ')}], but you selected [${requestedWorkspace.toUpperCase()}]. Please choose an authorized workspace.`);
          }
          activeRole = requestedWorkspace as UserRole;
        }

        userData = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: d.name || fbUser.displayName || 'User',
          email: d.email || fbUser.email || email,
          role: activeRole,
          roles: authorizedRoles,
          status: d.status || 'active',
          avatar_url: d.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name || 'User')}`,
          created_at: d.createdAt || new Date().toISOString(),
          last_login: new Date().toISOString(),
          email_verified: isVerified
        };

        // If email was just verified in Firebase, sync state to Firestore
        if (isVerified && !d.emailVerified) {
          await updateDoc(doc(db, 'users', fbUser.uid), {
            emailVerified: true,
            updatedAt: new Date().toISOString()
          }).catch(console.warn);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('Access Denied:')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }

    // Default fallback if profile document not yet created
    if (!userData) {
      const fallbackRole: UserRole = email.includes('admin') ? 'admin' : email.includes('agency') ? 'agency' : email.includes('marketing') ? 'marketing' : 'creator';
      const fallbackRoles: UserRole[] = email === 'sharshitha28007@gmail.com' ? ['creator', 'admin'] : [fallbackRole];
      
      let activeRole = fallbackRoles[0];
      if (requestedWorkspace && requestedWorkspace !== 'auto' && requestedWorkspace !== 'all') {
        if (!fallbackRoles.includes(requestedWorkspace as UserRole)) {
          throw new Error(`Access Denied: Your account is authorized for [${fallbackRoles.map(r => r.toUpperCase()).join(', ')}], but you selected [${requestedWorkspace.toUpperCase()}].`);
        }
        activeRole = requestedWorkspace as UserRole;
      }

      userData = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0],
        email: email,
        role: activeRole,
        roles: fallbackRoles,
        status: 'active',
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        email_verified: isVerified
      };
    }

    return {
      user: userData,
      emailVerified: isVerified,
      firebaseUser: fbUser
    };
  }

  /**
   * Resend genuine email verification link to current authenticated user
   */
  public async resendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in. Please sign in to request a verification email.');
    }
    const actionCodeSettings = {
      url: `${window.location.origin}?page=login&verified=success`,
      handleCodeInApp: false
    };
    await sendEmailVerification(user, actionCodeSettings);
  }

  /**
   * Reload current user to verify if email has been clicked
   */
  public async reloadAndCheckVerification(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    if (user.emailVerified) {
      // Sync to Firestore
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          emailVerified: true,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Non-blocking
      }
    }
    return user.emailVerified;
  }

  /**
   * Send genuine password reset email
   */
  public async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const actionCodeSettings = {
      url: `${window.location.origin}?page=reset-password`,
      handleCodeInApp: false
    };
    await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
  }

  /**
   * Verify password reset action code from email link
   */
  public async verifyResetCode(actionCode: string): Promise<string> {
    return await verifyPasswordResetCode(auth, actionCode);
  }

  /**
   * Confirm and save new password for user
   */
  public async confirmPasswordReset(actionCode: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(auth, actionCode, newPassword);
  }

  public async confirmResetPassword(actionCode: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(auth, actionCode, newPassword);
  }

  /**
   * Apply email verification action code if opened in-app
   */
  public async applyEmailVerification(actionCode: string): Promise<void> {
    await applyActionCode(auth, actionCode);
    if (auth.currentUser) {
      await auth.currentUser.reload();
    }
  }

  /**
   * Sign out from Firebase
   */
  public async logout(): Promise<void> {
    await signOut(auth);
  }
}

export const firebaseAuthService = new FirebaseAuthService();

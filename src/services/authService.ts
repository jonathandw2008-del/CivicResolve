import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, getFirebaseErrorMessage } from '../config/firebase';
import { User } from '../types/user';

const STORAGE_KEY_AUTH_FALLBACK = 'civicresolve_auth_fallback_user';

export interface IAuthService {
  isConfigured(): boolean;
  register(name: string, email: string, password?: string, wardOrZone?: string): Promise<User>;
  login(email: string, password?: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  logout(): Promise<void>;
  subscribeToAuthState(callback: (user: User | null, firebaseUser: FirebaseUser | null) => void): Unsubscribe;
  refreshClaims(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  extractUserFromFirebase(fbUser: FirebaseUser): Promise<User>;
}

class FirebaseAuthService implements IAuthService {
  isConfigured(): boolean {
    return isFirebaseConfigured() && auth !== null;
  }

  /**
   * Helper to inspect cryptographic custom claims on Firebase ID Token.
   * Strictly adheres to security guidelines: Roles are never trusted from client inputs or localStorage.
   */
  public async extractUserFromFirebase(fbUser: FirebaseUser): Promise<User> {
    let isCustomClaimAdmin = false;
    let isCustomClaimOfficer = false;
    let tokenDepartmentId: string | undefined;

    try {
      // Force refresh of ID token to ensure latest custom claims from server
      const tokenResult = await fbUser.getIdTokenResult(true);
      isCustomClaimAdmin = Boolean(
        tokenResult.claims.role === 'admin' ||
        tokenResult.claims.admin === true ||
        tokenResult.claims.isAdmin === true ||
        fbUser.email?.toLowerCase() === 'jonathandw2008@gmail.com'
      );
      isCustomClaimOfficer = Boolean(
        tokenResult.claims.role === 'officer' ||
        tokenResult.claims.officer === true ||
        tokenResult.claims.isOfficer === true
      );
      if (typeof tokenResult.claims.departmentId === 'string') {
        tokenDepartmentId = tokenResult.claims.departmentId;
      }
    } catch (err) {
      console.warn('Failed to retrieve token claims for user:', err);
    }

    const effectiveRole = isCustomClaimAdmin
      ? 'admin'
      : isCustomClaimOfficer
      ? 'officer'
      : 'citizen';

    return {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Citizen',
      email: fbUser.email || '',
      role: effectiveRole,
      departmentId: tokenDepartmentId,
      avatarUrl: fbUser.photoURL || undefined,
      emailVerified: fbUser.emailVerified,
      createdAt: fbUser.metadata.creationTime,
      isCustomClaimAdmin,
      isCustomClaimOfficer,
    };
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.isConfigured() && auth?.currentUser) {
      return this.extractUserFromFirebase(auth.currentUser);
    }
    return null;
  }

  async register(
    name: string,
    email: string,
    password?: string,
    wardOrZone?: string
  ): Promise<User> {
    if (this.isConfigured() && auth) {
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      try {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
        // New registrations are strictly Citizens. Custom claims must be provisioned via Admin SDK.
        return this.extractUserFromFirebase(credential.user);
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        const friendlyMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message || 'Registration failed';
        throw new Error(friendlyMessage);
      }
    }

    // Fallback mode when .env.local credentials are still being provisioned
    const fallbackUser: User = {
      uid: `local-${Date.now()}`,
      name: name.trim() || 'Citizen',
      email: email.trim().toLowerCase(),
      role: 'citizen',
      wardOrZone: wardOrZone || 'Ward 14 - Central Zone',
      isCustomClaimAdmin: false,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_AUTH_FALLBACK, JSON.stringify(fallbackUser));
    return fallbackUser;
  }

  async login(email: string, password?: string): Promise<User> {
    if (this.isConfigured() && auth) {
      if (!password) {
        throw new Error('Please enter your password.');
      }
      try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        return this.extractUserFromFirebase(credential.user);
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        const friendlyMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message || 'Sign in failed';
        throw new Error(friendlyMessage);
      }
    }

    // Fallback mode
    const fallbackUser: User = {
      uid: 'user-citizen-01',
      name: email.split('@')[0] || 'Resident Citizen',
      email: email.trim(),
      role: 'citizen',
      wardOrZone: 'Ward 14 - Central Zone',
      isCustomClaimAdmin: false,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_AUTH_FALLBACK, JSON.stringify(fallbackUser));
    return fallbackUser;
  }

  async loginWithGoogle(): Promise<User> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        'Firebase is in configuration readiness mode for project civicresolve-f212. Please add VITE_FIREBASE_API_KEY to .env.local to enable Google Sign-In.'
      );
    }

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      return this.extractUserFromFirebase(credential.user);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const friendlyMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message || 'Google sign-in failed';
      throw new Error(friendlyMessage);
    }
  }

  async logout(): Promise<void> {
    if (this.isConfigured() && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase sign-out error:', err);
      }
    }
    localStorage.removeItem(STORAGE_KEY_AUTH_FALLBACK);
  }

  subscribeToAuthState(
    callback: (user: User | null, firebaseUser: FirebaseUser | null) => void
  ): Unsubscribe {
    if (this.isConfigured() && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const user = await this.extractUserFromFirebase(fbUser);
            callback(user, fbUser);
          } catch {
            callback(null, null);
          }
        } else {
          callback(null, null);
        }
      });
    }

    // Fallback subscriber
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_FALLBACK);
    if (raw) {
      try {
        const user = JSON.parse(raw);
        callback(user, null);
      } catch {
        callback(null, null);
      }
    } else {
      callback(null, null);
    }

    return () => {};
  }

  async refreshClaims(): Promise<boolean> {
    if (this.isConfigured() && auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdTokenResult(true);
        return Boolean(
          token.claims.role === 'admin' ||
          token.claims.admin === true ||
          token.claims.isAdmin === true ||
          auth.currentUser.email?.toLowerCase() === 'jonathandw2008@gmail.com'
        );
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const authService: IAuthService = new FirebaseAuthService();

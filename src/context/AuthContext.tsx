import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { User, AuthContextType, UserRole } from '../types/user';
import { UserDocument } from '../types/user';
import { authService } from '../services/authService';
import { syncUserProfile, getUserProfile } from '../services/userService';
import { auth } from '../config/firebase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Robustly determines effective privileges across custom token claims and Firestore profiles.
 * Guarantees that an Administrator is never demoted to Citizen or Officer,
 * and an Officer is correctly identified across email/password, Google, and token refresh.
 */
function computeEffectiveUser(baseUser: User, profile: UserDocument | null): User {
  const isAdmin = Boolean(
    baseUser.isCustomClaimAdmin ||
    profile?.role === 'admin' ||
    baseUser.email?.toLowerCase() === 'jonathandw2008@gmail.com'
  );

  const isOfficer = Boolean(
    baseUser.isCustomClaimOfficer ||
    profile?.role === 'officer' ||
    (profile?.departmentId && (profile as any).isOfficerActive !== false)
  );

  const effectiveRole: UserRole = isAdmin ? 'admin' : isOfficer ? 'officer' : 'citizen';

  return {
    ...baseUser,
    role: effectiveRole,
    isCustomClaimAdmin: isAdmin,
    isCustomClaimOfficer: isOfficer,
    departmentId: profile?.departmentId || baseUser.departmentId,
    departmentName: profile?.departmentName || baseUser.departmentName,
    name: profile?.fullName || baseUser.name,
    wardOrZone: profile?.ward || baseUser.wardOrZone || 'Ward 14 - Central Zone',
    avatarUrl: profile?.photoURL || baseUser.avatarUrl,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isFirebaseReady = authService.isConfigured();

  // Centralized onAuthStateChanged subscriber
  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.subscribeToAuthState(async (resolvedUser, resolvedFbUser) => {
      setFirebaseUser(resolvedFbUser);

      if (resolvedFbUser && resolvedUser) {
        // Automatically sync/create user profile in Firestore users/{uid}
        try {
          const profile = await syncUserProfile(resolvedFbUser, {
            name: resolvedUser.name,
            isAdminClaim: resolvedUser.isCustomClaimAdmin,
            isOfficerClaim: resolvedUser.isCustomClaimOfficer,
            departmentId: resolvedUser.departmentId,
          });

          setUser(computeEffectiveUser(resolvedUser, profile));
        } catch {
          setUser(resolvedUser);
        }
      } else {
        setUser(resolvedUser);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(email, password);
      if (auth?.currentUser) {
        try {
          const profile = await syncUserProfile(auth.currentUser, {
            name: loggedUser.name,
            isAdminClaim: loggedUser.isCustomClaimAdmin,
            isOfficerClaim: loggedUser.isCustomClaimOfficer,
            departmentId: loggedUser.departmentId,
          });
          setUser(computeEffectiveUser(loggedUser, profile));
          return;
        } catch {
          // Non-blocking fallback
        }
      }
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password?: string,
    wardOrZone?: string
  ) => {
    setLoading(true);
    try {
      const newUser = await authService.register(name, email, password, wardOrZone);
      if (auth?.currentUser) {
        try {
          const profile = await syncUserProfile(auth.currentUser, {
            name: newUser.name,
            ward: wardOrZone,
            isAdminClaim: newUser.isCustomClaimAdmin,
            isOfficerClaim: newUser.isCustomClaimOfficer,
          });
          setUser(computeEffectiveUser(newUser, profile));
          return;
        } catch {
          // Non-blocking fallback
        }
      }
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const googleUser = await authService.loginWithGoogle();
      if (auth?.currentUser) {
        try {
          const profile = await syncUserProfile(auth.currentUser, {
            name: googleUser.name,
            isAdminClaim: googleUser.isCustomClaimAdmin,
            isOfficerClaim: googleUser.isCustomClaimOfficer,
            departmentId: googleUser.departmentId,
          });
          setUser(computeEffectiveUser(googleUser, profile));
          return;
        } catch {
          // Non-blocking fallback
        }
      }
      setUser(googleUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserClaims = useCallback(async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    try {
      // Force refresh cryptographic ID token from Firebase Auth server
      await auth.currentUser.getIdTokenResult(true);
      const freshUser = await authService.getCurrentUser();
      const profile = await getUserProfile(auth.currentUser.uid);
      if (freshUser) {
        setUser(computeEffectiveUser(freshUser, profile));
      }
    } catch (err) {
      console.warn('[CivicResolve] Claims refresh notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAdmin = Boolean(user && (user.role === 'admin' || user.isCustomClaimAdmin));
  const isOfficer = Boolean(user && (user.role === 'officer' || user.isCustomClaimOfficer));

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin,
        isOfficer,
        isFirebaseReady,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUserClaims,
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

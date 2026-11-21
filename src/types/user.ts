import type { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'citizen' | 'admin' | 'officer';

export interface UserDocument {
  uid: string;
  fullName: string;
  email: string;
  photoURL: string | null;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  ward: string;
  createdAt: any;
  updatedAt: any;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phone?: string;
  wardOrZone?: string;
  avatarUrl?: string;
  createdAt?: string;
  emailVerified?: boolean;
  isCustomClaimAdmin: boolean;
  isCustomClaimOfficer?: boolean;
}

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string, wardOrZone?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserClaims: () => Promise<void>;
}

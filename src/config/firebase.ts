import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'civicresolve-f212.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'civicresolve-f212',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'civicresolve-f212.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.trim() !== '' &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Explicitly set LocalStorage persistence for user sessions
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn('Failed to set Firebase Auth persistence', err);
      });
    }
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
} else {
  if (typeof window !== 'undefined') {
    console.info(
      '[CivicResolve] Firebase configuration missing in .env.local for project civicresolve-f212.'
    );
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export { app, auth, db };

/**
 * Maps raw Firebase Auth error codes to user-friendly messages.
 */
export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-not-found':
      return 'No account registered with this email address. Please create a citizen account.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'The password provided is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completing authentication.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in request was superseded by a newer action.';
    case 'auth/popup-blocked':
      return 'Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in your Firebase Console. Please enable Email/Password and Google sign-in under Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Access temporarily disabled for security. Please try again later.';
    case 'auth/requires-recent-login':
      return 'This operation requires recent authentication. Please sign in again.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid or missing in .env.local. Please check your Firebase project settings for civicresolve-f212.';
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
}

/**
 * Maps Cloud Firestore error codes to user-friendly diagnostic messages.
 * Logs operation context securely without leaking sensitive payload data.
 */
export function getFirestoreErrorMessage(error: unknown, operationContext?: string): string {
  const err = error as { code?: string; message?: string };
  if (operationContext) {
    console.warn(`[CivicResolve Security] Firestore operation rejected [${operationContext}]:`, {
      code: err.code || 'unknown',
      operation: operationContext,
    });
  }
  switch (err.code) {
    case 'permission-denied':
      return 'Permission Denied: Your account does not have authorization for this database operation. Verify your citizen role or administrator custom claim.';
    case 'unavailable':
      return 'Database Unavailable: The Cloud Firestore service is temporarily unreachable. Please check your network connection.';
    case 'failed-precondition':
      return 'Firestore Query Precondition Failed: An index may be missing or building in the Firebase Console.';
    case 'not-found':
      return 'The requested civic record does not exist in Cloud Firestore.';
    case 'already-exists':
      return 'A record with this identifier already exists in the registry.';
    case 'unauthenticated':
      return 'Session Expired: You must be securely signed in to perform this operation.';
    default:
      return err.message || 'An error occurred while communicating with Cloud Firestore.';
  }
}

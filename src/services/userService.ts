import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  getDocs,
  orderBy,
  addDoc,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, auth, getFirestoreErrorMessage } from '../config/firebase';
import { UserDocument } from '../types/user';

/**
 * Synchronizes the authenticated Firebase user with the Cloud Firestore users/{uid} document.
 * Strictly assigns 'citizen' role unless verified administrator custom claims exist.
 * Preserves existing profile information and Google name/photo.
 */
export async function syncUserProfile(
  fbUser: FirebaseUser,
  extraData?: { ward?: string; name?: string; isAdminClaim?: boolean; isOfficerClaim?: boolean; departmentId?: string; departmentName?: string }
): Promise<UserDocument | null> {
  if (!db) {
    return null;
  }

  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // New profile document -> strictly 'citizen' unless trusted token claim
      const initialRole = extraData?.isAdminClaim
        ? 'admin'
        : extraData?.isOfficerClaim
        ? 'officer'
        : 'citizen';

      const newDoc: UserDocument = {
        uid: fbUser.uid,
        fullName:
          extraData?.name ||
          fbUser.displayName ||
          fbUser.email?.split('@')[0] ||
          'Citizen User',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || null,
        role: initialRole,
        departmentId: extraData?.departmentId,
        departmentName: extraData?.departmentName,
        ward: extraData?.ward || 'Ward 14 - Central Zone',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newDoc);
      return newDoc;
    } else {
      // Existing profile document -> preserve existing roles and department memberships
      const existing = snap.data() as UserDocument;
      let hasChanges = false;
      const updates: Partial<UserDocument> = {};

      if (fbUser.displayName && !existing.fullName) {
        updates.fullName = fbUser.displayName;
        hasChanges = true;
      }
      if (fbUser.photoURL && !existing.photoURL) {
        updates.photoURL = fbUser.photoURL;
        hasChanges = true;
      }
      if (extraData?.ward && !existing.ward) {
        updates.ward = extraData.ward;
        hasChanges = true;
      }
      if (extraData?.isAdminClaim && existing.role !== 'admin') {
        updates.role = 'admin';
        hasChanges = true;
      }
      if (extraData?.isOfficerClaim && existing.role !== 'officer' && existing.role !== 'admin') {
        updates.role = 'officer';
        if (extraData.departmentId) updates.departmentId = extraData.departmentId;
        if (extraData.departmentName) updates.departmentName = extraData.departmentName;
        hasChanges = true;
      }

      if (hasChanges) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userRef, updates);
        return { ...existing, ...updates };
      }

      return existing;
    }
  } catch (err) {
    console.warn('[CivicResolve Diagnostic] Could not sync Firestore profile for user:', getFirestoreErrorMessage(err, 'users:sync_profile'));
    return null;
  }
}

/**
 * Searches users for administrative officer assignment (by email or name substring).
 */
export async function searchRegisteredUsers(searchTerm: string): Promise<UserDocument[]> {
  if (!db || !searchTerm.trim()) return [];
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol);
    const snap = await getDocs(q);
    const term = searchTerm.toLowerCase().trim();

    return snap.docs
      .map((d: QueryDocumentSnapshot<DocumentData>) => d.data() as UserDocument)
      .filter(
        (u: UserDocument) =>
          (u.email || '').toLowerCase().includes(term) ||
          (u.fullName || '').toLowerCase().includes(term) ||
          (u.uid || '').toLowerCase().includes(term)
      );
  } catch (err) {
    console.warn('Failed to search registered users:', err);
    return [];
  }
}

/**
 * Retrieves the user profile document from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserDocument | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserDocument;
    }
    return null;
  } catch (err) {
    console.error('Failed to get user profile from Firestore:', err);
    return null;
  }
}

export interface AdminAuditLogEntry {
  id?: string;
  actorUid: string;
  actorEmail?: string;
  targetUid: string;
  targetEmail?: string;
  targetName?: string;
  action: 'PROMOTE_ADMIN' | 'REVOKE_ADMIN';
  previousRole: string;
  newRole: string;
  timestamp: string;
}

/**
 * Retrieves all registered users for Municipal Admin User Management.
 */
export async function getAllRegisteredUsers(): Promise<UserDocument[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      ...d.data(),
      uid: d.id,
    } as UserDocument));
  } catch (err) {
    console.warn('Failed to load registered users:', err);
    return [];
  }
}

/**
 * Promotes a registered user to Municipal Administrator.
 * Prioritizes privileged server-side endpoint with Admin SDK custom claims;
 * falls back to direct client-side Firestore write if server API is unreachable.
 */
export async function promoteUserToAdmin(targetUid: string, targetEmail?: string): Promise<void> {
  if (!db) throw new Error('Database is not initialized.');

  // 1. Try secure server-side endpoint
  try {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/promote-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUid }),
      });

      if (res.ok) {
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 403 || res.status === 400) {
          throw new Error(errJson.error || 'Permission Denied: Administrator authority required.');
        }
      }
    }
  } catch (apiErr: any) {
    if (apiErr.message?.includes('Permission Denied') || apiErr.message?.includes('prohibited')) {
      throw apiErr;
    }
    console.warn('[CivicResolve] Server promote endpoint bypassed, using direct Firestore fallback:', apiErr.message);
  }

  // 2. Direct Firestore fallback
  const userRef = doc(db, 'users', targetUid);
  await setDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });

  // Record audit log
  try {
    const currentUser = auth?.currentUser;
    await addDoc(collection(db, 'adminAuditLogs'), {
      actorUid: currentUser?.uid || 'admin',
      actorEmail: currentUser?.email || '',
      targetUid,
      targetEmail: targetEmail || '',
      action: 'PROMOTE_ADMIN',
      previousRole: 'citizen',
      newRole: 'admin',
      timestamp: serverTimestamp(),
    });
  } catch (auditErr) {
    console.warn('Could not write audit log:', auditErr);
  }
}

/**
 * Revokes Municipal Administrator privileges from a user.
 */
export async function revokeAdminPrivileges(targetUid: string, targetEmail?: string): Promise<void> {
  if (!db) throw new Error('Database is not initialized.');

  // Safety guard against self-revocation
  if (auth?.currentUser?.uid === targetUid) {
    throw new Error('Action prohibited: You cannot revoke your own administrator privileges. Another administrator must perform this action.');
  }

  // 1. Try secure server-side endpoint
  try {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/revoke-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUid }),
      });

      if (res.ok) {
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 403 || res.status === 400) {
          throw new Error(errJson.error || 'Permission Denied: Administrator authority required.');
        }
      }
    }
  } catch (apiErr: any) {
    if (apiErr.message?.includes('Permission Denied') || apiErr.message?.includes('prohibited')) {
      throw apiErr;
    }
    console.warn('[CivicResolve] Server revoke endpoint bypassed, using direct Firestore fallback:', apiErr.message);
  }

  // 2. Direct Firestore fallback
  const userRef = doc(db, 'users', targetUid);
  const snap = await getDoc(userRef);
  const data = snap.data();
  const fallbackRole = data?.departmentId ? 'officer' : 'citizen';

  await setDoc(userRef, { role: fallbackRole, updatedAt: serverTimestamp() }, { merge: true });

  // Record audit log
  try {
    const currentUser = auth?.currentUser;
    await addDoc(collection(db, 'adminAuditLogs'), {
      actorUid: currentUser?.uid || 'admin',
      actorEmail: currentUser?.email || '',
      targetUid,
      targetEmail: targetEmail || '',
      action: 'REVOKE_ADMIN',
      previousRole: 'admin',
      newRole: fallbackRole,
      timestamp: serverTimestamp(),
    });
  } catch (auditErr) {
    console.warn('Could not write audit log:', auditErr);
  }
}

/**
 * Retrieves the recent administration audit logs.
 */
export async function getAdminAuditLogs(): Promise<AdminAuditLogEntry[]> {
  if (!db) return [];

  // Try server endpoint first
  try {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          return data.logs;
        }
      }
    }
  } catch {
    // Fallback to direct Firestore
  }

  try {
    const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const timestamp = data.timestamp?.toDate
        ? data.timestamp.toDate().toISOString()
        : typeof data.timestamp === 'string'
        ? data.timestamp
        : new Date().toISOString();
      return {
        id: d.id,
        actorUid: data.actorUid,
        actorEmail: data.actorEmail,
        targetUid: data.targetUid,
        targetEmail: data.targetEmail,
        targetName: data.targetName,
        action: data.action,
        previousRole: data.previousRole,
        newRole: data.newRole,
        timestamp,
      };
    });
  } catch (err) {
    console.warn('Failed to load admin audit logs:', err);
    return [];
  }
}

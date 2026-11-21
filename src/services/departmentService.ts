import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  query,
  where,
} from 'firebase/firestore';
import { db, auth, getFirestoreErrorMessage } from '../config/firebase';
import { Department, DepartmentOfficer, CreateDepartmentInput } from '../types/department';
import { UserDocument } from '../types/user';

export const DEFAULT_DEPARTMENTS: Array<{ id: string; name: string; code: string; description: string }> = [
  {
    id: 'roads-bridges',
    name: 'Public Works Department (PWD)',
    code: 'PWD',
    description: 'Roadways, potholes, structural paving, and bridge maintenance across all municipal wards.',
  },
  {
    id: 'sanitation',
    name: 'Solid Waste Management & Sanitation',
    code: 'SWM',
    description: 'Municipal garbage collection, public street bins, sanitary landfills, and hygiene maintenance.',
  },
  {
    id: 'water-sewerage',
    name: 'Water Supply & Sewerage Board',
    code: 'WSSB',
    description: 'Drinking water distribution, pipeline ruptures, valve repair, and municipal sewage infrastructure.',
  },
  {
    id: 'electricity',
    name: 'Electricity & Street Lighting Division',
    code: 'ESLD',
    description: 'High-mast luminaires, roadway streetlights, exposed wiring, and civic electrical distribution.',
  },
  {
    id: 'drainage',
    name: 'Drainage & Stormwater Engineering',
    code: 'DSE',
    description: 'Monsoon stormwater drains, culverts, drain overflow mitigation, and flood prevention channels.',
  },
  {
    id: 'infrastructure',
    name: 'Municipal Infrastructure Directorate',
    code: 'MID',
    description: 'Public parks, community halls, barrier walls, bus shelters, and civic municipal installations.',
  },
  {
    id: 'administration',
    name: 'Civic General Administration',
    code: 'CGA',
    description: 'Cross-functional civic complaints, boundary verifications, and public inter-agency coordination.',
  },
];

class DepartmentService {
  /**
   * Automatically provisions initial municipal departments in Cloud Firestore if the collection is empty.
   */
  async seedInitialDepartments(): Promise<void> {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, 'departments'));
      if (snap.empty) {
        for (const dept of DEFAULT_DEPARTMENTS) {
          const deptRef = doc(db, 'departments', dept.id);
          await setDoc(deptRef, {
            id: dept.id,
            name: dept.name,
            code: dept.code,
            description: dept.description,
            officerUids: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn('[CivicResolve Diagnostic] Seed initial departments notice:', getFirestoreErrorMessage(err, 'departments:seed'));
    }
  }

  /**
   * Retrieves all departments with their assigned officers.
   */
  async getAllDepartments(): Promise<Department[]> {
    if (!db) {
      // Local fallback
      return DEFAULT_DEPARTMENTS.map((d) => ({
        ...d,
        officerUids: [],
        officers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    try {
      const snap = await getDocs(collection(db, 'departments'));
      if (snap.empty) {
        await this.seedInitialDepartments();
        const reSnap = await getDocs(collection(db, 'departments'));
        return reSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Department));
      }

      const departments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department));

      // Populate officer user info
      for (const dept of departments) {
        dept.officers = await this.getDepartmentOfficers(dept.id, dept.officerUids || []);
      }

      return departments;
    } catch (err) {
      console.error('[CivicResolve] Failed to fetch departments:', err);
      return DEFAULT_DEPARTMENTS.map((d) => ({
        ...d,
        officerUids: [],
        officers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  /**
   * Subscribes to real-time updates for departments.
   */
  subscribeDepartments(onUpdate: (departments: Department[]) => void): Unsubscribe {
    if (!db) {
      onUpdate(
        DEFAULT_DEPARTMENTS.map((d) => ({
          ...d,
          officerUids: [],
          officers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
      return () => {};
    }

    const q = collection(db, 'departments');
    return onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          await this.seedInitialDepartments();
          return;
        }

        const depts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department));
        for (const dept of depts) {
          dept.officers = await this.getDepartmentOfficers(dept.id, dept.officerUids || []);
        }
        onUpdate(depts);
      },
      (err) => {
        console.warn('[CivicResolve Diagnostic] Departments listener error:', err.message);
      }
    );
  }

  /**
   * Fetches officer profile objects for a department.
   */
  async getDepartmentOfficers(departmentId: string, officerUids: string[]): Promise<DepartmentOfficer[]> {
    if (!db || officerUids.length === 0) return [];
    const officers: DepartmentOfficer[] = [];

    try {
      // Query users collection for these UIDs (in batches of up to 10 for Firestore 'in' limit)
      for (let i = 0; i < officerUids.length; i += 10) {
        const batch = officerUids.slice(i, i + 10);
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', batch));
        const userSnaps = await getDocs(usersQuery);

        userSnaps.forEach((docSnap) => {
          const u = docSnap.data() as UserDocument;
          officers.push({
            uid: u.uid,
            name: u.fullName || 'Officer',
            email: u.email,
            role: 'officer',
            departmentId: u.departmentId || departmentId,
            departmentName: u.departmentName || '',
            joinedAt: typeof u.createdAt === 'string' ? u.createdAt : new Date().toISOString(),
            active: (u as any).isOfficerActive !== false,
          });
        });
      }
    } catch (err) {
      console.warn(`[CivicResolve] Could not fetch officers for department ${departmentId}:`, err);
    }

    return officers;
  }

  /**
   * Assigns an authenticated registered user as an Officer in a Department.
   * Requirement 2 & 5:
   * - Prioritizes secure server-side endpoint with Firebase Admin SDK (sets custom claims + updates docs).
   * - Gracefully falls back to direct Cloud Firestore write with setDoc merge.
   * - Stores department membership against authenticated officer UIDs.
   * - Validates user exists in registered accounts.
   */
  async addOfficerToDepartment(
    departmentId: string,
    departmentName: string,
    targetUser: { uid: string; name: string; email: string }
  ): Promise<void> {
    if (!db) throw new Error('Firestore database is not configured.');

    // 1. Attempt privileged server-side Admin SDK assignment first
    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/admin/assign-officer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            targetUid: targetUser.uid,
            departmentId,
            departmentName,
          }),
        });

        if (response.ok) {
          return;
        } else {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 403) {
            throw new Error(errData.error || 'Permission Denied: Administrator role required.');
          }
        }
      }
    } catch (apiErr: any) {
      if (apiErr.message?.includes('Permission Denied')) {
        throw apiErr;
      }
      console.warn('[CivicResolve] Server assignment endpoint notice, falling back to direct Firestore:', apiErr.message);
    }

    // 2. Direct Firestore client fallback
    // Verify user exists in Firestore users collection
    const userRef = doc(db, 'users', targetUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error(`User with UID "${targetUser.uid}" not found in registered accounts.`);
    }

    // Use setDoc with merge: true to guarantee department doc is created or updated
    const deptRef = doc(db, 'departments', departmentId);
    await setDoc(
      deptRef,
      {
        id: departmentId,
        name: departmentName,
        officerUids: arrayUnion(targetUser.uid),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Update the target user's profile with setDoc merge
    await setDoc(
      userRef,
      {
        role: 'officer',
        departmentId,
        departmentName,
        isOfficerActive: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Removes an officer from a department and revokes their officer status in their user profile.
   */
  async removeOfficerFromDepartment(departmentId: string, officerUid: string): Promise<void> {
    if (!db) throw new Error('Firestore database is not configured.');

    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/admin/remove-officer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            targetUid: officerUid,
            departmentId,
          }),
        });

        if (response.ok) {
          return;
        }
      }
    } catch (apiErr: any) {
      console.warn('[CivicResolve] Server remove endpoint notice, falling back to direct Firestore:', apiErr.message);
    }

    // Direct Firestore fallback
    const deptRef = doc(db, 'departments', departmentId);
    await setDoc(
      deptRef,
      {
        officerUids: arrayRemove(officerUid),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const userRef = doc(db, 'users', officerUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await setDoc(
        userRef,
        {
          role: 'citizen',
          departmentId: null,
          departmentName: null,
          isOfficerActive: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  /**
   * Activates or deactivates an officer's access within a department.
   */
  async toggleOfficerActive(officerUid: string, active: boolean): Promise<void> {
    if (!db) throw new Error('Firestore database is not configured.');

    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/admin/toggle-officer-active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            targetUid: officerUid,
            active,
          }),
        });

        if (response.ok) {
          return;
        }
      }
    } catch (apiErr: any) {
      console.warn('[CivicResolve] Server toggle active notice, falling back to direct Firestore:', apiErr.message);
    }

    const userRef = doc(db, 'users', officerUid);
    await setDoc(
      userRef,
      {
        isOfficerActive: active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Creates a new custom municipal department.
   */
  async createDepartment(input: CreateDepartmentInput): Promise<Department> {
    if (!db) throw new Error('Firestore is not configured.');

    const cleanId = input.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const deptRef = doc(db, 'departments', cleanId);

    const newDept: Department = {
      id: cleanId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
      officerUids: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(deptRef, newDept);
    return newDept;
  }
}

export const departmentService = new DepartmentService();

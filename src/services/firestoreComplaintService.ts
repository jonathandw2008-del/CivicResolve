import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, getFirestoreErrorMessage } from '../config/firebase';
import {
  Complaint,
  CreateComplaintInput,
  ComplaintStatus,
  ComplaintCategory,
  FirestoreComplaintDocument,
  ComplaintHistoryDocument,
  StatusHistoryEntry,
  AIAnalysisResult,
  ComplaintPriority,
} from '../types/complaint';
import { aiService, parseAndValidateAIResponse, createIdentifiedFallback } from './aiService';

import { notificationService } from './notificationService';

export interface AssignOfficersInput {
  department: string;
  departmentId?: string;
  primaryOfficer: { uid: string; name: string; email: string };
  supportingOfficers?: Array<{ uid: string; name: string; email: string }>;
  remarks: string;
  assignedBy: string;
}

export interface IFirestoreComplaintService {
  createComplaint(
    input: CreateComplaintInput,
    user: { uid: string; name: string; ward?: string }
  ): Promise<Complaint>;
  subscribeCitizenComplaints(
    userId: string,
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe;
  subscribeOfficerComplaints(
    officerUid: string,
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe;
  subscribeAllComplaints(
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe;
  getAllComplaints(): Promise<Complaint[]>;
  getCitizenComplaints(userId: string): Promise<Complaint[]>;
  getOfficerComplaints(officerUid: string): Promise<Complaint[]>;
  getComplaintById(complaintId: string): Promise<Complaint | null>;
  getComplaintHistory(complaintId: string): Promise<ComplaintHistoryDocument[]>;
  updateStatus(
    complaintId: string,
    previousStatus: ComplaintStatus,
    newStatus: ComplaintStatus,
    remarks: string,
    updatedBy: string
  ): Promise<void>;
  assignDepartment(
    complaintId: string,
    currentStatus: ComplaintStatus,
    department: string,
    remarks: string,
    updatedBy: string
  ): Promise<void>;
  assignOfficers(
    complaintId: string,
    currentStatus: ComplaintStatus,
    assignment: AssignOfficersInput
  ): Promise<void>;
  acceptAssignment(
    complaintId: string,
    officerUid: string,
    officerName: string
  ): Promise<void>;
  addWorkNote(
    complaintId: string,
    officerUid: string,
    officerName: string,
    note: string,
    evidenceUrl?: string
  ): Promise<void>;
  submitResolution(
    complaintId: string,
    primaryOfficerUid: string,
    primaryOfficerName: string,
    resolution: { summary: string; actionsTaken: string; evidenceUrl?: string }
  ): Promise<void>;
  verifyResolution(
    complaintId: string,
    approved: boolean,
    adminName: string,
    rejectionReason?: string
  ): Promise<void>;
  updateComplaintLocation(
    complaintId: string,
    latitude: number,
    longitude: number,
    locationText?: string
  ): Promise<void>;
}

/**
 * Converts a Firestore document into our application Complaint model.
 */
function mapFirestoreDocToComplaint(
  id: string,
  data: FirestoreComplaintDocument,
  historyEntries: StatusHistoryEntry[] = []
): Complaint {
  const createdAtString = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === 'string'
    ? data.createdAt
    : new Date().toISOString();

  const updatedAtString = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate().toISOString()
    : typeof data.updatedAt === 'string'
    ? data.updatedAt
    : createdAtString;

  return {
    id: data.complaintId || id,
    complaintId: data.complaintId || id,
    userId: data.userId,
    userName: data.userName,
    title: data.title,
    description: data.description,
    location: data.location,
    ward: data.ward,
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    category: data.category as ComplaintCategory,
    imageUrl: data.imageURL || undefined,
    imageURL: data.imageURL,
    priority: data.priority,
    status: data.status,
    assignedDepartment: data.assignedDepartment || 'Pending Assignment',
    departmentId: data.departmentId || undefined,
    primaryOfficerId: data.primaryOfficerId || data.primaryOfficerUid || null,
    primaryOfficerUid: data.primaryOfficerUid || data.primaryOfficerId || null,
    primaryOfficerName: data.primaryOfficerName || null,
    primaryOfficerEmail: data.primaryOfficerEmail || null,
    supportingOfficerIds: data.supportingOfficerIds || data.supportingOfficerUids || [],
    supportingOfficerUids: data.supportingOfficerUids || data.supportingOfficerIds || [],
    supportingOfficers: data.supportingOfficers || [],
    resolution: data.resolution || null,
    recommendedDepartment: data.aiAnalysis?.recommendedDepartment || 'Civic General Administration',
    urgencyReason:
      data.aiAnalysis?.urgencyReason ||
      'Standard civic triage level assigned pending municipal engineering inspection.',
    createdAt: createdAtString,
    updatedAt: updatedAtString,
    aiAnalysis: data.aiAnalysis,
    statusHistory: historyEntries.length > 0 ? historyEntries : [
      {
        status: data.status,
        timestamp: createdAtString,
        note: 'Complaint recorded in Cloud Firestore.',
        updatedBy: data.userName || 'Citizen',
      },
    ],
  };
}

class FirestoreComplaintService implements IFirestoreComplaintService {
  async createComplaint(
    input: CreateComplaintInput,
    user: { uid: string; name: string; ward?: string }
  ): Promise<Complaint> {
    if (!db) {
      throw new Error('Cloud Firestore is not initialized.');
    }

    if (!user.uid) {
      throw new Error('Authentication required: You must be logged in to lodge a complaint.');
    }

    // Validate required fields
    if (!input.title || input.title.trim().length < 5) {
      throw new Error('Title must be at least 5 characters long.');
    }
    if (!input.description || input.description.trim().length < 15) {
      throw new Error('Description must be at least 15 characters long.');
    }
    if (!input.location || input.location.trim().length < 3) {
      throw new Error('Please specify an exact location or landmark.');
    }

    // Generate unique Complaint ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const complaintId = `CR-2026-${randomSuffix}`;

    // 1. Trigger AI Triage Analysis & Validation
    let aiResult: AIAnalysisResult;
    try {
      const rawAiResponse = await aiService.analyzeComplaint({
        title: input.title,
        description: input.description,
        location: input.location,
        selectedCategory: input.category,
      });

      const validated = parseAndValidateAIResponse(rawAiResponse, input.category);
      if (validated) {
        aiResult = validated;
      } else {
        console.warn('AI analysis response validation failed; using clearly identified fallback.');
        aiResult = createIdentifiedFallback(input.category);
      }
    } catch (aiErr) {
      console.warn('AI analysis failed during complaint submission; using identified fallback:', aiErr);
      aiResult = createIdentifiedFallback(input.category);
    }

    // 2. Map validated AI severity to document priority:
    // Low -> Low, Medium -> Medium, High -> High, Critical -> Critical
    const assignedPriority: ComplaintPriority = aiResult.priority;

    const docData: FirestoreComplaintDocument = {
      complaintId,
      userId: user.uid,
      userName: user.name || 'Citizen',
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      location: input.location.trim(),
      ward: input.ward || user.ward || 'Ward 14 - Central Zone',
      latitude: typeof input.latitude === 'number' ? input.latitude : null,
      longitude: typeof input.longitude === 'number' ? input.longitude : null,
      priority: assignedPriority,
      status: 'Reported',
      assignedDepartment: null,
      aiAnalysis: aiResult,
      imageURL: input.imageURL || input.imageUrl || null, // Optional
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. Create main document in 'complaints/{complaintId}'
      const docRef = doc(db, 'complaints', complaintId);
      await setDoc(docRef, docData);

      // 2. Create initial history record in 'complaints/{complaintId}/history'
      const remarks = aiResult.isFallback
        ? 'Citizen registered civic issue in Cloud Firestore (Standard Triage Fallback).'
        : `Citizen registered civic issue. AI assessed as ${assignedPriority} priority.`;

      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Complaint Registered',
        previousStatus: null,
        newStatus: 'Reported',
        updatedBy: user.name || 'Citizen',
        timestamp: serverTimestamp(),
        remarks,
      });

      // 3. Trigger Critical Priority Alert notification to Administration
      if (assignedPriority === 'Critical') {
        await notificationService.createNotification({
          recipientUid: 'admin',
          recipientRole: 'admin',
          type: 'critical_alert',
          title: 'Critical Emergency Hazard Alert',
          message: `Critical incident reported: "${input.title}". Immediate dispatch required.`,
          complaintId,
          link: '/admin/complaints',
          isUrgent: true,
        });
      }

      return mapFirestoreDocToComplaint(complaintId, docData);
    } catch (err) {
      const friendlyMsg = getFirestoreErrorMessage(err, 'complaints:create');
      throw new Error(friendlyMsg);
    }
  }

  subscribeCitizenComplaints(
    userId: string,
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onError(new Error('Cloud Firestore is not initialized.'));
      return () => {};
    }

    const complaintsCol = collection(db, 'complaints');

    // Query scoped directly to authenticated citizen's UID
    try {
      const q = query(complaintsCol, where('userId', '==', userId));

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((docSnap) =>
            mapFirestoreDocToComplaint(docSnap.id, docSnap.data() as FirestoreComplaintDocument)
          );
          // Sort client-side by creation timestamp descending to guarantee chronological ordering
          // without requiring a manual composite index in Firebase Console
          list.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          onUpdate(list);
        },
        (error) => {
          console.error('Firestore citizen snapshot error:', error);
          onError(new Error(getFirestoreErrorMessage(error, 'complaints:subscribe_citizen')));
        }
      );
    } catch (err) {
      onError(new Error(getFirestoreErrorMessage(err, 'complaints:subscribe_citizen')));
      return () => {};
    }
  }

  subscribeAllComplaints(
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onError(new Error('Cloud Firestore is not initialized.'));
      return () => {};
    }

    const complaintsCol = collection(db, 'complaints');
    const q = query(complaintsCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) =>
          mapFirestoreDocToComplaint(docSnap.id, docSnap.data() as FirestoreComplaintDocument)
        );
        onUpdate(list);
      },
      (error) => {
        onError(new Error(getFirestoreErrorMessage(error, 'complaints:subscribe_all')));
      }
    );
  }

  async getAllComplaints(): Promise<Complaint[]> {
    if (!db) return [];
    try {
      const complaintsCol = collection(db, 'complaints');
      const q = query(complaintsCol, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) =>
        mapFirestoreDocToComplaint(docSnap.id, docSnap.data() as FirestoreComplaintDocument)
      );
    } catch (err) {
      console.warn('Failed to load all complaints from Firestore:', err);
      return [];
    }
  }

  async getCitizenComplaints(userId: string): Promise<Complaint[]> {
    if (!db) return [];
    try {
      const complaintsCol = collection(db, 'complaints');
      const q = query(complaintsCol, where('userId', '==', userId));
      const snap = await getDocs(q);
      const list = snap.docs.map((docSnap) =>
        mapFirestoreDocToComplaint(docSnap.id, docSnap.data() as FirestoreComplaintDocument)
      );
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.warn('Failed to load citizen complaints from Firestore:', err);
      return [];
    }
  }

  async getComplaintById(complaintId: string): Promise<Complaint | null> {
    if (!db) return null;
    try {
      const docRef = doc(db, 'complaints', complaintId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      // Fetch history subcollection
      const historyDocs = await this.getComplaintHistory(complaintId);
      const historyEntries: StatusHistoryEntry[] = historyDocs.map((h) => ({
        status: h.newStatus,
        timestamp: h.timestamp instanceof Timestamp
          ? h.timestamp.toDate().toISOString()
          : typeof h.timestamp === 'string'
          ? h.timestamp
          : new Date().toISOString(),
        note: h.remarks,
        updatedBy: h.updatedBy,
      }));

      return mapFirestoreDocToComplaint(
        snap.id,
        snap.data() as FirestoreComplaintDocument,
        historyEntries
      );
    } catch (err) {
      console.error('Failed to get complaint by ID from Firestore:', err);
      return null;
    }
  }

  async getComplaintHistory(complaintId: string): Promise<ComplaintHistoryDocument[]> {
    if (!db) return [];
    try {
      const historyCol = collection(db, 'complaints', complaintId, 'history');
      let historyQuery = query(historyCol, orderBy('timestamp', 'asc'));
      let snap;
      try {
        snap = await getDocs(historyQuery);
      } catch {
        // Fallback without ordering
        snap = await getDocs(historyCol);
      }

      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ComplaintHistoryDocument),
      }));
    } catch (err) {
      console.warn('Failed to load complaint history from Firestore:', err);
      return [];
    }
  }

  async updateStatus(
    complaintId: string,
    previousStatus: ComplaintStatus,
    newStatus: ComplaintStatus,
    remarks: string,
    updatedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Add audit history document
      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Status Progression',
        previousStatus,
        newStatus,
        updatedBy,
        timestamp: serverTimestamp(),
        remarks: remarks.trim() || `Status updated from ${previousStatus} to ${newStatus}`,
      });
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:update_status'));
    }
  }

  async assignDepartment(
    complaintId: string,
    currentStatus: ComplaintStatus,
    department: string,
    remarks: string,
    updatedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      const nextStatus: ComplaintStatus =
        currentStatus === 'Reported' || currentStatus === 'Under Review'
          ? 'Acknowledged'
          : currentStatus;

      await updateDoc(docRef, {
        assignedDepartment: department,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      // Add audit history document
      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Department Allocation',
        previousStatus: currentStatus,
        newStatus: nextStatus,
        updatedBy,
        timestamp: serverTimestamp(),
        remarks: remarks.trim() || `Formally routed to ${department}`,
      });
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:assign_department'));
    }
  }

  /**
   * Requirement 3: Admin officer assignment (primary officer + optional supporting officers).
   */
  async assignOfficers(
    complaintId: string,
    currentStatus: ComplaintStatus,
    assignment: AssignOfficersInput
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      const docSnap = await getDoc(docRef);
      const prevData = docSnap.exists() ? (docSnap.data() as FirestoreComplaintDocument) : null;
      const isReassignment = Boolean(
        (prevData?.primaryOfficerId && prevData.primaryOfficerId !== assignment.primaryOfficer.uid) ||
        (prevData?.primaryOfficerUid && prevData.primaryOfficerUid !== assignment.primaryOfficer.uid)
      );

      const supportingUids = (assignment.supportingOfficers || []).map((o) => o.uid);

      await updateDoc(docRef, {
        assignedDepartment: assignment.department,
        departmentId: assignment.departmentId || null,
        // Set both primaryOfficerId and primaryOfficerUid for unified compatibility
        primaryOfficerId: assignment.primaryOfficer.uid,
        primaryOfficerUid: assignment.primaryOfficer.uid,
        primaryOfficerName: assignment.primaryOfficer.name,
        primaryOfficerEmail: assignment.primaryOfficer.email,
        // Set both supportingOfficerIds and supportingOfficerUids
        supportingOfficerIds: supportingUids,
        supportingOfficerUids: supportingUids,
        supportingOfficers: assignment.supportingOfficers || [],
        status: 'Assigned',
        updatedAt: serverTimestamp(),
      });

      // Add audit history document with assignment details
      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: isReassignment ? 'Officer Reassignment' : 'Officer Assignment',
        previousStatus: currentStatus,
        newStatus: 'Assigned',
        updatedBy: assignment.assignedBy,
        timestamp: serverTimestamp(),
        remarks:
          assignment.remarks.trim() ||
          `Assigned to Primary Officer ${assignment.primaryOfficer.name} (${assignment.department})`,
        assignmentDetails: {
          department: assignment.department,
          departmentId: assignment.departmentId,
          primaryOfficer: assignment.primaryOfficer,
          supportingOfficers: assignment.supportingOfficers || [],
        },
      });

      // In-app notifications
      await notificationService.createNotification({
        recipientUid: assignment.primaryOfficer.uid,
        recipientRole: 'officer',
        type: isReassignment ? 'reassignment' : 'assignment',
        title: isReassignment ? 'Complaint Reassigned to You' : 'New Complaint Assignment',
        message: `You were assigned as Primary Officer for complaint ${complaintId}.`,
        complaintId,
        link: `/department/complaints/${complaintId}`,
        isUrgent: true,
      });

      if (assignment.supportingOfficers && assignment.supportingOfficers.length > 0) {
        for (const s of assignment.supportingOfficers) {
          await notificationService.createNotification({
            recipientUid: s.uid,
            recipientRole: 'officer',
            type: 'assignment',
            title: 'Assigned as Supporting Officer',
            message: `You were added as Supporting Officer for complaint ${complaintId}.`,
            complaintId,
            link: `/department/complaints/${complaintId}`,
          });
        }
      }
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:assign_officers'));
    }
  }

  /**
   * Requirement 4: Officer accepts assigned complaint and starts field action.
   */
  async acceptAssignment(
    complaintId: string,
    _officerUid: string,
    officerName: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      await updateDoc(docRef, {
        status: 'In Progress',
        updatedAt: serverTimestamp(),
      });

      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Assignment Accepted',
        previousStatus: 'Assigned',
        newStatus: 'In Progress',
        updatedBy: officerName,
        timestamp: serverTimestamp(),
        remarks: `Officer ${officerName} accepted the assignment and began field action.`,
      });

      // Notify admin
      await notificationService.createNotification({
        recipientUid: 'admin',
        recipientRole: 'admin',
        type: 'status_update',
        title: 'Assignment Accepted',
        message: `Officer ${officerName} accepted assignment for ${complaintId} and moved it to In Progress.`,
        complaintId,
        link: `/admin/complaints`,
      });
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:accept_assignment'));
    }
  }

  /**
   * Requirement 4: Primary or supporting officer logs work note and photographic evidence.
   */
  async addWorkNote(
    complaintId: string,
    _officerUid: string,
    officerName: string,
    note: string,
    evidenceUrl?: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      const docSnap = await getDoc(docRef);
      const currentStatus: ComplaintStatus = docSnap.exists()
        ? (docSnap.data().status as ComplaintStatus)
        : 'In Progress';

      await updateDoc(docRef, {
        updatedAt: serverTimestamp(),
      });

      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Work Note & Field Progress',
        previousStatus: currentStatus,
        newStatus: currentStatus,
        updatedBy: officerName,
        timestamp: serverTimestamp(),
        remarks: note.trim(),
        evidenceUrl: evidenceUrl || null,
      });
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:add_work_note'));
    }
  }

  /**
   * Requirement 4: Primary officer submits final resolution.
   * STRICT REQUIREMENT: Supporting officers cannot submit resolution on behalf of primary officer.
   */
  async submitResolution(
    complaintId: string,
    primaryOfficerUid: string,
    primaryOfficerName: string,
    resolution: { summary: string; actionsTaken: string; evidenceUrl?: string }
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Complaint document not found.');

      const data = docSnap.data() as FirestoreComplaintDocument;
      if (data.primaryOfficerId && data.primaryOfficerId !== primaryOfficerUid) {
        throw new Error('Unauthorized: Only the designated Primary Officer may submit the final resolution.');
      }

      await updateDoc(docRef, {
        status: 'Resolution Submitted',
        resolution: {
          summary: resolution.summary.trim(),
          actionsTaken: resolution.actionsTaken.trim(),
          evidenceUrl: resolution.evidenceUrl || null,
          submittedByUid: primaryOfficerUid,
          submittedByName: primaryOfficerName,
          submittedAt: new Date().toISOString(),
        },
        updatedAt: serverTimestamp(),
      });

      const historyCol = collection(db, 'complaints', complaintId, 'history');
      await addDoc(historyCol, {
        action: 'Resolution Submitted',
        previousStatus: data.status,
        newStatus: 'Resolution Submitted',
        updatedBy: primaryOfficerName,
        timestamp: serverTimestamp(),
        remarks: `Resolution submitted by Primary Officer ${primaryOfficerName}: ${resolution.summary}`,
        evidenceUrl: resolution.evidenceUrl || null,
      });

      // Notify Municipal Admin
      await notificationService.createNotification({
        recipientUid: 'admin',
        recipientRole: 'admin',
        type: 'resolution_submitted',
        title: 'Resolution Submitted for Verification',
        message: `Primary Officer ${primaryOfficerName} submitted resolution for ${complaintId}. Awaiting review.`,
        complaintId,
        link: `/admin/complaints`,
        isUrgent: true,
      });
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:submit_resolution'));
    }
  }

  /**
   * Requirement 5: Admin verification of resolution (approve or reject with reason).
   */
  async verifyResolution(
    complaintId: string,
    approved: boolean,
    adminName: string,
    rejectionReason?: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');

    try {
      const docRef = doc(db, 'complaints', complaintId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Complaint not found.');
      const data = docSnap.data() as FirestoreComplaintDocument;

      const historyCol = collection(db, 'complaints', complaintId, 'history');

      if (approved) {
        await updateDoc(docRef, {
          status: 'Resolved',
          'resolution.approvedAt': new Date().toISOString(),
          'resolution.approvedBy': adminName,
          updatedAt: serverTimestamp(),
        });

        await addDoc(historyCol, {
          action: 'Resolution Verified & Approved',
          previousStatus: 'Resolution Submitted',
          newStatus: 'Resolved',
          updatedBy: adminName,
          timestamp: serverTimestamp(),
          remarks: 'Municipal Administration verified resolution evidence and approved ticket closure.',
        });

        // Notify Citizen
        await notificationService.createNotification({
          recipientUid: data.userId,
          recipientRole: 'citizen',
          type: 'resolution_approved',
          title: 'Civic Complaint Resolved',
          message: `Your reported complaint ${complaintId} has been verified and resolved.`,
          complaintId,
          link: `/citizen/complaints/${complaintId}`,
        });

        // Notify Primary Officer
        if (data.primaryOfficerId) {
          await notificationService.createNotification({
            recipientUid: data.primaryOfficerId,
            recipientRole: 'officer',
            type: 'resolution_approved',
            title: 'Resolution Approved',
            message: `Admin approved your resolution for complaint ${complaintId}. Ticket is closed.`,
            complaintId,
            link: `/department/complaints/${complaintId}`,
          });
        }
      } else {
        const reason = rejectionReason?.trim() || 'Work not completed to satisfaction; additional field work required.';

        await updateDoc(docRef, {
          status: 'In Progress',
          'resolution.rejectionReason': reason,
          'resolution.rejectedAt': new Date().toISOString(),
          'resolution.rejectedBy': adminName,
          updatedAt: serverTimestamp(),
        });

        await addDoc(historyCol, {
          action: 'Resolution Rejected (Rework Requested)',
          previousStatus: 'Resolution Submitted',
          newStatus: 'In Progress',
          updatedBy: adminName,
          timestamp: serverTimestamp(),
          remarks: `Resolution rejected by Admin: ${reason}`,
        });

        // Notify Primary Officer of rework
        if (data.primaryOfficerId) {
          await notificationService.createNotification({
            recipientUid: data.primaryOfficerId,
            recipientRole: 'officer',
            type: 'resolution_rejected',
            title: 'Resolution Rework Requested',
            message: `Admin requested rework on ${complaintId}: ${reason}`,
            complaintId,
            link: `/department/complaints/${complaintId}`,
            isUrgent: true,
          });
        }
      }
    } catch (err) {
      throw new Error(getFirestoreErrorMessage(err, 'complaints:verify_resolution'));
    }
  }

  /**
   * One-time fetch for complaints assigned to an Officer (primary or supporting).
   */
  async getOfficerComplaints(officerUid: string): Promise<Complaint[]> {
    if (!db || !officerUid) return [];

    try {
      const complaintsCol = collection(db, 'complaints');
      const map = new Map<string, Complaint>();

      const [s1, s2, s3, s4] = await Promise.all([
        getDocs(query(complaintsCol, where('primaryOfficerId', '==', officerUid))).catch(() => null),
        getDocs(query(complaintsCol, where('primaryOfficerUid', '==', officerUid))).catch(() => null),
        getDocs(query(complaintsCol, where('supportingOfficerIds', 'array-contains', officerUid))).catch(() => null),
        getDocs(query(complaintsCol, where('supportingOfficerUids', 'array-contains', officerUid))).catch(() => null),
      ]);

      [s1, s2, s3, s4].forEach((snap) => {
        snap?.docs.forEach((d) => {
          map.set(d.id, mapFirestoreDocToComplaint(d.id, d.data() as FirestoreComplaintDocument));
        });
      });

      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('Failed to load officer complaints from Firestore:', err);
      return [];
    }
  }

  /**
   * Real-time listener for complaints assigned to an Officer (primary or supporting).
   * Robustly checks both primaryOfficerId/primaryOfficerUid and supportingOfficerIds/supportingOfficerUids.
   */
  subscribeOfficerComplaints(
    officerUid: string,
    onUpdate: (complaints: Complaint[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    if (!db || !officerUid) {
      onUpdate([]);
      return () => {};
    }

    const complaintsCol = collection(db, 'complaints');
    const q1 = query(complaintsCol, where('primaryOfficerId', '==', officerUid));
    const q2 = query(complaintsCol, where('primaryOfficerUid', '==', officerUid));
    const q3 = query(complaintsCol, where('supportingOfficerIds', 'array-contains', officerUid));
    const q4 = query(complaintsCol, where('supportingOfficerUids', 'array-contains', officerUid));

    const map = new Map<string, Complaint>();

    const emitCombined = () => {
      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(combined);
    };

    const handleDocs = (docs: any[]) => {
      docs.forEach((d) => {
        map.set(d.id, mapFirestoreDocToComplaint(d.id, d.data() as FirestoreComplaintDocument));
      });
      emitCombined();
    };

    const unsub1 = onSnapshot(q1, (snap) => handleDocs(snap.docs), onError);
    const unsub2 = onSnapshot(q2, (snap) => handleDocs(snap.docs), (err) => console.warn('Officer UID q2 notice:', err.message));
    const unsub3 = onSnapshot(q3, (snap) => handleDocs(snap.docs), onError);
    const unsub4 = onSnapshot(q4, (snap) => handleDocs(snap.docs), (err) => console.warn('Supporting UID q4 notice:', err.message));

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }

  async updateComplaintLocation(
    complaintId: string,
    latitude: number,
    longitude: number,
    locationText?: string
  ): Promise<void> {
    if (!db) throw new Error('Cloud Firestore is not initialized.');
    const docRef = doc(db, 'complaints', complaintId);
    const updates: Record<string, any> = {
      latitude,
      longitude,
      updatedAt: serverTimestamp(),
    };
    if (locationText && locationText.trim()) {
      updates.location = locationText.trim();
    }
    await updateDoc(docRef, updates);
  }
}

export const firestoreComplaintService: IFirestoreComplaintService =
  new FirestoreComplaintService();

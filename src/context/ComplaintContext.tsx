import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Complaint,
  CreateComplaintInput,
  ComplaintStatus,
  ComplaintHistoryDocument,
  AIAnalysisResult,
  ComplaintResolution,
} from '../types/complaint';
import {
  firestoreComplaintService,
  AssignOfficersInput,
} from '../services/firestoreComplaintService';
import { INITIAL_COMPLAINTS } from '../data/initialComplaints';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { aiService, parseAndValidateAIResponse, createIdentifiedFallback } from '../services/aiService';

interface ComplaintContextType {
  complaints: Complaint[];
  userComplaints: Complaint[];
  officerComplaints: Complaint[];
  loading: boolean;
  error: string | null;
  isFirestoreConnected: boolean;
  getComplaint: (id: string) => Complaint | undefined;
  getComplaintHistory: (id: string) => Promise<ComplaintHistoryDocument[]>;
  submitComplaint: (input: CreateComplaintInput) => Promise<Complaint>;
  updateComplaintStatus: (id: string, status: ComplaintStatus, note: string) => Promise<void>;
  assignComplaintDepartment: (id: string, department: string, note: string) => Promise<void>;
  assignOfficers: (complaintId: string, assignment: AssignOfficersInput) => Promise<void>;
  acceptComplaintAssignment: (id: string) => Promise<void>;
  submitComplaintWorkNote: (id: string, note: string, evidenceUrl?: string) => Promise<void>;
  submitComplaintResolution: (id: string, summary: string, actionsTaken: string, evidenceUrl?: string) => Promise<void>;
  verifyComplaintResolution: (id: string, approved: boolean, rejectionReason?: string) => Promise<void>;
  updateComplaintLocation: (id: string, latitude: number, longitude: number, locationText?: string) => Promise<void>;
  refreshComplaints: () => Promise<void>;
  resetSampleData: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(undefined);

export const ComplaintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isOfficer, isAuthenticated } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [officerComplaints, setOfficerComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isFirestoreConnected = Boolean(db !== null);

  // Real-time Firestore onSnapshot Subscription
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let isMounted = true;
    let unsubscribe = () => {};

    if (isFirestoreConnected && db) {
      if (isAdmin) {
        // Admin: Subscribes to all complaints across all municipal wards
        unsubscribe = firestoreComplaintService.subscribeAllComplaints(
          (liveComplaints) => {
            if (!isMounted) return;
            setComplaints(liveComplaints);
            setOfficerComplaints(liveComplaints);
            setError(null);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.warn('[CivicResolve Diagnostic] Admin global complaints listener failed, falling back to citizen-scoped subscription:', err.message);
            // Fall back to citizen-scoped query so the user is never blocked on citizen pages
            const fallbackUnsub = firestoreComplaintService.subscribeCitizenComplaints(
              user.uid,
              (liveUserComplaints) => {
                if (!isMounted) return;
                setComplaints(liveUserComplaints);
                setError(null);
                setLoading(false);
              },
              (citizenErr) => {
                if (!isMounted) return;
                console.error('[CivicResolve Diagnostic] Citizen complaints fallback query error:', citizenErr);
                setError(citizenErr.message);
                setComplaints([]);
                setLoading(false);
              }
            );
            if (!isMounted) {
              fallbackUnsub();
            } else {
              unsubscribe = fallbackUnsub;
            }
          }
        );
      } else {
        // Citizen: Subscribes ONLY to complaints belonging to the authenticated citizen
        const unsubCitizen = firestoreComplaintService.subscribeCitizenComplaints(
          user.uid,
          (liveUserComplaints) => {
            if (!isMounted) return;
            setComplaints(liveUserComplaints);
            setError(null);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error('Firestore Citizen Query Error:', err);
            setError(err.message);
            setLoading(false);
          }
        );

        // If user is also an Officer: Subscribe to assigned department cases
        let unsubOfficer = () => {};
        if (isOfficer) {
          unsubOfficer = firestoreComplaintService.subscribeOfficerComplaints(
            user.uid,
            (liveOfficerComplaints) => {
              if (!isMounted) return;
              setOfficerComplaints(liveOfficerComplaints);
            },
            (err) => {
              console.warn('[CivicResolve Diagnostic] Officer complaints query notice:', err.message);
            }
          );
        }

        unsubscribe = () => {
          unsubCitizen();
          unsubOfficer();
        };
      }
    } else {
      // Local fallback mode
      setComplaints(INITIAL_COMPLAINTS);
      setLoading(false);
    }

    // Unsubscribe from listeners and guard against async memory leaks
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isAuthenticated, user?.uid, isAdmin, isOfficer, isFirestoreConnected]);

  const getComplaint = (id: string): Complaint | undefined => {
    return (
      complaints.find((c) => c.id === id || c.complaintId === id) ||
      officerComplaints.find((c) => c.id === id || c.complaintId === id)
    );
  };

  const getComplaintHistory = async (id: string): Promise<ComplaintHistoryDocument[]> => {
    if (isFirestoreConnected) {
      return firestoreComplaintService.getComplaintHistory(id);
    }
    const match = getComplaint(id);
    if (!match) return [];
    return match.statusHistory.map((h, idx) => ({
      id: `hist-${idx}`,
      action: 'Status Logged',
      previousStatus: null,
      newStatus: h.status,
      updatedBy: h.updatedBy,
      timestamp: h.timestamp,
      remarks: h.note || '',
    }));
  };

  // Filter complaints strictly for the citizen
  const userComplaints = complaints.filter(
    (c) => c.userId === user?.uid || (isAdmin && c.userId === user?.uid)
  );

  const submitComplaint = async (input: CreateComplaintInput): Promise<Complaint> => {
    if (!user) {
      throw new Error('You must be securely signed in to report a civic issue.');
    }

    if (isFirestoreConnected) {
      const created = await firestoreComplaintService.createComplaint(input, {
        uid: user.uid,
        name: user.name,
        ward: input.ward || user.wardOrZone,
      });
      // Real-time onSnapshot will automatically update state, but prepend locally for instant feedback
      setComplaints((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      return created;
    } else {
      // Offline fallback
      let aiResult: AIAnalysisResult;
      try {
        const rawAi = await aiService.analyzeComplaint({
          title: input.title,
          description: input.description,
          location: input.location,
          selectedCategory: input.category,
        });
        aiResult = parseAndValidateAIResponse(rawAi, input.category) || createIdentifiedFallback(input.category);
      } catch {
        aiResult = createIdentifiedFallback(input.category);
      }

      const now = new Date().toISOString();
      const fallback: Complaint = {
        id: `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: user.uid,
        userName: user.name,
        title: input.title.trim(),
        description: input.description.trim(),
        location: input.location.trim(),
        ward: input.ward || user.wardOrZone || 'Ward 14',
        category: input.category,
        imageUrl: input.imageUrl,
        priority: aiResult.priority,
        urgencyReason: aiResult.urgencyReason,
        recommendedDepartment: aiResult.recommendedDepartment,
        assignedDepartment: 'Pending Assignment',
        status: 'Reported',
        createdAt: now,
        updatedAt: now,
        aiAnalysis: aiResult,
        statusHistory: [
          {
            status: 'Reported',
            timestamp: now,
            note: aiResult.isFallback
              ? 'Complaint recorded locally (standard triage fallback).'
              : `Complaint recorded locally with AI priority: ${aiResult.priority}.`,
            updatedBy: user.name,
          },
        ],
      };
      setComplaints((prev) => [fallback, ...prev]);
      return fallback;
    }
  };

  const updateComplaintStatus = async (
    id: string,
    status: ComplaintStatus,
    note: string
  ): Promise<void> => {
    if (!isAdmin) {
      throw new Error('Permission Denied: Administrator custom claim required.');
    }

    const current = getComplaint(id);
    const prevStatus = current?.status || 'Reported';
    const updater = user?.name ? `${user.name} (Municipal Admin)` : (user?.email || 'Municipal Administrator');

    if (isFirestoreConnected) {
      await firestoreComplaintService.updateStatus(id, prevStatus, status, note, updater);
    }

    // Update local state immediately for instant feedback
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? {
              ...c,
              status,
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...c.statusHistory,
                {
                  status,
                  timestamp: new Date().toISOString(),
                  note: note.trim() || `Status updated from ${prevStatus} to ${status}`,
                  updatedBy: updater,
                },
              ],
            }
          : c
      )
    );
  };

  const assignComplaintDepartment = async (
    id: string,
    department: string,
    note: string
  ): Promise<void> => {
    if (!isAdmin) {
      throw new Error('Permission Denied: Administrator custom claim required.');
    }

    const current = getComplaint(id);
    const currentStatus = current?.status || 'Reported';
    const nextStatus: ComplaintStatus =
      currentStatus === 'Reported' || currentStatus === 'Under Review'
        ? 'Acknowledged'
        : currentStatus;
    const updater = user?.name ? `${user.name} (Municipal Admin)` : (user?.email || 'Municipal Operations Admin');

    if (isFirestoreConnected) {
      await firestoreComplaintService.assignDepartment(
        id,
        currentStatus,
        department,
        note,
        updater
      );
    }

    // Update local state immediately for instant feedback
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? {
              ...c,
              assignedDepartment: department,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...c.statusHistory,
                {
                  status: nextStatus,
                  timestamp: new Date().toISOString(),
                  note: note.trim() || `Formally routed to ${department}`,
                  updatedBy: updater,
                },
              ],
            }
          : c
      )
    );
  };

  const assignOfficers = async (
    complaintId: string,
    assignment: AssignOfficersInput
  ): Promise<void> => {
    if (!isAdmin) {
      throw new Error('Permission Denied: Administrator role required to assign officers.');
    }

    const current = getComplaint(complaintId);
    const currentStatus = current?.status || 'Reported';

    if (isFirestoreConnected) {
      await firestoreComplaintService.assignOfficers(complaintId, currentStatus, assignment);
    }

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId || c.complaintId === complaintId
          ? {
              ...c,
              assignedDepartment: assignment.department,
              departmentId: assignment.departmentId,
              primaryOfficerId: assignment.primaryOfficer.uid,
              primaryOfficerName: assignment.primaryOfficer.name,
              primaryOfficerEmail: assignment.primaryOfficer.email,
              supportingOfficerIds: (assignment.supportingOfficers || []).map((o) => o.uid),
              supportingOfficers: assignment.supportingOfficers || [],
              status: 'Assigned',
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const acceptComplaintAssignment = async (id: string): Promise<void> => {
    if (!user) throw new Error('Authentication required.');
    const updater = user.name || user.email;

    if (isFirestoreConnected) {
      await firestoreComplaintService.acceptAssignment(id, user.uid, updater);
    }

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id ? { ...c, status: 'In Progress', updatedAt: new Date().toISOString() } : c
      )
    );
    setOfficerComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id ? { ...c, status: 'In Progress', updatedAt: new Date().toISOString() } : c
      )
    );
  };

  const submitComplaintWorkNote = async (
    id: string,
    note: string,
    evidenceUrl?: string
  ): Promise<void> => {
    if (!user) throw new Error('Authentication required.');
    const updater = user.name || user.email;

    if (isFirestoreConnected) {
      await firestoreComplaintService.addWorkNote(id, user.uid, updater, note, evidenceUrl);
    }
  };

  const submitComplaintResolution = async (
    id: string,
    summary: string,
    actionsTaken: string,
    evidenceUrl?: string
  ): Promise<void> => {
    if (!user) throw new Error('Authentication required.');
    const target = getComplaint(id);
    if (target?.primaryOfficerId && target.primaryOfficerId !== user.uid && !isAdmin) {
      throw new Error('Unauthorized: Only the designated Primary Officer may submit the final resolution.');
    }

    const updater = user.name || user.email;

    if (isFirestoreConnected) {
      await firestoreComplaintService.submitResolution(id, user.uid, updater, {
        summary,
        actionsTaken,
        evidenceUrl,
      });
    }

    const resolutionObj: ComplaintResolution = {
      summary,
      actionsTaken,
      evidenceUrl: evidenceUrl || null,
      submittedByUid: user.uid,
      submittedByName: updater,
      submittedAt: new Date().toISOString(),
    };

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? { ...c, status: 'Resolution Submitted', resolution: resolutionObj, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setOfficerComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? { ...c, status: 'Resolution Submitted', resolution: resolutionObj, updatedAt: new Date().toISOString() }
          : c
      )
    );
  };

  const verifyComplaintResolution = async (
    id: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<void> => {
    if (!isAdmin) throw new Error('Permission Denied: Administrator role required to verify resolutions.');
    const updater = user?.name ? `${user.name} (Admin)` : 'Municipal Administrator';

    if (isFirestoreConnected) {
      await firestoreComplaintService.verifyResolution(id, approved, updater, rejectionReason);
    }

    const nextStatus: ComplaintStatus = approved ? 'Resolved' : 'In Progress';

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? {
              ...c,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
              resolution: c.resolution
                ? {
                    ...c.resolution,
                    approvedAt: approved ? new Date().toISOString() : undefined,
                    approvedBy: approved ? updater : undefined,
                    rejectionReason: approved ? undefined : rejectionReason,
                    rejectedAt: approved ? undefined : new Date().toISOString(),
                    rejectedBy: approved ? undefined : updater,
                  }
                : null,
            }
          : c
      )
    );
  };

  const updateComplaintLocation = async (
    id: string,
    latitude: number,
    longitude: number,
    locationText?: string
  ): Promise<void> => {
    if (isFirestoreConnected) {
      await firestoreComplaintService.updateComplaintLocation(id, latitude, longitude, locationText);
    }
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? {
              ...c,
              latitude,
              longitude,
              ...(locationText ? { location: locationText } : {}),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setOfficerComplaints((prev) =>
      prev.map((c) =>
        c.id === id || c.complaintId === id
          ? {
              ...c,
              latitude,
              longitude,
              ...(locationText ? { location: locationText } : {}),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const refreshComplaints = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    if (isFirestoreConnected) {
      try {
        if (isAdmin) {
          const live = await firestoreComplaintService.getAllComplaints();
          setComplaints(live);
          setOfficerComplaints(live);
        } else {
          const live = await firestoreComplaintService.getCitizenComplaints(user.uid);
          setComplaints(live);
          if (isOfficer) {
            const officerLive = await firestoreComplaintService.getOfficerComplaints(user.uid);
            setOfficerComplaints(officerLive);
          }
        }
        setError(null);
      } catch (err: unknown) {
        console.warn('Manual refresh query failed:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setComplaints(INITIAL_COMPLAINTS);
      setLoading(false);
    }
  }, [user, isAdmin, isOfficer, isFirestoreConnected]);

  const resetSampleData = useCallback(async () => {
    setLoading(true);
    setComplaints(INITIAL_COMPLAINTS);
    setLoading(false);
  }, []);

  return (
    <ComplaintContext.Provider
      value={{
        complaints,
        userComplaints,
        officerComplaints,
        loading,
        error,
        isFirestoreConnected,
        getComplaint,
        getComplaintHistory,
        submitComplaint,
        updateComplaintStatus,
        assignComplaintDepartment,
        assignOfficers,
        acceptComplaintAssignment,
        submitComplaintWorkNote,
        submitComplaintResolution,
        verifyComplaintResolution,
        updateComplaintLocation,
        refreshComplaints,
        resetSampleData,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

export const useComplaints = (): ComplaintContextType => {
  const context = useContext(ComplaintContext);
  if (!context) {
    throw new Error('useComplaints must be used within a ComplaintProvider');
  }
  return context;
};

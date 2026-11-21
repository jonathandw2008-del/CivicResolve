export type ComplaintCategory =
  | 'Roads and Potholes'
  | 'Garbage and Sanitation'
  | 'Water Leakage'
  | 'Streetlights and Electricity'
  | 'Drainage and Sewage'
  | 'Public Infrastructure'
  | 'Other'
  | 'Roads and potholes'
  | 'Garbage and sanitation'
  | 'Water supply and leakage'
  | 'Streetlights and electricity'
  | 'Drainage and sewage'
  | 'Public infrastructure';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolution Submitted'
  | 'Resolved';

export interface ComplaintResolution {
  summary: string;
  actionsTaken: string;
  evidenceUrl?: string | null;
  submittedByUid: string;
  submittedByName: string;
  submittedAt: string;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
}

export interface ComplaintAssignmentHistory {
  id?: string;
  complaintId: string;
  department: string;
  departmentId?: string;
  primaryOfficer: {
    uid: string;
    name: string;
    email: string;
  };
  supportingOfficers?: Array<{
    uid: string;
    name: string;
    email: string;
  }>;
  assignedBy: string;
  assignedAt: string;
  remarks?: string;
  previousPrimaryOfficerId?: string | null;
}

/**
 * Subcollection: complaints/{complaintId}/history/{historyId}
 */
export interface ComplaintHistoryDocument {
  id?: string;
  action: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  updatedBy: string;
  timestamp: any;
  remarks: string;
  evidenceUrl?: string | null;
  assignmentDetails?: {
    department: string;
    departmentId?: string;
    primaryOfficer?: { uid: string; name: string; email: string };
    supportingOfficers?: Array<{ uid: string; name: string; email: string }>;
  };
}

export interface StatusHistoryEntry {
  status: ComplaintStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
  evidenceUrl?: string | null;
  action?: string;
}

export interface AIAnalysisResult {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  severity?: ComplaintPriority;
  urgencyReason: string;
  recommendedDepartment: string;
  confidenceScore?: number;
  isFallback?: boolean;
}

/**
 * Main Collection: complaints/{complaintId}
 */
export interface FirestoreComplaintDocument {
  complaintId: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  location: string;
  ward: string;
  latitude?: number | null;
  longitude?: number | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedDepartment: string | null;
  departmentId?: string | null;
  primaryOfficerId?: string | null;
  primaryOfficerUid?: string | null;
  primaryOfficerName?: string | null;
  primaryOfficerEmail?: string | null;
  supportingOfficerIds?: string[];
  supportingOfficerUids?: string[];
  supportingOfficers?: Array<{ uid: string; name: string; email: string }>;
  resolution?: ComplaintResolution | null;
  aiAnalysis: AIAnalysisResult | null;
  imageURL: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface Complaint {
  id: string;
  complaintId?: string;
  userId: string;
  userName?: string;
  title: string;
  description: string;
  location: string;
  ward?: string;
  latitude?: number | null;
  longitude?: number | null;
  category: ComplaintCategory;
  imageUrl?: string;
  imageURL?: string | null;
  priority: ComplaintPriority;
  urgencyReason: string;
  recommendedDepartment: string;
  assignedDepartment: string;
  departmentId?: string;
  primaryOfficerId?: string | null;
  primaryOfficerUid?: string | null;
  primaryOfficerName?: string | null;
  primaryOfficerEmail?: string | null;
  supportingOfficerIds?: string[];
  supportingOfficerUids?: string[];
  supportingOfficers?: Array<{ uid: string; name: string; email: string }>;
  resolution?: ComplaintResolution | null;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: AIAnalysisResult | null;
  statusHistory: StatusHistoryEntry[];
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  location: string;
  ward?: string;
  latitude?: number | null;
  longitude?: number | null;
  category: ComplaintCategory;
  imageUrl?: string;
  imageURL?: string | null;
}

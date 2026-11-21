export type NotificationType =
  | 'assignment'
  | 'reassignment'
  | 'resolution_submitted'
  | 'resolution_approved'
  | 'resolution_rejected'
  | 'status_update'
  | 'critical_alert';

export interface AppNotification {
  id: string;
  recipientUid: string; // Target user UID, or 'admin' for global admin alerts
  recipientRole?: 'citizen' | 'officer' | 'admin';
  type: NotificationType;
  title: string;
  message: string;
  complaintId: string;
  link: string;
  isUrgent?: boolean;
  read: boolean;
  createdAt: any;
}

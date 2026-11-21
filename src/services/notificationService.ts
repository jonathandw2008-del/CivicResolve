import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppNotification, NotificationType } from '../types/notification';

class NotificationService {
  /**
   * Creates a new Firestore-backed in-app notification.
   * Requirement 6:
   * - New assignments.
   * - Reassignments.
   * - Resolution submissions.
   * - Resolution approvals or rejections.
   */
  async createNotification(notification: {
    recipientUid: string;
    recipientRole?: 'citizen' | 'officer' | 'admin';
    type: NotificationType;
    title: string;
    message: string;
    complaintId: string;
    link: string;
    isUrgent?: boolean;
  }): Promise<void> {
    if (!db) return;
    try {
      const notifRef = collection(db, 'notifications');
      await addDoc(notifRef, {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[CivicResolve Diagnostic] Could not persist notification in Firestore:', err);
    }
  }

  /**
   * Subscribes to real-time notifications for the current authenticated user.
   */
  subscribeUserNotifications(
    userId: string,
    isAdmin: boolean,
    onUpdate: (notifications: AppNotification[]) => void
  ): Unsubscribe {
    if (!db) {
      onUpdate([]);
      return () => {};
    }

    // Admins receive notifications addressed to their UID OR with recipientRole == 'admin'
    // Other users receive notifications addressed to their UID
    const notifsRef = collection(db, 'notifications');
    let q = query(notifsRef, where('recipientUid', '==', userId), orderBy('createdAt', 'desc'));

    if (isAdmin) {
      // For admins, also query recipientRole == 'admin'
      q = query(notifsRef, where('recipientRole', '==', 'admin'), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          const createdAtString =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : typeof data.createdAt === 'string'
              ? data.createdAt
              : new Date().toISOString();

          return {
            id: d.id,
            recipientUid: data.recipientUid,
            recipientRole: data.recipientRole,
            type: data.type,
            title: data.title,
            message: data.message,
            complaintId: data.complaintId,
            link: data.link,
            isUrgent: Boolean(data.isUrgent),
            read: Boolean(data.read),
            createdAt: createdAtString,
          } as AppNotification;
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('[CivicResolve Diagnostic] Notifications listener error:', err.message);
      }
    );
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'notifications', notificationId);
      await updateDoc(ref, { read: true });
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }

  /**
   * Marks a batch of notifications as read.
   */
  async markAllAsRead(notificationIds: string[]): Promise<void> {
    if (!db || notificationIds.length === 0) return;
    const firestoreDb = db;
    try {
      await Promise.all(
        notificationIds.map((id) => {
          const ref = doc(firestoreDb, 'notifications', id);
          return updateDoc(ref, { read: true });
        })
      );
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  }
}

export const notificationService = new NotificationService();

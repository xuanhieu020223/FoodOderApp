import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'order' | 'promotion' | 'incident' | 'system' | 'general';
export type NotificationTarget = 'customer' | 'restaurant' | 'driver' | 'all';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  targetIds?: string[]; // Specific user IDs if targeting specific users
  scheduledAt?: string; // ISO string for scheduled notifications
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  createdAt: string;
  createdBy: string;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const fetchNotifications = async (): Promise<Notification[]> => {
  const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as Notification),
    id: docSnap.id,
  }));
};

export const getNotificationById = async (id: string): Promise<Notification | null> => {
  const snap = await getDoc(doc(db, 'notifications', id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Notification), id: snap.id };
};

export const createNotification = async (data: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  const notificationData = {
    ...data,
    createdAt: new Date().toISOString(),
    status: data.scheduledAt ? 'scheduled' : 'draft',
  };
  const docRef = await addDoc(collection(db, 'notifications'), notificationData);
  return docRef.id;
};

export const sendNotification = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', id), {
    status: 'sent',
    sentAt: new Date().toISOString(),
  });
  // TODO: Integrate with FCM or push notification service
};

export const updateNotification = async (id: string, data: Partial<Notification>): Promise<void> => {
  await updateDoc(doc(db, 'notifications', id), data);
};

export const deleteNotification = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'notifications', id));
};

export const cancelScheduledNotification = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', id), {
    status: 'cancelled',
  });
};


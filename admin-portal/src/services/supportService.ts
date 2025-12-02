import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type SupportTicketDoc = {
  id: string;
  customer?: string;
  topic?: string;
  channel?: 'app' | 'phone' | 'email';
  severity?: 'low' | 'medium' | 'high';
  status?: 'new' | 'in-progress' | 'resolved';
  updatedAt?: string;
  createdAt?: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  history?: Array<{
    action: string;
    by: string;
    at: string;
    note?: string;
  }>;
};

export const fetchSupportTickets = async (): Promise<SupportTicketDoc[]> => {
  const snap = await getDocs(query(collection(db, 'supportTickets'), orderBy('updatedAt', 'desc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as SupportTicketDoc),
    id: docSnap.id,
  }));
};

export const getTicketById = async (id: string): Promise<SupportTicketDoc | null> => {
  const snap = await getDoc(doc(db, 'supportTickets', id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as SupportTicketDoc), id: snap.id };
};

export const updateTicketStatus = async (
  id: string,
  status: SupportTicketDoc['status'],
  response?: string,
  respondedBy?: string,
): Promise<void> => {
  const updateData: Partial<SupportTicketDoc> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (response) {
    updateData.response = response;
    updateData.respondedBy = respondedBy || 'Admin';
    updateData.respondedAt = new Date().toISOString();
  }
  await updateDoc(doc(db, 'supportTickets', id), updateData);
};


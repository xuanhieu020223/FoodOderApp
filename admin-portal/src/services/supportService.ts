import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export type SupportTicketDoc = {
  id: string;
  customer?: string;
  topic?: string;
  channel?: 'app' | 'phone' | 'email';
  severity?: 'low' | 'medium' | 'high';
  status?: 'new' | 'in-progress' | 'resolved';
  updatedAt?: string;
};

export const fetchSupportTickets = async (): Promise<SupportTicketDoc[]> => {
  const snap = await getDocs(query(collection(db, 'supportTickets'), orderBy('updatedAt', 'desc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as SupportTicketDoc),
    id: docSnap.id,
  }));
};


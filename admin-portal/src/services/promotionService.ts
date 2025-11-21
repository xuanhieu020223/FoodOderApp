import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export type PromotionDoc = {
  id: string;
  name?: string;
  owner?: string;
  start?: string;
  end?: string;
  usage?: number;
  budget?: number;
  status?: string;
};

export const fetchPromotions = async (): Promise<PromotionDoc[]> => {
  const snap = await getDocs(query(collection(db, 'promotions'), orderBy('start', 'desc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as PromotionDoc),
    id: docSnap.id,
  }));
};


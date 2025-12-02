import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
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
  type?: 'voucher' | 'free-ship' | 'combo';
};

export const fetchPromotions = async (): Promise<PromotionDoc[]> => {
  const snap = await getDocs(query(collection(db, 'promotions'), orderBy('start', 'desc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as PromotionDoc),
    id: docSnap.id,
  }));
};

export const getPromotionById = async (id: string): Promise<PromotionDoc | null> => {
  const snap = await getDoc(doc(db, 'promotions', id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as PromotionDoc), id: snap.id };
};

export const updatePromotion = async (id: string, data: Partial<PromotionDoc>): Promise<void> => {
  await updateDoc(doc(db, 'promotions', id), data);
};

export const deletePromotion = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'promotions', id));
};


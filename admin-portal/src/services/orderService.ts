import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { OrderStatus } from '../types';

export type OrderDoc = {
  id: string;
  customerName?: string;
  restaurantName?: string;
  totalAmount?: number;
  status?: OrderStatus | string;
  createdAt?: Timestamp | Date | number | string | null;
  address?: string;
};

const ordersCollection = collection(db, 'orders');

const mapOrderDoc = (docSnap: QueryDocumentSnapshot<DocumentData>) => ({
  ...(docSnap.data() as OrderDoc),
  id: docSnap.id,
});

export const fetchLatestOrders = async (size = 15): Promise<OrderDoc[]> => {
  const snap = await getDocs(query(ordersCollection, orderBy('createdAt', 'desc'), limit(size)));
  return snap.docs.map(mapOrderDoc);
};

export const fetchAllOrders = async (): Promise<OrderDoc[]> => {
  const snap = await getDocs(ordersCollection);
  return snap.docs.map(mapOrderDoc);
};

export const subscribeLatestOrders = (size = 15, cb: (orders: OrderDoc[]) => void) => {
  const q = query(ordersCollection, orderBy('createdAt', 'desc'), limit(size));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(mapOrderDoc));
  });
};


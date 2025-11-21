import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserAccount, UserRole } from '../types';

type FirestoreUser = {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt?: { toDate?: () => Date };
  rating?: number;
  city?: string;
};

const normalizeRole = (rawRole?: string): UserRole => {
  const normalized = (rawRole ?? 'customer').toLowerCase();
  if (normalized === 'user') return 'customer';
  if (normalized === 'shipper') return 'driver';
  const allowed: UserRole[] = ['customer', 'restaurant', 'driver', 'admin'];
  return allowed.includes(normalized as UserRole) ? (normalized as UserRole) : 'customer';
};

const normalizeStatus = (rawStatus?: string): UserAccount['status'] => {
  const normalized = (rawStatus ?? 'active').toLowerCase();
  if (normalized === 'blocked') return 'locked';
  const allowed: UserAccount['status'][] = ['active', 'locked', 'pending'];
  return allowed.includes(normalized as UserAccount['status']) ? (normalized as UserAccount['status']) : 'active';
};

export const fetchUsersWithOrderMeta = async (): Promise<UserAccount[]> => {
  const [usersSnap, ordersSnap] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'orders'))]);

  const ordersByUser = ordersSnap.docs.reduce<Map<string, number>>((acc, orderDoc) => {
    const order = orderDoc.data() as { userId?: string };
    if (!order.userId) return acc;
    acc.set(order.userId, (acc.get(order.userId) ?? 0) + 1);
    return acc;
  }, new Map());

  return usersSnap.docs.map((docSnap) => {
    const data = docSnap.data() as FirestoreUser;
    return {
      id: docSnap.id,
      name: data.name || data.username || 'Chưa cập nhật',
      role: normalizeRole(data.role),
      email: data.email || '',
      phone: data.phone || '',
      status: normalizeStatus(data.status),
      createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') ?? '',
      orders: ordersByUser.get(docSnap.id) ?? 0,
      rating: data.rating,
      city: data.city,
    };
  });
};

export const toggleUserStatus = async ({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: UserAccount['status'];
}): Promise<UserAccount['status']> => {
  const nextStatus = currentStatus === 'locked' ? 'active' : 'locked';
  await updateDoc(doc(db, 'users', id), { status: nextStatus });
  return nextStatus;
};


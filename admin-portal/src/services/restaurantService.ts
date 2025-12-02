import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Restaurant } from '../types';

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  // Lấy tất cả users và filter trong code để tránh lỗi index
  const snap = await getDocs(collection(db, 'users'));
  const restaurants = snap.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      const role = (data.role || '').toLowerCase();
      return role === 'restaurant' || role === 'restaurant_owner';
    })
    .sort((a, b) => {
      const aDate = a.data().createdAt?.toDate?.()?.getTime() || 0;
      const bDate = b.data().createdAt?.toDate?.()?.getTime() || 0;
      return bDate - aDate;
    });
  
  return restaurants.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || data.restaurantName || 'Chưa có tên',
      ownerName: data.ownerName || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      status: data.status || 'pending',
      registrationStatus: data.registrationStatus || 'pending',
      businessLicense: data.businessLicense,
      businessLicenseImage: data.businessLicenseImage,
      contractStatus: data.contractStatus || 'pending',
      commissionRate: data.commissionRate || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      approvedAt: data.approvedAt?.toDate?.()?.toISOString(),
      rejectedReason: data.rejectedReason,
      totalOrders: data.totalOrders || 0,
      totalRevenue: data.totalRevenue || 0,
      rating: data.rating,
      menuVerified: data.menuVerified || false,
      documentsVerified: data.documentsVerified || false,
    };
  });
};

export const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || data.restaurantName || 'Chưa có tên',
    ownerName: data.ownerName || data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || '',
    status: data.status || 'pending',
    registrationStatus: data.registrationStatus || 'pending',
    businessLicense: data.businessLicense,
    businessLicenseImage: data.businessLicenseImage,
    contractStatus: data.contractStatus || 'pending',
    commissionRate: data.commissionRate || 0,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    approvedAt: data.approvedAt?.toDate?.()?.toISOString(),
    rejectedReason: data.rejectedReason,
    totalOrders: data.totalOrders || 0,
    totalRevenue: data.totalRevenue || 0,
    rating: data.rating,
    menuVerified: data.menuVerified || false,
    documentsVerified: data.documentsVerified || false,
  };
};

export const approveRestaurant = async (id: string, commissionRate?: number): Promise<void> => {
  const updateData: any = {
    registrationStatus: 'approved',
    status: 'active',
    approvedAt: new Date(),
    documentsVerified: true,
  };
  if (commissionRate !== undefined) {
    updateData.commissionRate = commissionRate;
  }
  await updateDoc(doc(db, 'users', id), updateData);
};

export const rejectRestaurant = async (id: string, reason: string): Promise<void> => {
  await updateDoc(doc(db, 'users', id), {
    registrationStatus: 'rejected',
    status: 'rejected',
    rejectedReason: reason,
  });
};

export const updateRestaurantStatus = async (id: string, status: Restaurant['status']): Promise<void> => {
  await updateDoc(doc(db, 'users', id), { status });
};

export const updateRestaurant = async (id: string, data: Partial<Restaurant>): Promise<void> => {
  await updateDoc(doc(db, 'users', id), data);
};

export const verifyRestaurantDocuments = async (id: string, verified: boolean): Promise<void> => {
  await updateDoc(doc(db, 'users', id), { documentsVerified: verified });
};

export const verifyRestaurantMenu = async (id: string, verified: boolean): Promise<void> => {
  await updateDoc(doc(db, 'users', id), { menuVerified: verified });
};


import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Driver } from '../types';

export const fetchDrivers = async (): Promise<Driver[]> => {
  // Lấy tất cả users và filter trong code để tránh lỗi index
  const snap = await getDocs(collection(db, 'users'));
  const drivers = snap.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      const role = (data.role || '').toLowerCase();
      return role === 'driver' || role === 'shipper';
    })
    .sort((a, b) => {
      const aDate = a.data().createdAt?.toDate?.()?.getTime() || 0;
      const bDate = b.data().createdAt?.toDate?.()?.getTime() || 0;
      return bDate - aDate;
    });
  
  return drivers.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || 'Chưa có tên',
      email: data.email || '',
      phone: data.phone || '',
      licenseNumber: data.licenseNumber,
      licenseImage: data.licenseImage,
      vehicleType: data.vehicleType,
      vehiclePlate: data.vehiclePlate,
      status: data.status || 'pending',
      registrationStatus: data.registrationStatus || 'pending',
      onlineStatus: data.onlineStatus || 'offline',
      licenseVerified: data.licenseVerified || false,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      approvedAt: data.approvedAt?.toDate?.()?.toISOString(),
      rejectedReason: data.rejectedReason,
      totalDeliveries: data.totalDeliveries || 0,
      totalEarnings: data.totalEarnings || 0,
      rating: data.rating,
      currentLocation: data.currentLocation,
    };
  });
};

export const getDriverById = async (id: string): Promise<Driver | null> => {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || 'Chưa có tên',
    email: data.email || '',
    phone: data.phone || '',
    licenseNumber: data.licenseNumber,
    licenseImage: data.licenseImage,
    vehicleType: data.vehicleType,
    vehiclePlate: data.vehiclePlate,
    status: data.status || 'pending',
    registrationStatus: data.registrationStatus || 'pending',
    onlineStatus: data.onlineStatus || 'offline',
    licenseVerified: data.licenseVerified || false,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    approvedAt: data.approvedAt?.toDate?.()?.toISOString(),
    rejectedReason: data.rejectedReason,
    totalDeliveries: data.totalDeliveries || 0,
    totalEarnings: data.totalEarnings || 0,
    rating: data.rating,
    currentLocation: data.currentLocation,
  };
};

export const approveDriver = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'users', id), {
    registrationStatus: 'approved',
    status: 'active',
    approvedAt: new Date(),
    licenseVerified: true,
  });
};

export const rejectDriver = async (id: string, reason: string): Promise<void> => {
  await updateDoc(doc(db, 'users', id), {
    registrationStatus: 'rejected',
    status: 'rejected',
    rejectedReason: reason,
  });
};

export const updateDriverStatus = async (id: string, status: Driver['status']): Promise<void> => {
  await updateDoc(doc(db, 'users', id), { status });
};

export const updateDriver = async (id: string, data: Partial<Driver>): Promise<void> => {
  await updateDoc(doc(db, 'users', id), data);
};

export const verifyDriverLicense = async (id: string, verified: boolean): Promise<void> => {
  await updateDoc(doc(db, 'users', id), { licenseVerified: verified });
};


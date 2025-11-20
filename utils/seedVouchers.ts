import { db } from '../config/Firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export const seedVouchers = async () => {
  try {
    await addDoc(collection(db, 'vouchers'), {
      code: 'SHIP20',
      description: 'Giảm 20% cho đơn từ 100.000đ, tối đa 30.000đ',
      discountType: 'percent',
      discountValue: 20,
      minOrder: 100000,
      maxDiscount: 30000,
      expiryDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 ngày nữa
      isActive: true,
    });
    await addDoc(collection(db, 'vouchers'), {
      code: 'FREESHIP',
      description: 'Giảm 15.000đ phí ship cho đơn từ 50.000đ',
      discountType: 'amount',
      discountValue: 15000,
      minOrder: 50000,
      maxDiscount: 15000,
      expiryDate: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 ngày nữa
      isActive: true,
    });
    alert('Tạo voucher mẫu thành công!');
  } catch (e) {
    alert('Lỗi tạo voucher: ' + e);
  }
};
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

interface Voucher {
  id: string;
  code: string;
  description: string;
  discount: number;
  minOrder: number;
  maxDiscount: number;
  expiryDate: Date;
  isUsed: boolean;
}

const VouchersScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const vouchersRef = collection(db, 'vouchers');
      const q = query(vouchersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const voucherList: Voucher[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        voucherList.push({
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate.toDate(),
        } as Voucher);
      });

      // Sort by expiry date and used status
      setVouchers(voucherList.sort((a, b) => {
        if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
        return a.expiryDate.getTime() - b.expiryDate.getTime();
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách voucher');
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const renderVoucher = ({ item }: { item: Voucher }) => (
    <View style={[styles.voucherCard, item.isUsed && styles.voucherCardUsed]}>
      <View style={styles.voucherLeft}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            Giảm {formatCurrency(item.discount)}
          </Text>
        </View>
      </View>
      <View style={styles.voucherDivider} />
      <View style={styles.voucherRight}>
        <Text style={styles.voucherCode}>{item.code}</Text>
        <Text style={styles.voucherDescription}>{item.description}</Text>
        <View style={styles.voucherFooter}>
          <Text style={styles.voucherCondition}>
            Đơn tối thiểu {formatCurrency(item.minOrder)}
          </Text>
          <Text style={styles.voucherExpiry}>
            HSD: {formatDate(item.expiryDate)}
          </Text>
        </View>
        {item.isUsed && (
          <View style={styles.usedOverlay}>
            <Text style={styles.usedText}>Đã sử dụng</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vouchers}
        renderItem={renderVoucher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có voucher nào</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ee4d2d',
  },
  voucherCardUsed: {
    borderColor: '#ccc',
    opacity: 0.8,
  },
  voucherLeft: {
    width: 100,
    padding: 12,
    backgroundColor: '#fff4f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: '#ee4d2d',
    padding: 8,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  voucherDivider: {
    width: 1,
    backgroundColor: '#ee4d2d',
  },
  voucherRight: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  voucherCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherCondition: {
    fontSize: 12,
    color: '#666',
  },
  voucherExpiry: {
    fontSize: 12,
    color: '#ee4d2d',
  },
  usedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usedText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default VouchersScreen; 
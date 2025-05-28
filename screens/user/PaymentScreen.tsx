import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  name: string;
  number: string;
  isDefault: boolean;
  icon: string;
}

const PaymentScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const paymentsRef = collection(db, 'payment_methods');
      const q = query(paymentsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const methods: PaymentMethod[] = [];
      querySnapshot.forEach((doc) => {
        methods.push({ id: doc.id, ...doc.data() } as PaymentMethod);
      });

      setPaymentMethods(methods.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
      setLoading(false);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Lỗi', 'Không thể tải phương thức thanh toán');
      setLoading(false);
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa phương thức thanh toán này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'payment_methods', paymentId));
              setPaymentMethods(prev => prev.filter(method => method.id !== paymentId));
              Alert.alert('Thành công', 'Đã xóa phương thức thanh toán');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Lỗi', 'Không thể xóa phương thức thanh toán');
            }
          },
        },
      ]
    );
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentInfo}>
        <Image source={{ uri: item.icon }} style={styles.paymentIcon} />
        <View>
          <Text style={styles.paymentName}>{item.name}</Text>
          <Text style={styles.paymentNumber}>
            {item.type === 'card' ? '****' : ''} {item.number.slice(-4)}
          </Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Mặc định</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePayment(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#666" />
      </TouchableOpacity>
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
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có phương thức thanh toán</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => Alert.alert('Thông báo', 'Tính năng đang được phát triển')}
      >
        <Text style={styles.addButtonText}>Thêm phương thức thanh toán</Text>
      </TouchableOpacity>
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
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
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
  addButton: {
    backgroundColor: '#ee4d2d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentScreen; 
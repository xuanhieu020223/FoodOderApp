import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

const statusSteps = [
  'Đến lấy hàng',
  'Đã lấy hàng',
  'Đang giao',
  'Giao thành công',
];

const statusMap = {
  pending: 'Mới',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Giao thành công',
  cancelled: 'Đã hủy',
};

const ShipperOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      // Lấy đơn chưa có shipper hoặc đã nhận bởi shipper hiện tại
      const q = query(
        ordersRef,
        where('status', 'in', ['pending', 'confirmed', 'preparing', 'shipping']),
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (!d.shipperId || d.shipperId === user?.uid) {
          data.push({ id: docSnap.id, ...d });
        }
      });
      setOrders(data);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải đơn hàng');
    }
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { shipperId: user?.uid, status: 'shipping' });
      fetchOrders();
      Alert.alert('Đã nhận đơn', 'Bạn đã nhận đơn hàng thành công.');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể nhận đơn');
    }
  };
  const handleNextStatus = async (order: any) => {
    const statusArr = ['shipping', 'delivered'];
    const idx = statusArr.indexOf(order.status);
    if (idx < statusArr.length - 1) {
      try {
        await updateDoc(doc(db, 'orders', order.id), { status: statusArr[idx + 1] });
        fetchOrders();
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
      }
    }
  };
  const handleContact = (phone: string) => {
    Alert.alert('Liên hệ', `Gọi số: ${phone}`);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Đơn hàng</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>#{item.id} - {item.customerName || item.userId}</Text>
            <Text>Địa chỉ: {item.address}</Text>
            <Text>Giá cước: {item.totalAmount?.toLocaleString()} đ</Text>
            <Text>Trạng thái: <Text style={{ color: '#ee4d2d', fontWeight: 'bold' }}>{statusMap[String(item.status) as keyof typeof statusMap] || item.status}</Text></Text>
            {!item.shipperId ? (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                <Text style={styles.btnText}>Nhận đơn</Text>
              </TouchableOpacity>
            ) : item.status !== 'delivered' ? (
              <TouchableOpacity style={styles.nextBtn} onPress={() => handleNextStatus(item)}>
                <Text style={styles.btnText}>Cập nhật trạng thái</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleContact(item.customerPhone)}>
                <Text style={styles.link}>Gọi khách</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleContact(item.restaurantPhone || '')}>
                <Text style={styles.link}>Gọi nhà hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        style={{ width: '100%' }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Không có đơn hàng nào</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, marginBottom: 16, elevation: 2 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  acceptBtn: { backgroundColor: '#2e7d32', padding: 10, borderRadius: 6, marginTop: 8 },
  nextBtn: { backgroundColor: '#ee4d2d', padding: 10, borderRadius: 6, marginTop: 8 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { color: '#1976d2', marginHorizontal: 8, marginTop: 8 },
});

export default ShipperOrdersScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons } from '@expo/vector-icons';

const STATUS_LABELS: any = {
  waiting: 'Chờ nhận đơn',
  accepted: 'Đã nhận đơn',
  picking: 'Đang lấy hàng',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
};

const STATUS_COLORS: any = {
  waiting: '#888',
  accepted: '#1976d2',
  picking: '#fbc02d',
  delivering: '#ee4d2d',
  delivered: '#2e7d32',
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
        where('status', 'in', ['waiting', 'accepted', 'picking', 'delivering']),
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        // Hiển thị đơn chưa có shipper hoặc của shipper hiện tại
        if (!d.shipperId || d.shipperId === user?.uid) {
          data.push({ id: docSnap.id, ...d });
        }
      });
      setOrders(data);
    } catch (e) {
      setOrders([]);
    }
    setLoading(false);
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        shipperId: user?.uid,
        status: 'accepted',
        acceptedAt: new Date(),
      });
      fetchOrders();
      Alert.alert('Thành công', 'Bạn đã nhận đơn!');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể nhận đơn.');
    }
  };

  const updateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        [`${nextStatus}At`]: new Date(),
      });
      fetchOrders();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  };

  const getNextStatus = (status: string) => {
    switch (status) {
      case 'accepted': return 'picking';
      case 'picking': return 'delivering';
      case 'delivering': return 'delivered';
      default: return null;
    }
  };

  const renderActions = (item: any) => {
    if (!item.shipperId) {
      return (
        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(item.id)}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.acceptText}>Nhận đơn</Text>
        </TouchableOpacity>
      );
    }
    if (item.shipperId === user?.uid && item.status !== 'delivered') {
      const nextStatus = getNextStatus(item.status);
      if (nextStatus) {
        let label = '';
        if (nextStatus === 'picking') label = 'Đến lấy hàng';
        if (nextStatus === 'delivering') label = 'Đã lấy hàng';
        if (nextStatus === 'delivered') label = 'Giao thành công';
        return (
          <TouchableOpacity style={styles.statusBtn} onPress={() => updateStatus(item.id, nextStatus)}>
            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            <Text style={styles.statusText}>{label}</Text>
          </TouchableOpacity>
        );
      }
    }
    return null;
  };

  const callPhone = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
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
            <View style={styles.row}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>{STATUS_LABELS[item.status]}</Text>
            </View>
            <Text style={styles.address}>Nhà hàng: {item.restaurantName}</Text>
            <Text style={styles.address}>Địa chỉ lấy: {item.restaurantAddress}</Text>
            <Text style={styles.address}>Khách: {item.customerName}</Text>
            <Text style={styles.address}>Địa chỉ giao: {item.address}</Text>
            <Text style={styles.amount}>Giá cước: {item.totalAmount?.toLocaleString()} đ</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => callPhone(item.restaurantPhone)}>
                <Ionicons name="call" size={20} color="#1976d2" />
                <Text style={styles.iconText}>Nhà hàng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => callPhone(item.customerPhone)}>
                <Ionicons name="call" size={20} color="#ee4d2d" />
                <Text style={styles.iconText}>Khách</Text>
              </TouchableOpacity>
              {renderActions(item)}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Không có đơn hàng nào</Text>}
        refreshing={loading}
        onRefresh={fetchOrders}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#ee4d2d', marginBottom: 12 },
  card: { backgroundColor: '#fff7f3', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold', fontSize: 16, color: '#222' },
  status: { fontWeight: 'bold', fontSize: 15 },
  address: { fontSize: 14, color: '#444', marginTop: 2 },
  amount: { fontWeight: 'bold', color: '#2e7d32', fontSize: 16, marginTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  iconText: { marginLeft: 4, fontSize: 13, color: '#222' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ee4d2d', padding: 8, borderRadius: 8 },
  acceptText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976d2', padding: 8, borderRadius: 8 },
  statusText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
});

export default ShipperOrdersScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const STATUS_LABELS: any = {
  waiting: 'Chờ nhận đơn',
  accepted: 'Đã nhận đơn',
  picking: 'Đang lấy hàng',
  delivering: 'Đang giao',
  shipping: 'Đã được gán',
  delivered: 'Đã giao',
};

const STATUS_COLORS: any = {
  waiting: '#888',
  accepted: '#1976d2',
  picking: '#fbc02d',
  delivering: '#ee4d2d',
  shipping: '#9C27B0',
  delivered: '#2e7d32',
};

const ShipperOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchOrders();
    // Setup real-time listener
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['waiting', 'accepted', 'picking', 'delivering', 'shipping']),
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        // Hiển thị đơn chưa có shipper, đã được gán cho shipper này, hoặc của shipper hiện tại
        if (!d.shipperId || d.shipperId === user?.uid) {
          data.push({ id: docSnap.id, ...d });
        }
      });
      setOrders(data);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      // Lấy đơn chưa có shipper, đã được gán (shipping), hoặc đã nhận bởi shipper hiện tại
      const q = query(
        ordersRef,
        where('status', 'in', ['waiting', 'accepted', 'picking', 'delivering', 'shipping']),
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
      console.error('Error fetching orders:', e);
      setOrders([]);
    }
    setLoading(false);
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      // Check if order is already taken
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        if (orderData.shipperId && orderData.shipperId !== user?.uid) {
          Alert.alert('Thông báo', 'Đơn hàng này đã được shipper khác nhận');
          return;
        }
      }

      await updateDoc(orderRef, {
        shipperId: user?.uid,
        status: 'accepted',
        acceptedAt: new Date(),
      });
      Alert.alert('Thành công', 'Bạn đã nhận đơn!');
    } catch (e) {
      console.error('Error accepting order:', e);
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
      case 'shipping': return 'accepted'; // Khi nhận đơn từ nhà hàng
      case 'accepted': return 'picking';
      case 'picking': return 'delivering';
      case 'delivering': return 'delivered';
      default: return null;
    }
  };

  const renderActions = (item: any) => {
    // Nếu đơn chưa có shipper hoặc đã được gán cho shipper này (status = shipping)
    if (!item.shipperId || (item.status === 'shipping' && item.shipperId === user?.uid)) {
      return (
        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(item.id)}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.acceptText}>
            {item.status === 'shipping' ? 'Xác nhận nhận đơn' : 'Nhận đơn'}
          </Text>
        </TouchableOpacity>
      );
    }
    // Nếu đơn đã được shipper này nhận
    if (item.shipperId === user?.uid && item.status !== 'delivered') {
      const nextStatus = getNextStatus(item.status);
      if (nextStatus) {
        let label = '';
        let icon = 'arrow-forward-circle';
        if (nextStatus === 'accepted') {
          label = 'Xác nhận nhận đơn';
          icon = 'checkmark-circle';
        } else if (nextStatus === 'picking') {
          label = 'Đến lấy hàng';
          icon = 'location';
        } else if (nextStatus === 'delivering') {
          label = 'Đã lấy hàng';
          icon = 'bicycle';
        } else if (nextStatus === 'delivered') {
          label = 'Giao thành công';
          icon = 'checkmark-done-circle';
        }
        return (
          <TouchableOpacity style={styles.statusBtn} onPress={() => updateStatus(item.id, nextStatus)}>
            <Ionicons name={icon as any} size={20} color="#fff" />
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

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  const pendingOrders = orders.filter(o => !o.shipperId || o.status === 'shipping');
  const myOrders = orders.filter(o => o.shipperId === user?.uid && o.status !== 'shipping');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="delivery-dining" size={24} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Đơn hàng</Text>
            <Text style={styles.headerSubtitle}>Quản lý đơn giao hàng</Text>
          </View>
        </View>
      </View>

      {pendingOrders.length > 0 && (
        <View style={styles.sectionHeader}>
          <MaterialIcons name="schedule" size={20} color="#ee4d2d" />
          <Text style={styles.sectionTitle}>Đơn chờ nhận ({pendingOrders.length})</Text>
        </View>
      )}

      <FlatList
        data={pendingOrders}
        keyExtractor={item => `pending-${item.id}`}
        renderItem={({ item }) => (
          <View style={[styles.card, styles.pendingCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.orderInfo}>
                <MaterialIcons name="receipt" size={20} color="#ee4d2d" />
                <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#888' }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <MaterialIcons name="store" size={18} color="#666" />
                <Text style={styles.infoText}>{item.restaurantName || 'Nhà hàng'}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={18} color="#666" />
                <Text style={styles.infoText} numberOfLines={2}>
                  Lấy: {item.restaurantAddress || item.address || 'Chưa có địa chỉ'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={18} color="#666" />
                <Text style={styles.infoText}>{item.customerName || item.fullName || 'Khách hàng'}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="place" size={18} color="#ee4d2d" />
                <Text style={styles.infoText} numberOfLines={2}>
                  Giao: {item.address || 'Chưa có địa chỉ'}
                </Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <MaterialIcons name="attach-money" size={20} color="#2e7d32" />
              <Text style={styles.amount}>Phí giao: {item.totalAmount?.toLocaleString('vi-VN')} đ</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => callPhone(item.restaurantPhone || item.phone)}
              >
                <Ionicons name="call" size={18} color="#1976d2" />
                <Text style={styles.iconText}>Nhà hàng</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => callPhone(item.customerPhone || item.phone)}
              >
                <Ionicons name="call" size={18} color="#ee4d2d" />
                <Text style={styles.iconText}>Khách</Text>
              </TouchableOpacity>
              {renderActions(item)}
            </View>
          </View>
        )}
        ListEmptyComponent={null}
        refreshing={loading}
        onRefresh={fetchOrders}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} />}
      />

      {myOrders.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-shipping" size={20} color="#1976d2" />
            <Text style={styles.sectionTitle}>Đơn của tôi ({myOrders.length})</Text>
          </View>
          <FlatList
            data={myOrders}
            keyExtractor={item => `my-${item.id}`}
            renderItem={({ item }) => (
              <View style={[styles.card, styles.myCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <MaterialIcons name="receipt" size={20} color="#1976d2" />
                    <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#888' }]}>
                    <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
                  </View>
                </View>
                
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="store" size={18} color="#666" />
                    <Text style={styles.infoText}>{item.restaurantName || 'Nhà hàng'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={2}>
                      Lấy: {item.restaurantAddress || item.address || 'Chưa có địa chỉ'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={18} color="#666" />
                    <Text style={styles.infoText}>{item.customerName || item.fullName || 'Khách hàng'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="place" size={18} color="#ee4d2d" />
                    <Text style={styles.infoText} numberOfLines={2}>
                      Giao: {item.address || 'Chưa có địa chỉ'}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <MaterialIcons name="attach-money" size={20} color="#2e7d32" />
                  <Text style={styles.amount}>Phí giao: {item.totalAmount?.toLocaleString('vi-VN')} đ</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={() => callPhone(item.restaurantPhone || item.phone)}
                  >
                    <Ionicons name="call" size={18} color="#1976d2" />
                    <Text style={styles.iconText}>Nhà hàng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={() => callPhone(item.customerPhone || item.phone)}
                  >
                    <Ionicons name="call" size={18} color="#ee4d2d" />
                    <Text style={styles.iconText}>Khách</Text>
                  </TouchableOpacity>
                  {renderActions(item)}
                </View>
              </View>
            )}
            ListEmptyComponent={null}
            refreshing={loading}
            onRefresh={fetchOrders}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </>
      )}

      {orders.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
          <Text style={styles.emptySubtext}>Kéo xuống để làm mới</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ee4d2d',
  },
  myCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 12,
  },
  amount: {
    fontWeight: 'bold',
    color: '#2e7d32',
    fontSize: 16,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  iconText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  acceptText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default ShipperOrdersScreen;

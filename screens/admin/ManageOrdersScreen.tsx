import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { collection, query, getDocs, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/Firebase';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
};

type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: any;
  note?: string;
  shipperId?: string;
  paymentMethod?: string;
};

type Shipper = {
  id: string;
  username: string;
};

const OrderStatusText: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const OrderStatusColor: Record<OrderStatus, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#9C27B0',
  shipping: '#00BCD4',
  delivered: '#4CAF50',
  cancelled: '#f44336',
};

const OrderStatusIcon: Record<OrderStatus, keyof typeof MaterialIcons.glyphMap> = {
  pending: 'schedule',
  confirmed: 'check-circle',
  preparing: 'restaurant',
  shipping: 'delivery-dining',
  delivered: 'done-all',
  cancelled: 'cancel',
};

const ManageOrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [assignShipperModalVisible, setAssignShipperModalVisible] = useState(false);

  useEffect(() => {
    loadOrders();
    loadShippers();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const ordersData: Order[] = [];
      
      for (const doc of querySnapshot.docs) {
        const orderData = doc.data();
        
        // Sửa lại cách lấy thông tin khách hàng
        ordersData.push({
          id: doc.id,
          userId: orderData.userId || '',
          customerName: orderData.fullName || orderData.customerName || 'Không có tên', // Thêm fullName
          customerPhone: orderData.phone || orderData.customerPhone || 'Không có SĐT', // Thêm phone
          address: orderData.address || orderData.shippingAddress || 'Không có địa chỉ',
          items: orderData.items || [],
          totalAmount: orderData.totalAmount || 0,
          status: orderData.status || 'pending',
          createdAt: orderData.createdAt,
          note: orderData.note,
          shipperId: orderData.shipperId,
          paymentMethod: orderData.paymentMethod
        } as Order);
      }
      
      console.log('Loaded orders:', ordersData); // Log để debug
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadShippers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'shipper'));
      const querySnapshot = await getDocs(q);
      
      const shippersData: Shipper[] = [];
      querySnapshot.forEach((doc) => {
        shippersData.push({ id: doc.id, username: doc.data().username });
      });
      
      setShippers(shippersData);
    } catch (error) {
      console.error('Error loading shippers:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách shipper');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng');
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const handleAssignShipper = async (orderId: string, shipperId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        shipperId,
        status: 'shipping'
      });
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, shipperId, status: 'shipping' } : order
      ));
      
      Alert.alert('Thành công', 'Đã gán đơn hàng cho shipper');
    } catch (error) {
      console.error('Error assigning shipper:', error);
      Alert.alert('Lỗi', 'Không thể gán đơn hàng cho shipper');
    }
  };

  const getStatusActions = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case 'pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['preparing', 'cancelled'];
      case 'preparing':
        return ['shipping', 'cancelled'];
      case 'shipping':
        return ['delivered', 'cancelled'];
      default:
        return [];
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) return 'Không có ngày';
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString('vi-VN');
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString('vi-VN');
      }
      return 'Không có ngày';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Không có ngày';
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Đơn #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderTime}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: OrderStatusColor[item.status] }]}>
          <MaterialIcons name={OrderStatusIcon[item.status]} size={16} color="#fff" />
          <Text style={styles.statusText}>{OrderStatusText[item.status] || 'Không xác định'}</Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.customerDetail}>
          <MaterialIcons name="person" size={16} color="#666" />
          <Text style={styles.customerText} numberOfLines={1}>
            {item.customerName || 'Không có tên'}
          </Text>
        </View>
        <View style={styles.customerDetail}>
          <MaterialIcons name="phone" size={16} color="#666" />
          <Text style={styles.customerText} numberOfLines={1}>
            {item.customerPhone || 'Không có SĐT'}
          </Text>
        </View>
      </View>

      <View style={styles.addressInfo}>
        <MaterialIcons name="location-on" size={16} color="#666" />
        <Text style={styles.addressText} numberOfLines={2}>
          {item.address || 'Không có địa chỉ'}
        </Text>
      </View>

      <View style={styles.orderSummary}>
        <Text style={styles.itemCount}>
          {(item.items || []).length} món • {formatDate(item.createdAt)}
        </Text>
        <Text style={styles.totalAmount}>
          {(item.totalAmount || 0).toLocaleString('vi-VN')}đ
        </Text>
      </View>
    </TouchableOpacity>
  );

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedOrder(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn #{selectedOrder.id.slice(0, 8)}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedOrder(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.section, styles.statusSection]}>
                <View style={[styles.statusBadge, { backgroundColor: OrderStatusColor[selectedOrder.status] }]}>
                  <MaterialIcons name={OrderStatusIcon[selectedOrder.status]} size={20} color="#fff" />
                  <Text style={styles.statusText}>{OrderStatusText[selectedOrder.status] || 'Không xác định'}</Text>
                </View>
                <Text style={styles.orderTime}>
                  Đặt lúc: {formatDate(selectedOrder.createdAt)}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
                <View style={styles.infoRow}>
                  <MaterialIcons name="person" size={20} color="#666" />
                  <Text style={styles.infoText}>{selectedOrder.customerName || 'Không có tên'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.infoRow}
                  onPress={() => {
                    // Handle phone call
                  }}
                >
                  <MaterialIcons name="phone" size={20} color="#2196F3" />
                  <Text style={[styles.infoText, { color: '#2196F3' }]}>
                    {selectedOrder.customerPhone || 'Không có SĐT'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={20} color="#666" />
                  <Text style={styles.infoText}>{selectedOrder.address || 'Không có địa chỉ'}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Danh sách món</Text>
                {(selectedOrder.items || []).map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name || 'Không có tên'}</Text>
                      <Text style={styles.itemQuantity}>x{item.quantity || 0}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {((item.price || 0) * (item.quantity || 0)).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>
                    {(selectedOrder.totalAmount || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>

              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Thao tác</Text>
                  <View style={styles.actionButtons}>
                    {selectedOrder.status === 'confirmed' && (
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={handleAssignShipperPress}
                      >
                        <MaterialIcons name="delivery-dining" size={20} color="#fff" />
                        <Text style={styles.assignButtonText}>Gán shipper</Text>
                      </TouchableOpacity>
                    )}
                    {getStatusActions(selectedOrder.status).map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          { backgroundColor: OrderStatusColor[status] }
                        ]}
                        onPress={() => handleUpdateStatus(selectedOrder.id, status)}
                      >
                        <MaterialIcons 
                          name={OrderStatusIcon[status]} 
                          size={20} 
                          color="#fff" 
                          style={styles.statusButtonIcon}
                        />
                        <Text style={styles.statusButtonText}>
                          {OrderStatusText[status]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadOrders(), loadShippers()]);
    setRefreshing(false);
  };

  const handleAssignShipperPress = () => {
    if (shippers.length === 0) {
      Alert.alert('Thông báo', 'Không có shipper nào khả dụng');
      return;
    }
    setAssignShipperModalVisible(true);
  };

  const AssignShipperModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={assignShipperModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignShipperModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn shipper</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setAssignShipperModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.shipperList}>
              {shippers.map((shipper) => (
                <TouchableOpacity
                  key={shipper.id}
                  style={styles.shipperItem}
                  onPress={() => {
                    handleAssignShipper(selectedOrder.id, shipper.id);
                    setAssignShipperModalVisible(false);
                  }}
                >
                  <View style={styles.shipperInfo}>
                    <MaterialIcons name="person" size={24} color="#666" />
                    <Text style={styles.shipperName}>{shipper.username}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.status === statusFilter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity 
            style={[
              styles.filterButton,
              statusFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[
              styles.filterText,
              statusFilter === 'all' && styles.filterTextActive
            ]}>Tất cả</Text>
          </TouchableOpacity>
          {Object.entries(OrderStatusText).map(([key, value]) => (
            <TouchableOpacity 
              key={key}
              style={[
                styles.filterButton,
                statusFilter === key && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(key as OrderStatus)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === key && styles.filterTextActive
              ]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {statusFilter === 'all' 
                ? 'Chưa có đơn hàng nào'
                : `Không có đơn hàng ${OrderStatusText[statusFilter].toLowerCase()}`
              }
            </Text>
          </View>
        )}
      />

      <OrderDetailsModal />
      <AssignShipperModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ee4d2d',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterScroll: {
    paddingHorizontal: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#ee4d2d',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  itemPrice: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  statusButtonIcon: {
    marginRight: 5,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  shipperList: {
    maxHeight: 400,
  },
  shipperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shipperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shipperName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  assignButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
});

export default ManageOrdersScreen; 
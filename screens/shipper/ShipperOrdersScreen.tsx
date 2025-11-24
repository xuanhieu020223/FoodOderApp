import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, Linking, RefreshControl, Modal, ScrollView, TextInput, Image 
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const STATUS_LABELS: any = {
  waiting: 'Chờ nhận đơn',
  accepted: 'Đã nhận đơn',
  picking: 'Đang lấy hàng',
  delivering: 'Đang giao',
  shipping: 'Đã được gán',
  delivered: 'Đã giao',
};

const STATUS_COLORS: any = {
  waiting: '#FF9800',
  accepted: '#2196F3',
  picking: '#FFC107',
  delivering: '#F44336',
  shipping: '#9C27B0',
  delivered: '#4CAF50',
};

const STATUS_ICONS: any = {
  waiting: 'schedule',
  accepted: 'check-circle',
  picking: 'store',
  delivering: 'local-shipping',
  shipping: 'assignment',
  delivered: 'check-circle',
};

const ShipperOrdersScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'my'>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchOrders();
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['waiting', 'accepted', 'picking', 'delivering', 'shipping']),
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
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

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, selectedFilter]);

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by type
    if (selectedFilter === 'pending') {
      filtered = filtered.filter(o => !o.shipperId || o.status === 'shipping');
    } else if (selectedFilter === 'my') {
      filtered = filtered.filter(o => o.shipperId === user?.uid && o.status !== 'shipping');
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(query) ||
        (o.restaurantName || '').toLowerCase().includes(query) ||
        (o.customerName || o.fullName || '').toLowerCase().includes(query) ||
        (o.address || '').toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['waiting', 'accepted', 'picking', 'delivering', 'shipping']),
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
      console.error('Error fetching orders:', e);
      setOrders([]);
    }
    setLoading(false);
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
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
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  };

  const getNextStatus = (status: string) => {
    switch (status) {
      case 'shipping': return 'accepted';
      case 'accepted': return 'picking';
      case 'picking': return 'delivering';
      case 'delivering': return 'delivered';
      default: return null;
    }
  };

  const renderActions = (item: any) => {
    if (!item.shipperId || (item.status === 'shipping' && item.shipperId === user?.uid)) {
      return (
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]} 
          onPress={() => acceptOrder(item.id)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {item.status === 'shipping' ? 'Xác nhận nhận đơn' : 'Nhận đơn'}
          </Text>
        </TouchableOpacity>
      );
    }
    
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
          <TouchableOpacity 
            style={[styles.actionButton, styles.statusButton]} 
            onPress={() => updateStatus(item.id, nextStatus)}
          >
            <Ionicons name={icon as any} size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{label}</Text>
          </TouchableOpacity>
        );
      }
    }
    return null;
  };

  const callPhone = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsModalVisible(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Chưa có';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Chưa có';
    }
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const isPending = !item.shipperId || item.status === 'shipping';
    const isMyOrder = item.shipperId === user?.uid && item.status !== 'shipping';

    return (
      <TouchableOpacity 
        style={[styles.orderCard, isPending && styles.pendingCard, isMyOrder && styles.myCard]}
        onPress={() => openOrderDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIdContainer}>
            <View style={styles.orderIdIcon}>
              <MaterialIcons name="receipt" size={20} color="#fff" />
            </View>
            <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#888' }]}>
            <MaterialIcons 
              name={STATUS_ICONS[item.status] || 'info'} 
              size={14} 
              color="#fff" 
              style={{ marginRight: 4 }}
            />
            <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons name="store" size={18} color="#FF6B35" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nhà hàng</Text>
              <Text style={styles.infoValue}>{item.restaurantName || 'Chưa có tên'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons name="location-on" size={18} color="#4A90E2" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Điểm lấy</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.restaurantAddress || item.address || 'Chưa có địa chỉ'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons name="person" size={18} color="#7B68EE" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Khách hàng</Text>
              <Text style={styles.infoValue}>{item.customerName || item.fullName || 'Chưa có tên'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons name="place" size={18} color="#F44336" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Điểm giao</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.address || 'Chưa có địa chỉ'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <MaterialIcons name="attach-money" size={20} color="#4CAF50" />
            <Text style={styles.amountLabel}>Phí giao hàng:</Text>
            <Text style={styles.amountValue}>{item.totalAmount?.toLocaleString('vi-VN') || '0'} đ</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => callPhone(item.restaurantPhone || item.phone)}
          >
            <Ionicons name="call" size={16} color="#4A90E2" />
            <Text style={styles.contactButtonText}>Nhà hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.contactButton, styles.customerButton]}
            onPress={() => callPhone(item.customerPhone || item.phone)}
          >
            <Ionicons name="call" size={16} color="#F44336" />
            <Text style={[styles.contactButtonText, { color: '#F44336' }]}>Khách</Text>
          </TouchableOpacity>
          {(item.status === 'accepted' || item.status === 'picking' || item.status === 'delivering' || item.status === 'shipping') && item.shipperId === user?.uid && (
            <TouchableOpacity
              style={[styles.contactButton, styles.trackButton]}
              onPress={() => {
                navigation.navigate('OrderTracking' as never, { orderId: item.id, userRole: 'shipper' } as never);
              }}
            >
              <Ionicons name="map" size={16} color="#fff" />
              <Text style={[styles.contactButtonText, { color: '#fff' }]}>Bản đồ</Text>
            </TouchableOpacity>
          )}
          {renderActions(item)}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  const pendingOrders = filteredOrders.filter(o => !o.shipperId || o.status === 'shipping');
  const myOrders = filteredOrders.filter(o => o.shipperId === user?.uid && o.status !== 'shipping');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="delivery-dining" size={28} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Đơn hàng</Text>
            <Text style={styles.headerSubtitle}>Quản lý đơn giao hàng</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đơn hàng..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>
              Tất cả ({filteredOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'pending' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'pending' && styles.filterTabTextActive]}>
              Chờ nhận ({pendingOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'my' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('my')}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'my' && styles.filterTabTextActive]}>
              Của tôi ({myOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={selectedFilter === 'all' ? filteredOrders : selectedFilter === 'pending' ? pendingOrders : myOrders}
        keyExtractor={item => item.id}
        renderItem={renderOrderCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={80} color="#ddd" />
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Kéo xuống để làm mới'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedOrder && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin đơn hàng</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mã đơn:</Text>
                      <Text style={styles.detailValue}>#{selectedOrder.id.slice(-8).toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trạng thái:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedOrder.status] }]}>
                        <Text style={styles.statusText}>{STATUS_LABELS[selectedOrder.status]}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Thời gian:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Nhà hàng</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tên:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.restaurantName || 'Chưa có'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Địa chỉ:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.restaurantAddress || 'Chưa có'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>SĐT:</Text>
                      <TouchableOpacity onPress={() => callPhone(selectedOrder.restaurantPhone)}>
                        <Text style={[styles.detailValue, styles.phoneLink]}>
                          {selectedOrder.restaurantPhone || 'Chưa có'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Khách hàng</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tên:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.customerName || selectedOrder.fullName || 'Chưa có'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Địa chỉ giao:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.address || 'Chưa có'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>SĐT:</Text>
                      <TouchableOpacity onPress={() => callPhone(selectedOrder.customerPhone)}>
                        <Text style={[styles.detailValue, styles.phoneLink]}>
                          {selectedOrder.customerPhone || 'Chưa có'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Danh sách món</Text>
                      {selectedOrder.items.map((item: any, index: number) => (
                        <View key={index} style={styles.orderItemRow}>
                          <View style={styles.orderItemInfo}>
                            {item.imageUrl && (
                              <Image source={{ uri: item.imageUrl }} style={styles.orderItemImage} />
                            )}
                            <View style={styles.orderItemDetails}>
                              <Text style={styles.orderItemName}>{item.name || 'Món ăn'}</Text>
                              <Text style={styles.orderItemQuantity}>Số lượng: x{item.quantity || 0}</Text>
                            </View>
                          </View>
                          <Text style={styles.orderItemPrice}>
                            {((item.price || 0) * (item.quantity || 0)).toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ))}
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tổng cộng:</Text>
                        <Text style={styles.totalValue}>
                          {selectedOrder.totalAmount?.toLocaleString('vi-VN') || '0'} đ
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedOrder.note && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                      <Text style={styles.noteText}>{selectedOrder.note}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
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
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#ee4d2d',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  pendingCard: {
    borderLeftColor: '#FF9800',
  },
  myCard: {
    borderLeftColor: '#2196F3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ee4d2d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    marginBottom: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
  },
  amountValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
    fontSize: 18,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  customerButton: {
    backgroundColor: '#FFEBEE',
  },
  trackButton: {
    backgroundColor: '#00BCD4',
  },
  contactButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  acceptButton: {
    backgroundColor: '#ee4d2d',
  },
  statusButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  phoneLink: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
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
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    backgroundColor: '#ee4d2d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackButtonModal: {
    backgroundColor: '#00BCD4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShipperOrdersScreen;

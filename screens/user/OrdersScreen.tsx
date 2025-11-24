import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { useNavigation } from '@react-navigation/native';
import FloatingChatButton from '../../components/FloatingChatButton';

type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

interface Order {
  id: string;
  userId: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantImage?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Timestamp;
  note?: string;
  address: string;
  rating?: number;
  review?: string;
  deliveryFee?: number;
  voucherDiscount?: number;
  subtotal?: number;
}

const DEFAULT_RESTAURANT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png';

const OrdersScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const tabs = [
    { id: 'all', label: 'Tất cả', count: 0 },
    { id: 'pending', label: 'Chờ xác nhận', count: 0 },
    { id: 'processing', label: 'Đang chuẩn bị', count: 0 },
    { id: 'shipping', label: 'Đang giao', count: 0 },
    { id: 'delivered', label: 'Đã giao', count: 0 },
    { id: 'cancelled', label: 'Đã hủy', count: 0 },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const ordersData: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        ordersData.push({
          id: doc.id,
          ...doc.data(),
        } as Order);
      });
      
      setOrders(ordersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled'
      });

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      ));

      Alert.alert('Thành công', 'Đã hủy đơn hàng');
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;

    try {
      setSubmittingReview(true);
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        rating,
        review,
      });

      setOrders(orders.map(order =>
        order.id === selectedOrder.id ? { ...order, rating, review } : order
      ));

      setReviewModalVisible(false);
      setSelectedOrder(null);
      setRating(5);
      setReview('');
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'shipping':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'processing':
        return 'Đang chuẩn bị';
      case 'shipping':
        return 'Đang giao';
      case 'delivered':
        return 'Đã giao';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'restaurant-outline';
      case 'shipping':
        return 'bicycle-outline';
      case 'delivered':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const getTrackingSteps = (status: OrderStatus) => {
    const allSteps = [
      { key: 'pending', label: 'Đã đặt hàng', completed: true },
      { key: 'processing', label: 'Đang chuẩn bị', completed: status !== 'pending' },
      { key: 'shipping', label: 'Đang giao', completed: ['shipping', 'delivered'].includes(status) },
      { key: 'delivered', label: 'Đã giao', completed: status === 'delivered' },
    ];

    if (status === 'cancelled') {
      return [
        { key: 'pending', label: 'Đã đặt hàng', completed: true },
        { key: 'cancelled', label: 'Đã hủy', completed: true, isCancelled: true },
      ];
    }

    return allSteps;
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalVisible(true);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const trackingSteps = getTrackingSteps(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => openOrderDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.restaurantInfo}>
            <Image
              source={{ uri: item.restaurantImage || DEFAULT_RESTAURANT_IMAGE }}
              style={styles.restaurantImage}
            />
            <View style={styles.restaurantInfoText}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item.restaurantName || 'Đối tác FoodOrder'}
              </Text>
              <Text style={styles.orderDate}>
                {item.createdAt.toDate().toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={16} color={statusColor} />
            <Text style={[styles.orderStatus, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Tracking Progress */}
        <View style={styles.trackingContainer}>
          {trackingSteps.map((step, index) => (
            <View key={step.key} style={styles.trackingStep}>
              <View style={[
                styles.trackingDot,
                step.completed && styles.trackingDotCompleted,
                step.isCancelled && styles.trackingDotCancelled,
                { backgroundColor: step.completed ? statusColor : '#ddd' }
              ]}>
                {step.completed && !step.isCancelled && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
                {step.isCancelled && (
                  <Ionicons name="close" size={12} color="#fff" />
                )}
              </View>
              {index < trackingSteps.length - 1 && (
                <View style={[
                  styles.trackingLine,
                  step.completed && { backgroundColor: statusColor }
                ]} />
              )}
            </View>
          ))}
          <View style={styles.trackingLabels}>
            {trackingSteps.map((step) => (
              <Text
                key={step.key}
                style={[
                  styles.trackingLabel,
                  step.completed && { color: statusColor, fontWeight: '600' }
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <View key={index} style={styles.orderItem}>
              <Image source={{ uri: orderItem.imageUrl }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{orderItem.name}</Text>
                <Text style={styles.itemQuantity}>x{orderItem.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {(orderItem.price * orderItem.quantity).toLocaleString('vi-VN')} đ
              </Text>
            </View>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItemsText}>
              +{item.items.length - 2} món khác
            </Text>
          )}
        </View>

        {item.note && (
          <View style={styles.noteContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#666" />
            <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalPrice}>
              {item.totalAmount.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>

        <View style={styles.orderActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                Alert.alert(
                  'Xác nhận hủy',
                  'Bạn có chắc chắn muốn hủy đơn hàng này?',
                  [
                    { text: 'Không', style: 'cancel' },
                    { 
                      text: 'Hủy đơn',
                      style: 'destructive',
                      onPress: () => handleCancelOrder(item.id)
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#F44336" />
              <Text style={styles.cancelButtonText}>Hủy đơn</Text>
            </TouchableOpacity>
          )}

          {item.status === 'delivered' && !item.rating && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => {
                setSelectedOrder(item);
                setReviewModalVisible(true);
              }}
            >
              <Ionicons name="star-outline" size={18} color="#fff" />
              <Text style={styles.reviewButtonText}>Đánh giá</Text>
            </TouchableOpacity>
          )}

          {item.status === 'delivered' && item.rating && (
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.rating! ? 'star' : 'star-outline'}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
          )}

          {(item.status === 'shipping' || item.status === 'processing' || item.status === 'delivering') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.trackButton]}
              onPress={() => {
                navigation.navigate('OrderTracking' as never, { orderId: item.id, userRole: 'customer' } as never);
              }}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.trackButtonText}>Theo dõi</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton]}
            onPress={() => openOrderDetails(item)}
          >
            <Text style={styles.detailsButtonText}>Chi tiết</Text>
            <Ionicons name="chevron-forward" size={16} color="#ee4d2d" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  const filteredOrders = orders.filter(order => activeTab === 'all' || order.status === activeTab);
  const tabCounts = tabs.map(tab => ({
    ...tab,
    count: tab.id === 'all' ? orders.length : orders.filter(o => o.status === tab.id).length
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="receipt-long" size={24} color="#ee4d2d" />
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      <View style={styles.tabs}>
        <FlatList
          data={tabCounts}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.id && styles.activeTab,
              ]}
              onPress={() => setActiveTab(item.id as OrderStatus | 'all')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === item.id && styles.activeTabText,
                ]}
              >
                {item.label}
              </Text>
              {item.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  activeTab === item.id && styles.tabBadgeActive
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    activeTab === item.id && styles.tabBadgeTextActive
                  ]}>
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
        />
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-outline" size={80} color="#ddd" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all' 
                ? 'Bạn chưa có đơn hàng nào. Hãy đặt món ngay!'
                : `Chưa có đơn hàng ${tabCounts.find(t => t.id === activeTab)?.label.toLowerCase()}`
              }
            </Text>
          </View>
        )}
      />

      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin đơn hàng</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã đơn:</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.id.slice(0, 8)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngày đặt:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.createdAt.toDate().toLocaleString('vi-VN')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedOrder.status)}15` }]}>
                      <Ionicons name={getStatusIcon(selectedOrder.status) as any} size={14} color={getStatusColor(selectedOrder.status)} />
                      <Text style={[styles.detailValue, { color: getStatusColor(selectedOrder.status) }]}>
                        {getStatusText(selectedOrder.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Địa chỉ giao hàng</Text>
                  <View style={styles.addressContainer}>
                    <Ionicons name="location" size={20} color="#ee4d2d" />
                    <Text style={styles.addressText}>{selectedOrder.address}</Text>
                  </View>
                  {(selectedOrder.status === 'shipping' || selectedOrder.status === 'processing' || selectedOrder.status === 'delivering') && (
                    <TouchableOpacity
                      style={styles.trackButtonInModal}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        navigation.navigate('OrderTracking' as never, { orderId: selectedOrder.id, userRole: 'customer' } as never);
                      }}
                    >
                      <Ionicons name="map" size={18} color="#fff" />
                      <Text style={styles.trackButtonText}>Theo dõi đơn hàng trên bản đồ</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Món đã đặt ({selectedOrder.items.length})</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.detailOrderItem}>
                      <Image source={{ uri: item.imageUrl }} style={styles.detailItemImage} />
                      <View style={styles.detailItemInfo}>
                        <Text style={styles.detailItemName}>{item.name}</Text>
                        <Text style={styles.detailItemQuantity}>Số lượng: {item.quantity}</Text>
                      </View>
                      <Text style={styles.detailItemPrice}>
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  ))}
                </View>

                {selectedOrder.note && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                    <Text style={styles.noteTextFull}>{selectedOrder.note}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Tổng thanh toán</Text>
                  {selectedOrder.subtotal && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tạm tính:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.subtotal.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  )}
                  {selectedOrder.deliveryFee && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phí vận chuyển:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.deliveryFee.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  )}
                  {selectedOrder.voucherDiscount && selectedOrder.voucherDiscount > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Giảm giá:</Text>
                      <Text style={[styles.detailValue, styles.discountValue]}>
                        -{selectedOrder.voucherDiscount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  )}
                  <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Tổng cộng:</Text>
                    <Text style={styles.totalPrice}>
                      {selectedOrder.totalAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đánh giá đơn hàng</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setReviewModalVisible(false);
                  setSelectedOrder(null);
                  setRating(5);
                  setReview('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 5 ? 'Tuyệt vời!' : rating === 4 ? 'Rất tốt!' : rating === 3 ? 'Tốt!' : rating === 2 ? 'Tạm được' : 'Cần cải thiện'}
            </Text>

            <TextInput
              style={styles.reviewInput}
              placeholder="Chia sẻ trải nghiệm của bạn (không bắt buộc)"
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                submittingReview && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <FloatingChatButton />
    </SafeAreaView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tabs: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#ee4d2d',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  ordersList: {
    padding: 16,
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
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  restaurantInfoText: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  trackingContainer: {
    marginBottom: 16,
    paddingVertical: 12,
  },
  trackingStep: {
    alignItems: 'center',
    marginBottom: 4,
  },
  trackingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackingDotCompleted: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  trackingDotCancelled: {
    backgroundColor: '#F44336',
  },
  trackingLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginBottom: 4,
  },
  trackingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  trackingLabel: {
    fontSize: 10,
    color: '#999',
    flex: 1,
    textAlign: 'center',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  orderFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 18,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#FFF0F0',
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: '#ee4d2d',
  },
  reviewButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#F5F7FA',
  },
  detailsButtonText: {
    fontSize: 13,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: '#00BCD4',
  },
  trackButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  detailOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  detailItemQuantity: {
    fontSize: 13,
    color: '#666',
  },
  detailItemPrice: {
    fontSize: 15,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  noteTextFull: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  discountValue: {
    color: '#4CAF50',
  },
  ratingPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    height: 100,
    fontSize: 15,
    marginBottom: 20,
    backgroundColor: '#F5F7FA',
  },
  submitButton: {
    backgroundColor: '#ee4d2d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButtonInModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BCD4',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
});

export default OrdersScreen;

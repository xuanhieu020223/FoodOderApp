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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

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
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Timestamp;
  note?: string;
  address: string;
  rating?: number;
  review?: string;
}

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'processing', label: 'Đang chuẩn bị' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'cancelled', label: 'Đã hủy' },
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
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
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

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Image source={{ uri: item.restaurantImage }} style={styles.restaurantImage} />
          <View>
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
            <Text style={styles.orderDate}>
              {item.createdAt.toDate().toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>
        <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>

      <View style={styles.orderItems}>
        {item.items.map((orderItem, index) => (
          <View key={index} style={styles.orderItem}>
            <Image source={{ uri: orderItem.imageUrl }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{orderItem.name}</Text>
              <Text style={styles.itemQuantity}>x{orderItem.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {orderItem.price.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        ))}
      </View>

      {item.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Ghi chú:</Text>
          <Text style={styles.noteText}>{item.note}</Text>
        </View>
      )}

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Tổng cộng:</Text>
        <Text style={styles.totalPrice}>
          {item.totalAmount.toLocaleString('vi-VN')}đ
        </Text>
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
            <Text style={styles.actionButtonText}>Hủy đơn</Text>
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
            <Text style={[styles.actionButtonText, styles.reviewButtonText]}>
              Đánh giá
            </Text>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      <View style={styles.tabs}>
        <FlatList
          data={tabs}
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
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
        />
      </View>

      <FlatList
        data={orders.filter(order => activeTab === 'all' || order.status === activeTab)}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        )}
      />

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
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Nhập đánh giá của bạn (không bắt buộc)"
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
    </SafeAreaView>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tabs: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#ee4d2d',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '500',
  },
  noteContainer: {
    backgroundColor: '#fff3f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalPrice: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fff0f0',
  },
  reviewButton: {
    backgroundColor: '#ee4d2d',
  },
  reviewButtonText: {
    color: '#fff',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
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
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  ratingPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 100,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#ee4d2d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ffaa99',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrdersScreen; 
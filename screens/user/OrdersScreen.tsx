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
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp, runTransaction, addDoc } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
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
  restaurantRating?: number;
  restaurantReview?: string;
  shipperId?: string;
  shipperRating?: number;
  shipperReview?: string;
  itemRatings?: { [foodId: string]: { rating: number; review?: string } };
  deliveryFee?: number;
  voucherDiscount?: number;
  subtotal?: number;
}

const DEFAULT_RESTAURANT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png';

const OrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [restaurantReview, setRestaurantReview] = useState('');
  const [shipperRating, setShipperRating] = useState(5);
  const [shipperReview, setShipperReview] = useState('');
  const [itemRatings, setItemRatings] = useState<{ [foodId: string]: { rating: number; review?: string } }>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [ratingType, setRatingType] = useState<'overall' | 'restaurant' | 'shipper' | 'items'>('overall');

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
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;

    try {
      setSubmittingReview(true);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (ratingType === 'overall') {
        updateData.rating = rating;
        updateData.review = review;
      } else if (ratingType === 'restaurant') {
        updateData.restaurantRating = restaurantRating;
        updateData.restaurantReview = restaurantReview;
      } else if (ratingType === 'shipper') {
        updateData.shipperRating = shipperRating;
        updateData.shipperReview = shipperReview;
      } else if (ratingType === 'items') {
        updateData.itemRatings = {
          ...(selectedOrder.itemRatings ?? {}),
          ...itemRatings,
        };
      }

      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);

      // Update restaurant rating if restaurant rating was submitted
      if (ratingType === 'restaurant' && selectedOrder.restaurantId) {
        await updateRestaurantRating(selectedOrder.restaurantId, restaurantRating);
        await recordRatingHistory({
          orderId: selectedOrder.id,
          ratingType: 'restaurant',
          targetId: selectedOrder.restaurantId,
          rating: restaurantRating,
          review: restaurantReview,
        });
      }

      // Update shipper rating if shipper rating was submitted
      if (ratingType === 'shipper' && selectedOrder.shipperId) {
        await updateShipperRating(selectedOrder.shipperId, shipperRating);
        await recordRatingHistory({
          orderId: selectedOrder.id,
          ratingType: 'shipper',
          targetId: selectedOrder.shipperId,
          rating: shipperRating,
          review: shipperReview,
        });
      }

      // Update food item ratings if item ratings were submitted
      if (ratingType === 'items') {
        await updateFoodRatings(itemRatings);
        await Promise.all(
          Object.entries(itemRatings).map(([foodId, ratingPayload]) => {
            if (!ratingPayload?.rating) {
              return Promise.resolve();
            }

            return recordRatingHistory({
              orderId: selectedOrder.id,
              ratingType: 'item',
              targetId: foodId,
              rating: ratingPayload.rating,
              review: ratingPayload.review,
            });
          })
        );
      }

      if (ratingType === 'overall') {
        await recordRatingHistory({
          orderId: selectedOrder.id,
          ratingType: 'overall',
          targetId: selectedOrder.restaurantId ?? selectedOrder.shipperId ?? selectedOrder.userId,
          rating,
          review,
        });
      }

      setOrders((prevOrders) =>
        prevOrders.map(order =>
          order.id === selectedOrder.id ? { ...order, ...updateData } : order
        )
      );

      setReviewModalVisible(false);
      setSelectedOrder(null);
      setRating(5);
      setReview('');
      setRestaurantRating(5);
      setRestaurantReview('');
      setShipperRating(5);
      setShipperReview('');
      setItemRatings({});
      setRatingType('overall');
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const updateAggregatedRating = async (ref: DocumentReference, newRatingValue: number) => {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.exists() ? snapshot.data() : {};
      const previousCount =
        data && typeof data.totalRatings === 'number' ? data.totalRatings : 0;
      const previousTotalValue =
        data && typeof data.totalRatingValue === 'number'
          ? data.totalRatingValue
          : previousCount > 0 && typeof data.rating === 'number'
          ? data.rating * previousCount
          : 0;

      const totalRatings = previousCount + 1;
      const totalRatingValue = previousTotalValue + newRatingValue;
      const averageRating = totalRatingValue / totalRatings;

      transaction.set(
        ref,
        {
          totalRatings,
          totalRatingValue,
          rating: Number(averageRating.toFixed(1)),
        },
        { merge: true }
      );
    });
  };

  type RatingHistoryPayload = {
    orderId: string;
    ratingType: 'overall' | 'restaurant' | 'shipper' | 'item';
    rating: number;
    review?: string;
    targetId?: string;
  };

  const recordRatingHistory = async (payload: RatingHistoryPayload) => {
    const user = auth.currentUser;
    if (!user || !payload.rating) {
      return;
    }

    await addDoc(collection(db, 'ratings'), {
      ...payload,
      userId: user.uid,
      createdAt: Timestamp.now(),
    });
  };

  const updateRestaurantRating = async (restaurantId: string, newRating: number) => {
    try {
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateAggregatedRating(restaurantRef, newRating);
    } catch (error) {
      console.error('Error updating restaurant rating:', error);
    }
  };

  const updateShipperRating = async (shipperId: string, newRating: number) => {
    try {
      const shipperRef = doc(db, 'users', shipperId);
      await updateAggregatedRating(shipperRef, newRating);
    } catch (error) {
      console.error('Error updating shipper rating:', error);
    }
  };

  const updateFoodRatings = async (ratings: { [foodId: string]: { rating: number; review?: string } }) => {
    try {
      const updatePromises = Object.entries(ratings).map(([foodId, ratingData]) => {
        if (!ratingData?.rating) {
          return Promise.resolve();
        }

        const foodRef = doc(db, 'foods', foodId);
        return updateAggregatedRating(foodRef, ratingData.rating);
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating food ratings:', error);
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

          {item.status === 'delivered' && (!item.rating || !item.restaurantRating || (item.shipperId && !item.shipperRating)) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => {
                setSelectedOrder(item);
                setRating(item.rating || 5);
                setReview(item.review || '');
                setRestaurantRating(item.restaurantRating || 5);
                setRestaurantReview(item.restaurantReview || '');
                setShipperRating(item.shipperRating || 5);
                setShipperReview(item.shipperReview || '');
                setItemRatings(item.itemRatings || {});
                setRatingType('overall');
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

          {(item.status === 'shipping' || item.status === 'processing') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.trackButton]}
              onPress={() => {
                navigation.navigate('OrderTracking', { orderId: item.id, userRole: 'customer' });
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

  const getEmptyMessage = () => {
    if (activeTab === 'all') {
      return {
        prefix: 'Bạn chưa có đơn hàng nào. Hãy đặt món ngay!',
        suffix: '',
      };
    }

    const matchedLabel = tabCounts.find((t) => t.id === activeTab)?.label ?? '';
    return {
      prefix: 'Chưa có đơn hàng',
      suffix: matchedLabel.toLowerCase(),
    };
  };

  const emptyMessage = getEmptyMessage();

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
            <Ionicons name="receipt-outline" size={80} color="#ddd" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            {activeTab === 'all' ? (
              <Text style={styles.emptyText}>{emptyMessage.prefix}</Text>
            ) : (
              <Text style={styles.emptyText}>
                {emptyMessage.prefix}{' '}
                <Text style={styles.emptyTextHighlight}>{emptyMessage.suffix}</Text>
              </Text>
            )}
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
                  {(selectedOrder.status === 'shipping' || selectedOrder.status === 'processing') && (
                    <TouchableOpacity
                      style={styles.trackButtonInModal}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        navigation.navigate('OrderTracking', { orderId: selectedOrder.id, userRole: 'customer' });
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
        onRequestClose={() => {
          setReviewModalVisible(false);
          setSelectedOrder(null);
          setRating(5);
          setReview('');
          setRestaurantRating(5);
          setRestaurantReview('');
          setShipperRating(5);
          setShipperReview('');
          setItemRatings({});
          setRatingType('overall');
        }}
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
                  setRestaurantRating(5);
                  setRestaurantReview('');
                  setShipperRating(5);
                  setShipperReview('');
                  setItemRatings({});
                  setRatingType('overall');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rating Type Tabs */}
              <View style={styles.ratingTypeTabs}>
                <TouchableOpacity
                  style={[styles.ratingTypeTab, ratingType === 'overall' && styles.ratingTypeTabActive]}
                  onPress={() => setRatingType('overall')}
                >
                  <Text style={[styles.ratingTypeTabText, ratingType === 'overall' && styles.ratingTypeTabTextActive]}>
                    Tổng thể
                  </Text>
                </TouchableOpacity>
                {selectedOrder?.restaurantId && (
                  <TouchableOpacity
                    style={[styles.ratingTypeTab, ratingType === 'restaurant' && styles.ratingTypeTabActive]}
                    onPress={() => setRatingType('restaurant')}
                  >
                    <Text style={[styles.ratingTypeTabText, ratingType === 'restaurant' && styles.ratingTypeTabTextActive]}>
                      Nhà hàng
                    </Text>
                  </TouchableOpacity>
                )}
                {selectedOrder?.shipperId && (
                  <TouchableOpacity
                    style={[styles.ratingTypeTab, ratingType === 'shipper' && styles.ratingTypeTabActive]}
                    onPress={() => setRatingType('shipper')}
                  >
                    <Text style={[styles.ratingTypeTabText, ratingType === 'shipper' && styles.ratingTypeTabTextActive]}>
                      Shipper
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.ratingTypeTab, ratingType === 'items' && styles.ratingTypeTabActive]}
                  onPress={() => setRatingType('items')}
                >
                  <Text style={[styles.ratingTypeTabText, ratingType === 'items' && styles.ratingTypeTabTextActive]}>
                    Món ăn
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Overall Rating */}
              {ratingType === 'overall' && (
                <>
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
                </>
              )}

              {/* Restaurant Rating */}
              {ratingType === 'restaurant' && selectedOrder?.restaurantId && (
                <>
                  <View style={styles.ratingSectionHeader}>
                    <Text style={styles.ratingSectionTitle}>Đánh giá nhà hàng</Text>
                    <Text style={styles.ratingSectionSubtitle}>{selectedOrder.restaurantName}</Text>
                  </View>
                  <View style={styles.ratingPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRestaurantRating(star)}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={star <= restaurantRating ? 'star' : 'star-outline'}
                          size={40}
                          color="#FFD700"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingText}>
                    {restaurantRating === 5 ? 'Tuyệt vời!' : restaurantRating === 4 ? 'Rất tốt!' : restaurantRating === 3 ? 'Tốt!' : restaurantRating === 2 ? 'Tạm được' : 'Cần cải thiện'}
                  </Text>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Chia sẻ đánh giá về nhà hàng (không bắt buộc)"
                    value={restaurantReview}
                    onChangeText={setRestaurantReview}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Shipper Rating */}
              {ratingType === 'shipper' && selectedOrder?.shipperId && (
                <>
                  <View style={styles.ratingSectionHeader}>
                    <Text style={styles.ratingSectionTitle}>Đánh giá shipper</Text>
                  </View>
                  <View style={styles.ratingPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setShipperRating(star)}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={star <= shipperRating ? 'star' : 'star-outline'}
                          size={40}
                          color="#FFD700"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingText}>
                    {shipperRating === 5 ? 'Tuyệt vời!' : shipperRating === 4 ? 'Rất tốt!' : shipperRating === 3 ? 'Tốt!' : shipperRating === 2 ? 'Tạm được' : 'Cần cải thiện'}
                  </Text>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Chia sẻ đánh giá về shipper (không bắt buộc)"
                    value={shipperReview}
                    onChangeText={setShipperReview}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Item Ratings */}
              {ratingType === 'items' && selectedOrder && (
                <>
                  <View style={styles.ratingSectionHeader}>
                    <Text style={styles.ratingSectionTitle}>Đánh giá món ăn</Text>
                  </View>
                  {selectedOrder.items.map((item, index) => {
                    const foodKey = item.id;
                    const currentRating = itemRatings[foodKey]?.rating || 5;
                    const currentReview = itemRatings[foodKey]?.review || '';
                    return (
                      <View key={index} style={styles.itemRatingCard}>
                        <View style={styles.itemRatingHeader}>
                          <Image source={{ uri: item.imageUrl }} style={styles.itemRatingImage} />
                          <View style={styles.itemRatingInfo}>
                            <Text style={styles.itemRatingName}>{item.name}</Text>
                            <Text style={styles.itemRatingQuantity}>Số lượng: x{item.quantity}</Text>
                          </View>
                        </View>
                        <View style={styles.ratingPicker}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => {
                                setItemRatings({
                                  ...itemRatings,
                                  [foodKey]: {
                                    rating: star,
                                    review: itemRatings[foodKey]?.review || '',
                                  },
                                });
                              }}
                              style={styles.starButton}
                            >
                              <Ionicons
                                name={star <= currentRating ? 'star' : 'star-outline'}
                                size={30}
                                color="#FFD700"
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.itemReviewInput}
                          placeholder="Đánh giá món này (không bắt buộc)"
                          value={currentReview}
                          onChangeText={(text) => {
                            setItemRatings({
                              ...itemRatings,
                              [foodKey]: {
                                rating: currentRating,
                                review: text,
                              },
                            });
                          }}
                          multiline
                          numberOfLines={2}
                          textAlignVertical="top"
                        />
                      </View>
                    );
                  })}
                </>
              )}

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
            </ScrollView>
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
  emptyTextHighlight: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '600',
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
  ratingTypeTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  ratingTypeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
  },
  ratingTypeTabActive: {
    backgroundColor: '#ee4d2d',
  },
  ratingTypeTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  ratingTypeTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingSectionHeader: {
    marginBottom: 16,
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingSectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  itemRatingCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itemRatingHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemRatingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemRatingInfo: {
    flex: 1,
  },
  itemRatingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemRatingQuantity: {
    fontSize: 13,
    color: '#666',
  },
  itemReviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginTop: 12,
    backgroundColor: '#fff',
    minHeight: 60,
  },
});

export default OrdersScreen;

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import RestaurantScreenWrapper from '../../components/RestaurantScreenWrapper';

type NotificationType = 'new_order' | 'order_delivered' | 'order_cancelled' | 'system';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  createdAt: any;
  read: boolean;
  data?: any;
};

const NotificationTypeConfig: Record<NotificationType, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  new_order: { icon: 'add-shopping-cart', color: '#2196F3' },
  order_delivered: { icon: 'check-circle', color: '#4CAF50' },
  order_cancelled: { icon: 'cancel', color: '#F44336' },
  system: { icon: 'info', color: '#FF9800' },
};

const RestaurantNotificationsScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.uid) return;

    const ordersRef = collection(db, 'orders');
    const ordersQuery = query(ordersRef, where('restaurantId', '==', user.uid));

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        data.sort((a, b) => {
          const dateA = (a.createdAt?.toDate?.() ?? new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)).getTime();
          const dateB = (b.createdAt?.toDate?.() ?? new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)).getTime();
          return dateB - dateA;
        });

        setOrders(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error listening to orders:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchNotifications = async () => {
    setRefreshing(true);
    // Data refresh handled via onSnapshot
  };

  const derivedNotifications = useMemo(() => {
    return orders
      .flatMap((order) => {
        const events: Notification[] = [];
        const baseData = {
          orderId: order.id,
          data: order,
        };

        if (order.status === 'pending') {
          events.push({
            id: `pending_${order.id}`,
            type: 'new_order',
            title: 'Đơn hàng mới',
            message: `Đơn từ ${order.customerName || 'Khách hàng'} đang chờ xác nhận`,
            createdAt: order.createdAt,
            read: false,
            ...baseData,
          });
        }

        if (order.status === 'delivered') {
          events.push({
            id: `delivered_${order.id}`,
            type: 'order_delivered',
            title: 'Đã giao thành công',
            message: `Đơn #${order.id.slice(-8).toUpperCase()} đã hoàn tất`,
            createdAt: order.deliveredAt || order.updatedAt || order.createdAt,
            read: true,
            ...baseData,
          });
        }

        if (order.status === 'cancelled') {
          events.push({
            id: `cancelled_${order.id}`,
            type: 'order_cancelled',
            title: 'Đơn bị hủy',
            message: `Đơn #${order.id.slice(-8).toUpperCase()} đã hủy bởi ${order.cancelReason || 'khách hàng'}`,
            createdAt: order.updatedAt || order.createdAt,
            read: true,
            ...baseData,
          });
        }

        return events;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return dateB - dateA;
      });
  }, [orders]);

  const newOrderNotifications = useMemo(
    () => derivedNotifications.filter((notif) => notif.type === 'new_order'),
    [derivedNotifications]
  );

  const timelineNotifications = useMemo(
    () => derivedNotifications.filter((notif) => notif.type !== 'new_order'),
    [derivedNotifications]
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút trước`;
      if (hours < 24) return `${hours} giờ trước`;
      if (days < 7) return `${days} ngày trước`;
      
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 ₫';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  if (loading && derivedNotifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <RestaurantScreenWrapper
      title="Thông báo"
      subtitle={`${newOrderNotifications.length} đơn đang chờ`}
      scrollable={false}
    >
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          {[
            {
              label: 'Đơn mới',
              value: newOrderNotifications.length,
              icon: 'notifications-active',
              color: '#f97316',
            },
            {
              label: 'Đơn hoàn tất',
              value: timelineNotifications.filter((n) => n.type === 'order_delivered').length,
              icon: 'check-circle',
              color: '#22c55e',
            },
            {
              label: 'Đơn bị hủy',
              value: timelineNotifications.filter((n) => n.type === 'order_cancelled').length,
              icon: 'cancel',
              color: '#ef4444',
            },
          ].map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: `${card.color}15` }]}>
                <MaterialIcons name={card.icon as any} size={20} color={card.color} />
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đơn mới</Text>
            <Text style={styles.sectionSubtitle}>
              {newOrderNotifications.length > 0
                ? `${newOrderNotifications.length} đơn cần xử lý`
                : 'Chưa có đơn mới'}
            </Text>
          </View>

          {newOrderNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="done" size={48} color="#cbd5f5" />
              <Text style={styles.emptyText}>Không có đơn mới</Text>
              <Text style={styles.emptySubtext}>Hệ thống sẽ thông báo ngay khi có đơn mới</Text>
            </View>
          ) : (
            newOrderNotifications.map((notif) => (
              <View key={notif.id} style={styles.newOrderCard}>
                <View style={styles.newOrderHeader}>
                  <View style={styles.newOrderBadge}>
                    <MaterialIcons name="flash-on" size={16} color="#fff" />
                    <Text style={styles.newOrderBadgeText}>Ưu tiên</Text>
                  </View>
                  <Text style={styles.newOrderTime}>{formatDate(notif.createdAt)}</Text>
                </View>
                <Text style={styles.newOrderTitle}>{notif.message}</Text>
                <View style={styles.newOrderMeta}>
                  <Text style={styles.newOrderMetaText}>#{notif.orderId?.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.newOrderMetaText}>
                    {formatCurrency(notif.data?.totalAmount)}
                  </Text>
                  <Text style={styles.newOrderMetaText}>
                    {notif.data?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} món
                  </Text>
                </View>
                <TouchableOpacity style={styles.newOrderButton}>
                  <Text style={styles.newOrderButtonText}>Xem chi tiết đơn</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            <Text style={styles.sectionSubtitle}>
              {timelineNotifications.length > 0
                ? `${timelineNotifications.length} cập nhật gần nhất`
                : 'Chưa có cập nhật'}
            </Text>
          </View>

          {timelineNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="notifications-none" size={60} color="#d1d5db" />
              <Text style={styles.emptyText}>Chưa có thông báo</Text>
              <Text style={styles.emptySubtext}>
                Trạng thái đơn hàng sẽ hiển thị tại đây ngay khi cập nhật
              </Text>
            </View>
          ) : (
            timelineNotifications.map((notif) => {
              const config = NotificationTypeConfig[notif.type];
              return (
                <View key={notif.id} style={styles.notificationCard}>
                  <View style={[styles.notificationIcon, { backgroundColor: `${config.color}15` }]}>
                    <MaterialIcons name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notif.title}</Text>
                    <Text style={styles.notificationMessage}>{notif.message}</Text>
                    <View style={styles.notificationMeta}>
                      <Text style={styles.notificationCode}>
                        #{notif.orderId?.slice(-6).toUpperCase()}
                      </Text>
                      <Text style={styles.notificationTime}>{formatDate(notif.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </RestaurantScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  newOrderCard: {
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff7ed',
  },
  newOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  newOrderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  newOrderTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  newOrderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  newOrderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  newOrderMetaText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  newOrderButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  newOrderButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default RestaurantNotificationsScreen;


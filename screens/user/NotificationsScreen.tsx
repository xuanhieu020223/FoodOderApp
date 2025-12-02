import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

type NotificationCategory = 'all' | 'promotion' | 'order' | 'system' | 'voucher';

type FirestoreNotification = {
  id: string;
  type?: string;
  title?: string;
  content?: string;
  message?: string;
  to?: string;
  target?: string;
  createdAt?: any;
  read?: boolean;
  orderId?: string;
};

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');

  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const notiRef = collection(db, 'notifications');
    const q = query(
      notiRef,
      where('to', 'in', [user.uid, 'all-customers', 'all-users'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: FirestoreNotification[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        data.sort((a, b) => {
          const getTime = (ts: any) => {
            if (!ts) return 0;
            if (typeof ts.toDate === 'function') return ts.toDate().getTime();
            if (typeof ts === 'string') return new Date(ts).getTime();
            if (ts.seconds) return ts.seconds * 1000;
            return 0;
          };

          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setNotifications(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const onRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const notiRef = collection(db, 'notifications');
      const q = query(
        notiRef,
        where('to', 'in', [user.uid, 'all-customers', 'all-users'])
      );
      const snapshot = await getDocs(q);
      const data: FirestoreNotification[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });

      data.sort((a, b) => {
        const getTime = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toDate === 'function') return ts.toDate().getTime();
          if (typeof ts === 'string') return new Date(ts).getTime();
          if (ts.seconds) return ts.seconds * 1000;
          return 0;
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date(),
      });
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      if (unread.length === 0) {
        return;
      }

      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, 'notifications', n.id), {
            read: true,
            readAt: new Date(),
          })
        )
      );
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date =
        typeof timestamp.toDate === 'function'
          ? timestamp.toDate()
          : typeof timestamp === 'string'
          ? new Date(timestamp)
          : timestamp.seconds
          ? new Date(timestamp.seconds * 1000)
          : new Date();

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút trước`;
      if (hours < 24) return `${hours} giờ trước`;
      if (days < 7) return `${days} ngày trước`;

      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'promotion':
        return { name: 'pricetag-outline' as const, color: '#FF9800' };
      case 'order':
        return { name: 'receipt-outline' as const, color: '#2196F3' };
      case 'voucher':
        return { name: 'gift-outline' as const, color: '#9C27B0' };
      case 'system':
      default:
        return { name: 'notifications-outline' as const, color: '#607D8B' };
    }
  };

  const tabs: { id: NotificationCategory; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'order', label: 'Đơn hàng' },
    { id: 'promotion', label: 'Khuyến mãi' },
    { id: 'voucher', label: 'Voucher' },
    { id: 'system', label: 'Hệ thống' },
  ];

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => (n.type || 'system') === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({ item }: { item: FirestoreNotification }) => {
    const icon = getNotificationIcon(item.type);
    const isUnread = !item.read;
    const title =
      item.title ||
      (item.type === 'order'
        ? 'Cập nhật đơn hàng'
        : item.type === 'promotion'
        ? 'Khuyến mãi mới'
        : item.type === 'voucher'
        ? 'Voucher mới cho bạn'
        : 'Thông báo');
    const body = item.content || item.message || '';

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
        activeOpacity={0.8}
        onPress={() => {
          if (isUnread) {
            markAsRead(item.id);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.notificationTitle, isUnread && styles.unreadTitle]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          {!!body && (
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {body}
            </Text>
          )}
          <View style={styles.footerRow}>
            {item.type && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {item.type === 'order'
                    ? 'Đơn hàng'
                    : item.type === 'promotion'
                    ? 'Khuyến mãi'
                    : item.type === 'voucher'
                    ? 'Voucher'
                    : 'Hệ thống'}
                </Text>
              </View>
            )}
            <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ee4d2d" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrapper}>
            <Ionicons name="notifications" size={26} color="#ee4d2d" />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <Text style={styles.headerSubtitle}>
              {notifications.length} thông báo
              {unreadCount > 0 ? ` • ${unreadCount} chưa đọc` : ''}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <MaterialIcons name="done-all" size={18} color="#2196F3" />
            <Text style={styles.markAllButtonText}>Đánh dấu tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => setActiveTab(item.id)}
            >
              <Text
                style={[styles.tabText, activeTab === item.id && styles.activeTabText]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>Không có thông báo nào</Text>
          <Text style={styles.emptySubtext}>
            Các cập nhật về đơn hàng, khuyến mãi và voucher sẽ hiển thị tại đây
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.notificationList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ee4d2d',
    marginTop: 4,
    fontWeight: '500',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
  },
  markAllButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  tabs: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabsContent: {
    paddingHorizontal: 8,
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
  notificationList: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  unreadNotification: {
    backgroundColor: '#fff9f8',
    borderLeftWidth: 4,
    borderLeftColor: '#ee4d2d',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  chipText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ee4d2d',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default NotificationsScreen;
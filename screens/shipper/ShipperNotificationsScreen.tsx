import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, 
  TouchableOpacity, Modal, ScrollView 
} from 'react-native';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const ShipperNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'order' | 'system' | 'payment'>('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchNotifications();
    const notiRef = collection(db, 'notifications');
    const q = query(
      notiRef,
      where('to', 'in', [user?.uid, 'all-shippers'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Sort by createdAt in memory to avoid needing a composite index
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate 
          ? a.createdAt.toDate().getTime() 
          : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const dateB = b.createdAt?.toDate 
          ? b.createdAt.toDate().getTime() 
          : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return dateB - dateA; // Descending order
      });
      
      setNotifications(data);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error listening to notifications:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedCategory]);

  const filterNotifications = () => {
    if (selectedCategory === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(
        notifications.filter(n => {
          if (selectedCategory === 'order') {
            return n.type === 'order' || n.type === 'delivery';
          }
          if (selectedCategory === 'system') {
            return n.type === 'system' || n.type === 'announcement';
          }
          if (selectedCategory === 'payment') {
            return n.type === 'payment' || n.type === 'finance';
          }
          return true;
        })
      );
    }
  };

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      const notiRef = collection(db, 'notifications');
      const q = query(
        notiRef,
        where('to', 'in', [user?.uid, 'all-shippers'])
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Sort by createdAt in memory to avoid needing a composite index
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate 
          ? a.createdAt.toDate().getTime() 
          : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const dateB = b.createdAt?.toDate 
          ? b.createdAt.toDate().getTime() 
          : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return dateB - dateA; // Descending order
      });
      
      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
      setNotifications([]);
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
      console.error('Error marking as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), {
          read: true,
          readAt: new Date(),
        })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Chưa có ngày';
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
      
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Chưa có ngày';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'delivery':
        return { name: 'delivery-dining', color: '#ee4d2d' };
      case 'payment':
      case 'finance':
        return { name: 'account-balance-wallet', color: '#4CAF50' };
      case 'system':
      case 'announcement':
        return { name: 'campaign', color: '#2196F3' };
      default:
        return { name: 'notifications', color: '#666' };
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const openNotificationDetail = (notification: any) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  const unreadCount = getUnreadCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <MaterialIcons name="notifications" size={28} color="#ee4d2d" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Thông báo</Text>
              <Text style={styles.headerSubtitle}>
                {filteredNotifications.length} thông báo
                {unreadCount > 0 && ` • ${unreadCount} chưa đọc`}
              </Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
              <MaterialIcons name="done-all" size={18} color="#2196F3" />
              <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <View style={styles.categoryFilter}>
          <TouchableOpacity
            style={[styles.categoryTab, selectedCategory === 'all' && styles.categoryTabActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.categoryTabText, selectedCategory === 'all' && styles.categoryTabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryTab, selectedCategory === 'order' && styles.categoryTabActive]}
            onPress={() => setSelectedCategory('order')}
          >
            <MaterialIcons 
              name="delivery-dining" 
              size={16} 
              color={selectedCategory === 'order' ? '#fff' : '#666'} 
            />
            <Text style={[styles.categoryTabText, selectedCategory === 'order' && styles.categoryTabTextActive]}>
              Đơn hàng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryTab, selectedCategory === 'payment' && styles.categoryTabActive]}
            onPress={() => setSelectedCategory('payment')}
          >
            <MaterialIcons 
              name="account-balance-wallet" 
              size={16} 
              color={selectedCategory === 'payment' ? '#fff' : '#666'} 
            />
            <Text style={[styles.categoryTabText, selectedCategory === 'payment' && styles.categoryTabTextActive]}>
              Thanh toán
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryTab, selectedCategory === 'system' && styles.categoryTabActive]}
            onPress={() => setSelectedCategory('system')}
          >
            <MaterialIcons 
              name="campaign" 
              size={16} 
              color={selectedCategory === 'system' ? '#fff' : '#666'} 
            />
            <Text style={[styles.categoryTabText, selectedCategory === 'system' && styles.categoryTabTextActive]}>
              Hệ thống
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const iconInfo = getNotificationIcon(item.type);
          const isUnread = !item.read;
          
          return (
            <TouchableOpacity
              style={[styles.notificationItem, isUnread && styles.unreadItem]}
              onPress={() => openNotificationDetail(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}15` }]}>
                <MaterialIcons name={iconInfo.name as any} size={24} color={iconInfo.color} />
              </View>
              <View style={styles.contentContainer}>
                <View style={styles.contentHeader}>
                  <Text style={[styles.title, isUnread && styles.unreadTitle]}>
                    {item.title || 'Thông báo'}
                  </Text>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.content} numberOfLines={2}>
                  {item.content || item.message || ''}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>
              {!item.read && (
                <TouchableOpacity
                  style={styles.markReadButton}
                  onPress={() => markAsRead(item.id)}
                >
                  <MaterialIcons name="check" size={18} color="#2196F3" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={80} color="#ddd" />
            <Text style={styles.emptyText}>
              {selectedCategory === 'all' 
                ? 'Không có thông báo nào' 
                : 'Không có thông báo trong danh mục này'}
            </Text>
            <Text style={styles.emptySubtext}>
              Thông báo mới sẽ hiển thị ở đây
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Notification Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    {(() => {
                      const iconInfo = getNotificationIcon(selectedNotification.type);
                      return (
                        <View style={[styles.modalIconContainer, { backgroundColor: `${iconInfo.color}15` }]}>
                          <MaterialIcons name={iconInfo.name as any} size={28} color={iconInfo.color} />
                        </View>
                      );
                    })()}
                    <View style={styles.modalHeaderText}>
                      <Text style={styles.modalTitle}>
                        {selectedNotification.title || 'Thông báo'}
                      </Text>
                      <Text style={styles.modalDate}>
                        {formatDate(selectedNotification.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalContentText}>
                    {selectedNotification.content || selectedNotification.message || 'Không có nội dung'}
                  </Text>
                  
                  {selectedNotification.orderId && (
                    <View style={styles.modalInfoSection}>
                      <Text style={styles.modalInfoLabel}>Mã đơn hàng:</Text>
                      <Text style={styles.modalInfoValue}>
                        #{selectedNotification.orderId.slice(-8).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {selectedNotification.amount && (
                    <View style={styles.modalInfoSection}>
                      <Text style={styles.modalInfoLabel}>Số tiền:</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedNotification.amount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginTop: 8,
  },
  markAllText: {
    fontSize: 13,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '600',
  },
  categoryFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#ee4d2d',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ee4d2d',
    backgroundColor: '#FFF9F9',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ee4d2d',
    marginLeft: 8,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  markReadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    textAlign: 'center',
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 13,
    color: '#999',
  },
  modalBody: {
    padding: 20,
  },
  modalContentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold',
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
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShipperNotificationsScreen;

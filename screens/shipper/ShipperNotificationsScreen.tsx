import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const ShipperNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchNotifications();
    // Setup real-time listener
    const notiRef = collection(db, 'notifications');
    const q = query(
      notiRef,
      where('to', 'in', [user?.uid, 'all-shippers']),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
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

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      const notiRef = collection(db, 'notifications');
      const q = query(
        notiRef,
        where('to', 'in', [user?.uid, 'all-shippers']),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
      setNotifications([]);
    }
    setRefreshing(false);
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

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="notifications" size={24} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <Text style={styles.headerSubtitle}>{notifications.length} thông báo</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name={item.type === 'order' ? 'delivery-dining' : 'notifications'} 
                size={24} 
                color="#ee4d2d" 
              />
            </View>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{item.title || 'Thông báo'}</Text>
              <Text style={styles.content}>{item.content || item.message || ''}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có thông báo nào</Text>
            <Text style={styles.emptySubtext}>Thông báo mới sẽ hiển thị ở đây</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
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
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
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
    textAlign: 'center',
  },
});

export default ShipperNotificationsScreen;

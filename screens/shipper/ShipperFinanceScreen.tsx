import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const ShipperFinanceScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shipperId', '==', user?.uid),
        where('status', '==', 'delivered'),
        orderBy('deliveredAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setHistory(data);
    } catch (e) {
      console.error('Error fetching history:', e);
      setHistory([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const getTotalIncome = () => {
    return history.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  const getTodayIncome = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return history
      .filter(item => {
        if (!item.deliveredAt) return false;
        const deliveredDate = item.deliveredAt.toDate ? item.deliveredAt.toDate() : new Date(item.deliveredAt.seconds * 1000);
        return deliveredDate >= today;
      })
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  const getThisWeekIncome = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    return history
      .filter(item => {
        if (!item.deliveredAt) return false;
        const deliveredDate = item.deliveredAt.toDate ? item.deliveredAt.toDate() : new Date(item.deliveredAt.seconds * 1000);
        return deliveredDate >= weekAgo;
      })
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Chưa có ngày';
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
      return 'Chưa có ngày';
    }
  };

  if (loading && history.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Tài chính</Text>
            <Text style={styles.headerSubtitle}>Thống kê thu nhập</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="attach-money" size={32} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Tổng thu nhập</Text>
            <Text style={styles.statValue}>{getTotalIncome().toLocaleString('vi-VN')} đ</Text>
            <Text style={styles.statSubtext}>{history.length} chuyến giao</Text>
          </View>

          <View style={styles.secondaryStats}>
            <View style={[styles.statCard, styles.secondaryCard]}>
              <MaterialIcons name="today" size={24} color="#ee4d2d" />
              <Text style={styles.secondaryLabel}>Hôm nay</Text>
              <Text style={styles.secondaryValue}>{getTodayIncome().toLocaleString('vi-VN')} đ</Text>
            </View>

            <View style={[styles.statCard, styles.secondaryCard]}>
              <MaterialIcons name="date-range" size={24} color="#1976d2" />
              <Text style={styles.secondaryLabel}>7 ngày qua</Text>
              <Text style={styles.secondaryValue}>{getThisWeekIncome().toLocaleString('vi-VN')} đ</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <MaterialIcons name="history" size={20} color="#333" />
          <Text style={styles.sectionTitle}>Lịch sử giao hàng ({history.length})</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có chuyến giao thành công nào</Text>
            <Text style={styles.emptySubtext}>Hoàn thành đơn hàng để xem thu nhập</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIconContainer}>
                    <MaterialIcons name="check-circle" size={24} color="#2e7d32" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemText}>Đơn #{item.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.address} numberOfLines={1}>
                      {item.address || item.restaurantAddress || 'Chưa có địa chỉ'}
                    </Text>
                    <Text style={styles.date}>{formatDate(item.deliveredAt)}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.amount}>+{item.totalAmount?.toLocaleString('vi-VN')} đ</Text>
                </View>
              </View>
            )}
          />
        )}
      </ScrollView>
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
  statsContainer: {
    padding: 16,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  primaryCard: {
    backgroundColor: '#ee4d2d',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    marginRight: 8,
    alignItems: 'center',
    padding: 16,
  },
  secondaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  secondaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIconContainer: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  itemRight: {
    marginLeft: 12,
  },
  amount: {
    fontWeight: 'bold',
    color: '#2e7d32',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
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

export default ShipperFinanceScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

type Order = {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  items: {
    foodId: string;
    name: string;
    quantity: number;
  }[];
  userId: string;
};

type User = {
  id: string;
  username: string;
  orderCount: number;
};

const StatisticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [orderStatusData, setOrderStatusData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [topFoods, setTopFoods] = useState<{ name: string; quantity: number }[]>([]);
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'month'>('day');

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRevenueData(),
        loadOrderStatusData(),
        loadTopFoods(),
        loadTopUsers(),
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    const ordersRef = collection(db, 'orders');
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'day') {
      startDate.setDate(now.getDate() - 7); // 7 ngày gần nhất
    } else {
      startDate.setMonth(now.getMonth() - 6); // 6 tháng gần nhất
    }

    const q = query(
      ordersRef,
      where('status', '==', 'delivered'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const revenueByDate = new Map<string, number>();

    querySnapshot.forEach((doc) => {
      const order = doc.data() as Order;
      const date = order.createdAt.toDate();
      const dateKey = timeRange === 'day'
        ? date.toLocaleDateString('vi-VN')
        : `${date.getMonth() + 1}/${date.getFullYear()}`;

      const currentAmount = revenueByDate.get(dateKey) || 0;
      revenueByDate.set(dateKey, currentAmount + order.totalAmount);
    });

    const labels = Array.from(revenueByDate.keys());
    const data = Array.from(revenueByDate.values());

    setRevenueData({
      labels,
      datasets: [{ data }],
    });
  };

  const loadOrderStatusData = async () => {
    const ordersRef = collection(db, 'orders');
    const querySnapshot = await getDocs(ordersRef);
    const statusCount = new Map<string, number>();

    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const count = statusCount.get(order.status) || 0;
      statusCount.set(order.status, count + 1);
    });

    const statusLabels = ['pending', 'processing', 'shipping', 'delivered', 'cancelled'];
    const statusText = {
      pending: 'Chờ xác nhận',
      processing: 'Đang chuẩn bị',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };

    setOrderStatusData({
      labels: statusLabels.map(status => statusText[status as keyof typeof statusText]),
      datasets: [{
        data: statusLabels.map(status => statusCount.get(status) || 0)
      }]
    });
  };

  const loadTopFoods = async () => {
    const ordersRef = collection(db, 'orders');
    const querySnapshot = await getDocs(query(ordersRef, where('status', '==', 'delivered')));
    const foodCount = new Map<string, number>();

    querySnapshot.forEach((doc) => {
      const order = doc.data() as Order;
      order.items.forEach((item) => {
        const count = foodCount.get(item.name) || 0;
        foodCount.set(item.name, count + item.quantity);
      });
    });

    const sortedFoods = Array.from(foodCount.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    setTopFoods(sortedFoods);
  };

  const loadTopUsers = async () => {
    const ordersRef = collection(db, 'orders');
    const querySnapshot = await getDocs(query(ordersRef, where('status', '==', 'delivered')));
    const userOrderCount = new Map<string, { username: string; count: number }>();

    for (const doc of querySnapshot.docs) {
      const order = doc.data() as Order;
      const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', order.userId)));
      const username = userDoc.docs[0]?.data()?.username || 'Unknown User';
      
      const userData = userOrderCount.get(order.userId) || { username, count: 0 };
      userData.count += 1;
      userOrderCount.set(order.userId, userData);
    }

    const sortedUsers = Array.from(userOrderCount.entries())
      .map(([id, data]) => ({
        id,
        username: data.username,
        orderCount: data.count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    setTopUsers(sortedUsers);
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(238, 77, 45, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thống kê</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doanh thu</Text>
        <View style={styles.timeRangeButtons}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 'day' && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange('day')}
          >
            <Text style={[
              styles.timeRangeButtonText,
              timeRange === 'day' && styles.timeRangeButtonTextActive,
            ]}>
              7 ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 'month' && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[
              styles.timeRangeButtonText,
              timeRange === 'month' && styles.timeRangeButtonTextActive,
            ]}>
              6 tháng
            </Text>
          </TouchableOpacity>
        </View>
        <LineChart
          data={revenueData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
        <BarChart
          data={orderStatusData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          yAxisLabel=""
          yAxisSuffix=""
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top 5 món ăn bán chạy</Text>
        {topFoods.map((food, index) => (
          <View key={food.name} style={styles.rankingItem}>
            <Text style={styles.rankingNumber}>#{index + 1}</Text>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName}>{food.name}</Text>
              <Text style={styles.rankingValue}>{food.quantity} đơn</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top 5 khách hàng</Text>
        {topUsers.map((user, index) => (
          <View key={user.id} style={styles.rankingItem}>
            <Text style={styles.rankingNumber}>#{index + 1}</Text>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName}>{user.username}</Text>
              <Text style={styles.rankingValue}>{user.orderCount} đơn</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#ee4d2d',
  },
  timeRangeButtonText: {
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankingNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  rankingInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankingName: {
    fontSize: 14,
    color: '#333',
  },
  rankingValue: {
    fontSize: 14,
    color: '#666',
  },
});

export default StatisticsScreen; 
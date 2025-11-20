import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

type Order = {
  id: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
  createdAt: {
    toDate: () => Date;
  };
  items: {
    foodId: string;
    name: string;
    quantity: number;
  }[];
  userId: string;
  customerName?: string;
  customerPhone?: string;
};

type User = {
  id: string;
  username: string;
  orderCount: number;
};

type TimeRange = 'today' | 'week' | 'month' | 'year';

type StatisticData = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  successRate: number;
  chartData: {
    labels: string[];
    datasets: number[];
  };
};

const StatisticsScreen = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<StatisticData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    successRate: 0,
    chartData: {
      labels: [],
      datasets: [],
    },
  });
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

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const getTimeRangeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return {
          start: startOfDay,
          end: now,
          format: (date: Date) => date.getHours() + 'h',
          interval: 'hour',
        };
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        return {
          start: startOfWeek,
          end: now,
          format: (date: Date) => date.getDate() + '/' + (date.getMonth() + 1),
          interval: 'day',
        };
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setMonth(now.getMonth() - 1);
        return {
          start: startOfMonth,
          end: now,
          format: (date: Date) => date.getDate() + '/' + (date.getMonth() + 1),
          interval: 'day',
        };
      case 'year':
        const startOfYear = new Date(now);
        startOfYear.setFullYear(now.getFullYear() - 1);
        return {
          start: startOfYear,
          end: now,
          format: (date: Date) => (date.getMonth() + 1) + '/' + date.getFullYear(),
          interval: 'month',
        };
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const timeFilter = getTimeRangeFilter();
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('createdAt', '>=', Timestamp.fromDate(timeFilter.start)),
        where('createdAt', '<=', Timestamp.fromDate(timeFilter.end)),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        totalAmount: doc.data().totalAmount || 0,
        status: doc.data().status || 'pending',
        createdAt: doc.data().createdAt,
        items: doc.data().items || [],
        userId: doc.data().userId || '',
        customerName: doc.data().customerName || '',
        customerPhone: doc.data().customerPhone || '',
      } as Order));

      // Tính toán thống kê cơ bản
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
      const successRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

      // Tạo dữ liệu cho biểu đồ
      const chartData = generateChartData(completedOrders, timeFilter);

      setStatistics({
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue,
        successRate,
        chartData,
      });

      await Promise.all([
        loadRevenueData(),
        loadOrderStatusData(),
        loadTopFoods(),
        loadTopUsers(),
      ]);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (orders: any[], timeFilter: any) => {
    const labels: string[] = [];
    const datasets: number[] = [];
    const dataMap = new Map();

    // Tạo các mốc thời gian
    let current = new Date(timeFilter.start);
    while (current <= timeFilter.end) {
      const label = timeFilter.format(current);
      labels.push(label);
      dataMap.set(label, 0);

      switch (timeFilter.interval) {
        case 'hour':
          current = new Date(current.setHours(current.getHours() + 1));
          break;
        case 'day':
          current = new Date(current.setDate(current.getDate() + 1));
          break;
        case 'month':
          current = new Date(current.setMonth(current.getMonth() + 1));
          break;
      }
    }

    // Tính tổng doanh thu theo từng mốc thời gian
    orders.forEach(order => {
      const date = order.createdAt.toDate();
      const label = timeFilter.format(date);
      if (dataMap.has(label)) {
        dataMap.set(label, dataMap.get(label) + (order.totalAmount || 0));
      }
    });

    // Chuyển đổi dữ liệu cho biểu đồ
    dataMap.forEach((value) => {
      datasets.push(value);
    });

    return { labels, datasets };
  };

  const loadRevenueData = async () => {
    const ordersRef = collection(db, 'orders');
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7); // 7 ngày gần nhất
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1); // 1 tháng gần nhất
    } else if (timeRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1); // 1 năm gần nhất
    } else {
      // today
      startDate.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00 của ngày hôm nay
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
      const dateKey = timeRange === 'year'
        ? `${date.getMonth() + 1}/${date.getFullYear()}`
        : date.toLocaleDateString('vi-VN');

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>Thống kê doanh thu</Text>
      </View> */}

      <View style={styles.timeFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, timeRange === 'today' && styles.filterButtonActive]}
            onPress={() => setTimeRange('today')}
          >
            <Text style={[styles.filterText, timeRange === 'today' && styles.filterTextActive]}>
              Hôm nay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeRange === 'week' && styles.filterButtonActive]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.filterText, timeRange === 'week' && styles.filterTextActive]}>
              7 ngày qua
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeRange === 'month' && styles.filterButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.filterText, timeRange === 'month' && styles.filterTextActive]}>
              30 ngày qua
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeRange === 'year' && styles.filterButtonActive]}
            onPress={() => setTimeRange('year')}
          >
            <Text style={[styles.filterText, timeRange === 'year' && styles.filterTextActive]}>
              12 tháng qua
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsCard}>
          <View style={styles.statsIconContainer}>
            <MaterialIcons name="attach-money" size={24} color="#ee4d2d" />
          </View>
          <Text style={styles.statsLabel}>Doanh thu</Text>
          <Text style={styles.statsValue}>{formatCurrency(statistics.totalRevenue)}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIconContainer}>
            <MaterialIcons name="shopping-cart" size={24} color="#2196F3" />
          </View>
          <Text style={styles.statsLabel}>Tổng đơn</Text>
          <Text style={styles.statsValue}>{statistics.totalOrders}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIconContainer}>
            <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statsLabel}>Trung bình</Text>
          <Text style={styles.statsValue}>{formatCurrency(statistics.averageOrderValue)}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIconContainer}>
            <MaterialIcons name="check-circle" size={24} color="#9C27B0" />
          </View>
          <Text style={styles.statsLabel}>Tỷ lệ thành công</Text>
          <Text style={styles.statsValue}>{statistics.successRate.toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Biểu đồ doanh thu</Text>
        <LineChart
          data={{
            labels: statistics.chartData.labels,
            datasets: [
              {
                data: statistics.chartData.datasets.length > 0 
                  ? statistics.chartData.datasets 
                  : [0],
              },
            ],
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(238, 77, 45, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={styles.chart}
          bezier
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
  timeFilter: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ee4d2d',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statsCard: {
    width: '50%',
    padding: 8,
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
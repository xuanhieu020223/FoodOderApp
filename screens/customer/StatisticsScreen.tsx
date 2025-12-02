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
  Alert,
} from 'react-native';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../config/Firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { Share } from 'react-native';
import RestaurantScreenWrapper from '../../components/RestaurantScreenWrapper';
import { Card } from '../../components/admin/AntDesignComponents';

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
  const [userRole, setUserRole] = useState<string>('restaurant');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalShippers: 0,
    activeOrders: 0,
  });
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
  const [orderStatusData, setOrderStatusData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [topFoods, setTopFoods] = useState<{ name: string; quantity: number }[]>([]);
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [insightMetrics, setInsightMetrics] = useState({
    newOrders: 0,
    delivered: 0,
    repeatCustomers: 0,
    avgItems: 0,
  });

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (userRole !== 'admin' && !restaurantId) return;
    loadStatistics();
  }, [timeRange, restaurantId, userRole]);

  const loadUserRole = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const role = (userDoc.data().role || 'restaurant').toLowerCase();
          setUserRole(role);
          setRestaurantId(user.uid);
          if (role === 'admin') {
            loadSystemStats();
          }
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      let totalUsers = 0;
      let totalRestaurants = 0;
      let totalShippers = 0;
      
      usersSnapshot.forEach((doc) => {
        const role = (doc.data().role || 'customer').toLowerCase();
        totalUsers++;
        if (role === 'restaurant') totalRestaurants++;
        if (role === 'shipper' || role === 'driver') totalShippers++;
      });

      const ordersRef = collection(db, 'orders');
      const activeOrdersQuery = query(
        ordersRef,
        where('status', 'in', ['pending', 'confirmed', 'processing', 'shipping'])
      );
      const activeOrdersSnapshot = await getDocs(activeOrdersQuery);
      const activeOrders = activeOrdersSnapshot.size;

      setSystemStats({
        totalUsers,
        totalRestaurants,
        totalShippers,
        activeOrders,
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

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
      let ordersQuery = ordersRef;

      if (userRole !== 'admin' && restaurantId) {
        ordersQuery = query(ordersRef, where('restaurantId', '==', restaurantId));
      } else if (userRole === 'admin') {
        ordersQuery = query(
          ordersRef,
          where('createdAt', '>=', Timestamp.fromDate(timeFilter.start)),
          where('createdAt', '<=', Timestamp.fromDate(timeFilter.end)),
        );
      }

      const querySnapshot = await getDocs(ordersQuery);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        totalAmount: doc.data().totalAmount || 0,
        status: doc.data().status || 'pending',
        createdAt: doc.data().createdAt,
        deliveredAt: doc.data().deliveredAt,
        items: doc.data().items || [],
        userId: doc.data().userId || '',
        customerName: doc.data().customerName || '',
        customerPhone: doc.data().customerPhone || '',
      } as Order));

      const filteredOrders =
        userRole === 'admin'
          ? orders
          : orders.filter((order) => {
              const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
              return createdDate >= timeFilter.start && createdDate <= timeFilter.end;
            });

      // Tính toán thống kê cơ bản
      const completedOrders = filteredOrders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
      const successRate = filteredOrders.length > 0 ? (completedOrders.length / filteredOrders.length) * 100 : 0;

      // Tạo dữ liệu cho biểu đồ
      const chartData = generateChartData(completedOrders, timeFilter);
      const statusBreakdown = buildOrderStatusData(filteredOrders);
      const topFoodList = buildTopFoods(filteredOrders);
      const topCustomerList = buildTopCustomers(filteredOrders);
      const insightData = buildInsightMetrics(filteredOrders, completedOrders);

      setStatistics({
        totalRevenue,
        totalOrders: filteredOrders.length,
        averageOrderValue,
        successRate,
        chartData,
      });

      setOrderStatusData(statusBreakdown);
      setTopFoods(topFoodList);
      setTopUsers(topCustomerList);
      setInsightMetrics(insightData);
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

  const buildOrderStatusData = (orders: Order[]) => {
    const statusLabels = ['pending', 'preparing', 'shipping', 'delivered', 'cancelled'];
    const statusText = {
      pending: 'Chờ xác nhận',
      preparing: 'Đang chuẩn bị',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };

    const statusCount = statusLabels.map((status) =>
      orders.filter((order) => order.status === status).length,
    );

    return {
      labels: statusLabels.map((status) => statusText[status as keyof typeof statusText]),
      datasets: [{ data: statusCount }],
    };
  };

  const buildTopFoods = (orders: Order[]) => {
    const foodCount = new Map<string, number>();

    orders
      .filter((order) => order.status === 'delivered')
      .forEach((order) => {
        order.items.forEach((item) => {
          foodCount.set(item.name, (foodCount.get(item.name) || 0) + (item.quantity || 0));
        });
      });

    return Array.from(foodCount.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const buildTopCustomers = (orders: Order[]) => {
    const customerCount = new Map<string, { name: string; count: number }>();

    orders
      .filter((order) => order.status === 'delivered')
      .forEach((order) => {
        const key = order.userId || order.customerName || 'customer';
        const displayName = order.customerName || `Khách ${key.slice(-4)}`;
        const current = customerCount.get(key) || { name: displayName, count: 0 };
        current.count += 1;
        customerCount.set(key, current);
      });

    return Array.from(customerCount.entries())
      .map(([id, data]) => ({ id, username: data.name, orderCount: data.count }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);
  };

  const buildInsightMetrics = (orders: Order[], completedOrders: Order[]) => {
    const newOrders = orders.filter((order) => order.status === 'pending').length;
    const delivered = completedOrders.length;
    const customerOrderMap = new Map<string, number>();

    completedOrders.forEach((order) => {
      const key = order.userId || order.customerName || 'customer';
      customerOrderMap.set(key, (customerOrderMap.get(key) || 0) + 1);
    });

    const repeatCustomers = Array.from(customerOrderMap.values()).filter((count) => count > 1).length;
    const avgItems =
      completedOrders.length > 0
        ? (
            completedOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0) /
            completedOrders.length
          ).toFixed(1)
        : '0';

    return {
      newOrders,
      delivered,
      repeatCustomers,
      avgItems: Number(avgItems),
    };
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

  const handleExportReport = async () => {
    try {
      const reportData = {
        timeRange,
        statistics: {
          totalRevenue: statistics.totalRevenue,
          totalOrders: statistics.totalOrders,
          averageOrderValue: statistics.averageOrderValue,
          successRate: statistics.successRate,
        },
        systemStats: userRole === 'admin' ? systemStats : null,
        topFoods,
        topUsers,
        generatedAt: new Date().toISOString(),
      };

      const reportText = `
BÁO CÁO THỐNG KÊ - ${timeRange.toUpperCase()}
Thời gian: ${new Date().toLocaleString('vi-VN')}

TỔNG QUAN:
- Doanh thu: ${formatCurrency(statistics.totalRevenue)}
- Tổng đơn hàng: ${statistics.totalOrders}
- Giá trị đơn trung bình: ${formatCurrency(statistics.averageOrderValue)}
- Tỷ lệ thành công: ${statistics.successRate.toFixed(1)}%

${userRole === 'admin' ? `
HỆ THỐNG:
- Tổng người dùng: ${systemStats.totalUsers}
- Tổng nhà hàng: ${systemStats.totalRestaurants}
- Tổng tài xế: ${systemStats.totalShippers}
- Đơn đang xử lý: ${systemStats.activeOrders}
` : ''}

TOP 5 MÓN ĂN BÁN CHẠY:
${topFoods.map((food, index) => `${index + 1}. ${food.name}: ${food.quantity} đơn`).join('\n')}

TOP 5 KHÁCH HÀNG:
${topUsers.map((user, index) => `${index + 1}. ${user.username}: ${user.orderCount} đơn`).join('\n')}
      `.trim();

      await Share.share({
        message: reportText,
        title: `Báo cáo thống kê ${timeRange}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Lỗi', 'Không thể xuất báo cáo');
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(238, 77, 45, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const timeRangeDisplay = {
    today: 'Hôm nay',
    week: '7 ngày qua',
    month: '30 ngày qua',
    year: '12 tháng qua',
  }[timeRange];

  const insightConfig = [
    {
      key: 'newOrders',
      label: 'Đơn mới',
      value: insightMetrics.newOrders,
      icon: 'notifications-active',
      tint: '#fcd34d',
    },
    {
      key: 'delivered',
      label: 'Đơn hoàn tất',
      value: insightMetrics.delivered,
      icon: 'check-circle',
      tint: '#86efac',
    },
    {
      key: 'repeat',
      label: 'Khách quay lại',
      value: insightMetrics.repeatCustomers,
      icon: 'loop',
      tint: '#c4b5fd',
    },
    {
      key: 'avgItems',
      label: 'Món/đơn',
      value: insightMetrics.avgItems,
      icon: 'restaurant-menu',
      tint: '#fda4af',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <RestaurantScreenWrapper
      title="Doanh thu"
      subtitle="Theo dõi hiệu suất kinh doanh"
      scrollable={false}
      rightContent={
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleExportReport}>
            <MaterialIcons name="download" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton} onPress={onRefresh}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >

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

      {userRole === 'admin' && (
        <View style={styles.systemStatsSection}>
          <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
          <View style={styles.systemStatsGrid}>
            <View style={styles.systemStatCard}>
              <MaterialIcons name="people" size={28} color="#0EA5E9" />
              <Text style={styles.systemStatValue}>{systemStats.totalUsers}</Text>
              <Text style={styles.systemStatLabel}>Tổng người dùng</Text>
            </View>
            <View style={styles.systemStatCard}>
              <MaterialIcons name="restaurant" size={28} color="#F97316" />
              <Text style={styles.systemStatValue}>{systemStats.totalRestaurants}</Text>
              <Text style={styles.systemStatLabel}>Nhà hàng</Text>
            </View>
            <View style={styles.systemStatCard}>
              <MaterialIcons name="local-shipping" size={28} color="#22C55E" />
              <Text style={styles.systemStatValue}>{systemStats.totalShippers}</Text>
              <Text style={styles.systemStatLabel}>Tài xế</Text>
            </View>
            <View style={styles.systemStatCard}>
              <MaterialIcons name="receipt-long" size={28} color="#8B5CF6" />
              <Text style={styles.systemStatValue}>{systemStats.activeOrders}</Text>
              <Text style={styles.systemStatLabel}>Đơn đang xử lý</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.highlightCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.highlightLabel}>Doanh thu {timeRangeDisplay}</Text>
          <Text style={styles.highlightValue}>{formatCurrency(statistics.totalRevenue)}</Text>
          <Text style={styles.highlightSub}>
            {statistics.totalOrders} đơn • {statistics.successRate.toFixed(1)}% hoàn tất
          </Text>
        </View>
        <View style={styles.highlightBadge}>
          <MaterialIcons name="trending-up" size={20} color="#fff" />
          <Text style={styles.highlightBadgeText}>
            Trung bình {formatCurrency(statistics.averageOrderValue)}
          </Text>
        </View>
      </View>

      <View style={styles.insightGrid}>
        {insightConfig.map((item) => (
          <View key={item.key} style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: item.tint }]}>
              <MaterialIcons name={item.icon as any} size={18} color="#111" />
            </View>
            <Text style={styles.insightValue}>{item.value}</Text>
            <Text style={styles.insightLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Card title="Biểu đồ doanh thu" style={styles.chartCard}>
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
      </Card>

      <Card title="Trạng thái đơn hàng" style={styles.chartCard}>
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
      </Card>

      <Card title="Top 5 món ăn bán chạy" style={styles.chartCard}>
        {topFoods.map((food, index) => (
          <View key={food.name} style={styles.rankingItem}>
            <Text style={styles.rankingNumber}>#{index + 1}</Text>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName}>{food.name}</Text>
              <Text style={styles.rankingValue}>{food.quantity} đơn</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card title="Top 5 khách hàng" style={styles.chartCard}>
        {topUsers.map((user, index) => (
          <View key={user.id} style={styles.rankingItem}>
            <Text style={styles.rankingNumber}>#{index + 1}</Text>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName}>{user.username}</Text>
              <Text style={styles.rankingValue}>{user.orderCount} đơn</Text>
            </View>
          </View>
        ))}
      </Card>
      </ScrollView>
    </RestaurantScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsCardItem: {
    width: '50%',
    padding: 8,
  },
  chartCard: {
    marginBottom: 16,
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
  highlightCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  highlightLabel: {
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 8,
  },
  highlightValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  highlightSub: {
    color: '#d1d5db',
    marginTop: 4,
  },
  highlightBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  highlightBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  insightCard: {
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  insightLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  systemStatsSection: {
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
  systemStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  systemStatCard: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  systemStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  systemStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default StatisticsScreen; 
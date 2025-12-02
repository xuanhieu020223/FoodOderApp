import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList, RestaurantTabParamList } from '../../navigation/AdminNavigator';
import { auth, db } from '../../config/Firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  where, 
  Timestamp,
  orderBy,
  limit 
} from 'firebase/firestore';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import RestaurantScreenWrapper from '../../components/RestaurantScreenWrapper';
import { Card, Statistic, Button, Tag, Badge } from '../../components/admin/AntDesignComponents';

type AdminNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RestaurantTabParamList>,
  NativeStackNavigationProp<AdminStackParamList>
>;

interface MenuItemProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
  color: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, icon, description, color, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.menuIconContainer, { backgroundColor: color }]}>
      <MaterialIcons name={icon} size={28} color="#fff" />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuDescription}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#999" />
  </TouchableOpacity>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation<AdminNavigationProp>();
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('restaurant');
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  const [stats, setStats] = useState({
    newOrders: 0,
    todayRevenue: 0,
    newCustomers: 0,
    outOfStock: 0,
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const statCards = [
    {
      title: 'Đơn hàng mới',
      value: stats.newOrders.toString(),
      icon: 'receipt-long' as const,
      color: '#FFE8D9',
      iconColor: '#F97316',
    },
    {
      title: 'Doanh thu hôm nay',
      value: `${(stats.todayRevenue / 1000000).toFixed(1)}M`,
      icon: 'attach-money' as const,
      color: '#DCFCE7',
      iconColor: '#22C55E',
    },
    {
      title: 'Khách hàng mới',
      value: stats.newCustomers.toString(),
      icon: 'groups' as const,
      color: '#E0F2FE',
      iconColor: '#0EA5E9',
    },
    {
      title: 'Sản phẩm hết hàng',
      value: stats.outOfStock.toString(),
      icon: 'error-outline' as const,
      color: '#FEE2E2',
      iconColor: '#EF4444',
    },
  ];

  const managementMenu: MenuItemProps[] = [
    {
      title: 'Quản lý đơn hàng',
      icon: 'receipt-long',
      description: 'Theo dõi trạng thái đơn và cập nhật nhanh',
      color: '#F97316',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      title: 'Quản lý món ăn',
      icon: 'restaurant-menu',
      description: 'Thêm mới và chỉnh sửa thực đơn',
      color: '#22C55E',
      onPress: () => navigation.navigate('Menu'),
    },
    {
      title: 'Danh mục món',
      icon: 'category',
      description: 'Sắp xếp và quản lý nhóm món',
      color: '#EC4899',
      onPress: () => navigation.navigate('ManageCategories'),
    },
    {
      title: 'Khuyến mãi',
      icon: 'campaign',
      description: 'Tạo chiến dịch ưu đãi nhanh',
      color: '#8B5CF6',
      onPress: () => navigation.navigate('Promotions'),
    },
    ...(userRole === 'admin'
      ? [
          {
            title: 'Người dùng',
            icon: 'people',
            description: 'Khách hàng • nhà hàng • shipper',
            color: '#0EA5E9',
            onPress: () => navigation.navigate('ManageUsers'),
          } as MenuItemProps,
          {
            title: 'Quản lý nhà hàng',
            icon: 'store',
            description: 'Xem và quản lý tất cả nhà hàng',
            color: '#FF6B35',
            onPress: () => navigation.navigate('ManageRestaurants'),
          } as MenuItemProps,
        ]
      : []),
    {
      title: 'Báo cáo & phân tích',
      icon: 'bar-chart',
      description: 'Hiệu suất bán hàng & giao hàng',
      color: '#14B8A6',
      onPress: () => navigation.navigate('Statistics'),
    },
    {
      title: 'Hỗ trợ & khiếu nại',
      icon: 'support-agent',
      description: 'Xử lý ticket & phản hồi KH',
      color: '#FBBF24',
      onPress: () => navigation.navigate('Support'),
    },
  ];

  useEffect(() => {
    loadRestaurantInfo();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Đếm đơn hàng mới hôm nay
      const ordersRef = collection(db, 'orders');
      const newOrdersQuery = query(
        ordersRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('status', 'in', ['pending', 'confirmed', 'processing'])
      );
      const newOrdersSnapshot = await getDocs(newOrdersQuery);
      const newOrdersCount = newOrdersSnapshot.size;

      // Tính doanh thu hôm nay
      const todayRevenueQuery = query(
        ordersRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('status', '==', 'delivered')
      );
      const todayRevenueSnapshot = await getDocs(todayRevenueQuery);
      const todayRevenue = todayRevenueSnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().totalAmount || 0);
      }, 0);

      // Đếm khách hàng mới (7 ngày qua)
      const usersRef = collection(db, 'users');
      const newCustomersQuery = query(
        usersRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfWeek)),
        where('role', '==', 'customer')
      );
      const newCustomersSnapshot = await getDocs(newCustomersQuery);
      const newCustomersCount = newCustomersSnapshot.size;

      // Đếm sản phẩm hết hàng
      const foodsRef = collection(db, 'foods');
      const outOfStockQuery = query(foodsRef, where('stock', '==', 0));
      const outOfStockSnapshot = await getDocs(outOfStockQuery);
      const outOfStockCount = outOfStockSnapshot.size;

      // Tổng số người dùng
      const allUsersSnapshot = await getDocs(usersRef);
      const totalUsers = allUsersSnapshot.size;
      const totalRestaurants = allUsersSnapshot.docs.filter(
        doc => doc.data().role === 'restaurant'
      ).length;

      // Tổng đơn hàng và doanh thu
      const allOrdersSnapshot = await getDocs(ordersRef);
      const totalOrders = allOrdersSnapshot.size;
      const totalRevenue = allOrdersSnapshot.docs
        .filter(doc => doc.data().status === 'delivered')
        .reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);

      setStats({
        newOrders: newOrdersCount,
        todayRevenue,
        newCustomers: newCustomersCount,
        outOfStock: outOfStockCount,
        totalUsers,
        totalRestaurants,
        totalOrders,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRestaurantInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = (userData.role || 'restaurant').toLowerCase();
        setUserRole(role);

        if (role === 'restaurant') {
          const restaurantDoc = await getDoc(doc(db, 'restaurants', user.uid));
          if (restaurantDoc.exists()) {
            const restaurantData = restaurantDoc.data();
            setRestaurantInfo({
              name: restaurantData.name || 'Nhà hàng',
              image: restaurantData.image,
            });
          } else {
            setRestaurantInfo({ name: userData.name || 'Nhà hàng' });
          }
        } else {
          setRestaurantInfo({ name: userData.name || 'Admin' });
        }
      }
    } catch (error) {
      console.error('Error loading restaurant info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as any }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    }
  };

  const headerRight = (
    <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Statistics')}>
      <MaterialIcons name="insights" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const headerExtras = (
    <View style={styles.profileCard}>
      <View style={styles.profileAvatar}>
        {restaurantInfo?.image ? (
          <Image source={{ uri: restaurantInfo.image }} style={styles.profileImage} />
        ) : (
          <MaterialIcons name="restaurant" size={28} color="#ee4d2d" />
        )}
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileLabel}>Xin chào</Text>
        <Text style={styles.profileName}>{restaurantInfo?.name || 'Nhà hàng FoodOrder'}</Text>
      </View>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutPill}>
        <MaterialIcons name="logout" size={18} color="#ee4d2d" />
        <Text style={styles.logoutPillText}>Đăng xuất</Text>
      </TouchableOpacity>
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
    <>
      <RestaurantScreenWrapper
        title={restaurantInfo?.name || 'Nhà hàng'}
        subtitle={userRole === 'admin' ? 'Quản trị hệ thống' : 'Quản lý nhà hàng'}
        rightContent={headerRight}
        headerExtras={headerExtras}
      >
        <Card
          title="Tổng quan hôm nay"
          extra={
          <TouchableOpacity onPress={() => navigation.navigate('Statistics')}>
              <Text style={styles.linkText}>Xem chi tiết →</Text>
          </TouchableOpacity>
          }
          style={styles.dashboardCard}
        >
          {loadingStats ? (
            <View style={styles.statsLoadingContainer}>
              <ActivityIndicator size="small" color="#1890ff" />
        </View>
          ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          {statCards.map((card) => (
                <Card
                  key={card.title}
                  style={[styles.statCard, { backgroundColor: card.color }]}
                  bordered={false}
                  shadow={true}
                >
              <View style={[styles.statIconContainer, { backgroundColor: card.iconColor }]}>
                    <MaterialIcons name={card.icon} size={24} color="#fff" />
                  </View>
                  <Statistic
                    title={card.title}
                    value={card.value}
                    valueStyle={styles.statValue}
                    titleStyle={styles.statLabel}
                  />
                </Card>
              ))}
            </ScrollView>
          )}
        </Card>

        {userRole === 'admin' && (
          <Card title="Tổng quan hệ thống" style={styles.dashboardCard}>
            <View style={styles.systemStatsContainer}>
              <View style={styles.systemStatCard}>
                <MaterialIcons name="people" size={28} color="#1890ff" />
                <Statistic
                  title="Tổng người dùng"
                  value={stats.totalUsers}
                  valueStyle={styles.systemStatValue}
                />
              </View>
              <View style={styles.systemStatCard}>
                <MaterialIcons name="restaurant" size={28} color="#fa8c16" />
                <Statistic
                  title="Nhà hàng"
                  value={stats.totalRestaurants}
                  valueStyle={styles.systemStatValue}
                />
              </View>
              <View style={styles.systemStatCard}>
                <MaterialIcons name="receipt-long" size={28} color="#52c41a" />
                <Statistic
                  title="Tổng đơn hàng"
                  value={stats.totalOrders}
                  valueStyle={styles.systemStatValue}
                />
              </View>
              <View style={styles.systemStatCard}>
                <MaterialIcons name="attach-money" size={28} color="#722ed1" />
                <Statistic
                  title="Tổng doanh thu"
                  value={`${(stats.totalRevenue / 1000000).toFixed(1)}M`}
                  valueStyle={styles.systemStatValue}
                />
              </View>
            </View>
          </Card>
        )}

        <Card title="Quản lý nhà hàng" style={styles.dashboardCard}>
        {managementMenu.map((item) => (
          <MenuItem key={item.title} {...item} />
        ))}
        </Card>

        <Card title="Cài đặt" style={styles.dashboardCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setChangePasswordModalVisible(true)}
        >
            <View style={[styles.menuIconContainer, { backgroundColor: '#eb2f96' }]}>
            <MaterialIcons name="lock" size={28} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Đổi mật khẩu</Text>
            <Text style={styles.menuDescription}>Thay đổi mật khẩu đăng nhập</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
        </Card>
      </RestaurantScreenWrapper>

      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logoutPillText: {
    marginLeft: 6,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  linkText: {
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '600',
  },
  statsScroll: {
    paddingVertical: 6,
  },
  statCard: {
    width: Dimensions.get('window').width * 0.6,
    borderRadius: 20,
    padding: 18,
    marginRight: 14,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#475467',
    marginTop: 4,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  menuIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#666',
  },
  statsLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  systemStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  systemStatCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  systemStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  systemStatLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dashboardCard: {
    marginBottom: 16,
  },
});

export default AdminDashboardScreen; 
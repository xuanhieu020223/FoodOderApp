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
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc } from 'firebase/firestore';

type AdminNavigationProp = StackNavigationProp<AdminStackParamList>;

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <MaterialIcons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

interface MenuItemProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  screen: keyof AdminStackParamList;
  description: string;
  color: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, icon, screen, description, color }) => {
  const navigation = useNavigation<AdminNavigationProp>();

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => navigation.navigate(screen)}
    >
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
};

const AdminDashboardScreen = () => {
  const navigation = useNavigation<AdminNavigationProp>();
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('restaurant');

  useEffect(() => {
    loadRestaurantInfo();
  }, []);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          {restaurantInfo?.image && (
            <Image source={{ uri: restaurantInfo.image }} style={styles.restaurantAvatar} />
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurantInfo?.name || 'Nhà hàng'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <StatCard
            title="Đơn hàng mới"
            value="25"
            icon="receipt"
            color="#2196F3"
          />
          <StatCard
            title="Doanh thu hôm nay"
            value="12.5M"
            icon="attach-money"
            color="#4CAF50"
          />
          <StatCard
            title="Khách hàng mới"
            value="08"
            icon="person-add"
            color="#FF9800"
          />
          <StatCard
            title="Sản phẩm hết hàng"
            value="03"
            icon="error"
            color="#f44336"
          />
        </View>

        <Text style={styles.sectionTitle}>Quản lý nhà hàng</Text>
        
        <MenuItem
          title="Quản lý đơn hàng"
          icon="receipt"
          screen="ManageOrders"
          description="Xem và xử lý đơn hàng mới"
          color="#2196F3"
        />
        
        <MenuItem
          title="Quản lý món ăn"
          icon="restaurant"
          screen="ManageProducts"
          description="Thêm, sửa, xóa món ăn"
          color="#4CAF50"
        />
        
        <MenuItem
          title="Quản lý danh mục"
          icon="category"
          screen="ManageCategories"
          description="Sắp xếp và phân loại món ăn"
          color="#FF9800"
        />
        
        {userRole === 'admin' && (
          <MenuItem
            title="Quản lý người dùng"
            icon="people"
            screen="ManageUsers"
            description="Quản lý tài khoản khách hàng"
            color="#9C27B0"
          />
        )}
        
        <MenuItem
          title="Thống kê doanh thu"
          icon="bar-chart"
          screen="Statistics"
          description="Xem báo cáo và phân tích"
          color="#607D8B"
        />
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 14,
    marginBottom: 2,
  },
  restaurantName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
});

export default AdminDashboardScreen; 
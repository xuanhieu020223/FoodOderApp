import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { UserStackParamList, TabParamList } from '../../navigation/UserNavigator';
import { NavigatorScreenParams } from '@react-navigation/native';

type NavigationProps = NativeStackNavigationProp<UserStackParamList>;

interface UserData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  coins: number;
  vouchers: number;
  favorites: number;
}

interface Statistics {
  totalOrders: number;
  totalSpent: number;
  completedOrders: number;
  favoriteRestaurants: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: Exclude<keyof UserStackParamList, 'TabNavigator' | 'FoodDetail' | 'Checkout'> | 'Favorites';
}

const menuItems: MenuItem[] = [
  {
    id: 'account',
    title: 'Thông tin tài khoản',
    icon: 'person-outline',
    color: '#2196F3',
    screen: 'AccountInfo',
  },
  {
    id: 'address',
    title: 'Sổ địa chỉ',
    icon: 'location-outline',
    color: '#4CAF50',
    screen: 'Address',
  },
  {
    id: 'payment',
    title: 'Phương thức thanh toán',
    icon: 'card-outline',
    color: '#FF9800',
    screen: 'Payment',
  },
  {
    id: 'vouchers',
    title: 'Voucher của tôi',
    icon: 'ticket-outline',
    color: '#9C27B0',
    screen: 'Vouchers',
  },
  {
    id: 'favorites',
    title: 'Món ăn yêu thích',
    icon: 'heart-outline',
    color: '#E91E63',
    screen: 'Favorites',
  },
  {
    id: 'settings',
    title: 'Cài đặt',
    icon: 'settings-outline',
    color: '#607D8B',
    screen: 'Settings',
  },
  {
    id: 'help',
    title: 'Trung tâm trợ giúp',
    icon: 'help-circle-outline',
    color: '#00BCD4',
    screen: 'Help',
  },
  {
    id: 'chatbot',
    title: 'Trợ lý AI',
    icon: 'chatbubble-ellipses',
    color: '#ee4d2d',
    screen: 'Chatbot',
  },
];

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    totalOrders: 0,
    totalSpent: 0,
    completedOrders: 0,
    favoriteRestaurants: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadUserData();
    loadStatistics();
    loadAchievements();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      loadStatistics();
      loadAchievements();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      let totalOrders = 0;
      let totalSpent = 0;
      let completedOrders = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalOrders++;
        if (data.totalAmount) {
          totalSpent += data.totalAmount;
        }
        if (data.status === 'delivered') {
          completedOrders++;
        }
      });

      // Count favorite restaurants
      const favoritesRef = collection(db, 'favorites');
      const favoritesQuery = query(favoritesRef, where('userId', '==', user.uid));
      const favoritesSnapshot = await getDocs(favoritesQuery);
      
      const restaurantIds = new Set<string>();
      favoritesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.restaurantId) {
          restaurantIds.add(data.restaurantId);
        }
      });

      setStatistics({
        totalOrders,
        totalSpent,
        completedOrders,
        favoriteRestaurants: restaurantIds.size,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadAchievements = () => {
    const userStats = statistics;
    const allAchievements: Achievement[] = [
      {
        id: 'first_order',
        title: 'Khách hàng đầu tiên',
        description: 'Đặt đơn hàng đầu tiên',
        icon: 'star',
        color: '#FFD700',
        unlocked: userStats.totalOrders >= 1,
        progress: Math.min(userStats.totalOrders, 1),
        maxProgress: 1,
      },
      {
        id: 'regular_customer',
        title: 'Khách hàng thân thiết',
        description: 'Hoàn thành 10 đơn hàng',
        icon: 'trophy',
        color: '#FF9800',
        unlocked: userStats.completedOrders >= 10,
        progress: Math.min(userStats.completedOrders, 10),
        maxProgress: 10,
      },
      {
        id: 'big_spender',
        title: 'Người tiêu dùng lớn',
        description: 'Chi tiêu 1,000,000 đ',
        icon: 'cash',
        color: '#4CAF50',
        unlocked: userStats.totalSpent >= 1000000,
        progress: Math.min(userStats.totalSpent, 1000000),
        maxProgress: 1000000,
      },
      {
        id: 'food_lover',
        title: 'Người yêu ẩm thực',
        description: 'Yêu thích 5 nhà hàng',
        icon: 'heart',
        color: '#E91E63',
        unlocked: userStats.favoriteRestaurants >= 5,
        progress: Math.min(userStats.favoriteRestaurants, 5),
        maxProgress: 5,
      },
      {
        id: 'vip_customer',
        title: 'Khách hàng VIP',
        description: 'Hoàn thành 50 đơn hàng',
        icon: 'diamond',
        color: '#9C27B0',
        unlocked: userStats.completedOrders >= 50,
        progress: Math.min(userStats.completedOrders, 50),
        maxProgress: 50,
      },
    ];

    // Update achievements with current stats
    setAchievements(allAchievements.map(achievement => ({
      ...achievement,
      unlocked: achievement.progress! >= achievement.maxProgress!,
    })));
  };

  useEffect(() => {
    if (statistics.totalOrders > 0) {
      loadAchievements();
    }
  }, [statistics]);

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        name: editingName,
        phone: editingPhone,
      });

      setUserData(prev => ({
        ...prev!,
        name: editingName,
        phone: editingPhone,
      }));

      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const user = auth.currentUser;
        if (!user) return;

        setUploadingImage(true);
        
        // Upload image to Cloudinary
        const imageUrl = await uploadImageToCloudinary(result.assets[0].uri);

        // Save Cloudinary URL to Firebase
        await updateDoc(doc(db, 'users', user.uid), {
          avatar: imageUrl,
        });

        setUserData(prev => ({
          ...prev!,
          avatar: imageUrl,
        }));

        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện');
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất');
            }
          },
        },
      ]
    );
  };

  const handleMenuPress = (screen: MenuItem['screen']) => {
    if (screen === 'Favorites') {
      navigation.navigate('TabNavigator', {
        screen: 'Favorites'
      } as NavigatorScreenParams<TabParamList>);
    } else if (screen === 'Chatbot') {
      navigation.navigate('Chatbot');
    } else {
      navigation.navigate(screen);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color="#ee4d2d" />
      </View>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {uploadingImage ? (
                <LoadingSpinner size="small" color="#fff" />
              ) : (
                <>
                  <Image
                    source={
                      userData?.avatar
                        ? { uri: userData.avatar }
                        : { 
                            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'User')}&background=ee4d2d&color=fff&size=200`
                          }
                    }
                    style={styles.avatar}
                  />
                  <View style={styles.editAvatarButton}>
                    <Ionicons name="camera" size={20} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userData?.name || 'Chưa cập nhật'}</Text>
              <Text style={styles.email}>{userData?.email || 'Chưa cập nhật'}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditingName(userData?.name || '');
                  setEditingPhone(userData?.phone || '');
                  setEditModalVisible(true);
                }}
              >
                <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
                <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFE0B2' }]}>
                <Ionicons name="cash-outline" size={24} color="#FF9800" />
              </View>
              <Text style={styles.statValue}>{userData?.coins || 0}</Text>
              <Text style={styles.statLabel}>Xu</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E1BEE7' }]}>
                <Ionicons name="ticket" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.statValue}>{userData?.vouchers || 0}</Text>
              <Text style={styles.statLabel}>Voucher</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFCDD2' }]}>
                <Ionicons name="heart" size={24} color="#F44336" />
              </View>
              <Text style={styles.statValue}>{userData?.favorites || 0}</Text>
              <Text style={styles.statLabel}>Yêu thích</Text>
            </View>
          </View>

          {/* Extended Statistics */}
          <View style={styles.extendedStatsContainer}>
            <View style={styles.extendedStatItem}>
              <MaterialIcons name="receipt-long" size={20} color="#2196F3" />
              <View style={styles.extendedStatInfo}>
                <Text style={styles.extendedStatValue}>{statistics.totalOrders}</Text>
                <Text style={styles.extendedStatLabel}>Tổng đơn hàng</Text>
              </View>
            </View>
            <View style={styles.extendedStatItem}>
              <MaterialIcons name="attach-money" size={20} color="#4CAF50" />
              <View style={styles.extendedStatInfo}>
                <Text style={styles.extendedStatValue}>
                  {(statistics.totalSpent / 1000).toFixed(0)}K
                </Text>
                <Text style={styles.extendedStatLabel}>Tổng chi tiêu</Text>
              </View>
            </View>
            <View style={styles.extendedStatItem}>
              <MaterialIcons name="check-circle" size={20} color="#FF9800" />
              <View style={styles.extendedStatInfo}>
                <Text style={styles.extendedStatValue}>{statistics.completedOrders}</Text>
                <Text style={styles.extendedStatLabel}>Đơn đã hoàn thành</Text>
              </View>
            </View>
            <View style={styles.extendedStatItem}>
              <MaterialIcons name="restaurant" size={20} color="#E91E63" />
              <View style={styles.extendedStatInfo}>
                <Text style={styles.extendedStatValue}>{statistics.favoriteRestaurants}</Text>
                <Text style={styles.extendedStatLabel}>Nhà hàng yêu thích</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Thành tích</Text>
              <Text style={styles.sectionSubtitle}>
                {unlockedAchievements}/{achievements.length} đã mở khóa
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementCardLocked,
                ]}
              >
                <View style={[
                  styles.achievementIcon,
                  { backgroundColor: achievement.unlocked ? achievement.color : '#E0E0E0' }
                ]}>
                  <Ionicons
                    name={achievement.icon as any}
                    size={32}
                    color={achievement.unlocked ? '#fff' : '#999'}
                  />
                </View>
                <Text style={[
                  styles.achievementTitle,
                  !achievement.unlocked && styles.achievementTitleLocked
                ]} numberOfLines={1}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription} numberOfLines={2}>
                  {achievement.description}
                </Text>
                {achievement.progress !== undefined && achievement.maxProgress !== undefined && (
                  <View style={styles.achievementProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                            backgroundColor: achievement.unlocked ? achievement.color : '#E0E0E0',
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {achievement.progress}/{achievement.maxProgress}
                    </Text>
                  </View>
                )}
                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={achievement.color} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.lastMenuItem
              ]}
              onPress={() => handleMenuPress(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#fff" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ee4d2d" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
      </ScrollView>
      
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Họ tên</Text>
              <TextInput
                style={styles.input}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Nhập họ tên"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={editingPhone}
                onChangeText={setEditingPhone}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#ee4d2d',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  extendedStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  extendedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    minWidth: '45%',
    gap: 8,
  },
  extendedStatInfo: {
    flex: 1,
  },
  extendedStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  extendedStatLabel: {
    fontSize: 11,
    color: '#666',
  },
  achievementsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  achievementCard: {
    width: 140,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: '#999',
  },
  achievementDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementProgress: {
    width: '100%',
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;

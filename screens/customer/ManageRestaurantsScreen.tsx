import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, getDocs, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/Firebase';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  image?: string;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  status: 'active' | 'blocked' | 'pending';
  openingHours: string;
  ownerId: string;
  ownerName?: string;
  createdAt: any;
}

const ManageRestaurantsScreen = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'pending'>('all');

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const restaurantsData: Restaurant[] = [];

      for (const docSnap of querySnapshot.docs) {
        const restaurantData = docSnap.data();
        
        // Lấy thông tin chủ nhà hàng
        let ownerName = 'Chưa xác định';
        try {
          const ownerDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', docSnap.id)));
          if (!ownerDoc.empty) {
            ownerName = ownerDoc.docs[0].data().name || ownerDoc.docs[0].data().username || 'Chưa xác định';
          }
        } catch (error) {
          console.error('Error loading owner:', error);
        }

        // Tính toán thống kê đơn hàng
        const ordersRef = collection(db, 'orders');
        const restaurantOrdersQuery = query(ordersRef, where('restaurantId', '==', docSnap.id));
        const ordersSnapshot = await getDocs(restaurantOrdersQuery);
        const totalOrders = ordersSnapshot.size;
        const totalRevenue = ordersSnapshot.docs
          .filter(order => order.data().status === 'delivered')
          .reduce((sum, order) => sum + (order.data().totalAmount || 0), 0);

        restaurantsData.push({
          id: docSnap.id,
          name: restaurantData.name || 'Chưa có tên',
          address: restaurantData.address || 'Chưa có địa chỉ',
          phone: restaurantData.phone || 'Chưa có số điện thoại',
          image: restaurantData.image,
          rating: restaurantData.rating || 0,
          totalOrders,
          totalRevenue,
          status: restaurantData.status || 'active',
          openingHours: restaurantData.openingHours || 'Chưa cập nhật',
          ownerId: docSnap.id,
          ownerName,
          createdAt: restaurantData.createdAt,
        });
      }

      setRestaurants(restaurantsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách nhà hàng');
      setLoading(false);
    }
  };

  const filteredRestaurants = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      if (statusFilter !== 'all' && restaurant.status !== statusFilter) {
        return false;
      }
      if (keyword) {
        return (
          restaurant.name.toLowerCase().includes(keyword) ||
          restaurant.address.toLowerCase().includes(keyword) ||
          restaurant.phone.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [restaurants, statusFilter, searchQuery]);

  const handleBlockRestaurant = async (restaurantId: string) => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        status: 'blocked'
      });
      
      setRestaurants(restaurants.map(restaurant =>
        restaurant.id === restaurantId ? { ...restaurant, status: 'blocked' } : restaurant
      ));
      
      Alert.alert('Thành công', 'Đã chặn nhà hàng');
    } catch (error) {
      console.error('Error blocking restaurant:', error);
      Alert.alert('Lỗi', 'Không thể chặn nhà hàng');
    }
  };

  const handleUnblockRestaurant = async (restaurantId: string) => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        status: 'active'
      });
      
      setRestaurants(restaurants.map(restaurant =>
        restaurant.id === restaurantId ? { ...restaurant, status: 'active' } : restaurant
      ));
      
      Alert.alert('Thành công', 'Đã bỏ chặn nhà hàng');
    } catch (error) {
      console.error('Error unblocking restaurant:', error);
      Alert.alert('Lỗi', 'Không thể bỏ chặn nhà hàng');
    }
  };

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setModalVisible(true);
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => {
    return (
      <TouchableOpacity
        style={styles.restaurantCard}
        onPress={() => handleViewDetails(item)}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.restaurantImage} />
        ) : (
          <View style={[styles.restaurantImage, styles.defaultImage]}>
            <MaterialIcons name="restaurant" size={40} color="#666" />
          </View>
        )}
        
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantHeader}>
            <View style={styles.restaurantHeaderText}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'active' ? '#4CAF50' : item.status === 'pending' ? '#FF9800' : '#f44336' }
            ]}>
              <Text style={styles.statusText}>
                {item.status === 'active' ? 'Hoạt động' : item.status === 'pending' ? 'Chờ duyệt' : 'Đã chặn'}
              </Text>
            </View>
          </View>

          <View style={styles.restaurantDetails}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>

          <View style={styles.restaurantDetails}>
            <MaterialIcons name="phone" size={16} color="#666" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <MaterialIcons name="receipt-long" size={16} color="#666" />
              <Text style={styles.statText}>{item.totalOrders} đơn</Text>
            </View>
            <View style={styles.stat}>
              <MaterialIcons name="attach-money" size={16} color="#666" />
              <Text style={styles.statText}>
                {(item.totalRevenue / 1000000).toFixed(1)}M đ
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: item.status === 'active' ? '#f44336' : '#4CAF50' }
          ]}
          onPress={() => item.status === 'active'
            ? handleBlockRestaurant(item.id)
            : handleUnblockRestaurant(item.id)
          }
        >
          <MaterialIcons
            name={item.status === 'active' ? 'block' : 'check-circle'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải danh sách nhà hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm nhà hàng..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'active', 'blocked', 'pending'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive
              ]}>
                {status === 'all' ? 'Tất cả' : status === 'active' ? 'Hoạt động' : status === 'blocked' ? 'Đã chặn' : 'Chờ duyệt'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRestaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Không có nhà hàng</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết nhà hàng</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRestaurant && (
              <ScrollView style={styles.modalBody}>
                {selectedRestaurant.image ? (
                  <Image source={{ uri: selectedRestaurant.image }} style={styles.modalImage} />
                ) : (
                  <View style={[styles.modalImage, styles.defaultModalImage]}>
                    <MaterialIcons name="restaurant" size={60} color="#666" />
                  </View>
                )}

                <Text style={styles.modalName}>{selectedRestaurant.name}</Text>
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={20} color="#FFD700" />
                  <Text style={styles.modalRating}>{selectedRestaurant.rating.toFixed(1)}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="location-on" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedRestaurant.address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="phone" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedRestaurant.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedRestaurant.openingHours}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Thống kê</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <MaterialIcons name="receipt-long" size={24} color="#ee4d2d" />
                      <Text style={styles.statValue}>{selectedRestaurant.totalOrders}</Text>
                      <Text style={styles.statLabel}>Tổng đơn hàng</Text>
                    </View>
                    <View style={styles.statBox}>
                      <MaterialIcons name="attach-money" size={24} color="#ee4d2d" />
                      <Text style={styles.statValue}>
                        {(selectedRestaurant.totalRevenue / 1000000).toFixed(1)}M
                      </Text>
                      <Text style={styles.statLabel}>Tổng doanh thu</Text>
                    </View>
                  </View>
                </View>

                {selectedRestaurant.status === 'active' ? (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.blockButton]}
                    onPress={() => {
                      setModalVisible(false);
                      handleBlockRestaurant(selectedRestaurant.id);
                    }}
                  >
                    <MaterialIcons name="block" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Chặn nhà hàng</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.unblockButton]}
                    onPress={() => {
                      setModalVisible(false);
                      handleUnblockRestaurant(selectedRestaurant.id);
                    }}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Bỏ chặn</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    elevation: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    marginBottom: 10,
    elevation: 2,
  },
  filterScroll: {
    paddingHorizontal: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
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
  listContainer: {
    padding: 15,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  defaultImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantHeaderText: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  restaurantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
  },
  defaultModalImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalRating: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#fff3f0',
    padding: 15,
    borderRadius: 12,
    minWidth: 120,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  blockButton: {
    backgroundColor: '#f44336',
  },
  unblockButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
});

export default ManageRestaurantsScreen;


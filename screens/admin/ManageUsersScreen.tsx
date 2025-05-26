import React, { useState, useEffect } from 'react';
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

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  orderCount: number;
  totalSpent: number;
  lastActive: string;
  avatar?: string;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  createdAt: any; // Firebase Timestamp
  status: string;
  items: any[];
}

const ManageUsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Lấy danh sách người dùng từ Firebase
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      // Lấy thông tin đơn hàng để tính toán thống kê
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));

      const usersData: User[] = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        
        // Tính toán thống kê đơn hàng cho mỗi user
        const userOrders = orders.filter(order => order.userId === doc.id);
        const orderCount = userOrders.length;
        const totalSpent = userOrders.reduce((total, order) => total + (order.totalAmount || 0), 0);
        
        let lastActive = 'Chưa có đơn hàng';
        if (userOrders.length > 0) {
          const lastOrder = userOrders.reduce((latest, current) => {
            const currentDate = current.createdAt?.toDate() || new Date(0);
            const latestDate = latest.createdAt?.toDate() || new Date(0);
            return currentDate > latestDate ? current : latest;
          }, userOrders[0]);
          
          if (lastOrder.createdAt) {
            lastActive = lastOrder.createdAt.toDate().toLocaleString('vi-VN');
          }
        }
        
        usersData.push({
          id: doc.id,
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          role: userData.role || 'user',
          status: userData.status || 'active',
          orderCount,
          totalSpent,
          lastActive,
          avatar: userData.avatar
        });
      }
      
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'blocked'
      });
      
      setUsers(users.map(user =>
        user.id === userId ? { ...user, status: 'blocked' } : user
      ));
      
      Alert.alert('Thành công', 'Đã chặn người dùng');
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Lỗi', 'Không thể chặn người dùng');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'active'
      });
      
      setUsers(users.map(user =>
        user.id === userId ? { ...user, status: 'active' } : user
      ));
      
      Alert.alert('Thành công', 'Đã bỏ chặn người dùng');
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Lỗi', 'Không thể bỏ chặn người dùng');
    }
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleViewUserDetails(item)}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.defaultAvatar]}>
          <MaterialIcons name="account-circle" size={40} color="#666" />
        </View>
      )}
      
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? '#4CAF50' : '#f44336' }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'active' ? 'Hoạt động' : 'Đã chặn'}
            </Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          <MaterialIcons name="email" size={16} color="#666" />
          <Text style={styles.contactText}>{item.email}</Text>
        </View>

        <View style={styles.contactInfo}>
          <MaterialIcons name="phone" size={16} color="#666" />
          <Text style={styles.contactText}>{item.phone}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <MaterialIcons name="shopping-cart" size={16} color="#666" />
            <Text style={styles.statText}>{item.orderCount} đơn</Text>
          </View>
          <View style={styles.stat}>
            <MaterialIcons name="payments" size={16} color="#666" />
            <Text style={styles.statText}>
              {item.totalSpent.toLocaleString('vi-VN')}đ
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
          ? handleBlockUser(item.id)
          : handleUnblockUser(item.id)
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

  const UserDetailsModal = () => {
    if (!selectedUser) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết người dùng</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.userDetails}>
              {selectedUser.avatar ? (
                <Image
                  source={{ uri: selectedUser.avatar }}
                  style={styles.detailsAvatar}
                />
              ) : (
                <View style={[styles.detailsAvatar, styles.defaultDetailsAvatar]}>
                  <MaterialIcons name="account-circle" size={60} color="#666" />
                </View>
              )}

              <Text style={styles.detailsName}>{selectedUser.name}</Text>
              <View style={[
                styles.roleBadge,
                { backgroundColor: selectedUser.role === 'admin' ? '#2196F3' : '#FF9800' }
              ]}>
                <Text style={styles.roleText}>
                  {selectedUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                </Text>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                <View style={styles.detailRow}>
                  <MaterialIcons name="email" size={20} color="#666" />
                  <Text style={styles.detailText}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color="#666" />
                  <Text style={styles.detailText}>{selectedUser.phone}</Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Thống kê</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <MaterialIcons name="shopping-cart" size={24} color="#ee4d2d" />
                    <Text style={styles.statValue}>{selectedUser.orderCount}</Text>
                    <Text style={styles.statLabel}>Đơn hàng</Text>
                  </View>
                  <View style={styles.statBox}>
                    <MaterialIcons name="payments" size={24} color="#ee4d2d" />
                    <Text style={styles.statValue}>
                      {selectedUser.totalSpent.toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.statLabel}>Tổng chi tiêu</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Hoạt động</Text>
                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={20} color="#666" />
                  <Text style={styles.detailText}>
                    Hoạt động cuối: {selectedUser.lastActive}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons
                    name={selectedUser.status === 'active' ? 'check-circle' : 'block'}
                    size={20}
                    color={selectedUser.status === 'active' ? '#4CAF50' : '#f44336'}
                  />
                  <Text style={styles.detailText}>
                    Trạng thái: {selectedUser.status === 'active' ? 'Đang hoạt động' : 'Đã bị chặn'}
                  </Text>
                </View>
              </View>

              {selectedUser.status === 'active' ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.blockButton]}
                  onPress={() => {
                    setModalVisible(false);
                    handleBlockUser(selectedUser.id);
                  }}
                >
                  <MaterialIcons name="block" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Chặn người dùng</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.unblockButton]}
                  onPress={() => {
                    setModalVisible(false);
                    handleUnblockUser(selectedUser.id);
                  }}
                >
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Bỏ chặn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải danh sách người dùng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <MaterialIcons name="people" size={24} color="#ee4d2d" />
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Tổng người dùng</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>
            {users.filter(u => u.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Đang hoạt động</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialIcons name="block" size={24} color="#f44336" />
          <Text style={styles.statNumber}>
            {users.filter(u => u.status === 'blocked').length}
          </Text>
          <Text style={styles.statLabel}>Đã chặn</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người dùng..."
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
          <TouchableOpacity
            style={[
              styles.filterButton,
              roleFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setRoleFilter('all')}
          >
            <Text style={[
              styles.filterText,
              roleFilter === 'all' && styles.filterTextActive
            ]}>
              Tất cả vai trò
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              roleFilter === 'admin' && styles.filterButtonActive
            ]}
            onPress={() => setRoleFilter('admin')}
          >
            <Text style={[
              styles.filterText,
              roleFilter === 'admin' && styles.filterTextActive
            ]}>
              Quản trị viên
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              roleFilter === 'user' && styles.filterButtonActive
            ]}
            onPress={() => setRoleFilter('user')}
          >
            <Text style={[
              styles.filterText,
              roleFilter === 'user' && styles.filterTextActive
            ]}>
              Người dùng
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[
              styles.filterText,
              statusFilter === 'all' && styles.filterTextActive
            ]}>
              Tất cả trạng thái
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'active' && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[
              styles.filterText,
              statusFilter === 'active' && styles.filterTextActive
            ]}>
              Đang hoạt động
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'blocked' && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter('blocked')}
          >
            <Text style={[
              styles.filterText,
              statusFilter === 'blocked' && styles.filterTextActive
            ]}>
              Đã chặn
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={users.filter(user => {
          // Filter by role
          if (roleFilter !== 'all' && user.role !== roleFilter) {
            return false;
          }
          
          // Filter by status
          if (statusFilter !== 'all' && user.status !== statusFilter) {
            return false;
          }
          
          // Search by name, email or phone
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              user.name.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query) ||
              user.phone.toLowerCase().includes(query)
            );
          }
          
          return true;
        })}
        renderItem={renderUserItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <UserDetailsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCard: {
    alignItems: 'center',
    padding: 10,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  userCard: {
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
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
  userDetails: {
    padding: 20,
  },
  detailsAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 15,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  roleBadge: {
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 20,
  },
  roleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  detailText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
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
  defaultAvatar: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultDetailsAvatar: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default ManageUsersScreen; 
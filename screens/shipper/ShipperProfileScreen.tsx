import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  ScrollView, TextInput, Modal, Image 
} from 'react-native';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ChangePasswordModal from '../../components/ChangePasswordModal';

const ShipperProfileScreen = ({ navigation }: any) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDeliveries: 0, totalEarnings: 0, rating: 0, completedToday: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchUser();
    fetchStats();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        setUserData(null);
        setLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();
      setUserData(data);
      setEditName(data?.name || data?.username || '');
      setEditPhone(data?.phone || '');
      setEditAddress(data?.address || '');
    } catch (e) {
      console.error('Error fetching user:', e);
      setUserData(null);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      if (!user?.uid) return;
      
      const ordersRef = collection(db, 'orders');
      const deliveredQuery = query(
        ordersRef,
        where('shipperId', '==', user.uid),
        where('status', '==', 'delivered')
      );
      const snapshot = await getDocs(deliveredQuery);
      
      let totalDeliveries = 0;
      let totalEarnings = 0;
      let today = new Date();
      today.setHours(0, 0, 0, 0);
      let completedToday = 0;

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        totalDeliveries++;
        totalEarnings += data.totalAmount || 0;
        
        if (data.deliveredAt) {
          const deliveredDate = data.deliveredAt.toDate ? data.deliveredAt.toDate() : new Date(data.deliveredAt.seconds * 1000);
          if (deliveredDate >= today) {
            completedToday++;
          }
        }
      });

      // Calculate rating (mock for now, can be enhanced with actual ratings)
      const rating = totalDeliveries > 0 ? (4.5 + Math.random() * 0.5) : 0;

      setStats({
        totalDeliveries,
        totalEarnings,
        rating: parseFloat(rating.toFixed(1)),
        completedToday,
      });
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    if (!editPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
        phone: editPhone,
        address: editAddress,
        updatedAt: new Date(),
      });
      
      if (editName && user) {
        await updateProfile(user, {
          displayName: editName,
        });
      }
      
      await fetchUser();
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (e) {
      console.error('Error updating profile:', e);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="person" size={28} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Tài khoản</Text>
            <Text style={styles.headerSubtitle}>Thông tin cá nhân</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="person" size={72} color="#ee4d2d" />
            </View>
            <Text style={styles.name}>{userData?.name || userData?.username || 'Shipper'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {stats.rating > 0 && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={18} color="#FFC107" />
                <Text style={styles.ratingText}>{stats.rating}</Text>
                <Text style={styles.ratingCount}>({stats.totalDeliveries} đơn)</Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryStatCard]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="local-shipping" size={28} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Tổng đơn giao</Text>
          </View>

          <View style={[styles.statCard, styles.secondaryStatCard]}>
            <View style={[styles.statIconContainer, styles.secondaryIconContainer]}>
              <MaterialIcons name="attach-money" size={28} color="#4CAF50" />
            </View>
            <Text style={[styles.statValue, styles.secondaryStatValue]}>
              {stats.totalEarnings.toLocaleString('vi-VN')} đ
            </Text>
            <Text style={[styles.statLabel, styles.secondaryStatLabel]}>Tổng thu nhập</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.secondaryStatCard]}>
            <View style={[styles.statIconContainer, styles.secondaryIconContainer]}>
              <MaterialIcons name="today" size={28} color="#2196F3" />
            </View>
            <Text style={[styles.statValue, styles.secondaryStatValue]}>{stats.completedToday}</Text>
            <Text style={[styles.statLabel, styles.secondaryStatLabel]}>Hôm nay</Text>
          </View>

          <View style={[styles.statCard, styles.secondaryStatCard]}>
            <View style={[styles.statIconContainer, styles.secondaryIconContainer]}>
              <MaterialIcons name="star" size={28} color="#FFC107" />
            </View>
            <Text style={[styles.statValue, styles.secondaryStatValue]}>{stats.rating || 'N/A'}</Text>
            <Text style={[styles.statLabel, styles.secondaryStatLabel]}>Đánh giá</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color="#ee4d2d" />
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="person" size={22} color="#ee4d2d" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tên</Text>
                <Text style={styles.infoValue}>
                  {userData?.name || userData?.username || 'Chưa cập nhật'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="phone" size={22} color="#ee4d2d" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Số điện thoại</Text>
                <Text style={styles.infoValue}>{userData?.phone || 'Chưa cập nhật'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="location-on" size={22} color="#ee4d2d" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {userData?.address || 'Chưa cập nhật'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="email" size={22} color="#ee4d2d" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Chưa có'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color="#ee4d2d" />
            <Text style={styles.sectionTitle}>Cài đặt</Text>
          </View>

          <TouchableOpacity style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <MaterialIcons name="help-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.settingsText}>Trợ giúp & Hỗ trợ</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <MaterialIcons name="privacy-tip" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.settingsText}>Chính sách bảo mật</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <MaterialIcons name="description" size={22} color="#FF9800" />
              </View>
              <Text style={styles.settingsText}>Điều khoản sử dụng</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <MaterialIcons name="info-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.settingsText}>Về ứng dụng</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsCard}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <MaterialIcons name="lock" size={22} color="#E91E63" />
              </View>
              <Text style={styles.settingsText}>Đổi mật khẩu</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Modal */}
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
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên *</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nhập tên của bạn"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại *</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Nhập địa chỉ"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
      />
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ee4d2d',
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
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 4,
    marginRight: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  primaryStatCard: {
    backgroundColor: '#ee4d2d',
  },
  secondaryStatCard: {
    backgroundColor: '#fff',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryIconContainer: {
    backgroundColor: '#F5F5F5',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  secondaryStatValue: {
    color: '#1A1A1A',
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  secondaryStatLabel: {
    color: '#666',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ShipperProfileScreen;

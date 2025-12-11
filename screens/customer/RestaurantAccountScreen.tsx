import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import RestaurantScreenWrapper from '../../components/RestaurantScreenWrapper';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import type { AdminStackParamList, RestaurantTabParamList } from '../../navigation/AdminNavigator';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../../utils/cloudinary';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RestaurantTabParamList>,
  NativeStackNavigationProp<AdminStackParamList>
>;

const RestaurantAccountScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: '',
    phone: '',
    address: '',
    openingHours: '',
    description: '',
  });
  const [restaurantStatus, setRestaurantStatus] = useState({
    isActive: true,
    isOpen: true,
    isOnHoliday: false,
    isAcceptingOrders: true,
    autoOpenTime: { start: '08:00', end: '22:00' },
    autoOpenEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [showOwnerInfo, setShowOwnerInfo] = useState(false);
  const [showRestaurantInfo, setShowRestaurantInfo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto open/close based on time
  useEffect(() => {
    if (!restaurantStatus.autoOpenEnabled || restaurantStatus.isOnHoliday || !restaurantStatus.isActive) {
      return;
    }

    const checkAutoOpen = async () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { start, end } = restaurantStatus.autoOpenTime;

      const shouldBeOpen = currentTime >= start && currentTime < end;

      if (shouldBeOpen !== restaurantStatus.isOpen) {
        try {
          const user = auth.currentUser;
          if (!user) return;

          await updateDoc(doc(db, 'restaurants', user.uid), {
            isOpen: shouldBeOpen,
            updatedAt: new Date(),
          });
          
          setRestaurantStatus(prev => ({ ...prev, isOpen: shouldBeOpen }));
        } catch (error) {
          console.error('Error auto updating status:', error);
        }
      }
    };

    // Check immediately
    checkAutoOpen();

    // Check every minute
    const interval = setInterval(checkAutoOpen, 60000);

    return () => clearInterval(interval);
  }, [restaurantStatus.autoOpenEnabled, restaurantStatus.autoOpenTime.start, restaurantStatus.autoOpenTime.end, restaurantStatus.isOnHoliday, restaurantStatus.isActive]);

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserInfo({
          name: data.name || data.username || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
        });
      }

      const restaurantDoc = await getDoc(doc(db, 'restaurants', user.uid));
      if (restaurantDoc.exists()) {
        const data = restaurantDoc.data();
        setRestaurantInfo({
          name: data.name || '',
          phone: data.phone || userInfo.phone,
          address: data.address || '',
          openingHours: data.openingHours || '',
          description: data.description || '',
        });
        if (data.logoUrl || data.logo) {
          setRestaurantLogo((data.logoUrl || data.logo) as string);
        } else {
          setRestaurantLogo(null);
        }
        setRestaurantStatus({
          isActive: data.isActive !== false,
          isOpen: data.isOpen !== false,
          isOnHoliday: data.isOnHoliday === true,
          isAcceptingOrders: data.isAcceptingOrders !== false,
          autoOpenTime: data.autoOpenTime || { start: '08:00', end: '22:00' },
          autoOpenEnabled: data.autoOpenEnabled === true,
        });
      }
    } catch (error) {
      console.error('Error loading account info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (updates: Partial<typeof restaurantStatus>) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const newStatus = { ...restaurantStatus, ...updates };
      await updateDoc(doc(db, 'restaurants', user.uid), {
        ...newStatus,
        updatedAt: new Date(),
      });
      setRestaurantStatus(newStatus);
      
      // Cập nhật status trong users collection
      await updateDoc(doc(db, 'users', user.uid), {
        status: newStatus.isActive ? 'active' : 'inactive',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleSaveAutoOpenTime = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'restaurants', user.uid), {
        autoOpenTime: restaurantStatus.autoOpenTime,
        autoOpenEnabled: restaurantStatus.autoOpenEnabled,
        updatedAt: new Date(),
      });
      
      Alert.alert('Thành công', 'Đã lưu cài đặt tự động mở/đóng cửa');
      setStatusModalVisible(false);
    } catch (error) {
      console.error('Error saving auto open time:', error);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!restaurantInfo.name.trim()) {
        Alert.alert('Thông báo', 'Vui lòng nhập tên nhà hàng');
        return;
      }

      setSaving(true);
      await Promise.all([
        updateDoc(doc(db, 'restaurants', user.uid), {
          name: restaurantInfo.name,
          phone: restaurantInfo.phone,
          address: restaurantInfo.address,
          openingHours: restaurantInfo.openingHours,
          description: restaurantInfo.description,
          ...(restaurantLogo ? { logoUrl: restaurantLogo } : {}),
          ...restaurantStatus,
          updatedAt: new Date(),
        }),
        updateDoc(doc(db, 'users', user.uid), {
          name: userInfo.name,
          phone: userInfo.phone,
          status: restaurantStatus.isActive ? 'active' : 'inactive',
        }),
      ]);

      Alert.alert('Thành công', 'Đã lưu thông tin tài khoản');
    } catch (error) {
      console.error('Error saving account info:', error);
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      setUploadingLogo(true);

      const imageUrl = await uploadImageToCloudinary(result.assets[0].uri);

      await updateDoc(doc(db, 'restaurants', user.uid), {
        logoUrl: imageUrl,
        updatedAt: new Date(),
      });

      setRestaurantLogo(imageUrl);
      Alert.alert('Thành công', 'Đã cập nhật logo nhà hàng');
    } catch (error) {
      console.error('Error updating restaurant logo:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật logo nhà hàng');
    } finally {
      setUploadingLogo(false);
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
    <>
      <RestaurantScreenWrapper
        title="Tài khoản nhà hàng"
        subtitle="Thông tin & bảo mật"
        scrollable={false}
        rightContent={
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={loadData}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        }
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.sectionHeaderRow,
                showOwnerInfo && styles.sectionHeaderExpanded,
              ]}
              onPress={() => setShowOwnerInfo((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionLabel}>Thông tin chủ sở hữu</Text>
              <MaterialIcons
                name={showOwnerInfo ? 'expand-less' : 'expand-more'}
                size={24}
                color="#6b7280"
              />
            </TouchableOpacity>
            {showOwnerInfo && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoTitle}>Họ tên</Text>
                  <Text style={styles.infoValue}>{userInfo.name || 'Chưa cập nhật'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoTitle}>Email đăng nhập</Text>
                  <Text style={styles.infoValue}>{userInfo.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoTitle}>Số điện thoại</Text>
                  <TextInput
                    style={styles.infoInput}
                    value={userInfo.phone}
                    onChangeText={(text) => setUserInfo((prev) => ({ ...prev, phone: text }))}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.sectionHeaderRow,
                showRestaurantInfo && styles.sectionHeaderExpanded,
              ]}
              onPress={() => setShowRestaurantInfo((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionLabel}>Thông tin nhà hàng</Text>
              <MaterialIcons
                name={showRestaurantInfo ? 'expand-less' : 'expand-more'}
                size={24}
                color="#6b7280"
              />
            </TouchableOpacity>
            {showRestaurantInfo && (
              <>
                <View style={styles.logoSection}>
                  <Text style={styles.logoLabel}>Logo nhà hàng</Text>
                  <View style={styles.logoRow}>
                    <View style={styles.logoPreviewWrapper}>
                      {restaurantLogo ? (
                        <Image source={{ uri: restaurantLogo }} style={styles.logoImage} />
                      ) : (
                        <View style={styles.logoPlaceholder}>
                          <MaterialIcons name="restaurant" size={28} color="#9ca3af" />
                          <Text style={styles.logoPlaceholderText}>Chưa có logo</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.logoButton, uploadingLogo && styles.logoButtonDisabled]}
                      onPress={handlePickLogo}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="photo-camera" size={18} color="#fff" />
                          <Text style={styles.logoButtonText}>
                            {restaurantLogo ? 'Đổi logo' : 'Thêm logo'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Tên nhà hàng"
                  value={restaurantInfo.name}
                  onChangeText={(text) => setRestaurantInfo((prev) => ({ ...prev, name: text }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Số điện thoại liên hệ"
                  value={restaurantInfo.phone}
                  onChangeText={(text) => setRestaurantInfo((prev) => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Địa chỉ chi tiết"
                  value={restaurantInfo.address}
                  onChangeText={(text) => setRestaurantInfo((prev) => ({ ...prev, address: text }))}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Giờ mở cửa (VD: 08:00 - 22:00)"
                  value={restaurantInfo.openingHours}
                  onChangeText={(text) => setRestaurantInfo((prev) => ({ ...prev, openingHours: text }))}
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Giới thiệu ngắn gọn"
                  value={restaurantInfo.description}
                  onChangeText={(text) => setRestaurantInfo((prev) => ({ ...prev, description: text }))}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Trạng thái hoạt động</Text>
            
            {/* Status Overview */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <View style={[styles.statusIndicator, restaurantStatus.isActive && styles.statusIndicatorActive]} />
                  <Text style={styles.statusLabel}>
                    {restaurantStatus.isActive ? 'Đang hoạt động' : 'Tạm đóng cửa'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusToggle, restaurantStatus.isActive && styles.statusToggleActive]}
                  onPress={() => {
                    const newStatus = !restaurantStatus.isActive;
                    setRestaurantStatus(prev => ({ ...prev, isActive: newStatus, isOpen: newStatus }));
                    handleUpdateStatus({ isActive: newStatus, isOpen: newStatus });
                  }}
                >
                  <Text style={[styles.statusToggleText, restaurantStatus.isActive && styles.statusToggleTextActive]}>
                    {restaurantStatus.isActive ? 'Tắt' : 'Bật'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <MaterialIcons 
                    name={restaurantStatus.isOpen ? 'restaurant' : 'restaurant-menu'} 
                    size={20} 
                    color={restaurantStatus.isOpen ? '#4CAF50' : '#999'} 
                  />
                  <View style={styles.statusLabelContainer}>
                    <Text style={styles.statusLabel}>
                      {restaurantStatus.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
                    </Text>
                    {restaurantStatus.autoOpenEnabled && (
                      <Text style={styles.statusSubLabel}>
                        Tự động: {restaurantStatus.autoOpenTime.start} - {restaurantStatus.autoOpenTime.end}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statusToggle, restaurantStatus.isOpen && styles.statusToggleActive]}
                  onPress={() => {
                    const newStatus = !restaurantStatus.isOpen;
                    setRestaurantStatus(prev => ({ ...prev, isOpen: newStatus }));
                    handleUpdateStatus({ isOpen: newStatus });
                  }}
                  disabled={restaurantStatus.isOnHoliday}
                >
                  <Text style={[styles.statusToggleText, restaurantStatus.isOpen && styles.statusToggleTextActive]}>
                    {restaurantStatus.isOpen ? 'Đóng' : 'Mở'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <MaterialIcons 
                    name={restaurantStatus.isOnHoliday ? 'event-busy' : 'event-available'} 
                    size={20} 
                    color={restaurantStatus.isOnHoliday ? '#F44336' : '#4CAF50'} 
                  />
                  <Text style={styles.statusLabel}>
                    {restaurantStatus.isOnHoliday ? 'Nghỉ lễ' : 'Đang hoạt động bình thường'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusToggle, restaurantStatus.isOnHoliday && styles.statusToggleHoliday]}
                  onPress={() => {
                    const newStatus = !restaurantStatus.isOnHoliday;
                    setRestaurantStatus(prev => ({ 
                      ...prev, 
                      isOnHoliday: newStatus,
                      isOpen: newStatus ? false : prev.isOpen,
                    }));
                    handleUpdateStatus({ 
                      isOnHoliday: newStatus,
                      isOpen: newStatus ? false : restaurantStatus.isOpen,
                    });
                  }}
                >
                  <Text style={[styles.statusToggleText, restaurantStatus.isOnHoliday && styles.statusToggleTextActive]}>
                    {restaurantStatus.isOnHoliday ? 'Hết nghỉ' : 'Nghỉ lễ'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <MaterialIcons 
                    name={restaurantStatus.isAcceptingOrders ? 'shopping-cart' : 'remove-shopping-cart'} 
                    size={20} 
                    color={restaurantStatus.isAcceptingOrders ? '#4CAF50' : '#FF9800'} 
                  />
                  <Text style={styles.statusLabel}>
                    {restaurantStatus.isAcceptingOrders ? 'Đang nhận đơn' : 'Tạm ngưng nhận đơn (quá tải)'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusToggle, restaurantStatus.isAcceptingOrders && styles.statusToggleActive]}
                  onPress={() => {
                    const newStatus = !restaurantStatus.isAcceptingOrders;
                    setRestaurantStatus(prev => ({ ...prev, isAcceptingOrders: newStatus }));
                    handleUpdateStatus({ isAcceptingOrders: newStatus });
                  }}
                  disabled={restaurantStatus.isOnHoliday || !restaurantStatus.isOpen}
                >
                  <Text style={[styles.statusToggleText, restaurantStatus.isAcceptingOrders && styles.statusToggleTextActive]}>
                    {restaurantStatus.isAcceptingOrders ? 'Tạm ngưng' : 'Nhận đơn'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStatusModalVisible(true)}
            >
              <MaterialIcons name="schedule" size={20} color="#ee4d2d" />
              <Text style={styles.secondaryButtonText}>Thiết lập thời gian mở cửa tự động</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Bảo mật & đăng xuất</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setChangePasswordModalVisible(true)}
            >
              <MaterialIcons name="lock" size={20} color="#ee4d2d" />
              <Text style={styles.secondaryButtonText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={async () => {
                try {
                  await auth.signOut();
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Login' as never }],
                    })
                  );
                } catch (error) {
                  console.error('Logout error:', error);
                  Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
                }
              }}
            >
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.dangerButtonText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </RestaurantScreenWrapper>

      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
      />

      {/* Auto Open Time Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thời gian mở cửa tự động</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSwitchRow}>
                <View style={styles.modalSwitchLeft}>
                  <MaterialIcons name="schedule" size={20} color="#ee4d2d" />
                  <Text style={styles.modalSwitchLabel}>Bật tự động đóng/mở cửa</Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalSwitch, restaurantStatus.autoOpenEnabled && styles.modalSwitchActive]}
                  onPress={() => {
                    setRestaurantStatus(prev => ({ ...prev, autoOpenEnabled: !prev.autoOpenEnabled }));
                  }}
                >
                  <View style={[styles.modalSwitchThumb, restaurantStatus.autoOpenEnabled && styles.modalSwitchThumbActive]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Thời gian mở cửa:</Text>
              <TextInput
                style={styles.input}
                value={restaurantStatus.autoOpenTime.start}
                onChangeText={(text) => setRestaurantStatus(prev => ({
                  ...prev,
                  autoOpenTime: { ...prev.autoOpenTime, start: text }
                }))}
                placeholder="08:00"
                placeholderTextColor="#999"
                editable={restaurantStatus.autoOpenEnabled}
              />

              <Text style={styles.modalLabel}>Thời gian đóng cửa:</Text>
              <TextInput
                style={[styles.input, !restaurantStatus.autoOpenEnabled && styles.inputDisabled]}
                value={restaurantStatus.autoOpenTime.end}
                onChangeText={(text) => setRestaurantStatus(prev => ({
                  ...prev,
                  autoOpenTime: { ...prev.autoOpenTime, end: text }
                }))}
                placeholder="22:00"
                placeholderTextColor="#999"
                editable={restaurantStatus.autoOpenEnabled}
              />

              <View style={styles.modalNote}>
                <MaterialIcons name="info" size={18} color="#2196F3" />
                <Text style={styles.modalNoteText}>
                  {restaurantStatus.autoOpenEnabled 
                    ? 'Hệ thống sẽ tự động mở/đóng cửa theo thời gian đã thiết lập. Kiểm tra mỗi phút.'
                    : 'Bật tính năng này để hệ thống tự động mở/đóng cửa theo giờ làm việc'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveAutoOpenTime}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingBottom: 32,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  infoInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#ee4d2d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderExpanded: {
    marginBottom: 16,
  },
  logoSection: {
    marginBottom: 16,
  },
  logoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPreviewWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  logoPlaceholderText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ee4d2d',
    gap: 6,
  },
  logoButtonDisabled: {
    opacity: 0.6,
  },
  logoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ee4d2d',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#ee4d2d',
    fontWeight: '600',
    fontSize: 15,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#f43f5e',
    gap: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  statusCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#999',
  },
  statusIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  statusLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  statusToggle: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  statusToggleTextActive: {
    color: '#fff',
  },
  statusToggleHoliday: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  statusLabelContainer: {
    flex: 1,
  },
  statusSubLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalSwitchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  modalSwitchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  modalSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  modalSwitchActive: {
    backgroundColor: '#4CAF50',
  },
  modalSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  modalSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  modalOverlay: {
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
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  modalNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
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

export default RestaurantAccountScreen;


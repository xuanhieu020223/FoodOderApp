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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading account info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
    } finally {
      setLoading(false);
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
          updatedAt: new Date(),
        }),
        updateDoc(doc(db, 'users', user.uid), {
          name: userInfo.name,
          phone: userInfo.phone,
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

  const quickActions = [
    {
      title: 'Quản lý danh mục',
      description: 'Tùy chỉnh nhóm món ăn',
      icon: 'category',
      onPress: () => navigation.navigate('ManageCategories'),
    },
    {
      title: 'Nhân sự & phân quyền',
      description: 'Quản lý tài khoản nhân viên',
      icon: 'group',
      onPress: () => navigation.navigate('ManageUsers'),
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
            <Text style={styles.sectionLabel}>Thông tin chủ sở hữu</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Thông tin nhà hàng</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Hành động nhanh</Text>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                style={styles.quickAction}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#fff3f0' }]}>
                  <MaterialIcons name={action.icon as any} size={20} color="#ee4d2d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>{action.description}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#bbb" />
              </TouchableOpacity>
            ))}
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
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  quickActionDescription: {
    fontSize: 13,
    color: '#6b7280',
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
});

export default RestaurantAccountScreen;


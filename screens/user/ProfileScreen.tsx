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
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
];

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const storage = getStorage();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

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
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
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
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'users', user.uid), {
          avatar: downloadURL,
        });

        setUserData(prev => ({
          ...prev!,
          avatar: downloadURL,
        }));

        setUploadingImage(false);
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
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
    } else {
      navigation.navigate(screen);
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {uploadingImage ? (
                <ActivityIndicator size="large" color="#fff" />
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

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFE0B2' }]}>
                <Ionicons name="cash-outline" size={24} color="#FF9800" />
              </View>
              <Text style={styles.statValue}>{userData?.coins || 0}</Text>
              <Text style={styles.statLabel}>Xu</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E1BEE7' }]}>
                <Ionicons name="ticket" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.statValue}>{userData?.vouchers || 0}</Text>
              <Text style={styles.statLabel}>Voucher</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFCDD2' }]}>
                <Ionicons name="heart" size={24} color="#F44336" />
              </View>
              <Text style={styles.statValue}>{userData?.favorites || 0}</Text>
              <Text style={styles.statLabel}>Yêu thích</Text>
            </View>
          </View>
        </View>

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
    backgroundColor: '#f8f9fa',
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
    fontWeight: '600',
    color: '#333',
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
  },
  statItem: {
    alignItems: 'center',
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
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
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
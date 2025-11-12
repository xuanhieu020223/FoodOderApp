import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc } from 'firebase/firestore';

const ShipperProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleChangePassword = () => {
    Alert.alert('Đổi mật khẩu', 'Chức năng đổi mật khẩu sẽ được phát triển.');
  };
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn đã đăng xuất thành công.');
    // TODO: Thực hiện điều hướng về màn hình đăng nhập
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;
  if (!profile) return <Text style={{ marginTop: 40, textAlign: 'center' }}>Không có dữ liệu tài khoản</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Thông tin tài khoản</Text>
      <View style={styles.infoBox}>
        <Text style={styles.label}>Họ tên:</Text>
        <Text style={styles.value}>{profile.name}</Text>
        <Text style={styles.label}>Số điện thoại:</Text>
        <Text style={styles.value}>{profile.phone}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profile.email}</Text>
        <Text style={styles.label}>Phương tiện:</Text>
        <Text style={styles.value}>{profile.vehicle || 'Chưa cập nhật'}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Đổi mật khẩu</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#b71c1c' }]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  infoBox: { backgroundColor: '#f9fbe7', borderRadius: 10, padding: 16, marginVertical: 16, width: '100%' },
  label: { fontWeight: 'bold', marginTop: 8 },
  value: { marginBottom: 4 },
  button: { backgroundColor: '#1976d2', padding: 12, borderRadius: 8, marginVertical: 8, minWidth: 180 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});

export default ShipperProfileScreen;

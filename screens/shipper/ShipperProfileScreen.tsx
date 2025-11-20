import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../config/Firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const ShipperProfileScreen = ({ navigation }: any) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchUser();
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
      setUserData(userDoc.data());
    } catch (e) {
      setUserData(null);
    }
    setLoading(false);
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

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  return (
    <View style={styles.container}>
      <View style={styles.avatarBox}>
        <Ionicons name="person-circle" size={90} color="#ee4d2d" />
        <Text style={styles.name}>{userData?.name || 'Shipper'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>
      <View style={styles.infoBox}>
        <Ionicons name="call" size={18} color="#ee4d2d" />
        <Text style={styles.infoText}>{userData?.phone || 'Chưa cập nhật'}</Text>
      </View>
      <View style={styles.infoBox}>
        <Ionicons name="location" size={18} color="#ee4d2d" />
        <Text style={styles.infoText}>{userData?.address || 'Chưa cập nhật'}</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', padding: 24 },
  avatarBox: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee' },
  name: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  email: { fontSize: 14, color: '#888', marginTop: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff7f3', borderRadius: 8, padding: 10, width: '100%' },
  infoText: { fontSize: 15, marginLeft: 8, color: '#222' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ee4d2d', padding: 12, borderRadius: 8, marginTop: 32 },
  logoutText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
});

export default ShipperProfileScreen;

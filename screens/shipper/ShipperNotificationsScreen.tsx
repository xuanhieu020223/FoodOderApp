import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons } from '@expo/vector-icons';

const ShipperNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const notiRef = collection(db, 'notifications');
      const q = query(
        notiRef,
        where('to', 'in', [user?.uid, 'all-shippers']),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setNotifications(data);
    } catch (e) {
      setNotifications([]);
    }
    setLoading(false);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Thông báo</Text>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Ionicons name="notifications" size={24} color="#ee4d2d" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.content}>{item.content}</Text>
              <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Không có thông báo nào</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#ee4d2d' },
  item: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff7f3', borderRadius: 8, padding: 12, marginBottom: 12, elevation: 1 },
  title: { fontWeight: 'bold', fontSize: 16, color: '#222' },
  content: { fontSize: 14, color: '#444', marginTop: 2 },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
});

export default ShipperNotificationsScreen;

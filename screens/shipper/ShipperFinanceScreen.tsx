import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons } from '@expo/vector-icons';

const ShipperFinanceScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shipperId', '==', user?.uid),
        where('status', '==', 'delivered')
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setHistory(data);
    } catch (e) {
      setHistory([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const getTotalIncome = () => {
    return history.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="wallet" size={36} color="#ee4d2d" />
        <Text style={styles.header}>Tổng thu nhập</Text>
        <Text style={styles.income}>{getTotalIncome().toLocaleString()} đ</Text>
        <Text style={styles.trips}>Số chuyến: {history.length}</Text>
      </View>
      <Text style={styles.subHeader}>Lịch sử các chuyến giao thành công</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.itemText}>#{item.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.address}>{item.address}</Text>
              <Text style={styles.date}>{item.deliveredAt ? new Date(item.deliveredAt.seconds * 1000).toLocaleString() : ''}</Text>
            </View>
            <Text style={styles.amount}>{item.totalAmount?.toLocaleString()} đ</Text>
          </View>
        )}
        style={{ width: '100%' }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Chưa có chuyến giao thành công nào</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  card: { backgroundColor: '#fff7f3', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16, width: '100%', elevation: 2 },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  income: { fontSize: 28, color: '#ee4d2d', marginVertical: 8, fontWeight: 'bold' },
  trips: { fontSize: 16, color: '#555' },
  subHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 16, alignSelf: 'flex-start' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee', width: '100%' },
  itemText: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  address: { fontSize: 13, color: '#555' },
  date: { fontSize: 12, color: '#888' },
  amount: { fontWeight: 'bold', color: '#2e7d32', fontSize: 16 },
});

export default ShipperFinanceScreen;

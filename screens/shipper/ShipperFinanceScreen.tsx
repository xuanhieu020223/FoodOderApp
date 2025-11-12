import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

const ShipperFinanceScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  };

  const getTotalIncome = () => {
    return history.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tổng thu nhập</Text>
      <Text style={styles.income}>{getTotalIncome().toLocaleString()} đ</Text>
      <Text style={styles.subHeader}>Lịch sử các chuyến giao thành công</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>#{item.id} - {item.address}</Text>
            <Text style={styles.amount}>{item.totalAmount?.toLocaleString()} đ</Text>
          </View>
        )}
        style={{ width: '100%' }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Chưa có chuyến giao thành công nào</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  income: { fontSize: 28, color: '#ee4d2d', marginVertical: 8, fontWeight: 'bold' },
  subHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 16, alignSelf: 'flex-start' },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee', width: '100%' },
  itemText: { fontSize: 15 },
  amount: { fontWeight: 'bold', color: '#2e7d32' },
});

export default ShipperFinanceScreen;

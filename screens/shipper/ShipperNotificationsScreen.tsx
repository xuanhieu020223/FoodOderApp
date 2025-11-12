import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';

// Dummy notifications
const notifications = [
  { id: 'n1', title: 'Đơn hàng mới', content: 'Bạn có đơn hàng mới tại 123 Lê Lợi, Q.1', time: '10:30 12/11/2025' },
  { id: 'n2', title: 'Đơn hàng đã giao thành công', content: 'Bạn vừa giao thành công đơn DH001', time: '09:00 12/11/2025' },
  { id: 'n3', title: 'Khuyến mãi', content: 'Nhận ngay 20k khi hoàn thành 5 đơn hôm nay!', time: '08:00 12/11/2025' },
];

const ShipperNotificationsScreen = () => {
  const [list] = useState(notifications);

  const handlePress = (item: typeof notifications[0]) => {
    Alert.alert(item.title, item.content);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Thông báo</Text>
      <FlatList
        data={list}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.content}>{item.content}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </TouchableOpacity>
        )}
        style={{ width: '100%' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#f1f8e9', borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1 },
  title: { fontWeight: 'bold', fontSize: 16 },
  content: { marginTop: 4, fontSize: 14 },
  time: { marginTop: 4, color: '#888', fontSize: 12, alignSelf: 'flex-end' },
});

export default ShipperNotificationsScreen;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const NotificationsScreen = () => {
  const notifications = [
    {
      id: '1',
      title: 'Đơn hàng đã được xác nhận',
      message: 'Đơn hàng #12345 của bạn đã được xác nhận và đang được chuẩn bị.',
      time: '5 phút trước',
      type: 'order',
    },
    {
      id: '2',
      title: 'Khuyến mãi mới',
      message: 'Giảm giá 50% cho đơn hàng đầu tiên của bạn!',
      time: '1 giờ trước',
      type: 'promo',
    },
    {
      id: '3',
      title: 'Đơn hàng đã được giao',
      message: 'Đơn hàng #12345 của bạn đã được giao thành công.',
      time: '2 giờ trước',
      type: 'order',
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'fast-food-outline';
      case 'promo':
        return 'pricetag-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity style={styles.notificationCard}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon(item.type)} size={24} color="#ee4d2d" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.notificationsList}
        showsVerticalScrollIndicator={false}
      />
      
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default NotificationsScreen; 
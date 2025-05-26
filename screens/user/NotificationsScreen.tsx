import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationType = 'promotion' | 'order' | 'system';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  image?: string;
  time: string;
  isRead: boolean;
};

const notifications: Notification[] = [
  {
    id: '1',
    type: 'promotion',
    title: 'Giảm 50% cho đơn từ 50K',
    message: 'Nhập mã WELCOME50 để được giảm 50% cho đơn hàng đầu tiên từ 50K',
    image: 'https://images.foody.vn/res/g119/1184695/prof/s640x400/foody-upload-api-foody-mobile-im-f5d0d927-230403114431.jpeg',
    time: '5 phút trước',
    isRead: false,
  },
  {
    id: '2',
    type: 'order',
    title: 'Đơn hàng đã giao thành công',
    message: 'Đơn hàng #123456 từ Cơm Tấm Phúc Lộc Thọ đã được giao thành công',
    time: '30 phút trước',
    isRead: false,
  },
  {
    id: '3',
    type: 'system',
    title: 'Cập nhật ứng dụng',
    message: 'Phiên bản mới đã sẵn sàng. Cập nhật ngay để trải nghiệm những tính năng mới nhất!',
    time: '1 giờ trước',
    isRead: true,
  },
];

const NotificationsScreen = () => {
  const [activeTab, setActiveTab] = useState<NotificationType | 'all'>('all');

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'promotion', label: 'Khuyến mãi' },
    { id: 'order', label: 'Đơn hàng' },
    { id: 'system', label: 'Hệ thống' },
  ];

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'promotion':
        return 'gift-outline';
      case 'order':
        return 'receipt-outline';
      case 'system':
        return 'settings-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
    >
      <View style={styles.notificationContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.notificationImage} />
        ) : (
          <View style={[styles.iconContainer, styles[`${item.type}Icon`]]}>
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={24}
              color="#fff"
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const filteredNotifications = notifications.filter(
    notification => activeTab === 'all' || notification.type === activeTab
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      <View style={styles.tabs}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.id && styles.activeTab,
              ]}
              onPress={() => setActiveTab(item.id as NotificationType | 'all')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === item.id && styles.activeTabText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
        />
      </View>

      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            Không có thông báo nào
          </Text>
          <Text style={styles.emptySubtext}>
            Bạn sẽ nhận được thông báo khi có tin mới
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tabs: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#ee4d2d',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  notificationList: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#fff9f8',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promotionIcon: {
    backgroundColor: '#FF9800',
  },
  orderIcon: {
    backgroundColor: '#2196F3',
  },
  systemIcon: {
    backgroundColor: '#607D8B',
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
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
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ee4d2d',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default NotificationsScreen; 
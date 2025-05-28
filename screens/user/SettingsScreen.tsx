import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    darkMode: false,
    locationServices: true,
    autoSave: true,
    biometricLogin: false,
  });

  const handleToggle = async (key: keyof typeof settings) => {
    try {
      const newValue = !settings[key];
      await AsyncStorage.setItem(`setting_${key}`, JSON.stringify(newValue));
      setSettings(prev => ({ ...prev, [key]: newValue }));

      if (key === 'darkMode') {
        Alert.alert('Thông báo', 'Tính năng đang được phát triển');
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa bộ nhớ đệm?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Thành công', 'Đã xóa bộ nhớ đệm');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Lỗi', 'Không thể xóa bộ nhớ đệm');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    value: boolean,
    key: keyof typeof settings
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor(key) }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: '#ddd', true: '#ee4d2d' }}
        thumbColor="#fff"
      />
    </View>
  );

  const getIconColor = (key: string) => {
    const colors: { [key: string]: string } = {
      notifications: '#2196F3',
      emailNotifications: '#4CAF50',
      darkMode: '#607D8B',
      locationServices: '#FF9800',
      autoSave: '#9C27B0',
      biometricLogin: '#E91E63',
    };
    return colors[key] || '#666';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông báo</Text>
        {renderSettingItem(
          'notifications-outline',
          'Thông báo đẩy',
          'Nhận thông báo về đơn hàng và khuyến mãi',
          settings.notifications,
          'notifications'
        )}
        {renderSettingItem(
          'mail-outline',
          'Thông báo qua email',
          'Nhận thông báo qua địa chỉ email',
          settings.emailNotifications,
          'emailNotifications'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giao diện</Text>
        {renderSettingItem(
          'moon-outline',
          'Chế độ tối',
          'Thay đổi giao diện sang tông màu tối',
          settings.darkMode,
          'darkMode'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
        {renderSettingItem(
          'location-outline',
          'Dịch vụ vị trí',
          'Cho phép ứng dụng truy cập vị trí',
          settings.locationServices,
          'locationServices'
        )}
        {renderSettingItem(
          'save-outline',
          'Tự động lưu',
          'Tự động lưu thông tin đơn hàng',
          settings.autoSave,
          'autoSave'
        )}
        {renderSettingItem(
          'finger-print-outline',
          'Đăng nhập sinh trắc học',
          'Sử dụng vân tay hoặc Face ID',
          settings.biometricLogin,
          'biometricLogin'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dữ liệu</Text>
        <TouchableOpacity
          style={styles.clearCacheButton}
          onPress={handleClearCache}
        >
          <View style={styles.clearCacheContent}>
            <Ionicons name="trash-outline" size={20} color="#ee4d2d" />
            <Text style={styles.clearCacheText}>Xóa bộ nhớ đệm</Text>
          </View>
          <Text style={styles.cacheSize}>123 MB</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Phiên bản</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  clearCacheButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearCacheContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearCacheText: {
    fontSize: 16,
    color: '#ee4d2d',
    marginLeft: 8,
  },
  cacheSize: {
    fontSize: 14,
    color: '#666',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
});

export default SettingsScreen; 
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import * as Location from 'expo-location';

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    address: '',
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSaveAddress = async () => {
    if (!address.name.trim() || !address.phone.trim() || !address.address.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setSubmitting(true);
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'addresses'), {
        userId: user.uid,
        name: address.name.trim(),
        phone: address.phone.trim(),
        address: address.address.trim(),
        isDefault: address.isDefault,
        createdAt: new Date(),
      });

      Alert.alert('Thành công', 'Đã thêm địa chỉ mới');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding address:', error);
      Alert.alert('Lỗi', 'Không thể thêm địa chỉ');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập',
          'Vui lòng cấp quyền truy cập vị trí để sử dụng tính năng này'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocoding to get address
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        
        setAddress(prev => ({
          ...prev,
          address: fullAddress,
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ tên người nhận</Text>
          <TextInput
            style={styles.input}
            value={address.name}
            onChangeText={(text) => setAddress(prev => ({ ...prev, name: text }))}
            placeholder="Nhập họ tên"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={address.phone}
            onChangeText={(text) => setAddress(prev => ({ ...prev, phone: text }))}
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Địa chỉ</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={address.address}
              onChangeText={(text) => setAddress(prev => ({ ...prev, address: text }))}
              placeholder="Nhập địa chỉ"
              multiline
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
            >
              <Ionicons name="locate" size={20} color="#ee4d2d" />
              <Text style={styles.locationButtonText}>Vị trí hiện tại</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Đặt làm địa chỉ mặc định</Text>
          <Switch
            value={address.isDefault}
            onValueChange={(value) => setAddress(prev => ({ ...prev, isDefault: value }))}
            trackColor={{ false: '#ddd', true: '#ee4d2d' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
        onPress={handleSaveAddress}
        disabled={submitting}
      >
        <Text style={styles.saveButtonText}>
          {submitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
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
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addressInputContainer: {
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  locationButtonText: {
    marginLeft: 4,
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddAddressScreen; 
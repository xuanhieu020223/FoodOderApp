import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AccountInfoScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    avatar: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          avatar: data.avatar || '',
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
      });

      Alert.alert('Thành công', 'Đã cập nhật thông tin');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const user = auth.currentUser;
        if (!user) return;

        setUploading(true);
        const storage = getStorage();
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'users', user.uid), {
          avatar: downloadURL,
        });

        setUserData(prev => ({
          ...prev,
          avatar: downloadURL,
        }));

        setUploading(false);
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handlePickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ee4d2d" />
          ) : (
            <>
              <Image
                source={{ 
                  uri: userData.avatar || `https://ui-avatars.com/api/?name=${userData.name}&background=ee4d2d&color=fff`
                }}
                style={styles.avatar}
              />
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ tên</Text>
          <TextInput
            style={styles.input}
            value={userData.name}
            onChangeText={(text) => setUserData(prev => ({ ...prev, name: text }))}
            placeholder="Nhập họ tên"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={userData.email}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={userData.phone}
            onChangeText={(text) => setUserData(prev => ({ ...prev, phone: text }))}
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={userData.address}
            onChangeText={(text) => setUserData(prev => ({ ...prev, address: text }))}
            placeholder="Nhập địa chỉ"
            multiline
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleUpdateProfile}
      >
        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#ee4d2d',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  form: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
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
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountInfoScreen; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';

type RootStackParamList = {
  AddAddress: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

const AddressScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const addressesRef = collection(db, 'addresses');
      const q = query(addressesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const addressList: Address[] = [];
      querySnapshot.forEach((doc) => {
        addressList.push({ id: doc.id, ...doc.data() } as Address);
      });

      setAddresses(addressList.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
      setLoading(false);
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách địa chỉ');
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Remove default from all addresses
      const batch = writeBatch(db);
      addresses.forEach(addr => {
        if (addr.isDefault) {
          batch.update(doc(db, 'addresses', addr.id), { isDefault: false });
        }
      });

      // Set new default
      batch.update(doc(db, 'addresses', addressId), { isDefault: true });
      await batch.commit();

      // Update local state
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }))
      );

      Alert.alert('Thành công', 'Đã cập nhật địa chỉ mặc định');
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật địa chỉ mặc định');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa địa chỉ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'addresses', addressId));
              setAddresses(prev => prev.filter(addr => addr.id !== addressId));
              Alert.alert('Thành công', 'Đã xóa địa chỉ');
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Lỗi', 'Không thể xóa địa chỉ');
            }
          },
        },
      ]
    );
  };

  const renderAddressItem = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressInfo}>
        <View style={styles.addressHeader}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Mặc định</Text>
            </View>
          )}
        </View>
        <Text style={styles.phone}>{item.phone}</Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
      
      <View style={styles.actions}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(item.id)}
          >
            <Ionicons name="star-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteAddress(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        renderItem={renderAddressItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddAddress')}
      >
        <Text style={styles.addButtonText}>Thêm địa chỉ mới</Text>
      </TouchableOpacity>
    </View>
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
  list: {
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressInfo: {
    flex: 1,
    marginRight: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#ee4d2d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddressScreen; 
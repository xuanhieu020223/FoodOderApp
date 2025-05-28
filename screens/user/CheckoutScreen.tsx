import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, addDoc, doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../config/Firebase';
import * as Location from 'expo-location';
import { UserStackParamList } from '../../navigation/UserNavigator';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;
type CheckoutRouteProp = RouteProp<UserStackParamList, 'Checkout'>;

type CartItem = {
  id: string;
  foodId: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl: string;
  userId: string;
  createdAt: Date;
};

type OrderDetails = {
  fullName: string;
  phone: string;
  address: string;
  note: string;
  paymentMethod: 'COD' | 'Banking';
};

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const DELIVERY_FEE = 15000; // 15,000 VND

const CheckoutScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const { selectedItems } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    fullName: '',
    phone: '',
    address: '',
    note: '',
    paymentMethod: 'COD',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadUserData(),
          loadSelectedItems(),
          checkLocationPermission()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Cập nhật thông tin từ Firebase
        const updatedOrderDetails = {
          ...orderDetails,
          fullName: userData.name || orderDetails.fullName,
          phone: userData.phone || orderDetails.phone,
          address: userData.address || orderDetails.address,
        };

        setOrderDetails(updatedOrderDetails);

        // Nếu có thông tin vị trí, cập nhật location state
        if (userData.location) {
          setLocation({
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
            address: userData.address || ''
          });
        }

        // Log để debug
        console.log('Loaded user data:', {
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          location: userData.location
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    }
  };

  const loadSelectedItems = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const items: CartItem[] = [];
      for (const itemId of selectedItems) {
        const cartDoc = await getDoc(doc(db, 'carts', itemId));
        if (cartDoc.exists()) {
          items.push({ id: cartDoc.id, ...cartDoc.data() } as CartItem);
        }
      }
      setCartItems(items);
      setLoading(false);
    } catch (error) {
      console.error('Error loading selected items:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      setLoading(false);
    }
  };

  const calculateSubTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubTotal() + DELIVERY_FEE;
  };

  const handleInputChange = (field: keyof OrderDetails, value: string) => {
    setOrderDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const isFormValid = () => {
    // Log validation details for debugging
    console.log('Form validation details:', {
      fullName: orderDetails.fullName,
      phone: orderDetails.phone,
      address: orderDetails.address,
      cartItems: cartItems.length,
      paymentMethod: orderDetails.paymentMethod
    });

    const valid = (
      orderDetails.fullName.trim().length > 0 &&
      orderDetails.phone.trim().length > 0 &&
      orderDetails.address.trim().length > 0 &&
      cartItems.length > 0 &&
      (orderDetails.paymentMethod === 'COD' || orderDetails.paymentMethod === 'Banking')
    );

    return valid;
  };

  const handlePlaceOrder = async () => {
    // Log current state before validation
    console.log('Current order details:', orderDetails);
    console.log('Form valid:', isFormValid());

    if (!isFormValid()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin đặt hàng');
      return;
    }

    try {
      setSubmitting(true);
      const user = auth.currentUser;
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // Create order in Firestore
      const ordersRef = collection(db, 'orders');
      const order = {
        userId: user.uid,
        items: cartItems.map(item => ({
          foodId: item.foodId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        customerName: orderDetails.fullName,
        customerPhone: orderDetails.phone,
        address: orderDetails.address,
        subtotal: calculateSubTotal(),
        deliveryFee: DELIVERY_FEE,
        totalAmount: calculateTotal(),
        status: 'pending',
        note: orderDetails.note,
        paymentMethod: orderDetails.paymentMethod,
        createdAt: new Date(),
      };

      await addDoc(ordersRef, order);

      // Delete ordered items from cart
      const batch = writeBatch(db);
      selectedItems.forEach(itemId => {
        const cartItemRef = doc(db, 'carts', itemId);
        batch.delete(cartItemRef);
      });
      await batch.commit();

      Alert.alert(
        'Thành công',
        'Đặt hàng thành công',
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => navigation.navigate('TabNavigator', { screen: 'Orders' }),
          },
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Lỗi', 'Không thể đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const checkLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        Alert.alert(
          'Cần quyền truy cập vị trí',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt để sử dụng tính năng này.',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Mở cài đặt', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocoding to get address
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const fullAddress = `${address.street || ''} ${address.district || ''} ${address.city || ''} ${address.region || ''}`.trim();
        
        setLocation({
          latitude,
          longitude,
          address: fullAddress
        });

        setOrderDetails(prev => ({
          ...prev,
          address: fullAddress
        }));

        // Save address to user profile
        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            address: fullAddress,
            location: { latitude, longitude }
          });
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại sau.');
    }
  };

  const openGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const subtotal = calculateSubTotal();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color="#ee4d2d" />
            </View>
            <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          </View>
          <View style={styles.addressForm}>
            <TextInput
              style={styles.input}
              placeholder="Họ tên người nhận"
              value={orderDetails.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              keyboardType="phone-pad"
              value={orderDetails.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
            />
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Địa chỉ giao hàng"
                multiline
                value={orderDetails.address}
                onChangeText={(value) => handleInputChange('address', value)}
              />
              <View style={styles.addressActions}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                >
                  <Ionicons name="locate" size={20} color="#ee4d2d" />
                  <Text style={styles.locationButtonText}>Vị trí hiện tại</Text>
                </TouchableOpacity>
                {location && (
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={openGoogleMaps}
                  >
                    <Ionicons name="map" size={20} color="#ee4d2d" />
                    <Text style={styles.locationButtonText}>Xem bản đồ</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="restaurant" size={20} color="#ee4d2d" />
            </View>
            <Text style={styles.sectionTitle}>Món đã chọn</Text>
          </View>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemQuantity}>Số lượng: {item.quantity}</Text>
                <Text style={styles.orderItemPrice}>
                  {(item.price * item.quantity).toLocaleString('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet" size={20} color="#ee4d2d" />
            </View>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              orderDetails.paymentMethod === 'COD' && styles.paymentOptionSelected
            ]}
            onPress={() => handleInputChange('paymentMethod', 'COD')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons 
                name="cash" 
                size={24} 
                color={orderDetails.paymentMethod === 'COD' ? '#ee4d2d' : '#666'} 
              />
              <View style={styles.paymentOptionTexts}>
                <Text style={[
                  styles.paymentOptionText,
                  orderDetails.paymentMethod === 'COD' && styles.paymentOptionTextSelected
                ]}>Thanh toán khi nhận hàng</Text>
                <Text style={styles.paymentOptionSubtext}>Thanh toán bằng tiền mặt</Text>
              </View>
            </View>
            {orderDetails.paymentMethod === 'COD' && (
              <Ionicons name="checkmark-circle" size={24} color="#ee4d2d" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              orderDetails.paymentMethod === 'Banking' && styles.paymentOptionSelected
            ]}
            onPress={() => handleInputChange('paymentMethod', 'Banking')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons 
                name="card" 
                size={24} 
                color={orderDetails.paymentMethod === 'Banking' ? '#ee4d2d' : '#666'} 
              />
              <View style={styles.paymentOptionTexts}>
                <Text style={[
                  styles.paymentOptionText,
                  orderDetails.paymentMethod === 'Banking' && styles.paymentOptionTextSelected
                ]}>Chuyển khoản ngân hàng</Text>
                <Text style={styles.paymentOptionSubtext}>Thanh toán qua tài khoản ngân hàng</Text>
              </View>
            </View>
            {orderDetails.paymentMethod === 'Banking' && (
              <Ionicons name="checkmark-circle" size={24} color="#ee4d2d" />
            )}
          </TouchableOpacity>
        </View>

        {/* Note Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="create" size={20} color="#ee4d2d" />
            </View>
            <Text style={styles.sectionTitle}>Ghi chú</Text>
          </View>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
            multiline
            value={orderDetails.note}
            onChangeText={(value) => handleInputChange('note', value)}
          />
        </View>
      </ScrollView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.priceDetails}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tổng giá trị đơn hàng</Text>
            <Text style={styles.priceValue}>
              {subtotal.toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
              })}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí giao hàng</Text>
            <Text style={styles.priceValue}>
              {DELIVERY_FEE.toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
              })}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalPrice}>
              {calculateTotal().toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (!isFormValid() || submitting) && styles.placeOrderButtonDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={!isFormValid() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              {isFormValid() ? 
                `Đặt đơn • ${calculateTotal().toLocaleString('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                })}` : 
                'Vui lòng điền đầy đủ thông tin'
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* Debug information in development */}
        {/* {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text>Form valid: {isFormValid() ? 'Yes' : 'No'}</Text>
            <Text>Name: {orderDetails.fullName ? 'Filled' : 'Empty'}</Text>
            <Text>Phone: {orderDetails.phone ? 'Filled' : 'Empty'}</Text>
            <Text>Address: {orderDetails.address ? 'Filled' : 'Empty'}</Text>
            <Text>Items count: {cartItems.length}</Text>
          </View>
        )} */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addressForm: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  noteInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  orderItemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 15,
    color: '#ee4d2d',
    fontWeight: '500',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  paymentOptionSelected: {
    borderColor: '#ee4d2d',
    backgroundColor: '#fff3f0',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionTexts: {
    marginLeft: 12,
  },
  paymentOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: '#ee4d2d',
  },
  paymentOptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  priceDetails: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    fontSize: 18,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  placeOrderButton: {
    backgroundColor: '#ee4d2d',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  placeOrderButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  addressInputContainer: {
    width: '100%',
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff3f0',
  },
  locationButtonText: {
    marginLeft: 4,
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '500',
  },
  debugInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
});

export default CheckoutScreen; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../config/Firebase';
import { UserStackParamList } from '../../navigation/UserNavigator';
import CustomerScreenWrapper from '../../components/CustomerScreenWrapper';
import FloatingChatButton from '../../components/FloatingChatButton';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;

type CartItem = {
  id: string;
  foodId: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantImage?: string;
  userId: string;
  createdAt: Date;
};

const DELIVERY_FEE = 15000;
const MIN_ORDER_FOR_FREE_DELIVERY = 100000;

const CartScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    loadCartItems();
    const unsubscribe = navigation.addListener('focus', loadCartItems);
    return unsubscribe;
  }, [navigation]);

  const loadCartItems = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const cartsRef = collection(db, 'carts');
      const q = query(cartsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const items: CartItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as CartItem);
      });
      
      setCartItems(items);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cart items:', error);
      Alert.alert('Lỗi', 'Không thể tải giỏ hàng');
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      Alert.alert(
        'Xóa món',
        'Bạn có muốn xóa món này khỏi giỏ hàng?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', onPress: () => removeItem(itemId) },
        ]
      );
      return;
    }

    try {
      setUpdating(true);
      await updateDoc(doc(db, 'carts', itemId), {
        quantity: newQuantity,
      });
      
      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setUpdating(true);
      await deleteDoc(doc(db, 'carts', itemId));
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Lỗi', 'Không thể xóa món khỏi giỏ hàng');
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(item => item.id));
    }
  };

  const calculateSelectedTotal = () => {
    return cartItems
      .filter(item => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateSubtotal = () => {
    return calculateSelectedTotal();
  };

  const calculateDeliveryFee = () => {
    const subtotal = calculateSubtotal();
    return subtotal >= MIN_ORDER_FOR_FREE_DELIVERY ? 0 : DELIVERY_FEE;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDeliveryFee();
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một món để thanh toán');
      return;
    }
    navigation.navigate('Checkout', { selectedItems });
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const isSelected = selectedItems.includes(item.id);
    const itemTotal = item.price * item.quantity;

    return (
      <View style={[styles.cartItem, isSelected && styles.cartItemSelected]}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected
          ]}
          onPress={() => handleSelectItem(item.id)}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </TouchableOpacity>

        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.restaurantName && (
            <View style={styles.restaurantRow}>
              <Ionicons name="restaurant-outline" size={12} color="#999" />
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item.restaurantName}
              </Text>
            </View>
          )}
          <Text style={styles.itemPrice}>
            {item.price.toLocaleString('vi-VN')} đ
          </Text>
          
          <View style={styles.quantityRow}>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={updating}
              >
                <Ionicons name="remove" size={18} color="#ee4d2d" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={updating}
              >
                <Ionicons name="add" size={18} color="#ee4d2d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemTotal}>
              {itemTotal.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => {
            Alert.alert(
              'Xác nhận',
              'Bạn có chắc muốn xóa món này?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', onPress: () => removeItem(item.id) },
              ]
            );
          }}
          disabled={updating}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <CustomerScreenWrapper gradientHeight={240}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ee4d2d" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
        <FloatingChatButton />
      </CustomerScreenWrapper>
    );
  }

  if (!auth.currentUser) {
    return (
      <CustomerScreenWrapper gradientHeight={240}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>Giỏ hàng của bạn</Text>
          <Text style={styles.emptyText}>
            Vui lòng đăng nhập để xem giỏ hàng
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
        <FloatingChatButton />
      </CustomerScreenWrapper>
    );
  }

  if (cartItems.length === 0) {
    return (
      <CustomerScreenWrapper gradientHeight={240}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyText}>
            Thêm món ăn vào giỏ hàng để bắt đầu đặt hàng
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('TabNavigator', { screen: 'Home' })}
          >
            <Ionicons name="restaurant-outline" size={20} color="#fff" />
            <Text style={styles.continueButtonText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
        <FloatingChatButton />
      </CustomerScreenWrapper>
    );
  }

  const subtotal = calculateSubtotal();
  const deliveryFee = calculateDeliveryFee();
  const total = calculateTotal();
  const isFreeDelivery = subtotal >= MIN_ORDER_FOR_FREE_DELIVERY;
  const remainingForFreeDelivery = MIN_ORDER_FOR_FREE_DELIVERY - subtotal;

  return (
    <CustomerScreenWrapper gradientHeight={250}>
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialIcons name="shopping-cart" size={24} color="#ee4d2d" />
              <Text style={styles.headerTitle}>Giỏ hàng ({cartItems.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.selectAllContainer}
              onPress={handleSelectAll}
            >
              <View style={[
                styles.checkbox,
                selectedItems.length === cartItems.length && styles.checkboxSelected
              ]}>
                {selectedItems.length === cartItems.length && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.selectAllText}>
                {selectedItems.length === cartItems.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={cartItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            {!isFreeDelivery && subtotal > 0 && (
              <View style={styles.freeDeliveryBanner}>
                <Ionicons name="gift-outline" size={20} color="#4CAF50" />
                <Text style={styles.freeDeliveryText}>
                  Mua thêm {remainingForFreeDelivery.toLocaleString('vi-VN')} đ để được miễn phí vận chuyển
                </Text>
              </View>
            )}

            {isFreeDelivery && (
              <View style={styles.freeDeliverySuccess}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.freeDeliverySuccessText}>
                  Bạn được miễn phí vận chuyển!
                </Text>
              </View>
            )}

            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tạm tính ({selectedItems.length} món):</Text>
                <Text style={styles.priceValue}>
                  {subtotal.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Phí vận chuyển:</Text>
                <Text style={[
                  styles.priceValue,
                  deliveryFee === 0 && styles.freeDeliveryPrice
                ]}>
                  {deliveryFee === 0 ? 'Miễn phí' : `${deliveryFee.toLocaleString('vi-VN')} đ`}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng:</Text>
                <Text style={styles.totalPrice}>
                  {total.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.checkoutButton,
                selectedItems.length === 0 && styles.checkoutButtonDisabled
              ]}
              onPress={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              <View style={styles.checkoutButtonContent}>
                <Text style={styles.checkoutButtonText}>
                  Thanh toán ({selectedItems.length})
                </Text>
                <Text style={styles.checkoutButtonSubtext}>
                  {total.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <FloatingChatButton />
      </>
    </CustomerScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  loginButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ee4d2d',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#ee4d2d',
  },
  selectAllText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartItemSelected: {
    borderWidth: 2,
    borderColor: '#ee4d2d',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  restaurantName: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '600',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  quantityText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  freeDeliveryText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  freeDeliverySuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  freeDeliverySuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  priceBreakdown: {
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
    fontWeight: '500',
  },
  freeDeliveryPrice: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 22,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#ee4d2d',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  checkoutButtonContent: {
    flex: 1,
  },
  checkoutButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  checkoutButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
});

export default CartScreen;

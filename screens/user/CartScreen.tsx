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

const MIN_ORDER_FOR_FREE_DELIVERY = 150000; // Cập nhật để khớp với config trong deliveryFee.ts

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

  const calculateTotal = () => {
    // Trong giỏ hàng, chỉ hiển thị tạm tính
    // Phí vận chuyển sẽ được tính ở CheckoutScreen khi có địa chỉ
    return calculateSubtotal();
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
          activeOpacity={0.7}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </TouchableOpacity>

        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => {
                Alert.alert(
                  'Xác nhận',
                  'Bạn có chắc muốn xóa món này?',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Xóa', onPress: () => removeItem(item.id), style: 'destructive' },
                  ]
                );
              }}
              disabled={updating}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={22} color="#999" />
            </TouchableOpacity>
          </View>
          
          {item.restaurantName && (
            <View style={styles.restaurantRow}>
              <Ionicons name="restaurant-outline" size={14} color="#999" />
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item.restaurantName}
              </Text>
            </View>
          )}
          
          <View style={styles.itemBottom}>
            <View style={styles.priceContainer}>
              <Text style={styles.itemPriceUnit}>
                {item.price.toLocaleString('vi-VN')} đ
              </Text>
              <Text style={styles.itemTotal}>
                {itemTotal.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={updating || item.quantity <= 1}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="remove" 
                  size={18} 
                  color={item.quantity <= 1 ? "#ccc" : "#ee4d2d"} 
                />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={updating}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#ee4d2d" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      <CustomerScreenWrapper gradientHeight={180}>
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
  const total = calculateTotal();
  const isFreeDelivery = subtotal >= MIN_ORDER_FOR_FREE_DELIVERY;
  const remainingForFreeDelivery = MIN_ORDER_FOR_FREE_DELIVERY - subtotal;

  return (
    <CustomerScreenWrapper gradientHeight={120}>
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Giỏ hàng ({cartItems.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.selectAllContainer}
              onPress={handleSelectAll}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                selectedItems.length === cartItems.length && styles.checkboxSelected
              ]}>
                {selectedItems.length === cartItems.length && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
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
                <View style={styles.deliveryFeeInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#999" />
                  <Text style={styles.deliveryFeeText}>
                    Sẽ được tính khi nhập địa chỉ
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tạm tính:</Text>
                <Text style={styles.totalPrice}>
                  {total.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <Text style={styles.noteText}>
                * Phí vận chuyển sẽ được tính dựa trên khoảng cách từ nhà hàng đến địa chỉ giao hàng
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.checkoutButton,
                selectedItems.length === 0 && styles.checkoutButtonDisabled
              ]}
              onPress={handleCheckout}
              disabled={selectedItems.length === 0}
              activeOpacity={0.8}
            >
              <View style={styles.checkoutButtonContent}>
                <View style={styles.checkoutButtonLeft}>
                  <Text style={styles.checkoutButtonText}>
                    Thanh toán
                  </Text>
                  <Text style={styles.checkoutButtonSubtext}>
                    {selectedItems.length} món • {total.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <View style={styles.checkoutButtonRight}>
                  <Ionicons name="arrow-forward" size={22} color="#fff" />
                </View>
              </View>
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
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#ee4d2d',
    borderColor: '#ee4d2d',
  },
  selectAllText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cartItemSelected: {
    borderWidth: 2,
    borderColor: '#ee4d2d',
    backgroundColor: '#FFF5F3',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    marginLeft: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
    marginRight: 8,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  restaurantName: {
    fontSize: 13,
    color: '#999',
    flex: 1,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceContainer: {
    flex: 1,
  },
  itemPriceUnit: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 24,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 28,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 18,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 4,
  },
  footer: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  freeDeliveryText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
    lineHeight: 20,
  },
  freeDeliverySuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  freeDeliverySuccessText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    lineHeight: 20,
  },
  priceBreakdown: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  freeDeliveryPrice: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  totalPrice: {
    fontSize: 24,
    color: '#ee4d2d',
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  checkoutButton: {
    backgroundColor: '#ee4d2d',
    height: 56,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#ee4d2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  checkoutButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  checkoutButtonLeft: {
    flex: 1,
  },
  checkoutButtonRight: {
    marginLeft: 12,
  },
  checkoutButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  checkoutButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  deliveryFeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryFeeText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});

export default CartScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../config/Firebase';
import { UserStackParamList } from '../../navigation/UserNavigator';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;
type FoodDetailRouteProp = RouteProp<UserStackParamList, 'FoodDetail'>;

type Food = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

type CartItem = {
  foodId: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl: string;
  userId: string;
  createdAt: Date;
};

const { width } = Dimensions.get('window');

const FoodDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FoodDetailRouteProp>();
  const { foodId } = route.params;

  const [food, setFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    loadFoodDetails();
    checkFavoriteStatus();
  }, [foodId]);

  const loadFoodDetails = async () => {
    try {
      const foodDoc = await getDoc(doc(db, 'foods', foodId));
      if (foodDoc.exists()) {
        setFood({ id: foodDoc.id, ...foodDoc.data() } as Food);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading food details:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin món ăn');
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const favoritesRef = collection(db, 'favorites');
      const q = query(
        favoritesRef,
        where('userId', '==', user.uid),
        where('foodId', '==', foodId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setIsFavorite(true);
        setFavoriteId(querySnapshot.docs[0].id);
      } else {
        setIsFavorite(false);
        setFavoriteId(null);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          'Thông báo',
          'Vui lòng đăng nhập để thêm vào yêu thích',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
        return;
      }

      if (isFavorite && favoriteId) {
        // Remove from favorites
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
        Alert.alert('Thành công', 'Đã xóa khỏi danh sách yêu thích');
      } else {
        // Add to favorites
        const favoritesRef = collection(db, 'favorites');
        const favoriteDoc = await addDoc(favoritesRef, {
          userId: user.uid,
          foodId: foodId,
          createdAt: new Date(),
        });
        setIsFavorite(true);
        setFavoriteId(favoriteDoc.id);
        Alert.alert('Thành công', 'Đã thêm vào danh sách yêu thích');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện thao tác');
    }
  };

  const handleQuantityChange = (increment: number) => {
    const newQuantity = quantity + increment;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const addToCart = async () => {
    if (!food) return;

    try {
      setAddingToCart(true);

      // Check if user is logged in
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          'Thông báo',
          'Vui lòng đăng nhập để thêm vào giỏ hàng',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
        return;
      }

      // Check if item already exists in cart
      const cartsRef = collection(db, 'carts');
      const q = query(
        cartsRef,
        where('userId', '==', user.uid),
        where('foodId', '==', food.id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Item already exists in cart
        Alert.alert(
          'Thông báo',
          'Món ăn đã có trong giỏ hàng. Bạn có muốn cập nhật số lượng?',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Cập nhật',
              onPress: async () => {
                const cartDoc = querySnapshot.docs[0];
                const currentQuantity = cartDoc.data().quantity;
                await updateDoc(doc(db, 'carts', cartDoc.id), {
                  quantity: currentQuantity + quantity,
                });
                Alert.alert('Thành công', 'Đã cập nhật số lượng trong giỏ hàng');
              },
            },
          ]
        );
        return;
      }

      // Add new item to cart
      const cartItem: CartItem = {
        foodId: food.id,
        quantity: quantity,
        price: food.price,
        name: food.name,
        imageUrl: food.imageUrl,
        userId: user.uid,
        createdAt: new Date(),
      };

      await addDoc(cartsRef, cartItem);

      Alert.alert(
        'Thành công',
        'Đã thêm vào giỏ hàng',
        [
          {
            text: 'Tiếp tục mua',
            style: 'cancel',
          },
          {
            text: 'Xem giỏ hàng',
            onPress: () => navigation.navigate('Cart'),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const buyNow = async () => {
    if (!food) return;

    try {
      setAddingToCart(true);

      // Check if user is logged in
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          'Thông báo',
          'Vui lòng đăng nhập để mua hàng',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
        return;
      }

      // Add to cart first
      const cartsRef = collection(db, 'carts');
      const cartItem: CartItem = {
        foodId: food.id,
        quantity: quantity,
        price: food.price,
        name: food.name,
        imageUrl: food.imageUrl,
        userId: user.uid,
        createdAt: new Date(),
      };

      const cartDocRef = await addDoc(cartsRef, cartItem);

      // Navigate to checkout with the cart item id
      navigation.navigate('Checkout', {
        selectedItems: [cartDocRef.id],
      });
    } catch (error) {
      console.error('Error processing buy now:', error);
      Alert.alert('Lỗi', 'Không thể xử lý yêu cầu mua hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy món ăn</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={{ uri: food.imageUrl }} style={styles.foodImage} />
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ee4d2d" : "#fff"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.foodPrice}>
            {food.price.toLocaleString('vi-VN', {
              style: 'currency',
              currency: 'VND'
            })}
          </Text>
          
          <Text style={styles.descriptionTitle}>Mô tả</Text>
          <Text style={styles.description}>{food.description}</Text>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Số lượng:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-1)}
              >
                <Ionicons name="remove" size={20} color="#ee4d2d" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(1)}
              >
                <Ionicons name="add" size={20} color="#ee4d2d" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng tiền:</Text>
            <Text style={styles.totalPrice}>
              {(food.price * quantity).toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
              })}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, styles.addToCartButton]}
          onPress={addToCart}
          disabled={addingToCart}
        >
          <Ionicons name="cart-outline" size={24} color="#ee4d2d" />
          <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buyButton]}
          onPress={buyNow}
          disabled={addingToCart}
        >
          <Text style={styles.buyButtonText}>Mua ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  foodImage: {
    width: width,
    height: width * 0.8,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 16,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  foodPrice: {
    fontSize: 20,
    color: '#ee4d2d',
    fontWeight: '600',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ee4d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
  },
  totalPrice: {
    fontSize: 20,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  addToCartButton: {
    backgroundColor: '#fff3f0',
    marginRight: 8,
  },
  addToCartText: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: '600',
    marginLeft: 8,
  },
  buyButton: {
    backgroundColor: '#ee4d2d',
    marginLeft: 8,
  },
  buyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FoodDetailScreen; 
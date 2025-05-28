import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, getDocs, orderBy, where, limit, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, auth } from '../../config/Firebase';
import { UserStackParamList } from '../../navigation/UserNavigator';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;

const { width } = Dimensions.get('window');

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

type Category = {
  id: string;
  name: string;
  description: string;
  priority: number;
  icon: MaterialIconName;
};

type Food = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

type Promotion = {
  id: string;
  image: string;
  title: string;
  description: string;
  code: string;
  minOrder: number;
  discount: number;
  maxDiscount?: number;
  expiryDate: Date;
};

type SortOption = {
  id: string;
  label: string;
  value: (a: Food, b: Food) => number;
};

const sortOptions: SortOption[] = [
  {
    id: 'default',
    label: 'Mặc định',
    value: () => 0,
  },
  {
    id: 'priceAsc',
    label: 'Giá tăng dần',
    value: (a, b) => a.price - b.price,
  },
  {
    id: 'priceDesc',
    label: 'Giá giảm dần',
    value: (a, b) => b.price - a.price,
  },
  {
    id: 'nameAsc',
    label: 'Tên A-Z',
    value: (a, b) => a.name.localeCompare(b.name),
  },
  {
    id: 'nameDesc',
    label: 'Tên Z-A',
    value: (a, b) => b.name.localeCompare(a.name),
  },
];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [favorites, setFavorites] = useState<{ [key: string]: string }>({});
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>('default');

  const loadCartItemCount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const cartsRef = collection(db, 'carts');
      const q = query(cartsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      setCartItemCount(querySnapshot.size);
    } catch (error) {
      console.error('Error loading cart items:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const favoritesMap: { [key: string]: string } = {};
      querySnapshot.forEach((doc) => {
        favoritesMap[doc.data().foodId] = doc.id;
      });
      setFavorites(favoritesMap);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  useEffect(() => {
    loadCartItemCount();
    loadFavorites();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCartItemCount();
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Set up header right button
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart-outline" size={48} color="#333" />
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, cartItemCount]);

  useEffect(() => {
    if (!foods) return;
    
    const query = searchQuery.toLowerCase().trim();
    if (query === '') {
      setFilteredFoods(foods);
      return;
    }

    // Log for debugging
    console.log('Search query:', query);
    console.log('All foods:', foods);

    const filtered = foods.filter(food => {
      const nameMatch = food.name.toLowerCase().includes(query);
      const descMatch = food.description.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });

    // Log filtered results
    console.log('Filtered foods:', filtered);
    setFilteredFoods(filtered);
  }, [searchQuery, foods, selectedCategory]);

  useEffect(() => {
    if (!foods) return;
    
    const sortedFoods = [...foods].sort(
      sortOptions.find(opt => opt.id === selectedSort)?.value || (() => 0)
    );
    
    if (searchQuery.trim() === '') {
      setFilteredFoods(sortedFoods);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = sortedFoods.filter(food => 
        food.name.toLowerCase().includes(query) || 
        food.description.toLowerCase().includes(query)
      );
      setFilteredFoods(filtered);
    }
  }, [searchQuery, foods, selectedSort]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Reset category selection when searching
    if (text.trim() !== '') {
      setSelectedCategory(null);
    }
  };

  const loadData = async () => {
    try {
      // Load categories
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(query(categoriesRef, orderBy('priority')));
      const categoriesData: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(categoriesData);

      // Load foods
      const foodsRef = collection(db, 'foods');
      let foodQuery = query(foodsRef, where('isAvailable', '==', true));
      
      if (selectedCategory) {
        foodQuery = query(foodsRef, 
          where('isAvailable', '==', true),
          where('category', '==', selectedCategory)
        );
      }
      
      const foodsSnapshot = await getDocs(foodQuery);
      const foodsData: Food[] = [];
      foodsSnapshot.forEach((doc) => {
        foodsData.push({ id: doc.id, ...doc.data() } as Food);
      });
      setFoods(foodsData);
      setFilteredFoods(foodsData);

      // Load active promotions
      const promotionsRef = collection(db, 'promotions');
      const now = new Date();
      const promotionsSnapshot = await getDocs(
        query(
          promotionsRef,
          where('expiryDate', '>', now),
          where('isActive', '==', true),
          orderBy('expiryDate'),
          limit(10)
        )
      );
      const promotionsData: Promotion[] = [];
      promotionsSnapshot.forEach((doc) => {
        const data = doc.data();
        promotionsData.push({
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate.toDate(),
        } as Promotion);
      });
      setPromotions(promotionsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const toggleFavorite = async (foodId: string) => {
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

      if (favorites[foodId]) {
        // Remove from favorites
        await deleteDoc(doc(db, 'favorites', favorites[foodId]));
        setFavorites(prev => {
          const newFavorites = { ...prev };
          delete newFavorites[foodId];
          return newFavorites;
        });
        Alert.alert('Thành công', 'Đã xóa khỏi danh sách yêu thích');
      } else {
        // Add to favorites
        const favoritesRef = collection(db, 'favorites');
        const favoriteDoc = await addDoc(favoritesRef, {
          userId: user.uid,
          foodId: foodId,
          createdAt: new Date(),
        });
        setFavorites(prev => ({
          ...prev,
          [foodId]: favoriteDoc.id,
        }));
        Alert.alert('Thành công', 'Đã thêm vào danh sách yêu thích');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện thao tác');
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemSelected
      ]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <View style={[
        styles.categoryIcon,
        selectedCategory === item.id && styles.categoryIconSelected
      ]}>
        <MaterialIcons 
          name={item.icon in MaterialIcons.glyphMap ? item.icon : 'restaurant'} 
          size={24} 
          color={selectedCategory === item.id ? "#fff" : "#ee4d2d"} 
        />
      </View>
      <Text style={[
        styles.categoryName,
        selectedCategory === item.id && styles.categoryNameSelected
      ]} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <TouchableOpacity style={styles.promotionItem}>
      <Image source={{ uri: item.image }} style={styles.promotionImage} />
      <View style={styles.promotionOverlay}>
        <View style={styles.promotionContent}>
          <Text style={styles.promotionTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.promotionDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.promotionFooter}>
            <View style={styles.promotionCode}>
              <Text style={styles.promotionCodeText}>{item.code}</Text>
            </View>
            <Text style={styles.promotionExpiry}>
              HSD: {item.expiryDate.toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity 
      style={styles.foodItem}
      onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
        >
          <Ionicons 
            name={favorites[item.id] ? "heart" : "heart-outline"} 
            size={20} 
            color={favorites[item.id] ? "#ee4d2d" : "#666"} 
          />
        </TouchableOpacity>
        {!item.isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Hết hàng</Text>
          </View>
        )}
      </View>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.foodDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.foodFooter}>
          <Text style={styles.foodPrice}>
            {item.price.toLocaleString('vi-VN', {
              style: 'currency',
              currency: 'VND'
            })}
          </Text>
          <TouchableOpacity 
            style={[
              styles.addToCartButton,
              !item.isAvailable && styles.addToCartButtonDisabled
            ]}
            onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
            disabled={!item.isAvailable}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sắp xếp theo</Text>
            <TouchableOpacity
              onPress={() => setShowSortModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.sortOption}
              onPress={() => {
                setSelectedSort(option.id);
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                selectedSort === option.id && styles.sortOptionTextSelected
              ]}>
                {option.label}
              </Text>
              {selectedSort === option.id && (
                <Ionicons name="checkmark" size={24} color="#ee4d2d" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderSortModal()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={24} color="#999" style={styles.searchIcon} />
            <TextInput 
              placeholder="Tìm kiếm món ăn..." 
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerCartButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <Ionicons name="cart-outline" size={24} color="#333" />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!searchQuery && (
          <>
            <Text style={styles.sectionTitle}>Danh mục</Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>Không có danh mục nào</Text>
              )}
            />
          </>
        )}

        {!searchQuery && promotions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ưu đãi hôm nay</Text>
            <FlatList
              data={promotions}
              renderItem={renderPromotion}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promotionsContainer}
            />
          </>
        )}

        <View style={styles.foodsHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery 
              ? `Kết quả tìm kiếm (${filteredFoods.length})`
              : selectedCategory 
                ? categories.find(c => c.id === selectedCategory)?.name || 'Món ăn'
                : 'Tất cả món ăn'
            }
          </Text>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="filter-outline" size={20} color="#666" />
            <Text style={styles.sortButtonText}>
              {sortOptions.find(opt => opt.id === selectedSort)?.label || 'Sắp xếp'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.foodsContainer}>
          {filteredFoods.map((item) => (
            <View key={item.id} style={styles.foodItemWrapper}>
              {renderFoodItem({ item })}
            </View>
          ))}
          {filteredFoods.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'Không tìm thấy món ăn phù hợp'
                  : 'Không có món ăn nào'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  headerCartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ee4d2d',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryIconSelected: {
    backgroundColor: '#ee4d2d',
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#ee4d2d',
    fontWeight: '500',
  },
  promotionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  promotionItem: {
    width: width * 0.8,
    height: width * 0.4,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  promotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    justifyContent: 'flex-end',
  },
  promotionContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.9,
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionCode: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  promotionCodeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  promotionExpiry: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  foodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  foodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  foodItemWrapper: {
    width: '50%',
    padding: 8,
  },
  foodItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.3,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  foodInfo: {
    padding: 12,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#ee4d2d',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  badge: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: '#ee4d2d',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartButton: {
    padding: 12,
    marginRight: 12,
    position: 'relative',
  },
  categoryItemSelected: {
    backgroundColor: '#fff3f0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#ee4d2d',
    fontWeight: '500',
  },
});

export default HomeScreen;

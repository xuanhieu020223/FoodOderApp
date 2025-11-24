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
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import LoadingSpinner from '../../components/LoadingSpinner';
import AIChatbox from '../../components/AIChatbox';
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
  restaurantId?: string;
  restaurantName?: string;
  rating?: number;
  sold?: number;
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
  icon: keyof typeof Ionicons.glyphMap;
  value: (a: Food, b: Food) => number;
};

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  image?: string;
  rating?: number;
  deliveryTime?: string;
  tags?: string[];
  openingHours?: string;
};

const sortOptions: SortOption[] = [
  {
    id: 'default',
    label: 'Mặc định',
    icon: 'apps-outline',
    value: () => 0,
  },
  {
    id: 'priceAsc',
    label: 'Giá tăng dần',
    icon: 'arrow-up-outline',
    value: (a, b) => a.price - b.price,
  },
  {
    id: 'priceDesc',
    label: 'Giá giảm dần',
    icon: 'arrow-down-outline',
    value: (a, b) => b.price - a.price,
  },
  {
    id: 'popular',
    label: 'Bán chạy',
    icon: 'flame-outline',
    value: (a, b) => (b.sold || 0) - (a.sold || 0),
  },
  {
    id: 'rating',
    label: 'Đánh giá cao',
    icon: 'star-outline',
    value: (a, b) => (b.rating || 0) - (a.rating || 0),
  },
];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [restaurantMap, setRestaurantMap] = useState<Record<string, Restaurant>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [favorites, setFavorites] = useState<{ [key: string]: string }>({});
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>('default');
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showChatbox, setShowChatbox] = useState(false);

  useEffect(() => {
    const map: Record<string, Restaurant> = {};
    restaurants.forEach((rest) => {
      map[rest.id] = rest;
    });
    setRestaurantMap(map);
  }, [restaurants]);

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
    navigation.setOptions({
      headerRight: () => (
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
      ),
    });
  }, [navigation, cartItemCount]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') {
      setFilteredRestaurants([]);
      return;
    }

    const restaurantMatches = restaurants.filter(rest => {
      const nameMatch = rest.name?.toLowerCase().includes(query);
      const addressMatch = rest.address?.toLowerCase().includes(query);
      return nameMatch || addressMatch;
    });
    setFilteredRestaurants(restaurantMatches);
  }, [searchQuery, restaurants]);

  useEffect(() => {
    if (!foods) return;
    
    let filtered = [...foods];
    
    // Apply price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(food => {
        if (priceFilter === 'low') return food.price < 50000;
        if (priceFilter === 'medium') return food.price >= 50000 && food.price < 150000;
        if (priceFilter === 'high') return food.price >= 150000;
        return true;
      });
    }
    
    // Apply sort
    const sortedFoods = filtered.sort(
      sortOptions.find(opt => opt.id === selectedSort)?.value || (() => 0)
    );
    
    // Apply search
    if (searchQuery.trim() === '') {
      setFilteredFoods(sortedFoods);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const searchFiltered = sortedFoods.filter(food => {
        const nameMatch = food.name.toLowerCase().includes(query);
        const descMatch = food.description.toLowerCase().includes(query);
        const restaurantName = food.restaurantId ? restaurantMap[food.restaurantId]?.name : undefined;
        const restaurantMatch = restaurantName?.toLowerCase().includes(query);
        return nameMatch || descMatch || restaurantMatch;
      });
      setFilteredFoods(searchFiltered);
    }
  }, [searchQuery, foods, selectedSort, restaurantMap, priceFilter]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() !== '') {
      setSelectedCategory(null);
    }
  };

  const loadData = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(query(categoriesRef, orderBy('priority')));
      const categoriesData: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(categoriesData);

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

      const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
      const restaurantsData: Restaurant[] = [];
      restaurantsSnapshot.forEach((doc) => {
        restaurantsData.push({ id: doc.id, ...doc.data() } as Restaurant);
      });
      setRestaurants(restaurantsData);

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
    await loadCartItemCount();
    await loadFavorites();
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
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
          ]
        );
        return;
      }

      if (favorites[foodId]) {
        await deleteDoc(doc(db, 'favorites', favorites[foodId]));
        setFavorites(prev => {
          const newFavorites = { ...prev };
          delete newFavorites[foodId];
          return newFavorites;
        });
      } else {
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
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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
    <TouchableOpacity 
      style={styles.promotionItem}
      onPress={() => navigation.navigate('Vouchers')}
    >
      <Image source={{ uri: item.image }} style={styles.promotionImage} resizeMode="cover" />
      <View style={styles.promotionOverlay}>
        <View style={styles.promotionContent}>
          <View style={styles.promotionBadge}>
            <Ionicons name="gift" size={16} color="#fff" />
            <Text style={styles.promotionBadgeText}>KHUYẾN MÃI</Text>
          </View>
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

  const renderRestaurantCard = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
    >
      <View style={styles.restaurantImageContainer}>
        <Image
          source={{ uri: item.image || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png' }}
          style={styles.restaurantCardImage}
          resizeMode="cover"
        />
        {item.rating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.restaurantCardContent}>
        <Text style={styles.restaurantCardName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.restaurantCardMeta}>
          <Ionicons name="time-outline" size={12} color="#666" />
          <Text style={styles.restaurantCardMetaText}>
            {item.deliveryTime || '20-30 phút'}
          </Text>
        </View>
        {item.address && (
          <Text style={styles.restaurantCardAddress} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity 
      style={styles.foodItem}
      onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.foodImage} resizeMode="cover" />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
        >
          <Ionicons 
            name={favorites[item.id] ? "heart" : "heart-outline"} 
            size={18} 
            color={favorites[item.id] ? "#ee4d2d" : "#fff"} 
          />
        </TouchableOpacity>
        {!item.isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Hết hàng</Text>
          </View>
        )}
        {item.rating && item.rating >= 4.5 && (
          <View style={styles.hotBadge}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.hotBadgeText}>Hot</Text>
          </View>
        )}
      </View>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        {item.restaurantId && (
          <Text style={styles.foodRestaurant} numberOfLines={1}>
            {restaurantMap[item.restaurantId]?.name || 'Đối tác FoodOrder'}
          </Text>
        )}
        <View style={styles.foodRatingRow}>
          {item.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.sold && item.sold > 0 && (
            <Text style={styles.soldText}>Đã bán {item.sold}+</Text>
          )}
        </View>
        <View style={styles.foodFooter}>
          <Text style={styles.foodPrice}>
            {item.price.toLocaleString('vi-VN')} đ
          </Text>
          <TouchableOpacity 
            style={[
              styles.addToCartButton,
              !item.isAvailable && styles.addToCartButtonDisabled
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (item.isAvailable) {
                navigation.navigate('FoodDetail', { foodId: item.id });
              }
            }}
            disabled={!item.isAvailable}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sắp xếp & Lọc</Text>
            <TouchableOpacity
              onPress={() => setShowSortModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sắp xếp theo</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option.id);
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <Ionicons 
                    name={option.icon} 
                    size={20} 
                    color={selectedSort === option.id ? "#ee4d2d" : "#666"} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    selectedSort === option.id && styles.sortOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {selectedSort === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#ee4d2d" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Khoảng giá</Text>
            {[
              { id: 'all', label: 'Tất cả', icon: 'apps-outline' },
              { id: 'low', label: 'Dưới 50K', icon: 'cash-outline' },
              { id: 'medium', label: '50K - 150K', icon: 'wallet-outline' },
              { id: 'high', label: 'Trên 150K', icon: 'diamond-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.sortOption}
                onPress={() => {
                  setPriceFilter(option.id as any);
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={priceFilter === option.id ? "#ee4d2d" : "#666"} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    priceFilter === option.id && styles.sortOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {priceFilter === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#ee4d2d" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowSortModal(false)}
          >
            <Text style={styles.applyButtonText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderSortModal()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ee4d2d" />
        }
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#999" style={styles.searchIcon} />
            <TextInput 
              placeholder="Tìm kiếm món ăn, nhà hàng..." 
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleSearch('')}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!searchQuery ? (
          <>
            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Danh mục</Text>
              <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
                ListEmptyComponent={() => (
                  <View style={styles.emptyCategoryContainer}>
                    <Text style={styles.emptyText}>Không có danh mục nào</Text>
                  </View>
                )}
              />
            </View>

            {/* Promotions */}
            {promotions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Ưu đãi hôm nay</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Vouchers')}>
                    <Text style={styles.seeAllText}>Xem tất cả</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={promotions}
                  renderItem={renderPromotion}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promotionsContainer}
                />
              </View>
            )}

            {/* Restaurants */}
            {restaurants.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nhà hàng nổi bật</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('RestaurantList')}>
                    <Text style={styles.seeAllText}>Xem tất cả</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={restaurants.slice(0, 10)}
                  horizontal
                  keyExtractor={(item) => item.id}
                  renderItem={renderRestaurantCard}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.restaurantCarousel}
                />
              </View>
            )}

            {/* Foods Section */}
            <View style={styles.section}>
              <View style={styles.foodsHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory 
                    ? categories.find(c => c.id === selectedCategory)?.name || 'Món ăn'
                    : 'Gợi ý cho bạn'
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setShowSortModal(true)}
                >
                  <Ionicons name="filter" size={18} color="#ee4d2d" />
                  <Text style={styles.filterButtonText}>Lọc</Text>
                </TouchableOpacity>
              </View>
              
              {filteredFoods.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="restaurant-outline" size={64} color="#ddd" />
                  <Text style={styles.emptyText}>Không có món ăn nào</Text>
                </View>
              ) : (
                <View style={styles.foodsContainer}>
                  {filteredFoods.map((item) => (
                    <View key={item.id} style={styles.foodItemWrapper}>
                      {renderFoodItem({ item })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              Kết quả tìm kiếm ({filteredFoods.length + filteredRestaurants.length})
            </Text>
            
            {filteredFoods.length > 0 && (
              <>
                <Text style={styles.searchSectionTitle}>
                  Món ăn ({filteredFoods.length})
                </Text>
                {filteredFoods.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchRow}
                    onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.searchRowImage} />
                    <View style={styles.searchRowInfo}>
                      <Text style={styles.searchRowTitle}>{item.name}</Text>
                      <Text style={styles.searchRowMeta}>
                        {restaurantMap[item.restaurantId || '']?.name || 'Đối tác FoodOrder'}
                      </Text>
                      <Text style={styles.searchRowPrice}>
                        {item.price.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ee4d2d" />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {filteredRestaurants.length > 0 && (
              <>
                <Text style={[styles.searchSectionTitle, { marginTop: 20 }]}>
                  Nhà hàng ({filteredRestaurants.length})
                </Text>
                {filteredRestaurants.map((restaurantItem) => (
                  <TouchableOpacity
                    key={restaurantItem.id}
                    style={styles.searchRow}
                    onPress={() =>
                      navigation.navigate('RestaurantDetail', { restaurantId: restaurantItem.id })
                    }
                  >
                    <Image
                      source={{
                        uri: restaurantItem.image || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
                      }}
                      style={styles.searchRowImage}
                    />
                    <View style={styles.searchRowInfo}>
                      <Text style={styles.searchRowTitle}>{restaurantItem.name}</Text>
                      <Text style={styles.searchRowMeta} numberOfLines={1}>
                        {restaurantItem.address}
                      </Text>
                      {restaurantItem.rating && (
                        <View style={styles.searchRatingRow}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.searchRatingText}>
                            {restaurantItem.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ee4d2d" />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {filteredFoods.length === 0 && filteredRestaurants.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ddd" />
                <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                <Text style={styles.emptySubtext}>
                  Thử tìm kiếm với từ khóa khác
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={{ height: 24 }} />
      </ScrollView>
      
      {/* AI Chatbox Floating Button */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(300)}
        style={styles.chatButtonContainer}
      >
        <TouchableOpacity
          onPress={() => setShowChatbox(true)}
          style={styles.chatButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ee4d2d', '#ff6b4a']}
            style={styles.chatButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="smart-toy" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* AI Chatbox Modal */}
      <AIChatbox visible={showChatbox} onClose={() => setShowChatbox(false)} />
    </SafeAreaView>
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
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerCartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryItemSelected: {
    backgroundColor: 'transparent',
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIconSelected: {
    backgroundColor: '#ee4d2d',
    elevation: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: '#ee4d2d',
    fontWeight: '600',
  },
  promotionsContainer: {
    paddingHorizontal: 16,
  },
  promotionItem: {
    width: width * 0.85,
    height: 180,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  promotionContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  promotionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  promotionDescription: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 12,
    opacity: 0.95,
    lineHeight: 18,
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionCode: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promotionCodeText: {
    color: '#ee4d2d',
    fontSize: 13,
    fontWeight: 'bold',
  },
  promotionExpiry: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  restaurantCarousel: {
    paddingHorizontal: 16,
  },
  restaurantCard: {
    width: 180,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  restaurantCardImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  restaurantCardContent: {
    padding: 12,
  },
  restaurantCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  restaurantCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantCardMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  restaurantCardAddress: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  foodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  foodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  foodItemWrapper: {
    width: '50%',
    padding: 8,
  },
  foodItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.35,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hotBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  foodInfo: {
    padding: 12,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  foodRestaurant: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  foodRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  soldText: {
    fontSize: 11,
    color: '#999',
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  addToCartButton: {
    backgroundColor: '#ee4d2d',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyCategoryContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  searchResultsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchRowImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  searchRowInfo: {
    flex: 1,
  },
  searchRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  searchRowMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  searchRowPrice: {
    fontSize: 15,
    color: '#ee4d2d',
    fontWeight: 'bold',
  },
  searchRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  searchRatingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#ee4d2d',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#ee4d2d',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#ee4d2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;

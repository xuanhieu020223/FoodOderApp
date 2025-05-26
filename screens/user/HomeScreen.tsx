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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { UserStackParamList } from '../../navigation/UserNavigator';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;

const { width } = Dimensions.get('window');

type Category = {
  id: string;
  name: string;
  description: string;
  priority: number;
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

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        <Ionicons 
          name="restaurant" 
          size={24} 
          color={selectedCategory === item.id ? "#fff" : "#ee4d2d"} 
        />
      </View>
      <Text style={[
        styles.categoryName,
        selectedCategory === item.id && styles.categoryNameSelected
      ]}>{item.name}</Text>
      <Text style={[
        styles.categoryDescription,
        selectedCategory === item.id && styles.categoryDescriptionSelected
      ]} numberOfLines={1}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <TouchableOpacity 
      style={styles.promotionItem}
      onPress={() => {
        // Show promotion details
      }}
    >
      <Image source={{ uri: item.image }} style={styles.promotionImage} />
      <View style={styles.promotionContent}>
        <Text style={styles.promotionTitle}>{item.title}</Text>
        <Text style={styles.promotionDescription}>{item.description}</Text>
        <View style={styles.promotionFooter}>
          <Text style={styles.promotionCode}>{item.code}</Text>
          <Text style={styles.promotionExpiry}>
            HSD: {item.expiryDate.toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity 
      style={styles.foodItem}
      onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodDescription} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.foodPrice}>
          {item.price.toLocaleString('vi-VN', {
            style: 'currency',
            currency: 'VND'
          })}
        </Text>
      </View>
    </TouchableOpacity>
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
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={20} color="#ee4d2d" />
            <Text style={styles.locationText}>Giao đến</Text>
            <Text style={styles.addressText}>Chọn địa chỉ giao hàng</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </View>
          <TouchableOpacity style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color="#ee4d2d" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput 
            placeholder="Tìm kiếm món ăn..." 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

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

        <Text style={styles.sectionTitle}>Ưu đãi hôm nay</Text>
        <FlatList
          data={promotions}
          renderItem={renderPromotion}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promotionsContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có ưu đãi nào</Text>
            </View>
          )}
        />

        <Text style={styles.sectionTitle}>
          {selectedCategory 
            ? categories.find(c => c.id === selectedCategory)?.name || 'Món ăn'
            : 'Tất cả món ăn'}
        </Text>
        <View style={styles.foodsContainer}>
          {foods.map((item) => (
            <View key={item.id} style={styles.foodItemWrapper}>
              {renderFoodItem({ item })}
            </View>
          ))}
          {foods.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có món ăn nào</Text>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  cartButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
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
    width: 100,
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  categoryItemSelected: {
    backgroundColor: '#ee4d2d',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconSelected: {
    backgroundColor: '#fff',
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#fff',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryDescriptionSelected: {
    color: '#fff',
  },
  promotionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  promotionItem: {
    width: width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  promotionImage: {
    width: '100%',
    height: width * 0.4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  promotionContent: {
    padding: 12,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionCode: {
    fontSize: 14,
    color: '#ee4d2d',
    fontWeight: '500',
  },
  promotionExpiry: {
    fontSize: 12,
    color: '#999',
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
  foodImage: {
    width: '100%',
    height: width * 0.3,
    resizeMode: 'cover',
  },
  foodInfo: {
    padding: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  foodPrice: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;

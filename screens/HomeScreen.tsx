import React from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomNav from '../components/BottomNav';

// Định nghĩa type cho Navigation
type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  OrdersScreen: undefined;
  FavoritesScreen: undefined;
  NotificationsScreen: undefined;
  ProfileScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const categories = [
  { id: '1', name: 'Đồ ăn', icon: 'restaurant' },
  { id: '2', name: 'Đồ uống', icon: 'local-cafe' },
  { id: '3', name: 'Trà sữa', icon: 'local-drink' },
  { id: '4', name: 'Bánh ngọt', icon: 'cake' },
  { id: '5', name: 'Đồ chay', icon: 'eco' },
];

const featuredFoods = [
  {
    id: '1',
    name: 'Cơm gà xối mỡ',
    price: '45.000đ',
    rating: 4.8,
    time: '25-35',
    image: 'https://cdn.tgdd.vn/Files/2021/08/04/1373941/pizza-hai-san-1.jpg',
  },
  {
    id: '2',
    name: 'Bún bò Huế',
    price: '55.000đ',
    rating: 4.7,
    time: '20-30',
    image: 'https://cdn.tgdd.vn/2021/08/content/Cover-800x450-9.jpg',
  },
];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  
  const renderCategory = ({ item }: any) => (
    <TouchableOpacity style={styles.categoryItem}>
      <MaterialIcons name={item.icon} size={24} color="#ee4d2d" />
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderFood = ({ item }: any) => (
    <TouchableOpacity style={styles.foodCard}>
      <Image source={{ uri: item.image }} style={styles.foodImage} />
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.foodDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#ffc107" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.timeText}>{item.time} phút</Text>
        </View>
        <Text style={styles.foodPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            placeholder="Tìm kiếm món ăn, nhà hàng..." 
            style={styles.searchInput}
          />
        </View>

        <View style={styles.promotionContainer}>
          <Image 
            source={{ uri: 'https://food-cms.grab.com/compressed_webp/merchants/5-C3VTR6KELVUNJN/hero/photo_637f9e0c-4c3a-4f1c-8c1c-8c1c8c1c8c1c_1619164800.webp' }}
            style={styles.promotionImage}
          />
        </View>

        <Text style={styles.sectionTitle}>Danh mục</Text>
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />

        <Text style={styles.sectionTitle}>Món ăn nổi bật</Text>
        <FlatList
          horizontal
          data={featuredFoods}
          renderItem={renderFood}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.foodsContainer}
        />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginLeft: 4,
    flex: 1,
  },
  cartButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  promotionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  promotionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  categoryItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 12,
    width: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryText: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
  },
  foodsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  foodCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  foodImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  foodInfo: {
    padding: 12,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  foodDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  foodPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ee4d2d',
  },
});

export default HomeScreen;

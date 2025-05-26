import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type Restaurant = {
  id: string;
  name: string;
  image: string;
  rating: number;
  ratingCount: number;
  distance: string;
  deliveryTime: string;
  priceRange: string;
  cuisine: string;
};

const favoriteRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Cơm Tấm Phúc Lộc Thọ',
    image: 'https://images.foody.vn/res/g119/1184695/prof/s640x400/foody-upload-api-foody-mobile-im-f5d0d927-230403114431.jpeg',
    rating: 4.5,
    ratingCount: 999,
    distance: '0.8km',
    deliveryTime: '15-25',
    priceRange: '30k-50k',
    cuisine: 'Cơm',
  },
  {
    id: '2',
    name: 'Bún Bò Huế O Xuân',
    image: 'https://images.foody.vn/res/g119/1184695/prof/s640x400/foody-upload-api-foody-mobile-im-f5d0d927-230403114431.jpeg',
    rating: 4.8,
    ratingCount: 888,
    distance: '1.2km',
    deliveryTime: '20-30',
    priceRange: '40k-70k',
    cuisine: 'Bún',
  },
  {
    id: '3',
    name: 'Phở Gia Truyền Hà Nội',
    image: 'https://images.foody.vn/res/g119/1184695/prof/s640x400/foody-upload-api-foody-mobile-im-f5d0d927-230403114431.jpeg',
    rating: 4.6,
    ratingCount: 777,
    distance: '1.5km',
    deliveryTime: '20-35',
    priceRange: '35k-60k',
    cuisine: 'Phở',
  },
];

const FavoritesScreen = () => {
  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity style={styles.restaurantCard}>
      <Image source={{ uri: item.image }} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cuisineText}>{item.cuisine}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFC107" />
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.ratingCount}>({item.ratingCount}+)</Text>
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>{item.distance}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.detailText}>{item.deliveryTime} phút</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.detailText}>{item.priceRange}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.favoriteButton}>
        <Ionicons name="heart" size={24} color="#ee4d2d" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yêu thích</Text>
      </View>

      {favoriteRestaurants.length > 0 ? (
        <FlatList
          data={favoriteRestaurants}
          renderItem={renderRestaurant}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.restaurantList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            Bạn chưa có nhà hàng yêu thích nào
          </Text>
          <Text style={styles.emptySubtext}>
            Hãy khám phá và lưu lại những nhà hàng bạn yêu thích
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  restaurantList: {
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  restaurantImage: {
    width: '100%',
    height: 160,
  },
  restaurantInfo: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  cuisineText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  dot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default FavoritesScreen; 
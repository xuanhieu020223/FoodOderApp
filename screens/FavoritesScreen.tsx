import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const FavoritesScreen = () => {
  const favorites = [
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

  const renderFavorite = ({ item }: any) => (
    <TouchableOpacity style={styles.favoriteCard}>
      <Image source={{ uri: item.image }} style={styles.favoriteImage} />
      <View style={styles.favoriteInfo}>
        <Text style={styles.favoriteName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.favoriteDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#ffc107" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.timeText}>{item.time} phút</Text>
        </View>
        <Text style={styles.favoritePrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Món ăn yêu thích</Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.favoritesList}
        showsVerticalScrollIndicator={false}
      />
      
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  favoritesList: {
    padding: 16,
  },
  favoriteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  favoriteImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  favoriteInfo: {
    padding: 12,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  favoriteDetails: {
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
  favoritePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ee4d2d',
  },
});

export default FavoritesScreen; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/Firebase';
import { UserStackParamList } from '../../navigation/UserNavigator';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;

type Food = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

type FavoriteData = {
  userId: string;
  foodId: string;
  createdAt: any;
};

type FavoriteItem = {
  id: string;
  userId: string;
  foodId: string;
  food: Food;
  createdAt: Date;
};

const FavoritesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const favoritesData: FavoriteItem[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const favoriteData = docSnapshot.data() as FavoriteData;
        // Fetch food details
        const foodRef = doc(db, 'foods', favoriteData.foodId);
        const foodDoc = await getDoc(foodRef);
        
        if (foodDoc.exists()) {
          const foodData = foodDoc.data();
          favoritesData.push({
            id: docSnapshot.id,
            userId: favoriteData.userId,
            foodId: favoriteData.foodId,
            food: {
              id: foodDoc.id,
              name: foodData.name,
              description: foodData.description,
              price: foodData.price,
              category: foodData.category,
              imageUrl: foodData.imageUrl,
              isAvailable: foodData.isAvailable,
            },
            createdAt: favoriteData.createdAt.toDate(),
          });
        }
      }

      // Sort by most recently added
      favoritesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setFavorites(favoritesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu thích');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    const unsubscribe = navigation.addListener('focus', loadFavorites);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', favoriteId));
      setFavorites(prev => prev.filter(item => item.id !== favoriteId));
      Alert.alert('Thành công', 'Đã xóa khỏi danh sách yêu thích');
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Lỗi', 'Không thể xóa khỏi danh sách yêu thích');
    }
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity
      style={styles.favoriteItem}
      onPress={() => navigation.navigate('FoodDetail', { foodId: item.food.id })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.food.imageUrl }} style={styles.foodImage} />
      
      {!item.food.isAvailable && (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableText}>Hết hàng</Text>
        </View>
      )}
      
      <View style={styles.foodInfo}>
        <View style={styles.foodHeader}>
          <Text style={styles.foodName} numberOfLines={1}>
            {item.food.name}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Xác nhận',
                'Bạn có chắc muốn xóa món này khỏi danh sách yêu thích?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Xóa', onPress: () => removeFavorite(item.id) },
                ]
              );
            }}
          >
            <Ionicons name="heart" size={24} color="#ee4d2d" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.foodDescription} numberOfLines={2}>
          {item.food.description}
        </Text>
        
        <View style={styles.foodFooter}>
          <Text style={styles.foodPrice}>
            {item.food.price.toLocaleString('vi-VN')}đ
          </Text>
          <TouchableOpacity 
            style={[
              styles.orderButton,
              !item.food.isAvailable && styles.orderButtonDisabled
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (item.food.isAvailable) {
                navigation.navigate('FoodDetail', { foodId: item.food.id });
              }
            }}
            disabled={!item.food.isAvailable}
          >
            <Text style={styles.orderButtonText}>
              {item.food.isAvailable ? 'Đặt món' : 'Hết hàng'}
            </Text>
          </TouchableOpacity>
        </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Món ăn yêu thích</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>Chưa có món ăn yêu thích</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('TabNavigator', { screen: 'Home' })}
          >
            <Text style={styles.browseButtonText}>Khám phá món ăn</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  favoriteItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodImage: {
    width: '100%',
    height: width * 0.4,
    resizeMode: 'cover',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  foodInfo: {
    padding: 16,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  foodDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ee4d2d',
  },
  orderButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  orderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FavoritesScreen; 
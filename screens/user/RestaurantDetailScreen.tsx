import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl } from 'react-native';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserStackParamList } from '../../navigation/UserNavigator';
import { MaterialIcons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<UserStackParamList>;

const PLACEHOLDER_FOOD_IMAGE = 'https://via.placeholder.com/80?text=Food';
const PLACEHOLDER_RESTAURANT_IMAGE = 'https://via.placeholder.com/600x300?text=Restaurant';

const RestaurantDetailScreen = ({ route }: any) => {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'restaurants', restaurantId));
      if (docSnap.exists()) {
        setRestaurant({ id: docSnap.id, ...docSnap.data() });
      } else {
        setRestaurant(null);
      }
      const foodSnap = await getDocs(
        query(collection(db, 'foods'), where('restaurantId', '==', restaurantId))
      );
      const foodList: any[] = [];
      foodSnap.forEach(f => foodList.push({ id: f.id, ...f.data() }));
      setFoods(foodList);
    } catch (e) {
      setRestaurant(null);
      setFoods([]);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="restaurant-menu" size={80} color="#ddd" />
        <Text style={styles.errorText}>Không tìm thấy nhà hàng</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="restaurant" size={28} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Chi tiết nhà hàng</Text>
            <Text style={styles.headerSubtitle}>Thông tin và thực đơn</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ee4d2d']} />}
      >
        {/* Restaurant Image */}
        <Image
          source={{ uri: restaurant.image || PLACEHOLDER_RESTAURANT_IMAGE }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Restaurant Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.name}>{restaurant.name}</Text>
          
          {restaurant.address && (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={18} color="#ee4d2d" />
              <Text style={styles.address}>{restaurant.address}</Text>
            </View>
          )}

          {restaurant.description && (
            <Text style={styles.desc}>{restaurant.description}</Text>
          )}

          {restaurant.openingHours && (
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={18} color="#059669" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Giờ mở cửa:</Text>
                <Text style={styles.infoValue}>{restaurant.openingHours}</Text>
              </View>
            </View>
          )}

          {restaurant.rating && (
            <View style={styles.infoRow}>
              <MaterialIcons name="star" size={18} color="#FFB800" />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Menu Header */}
        <View style={styles.menuHeaderContainer}>
          <MaterialIcons name="restaurant-menu" size={24} color="#ee4d2d" />
          <Text style={styles.menuHeader}>Thực đơn</Text>
        </View>

        {/* Food List */}
        {foods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fastfood" size={60} color="#ddd" />
            <Text style={styles.emptyText}>Chưa có món ăn nào</Text>
          </View>
        ) : (
          foods.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.foodCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
            >
              <Image
                source={{ uri: item.imageUrl || PLACEHOLDER_FOOD_IMAGE }}
                style={styles.foodImage}
                resizeMode="cover"
              />
              <View style={styles.foodContent}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text numberOfLines={2} style={styles.foodDescription}>
                  {item.description || 'Không có mô tả'}
                </Text>
                <Text style={styles.foodPrice}>{item.price?.toLocaleString()} đ</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 240,
    backgroundColor: '#eee',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  desc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
  ratingText: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '600',
    marginLeft: 8,
  },
  menuHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  foodImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  foodContent: {
    flex: 1,
    marginLeft: 12,
  },
  foodName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  foodPrice: {
    fontSize: 16,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default RestaurantDetailScreen;
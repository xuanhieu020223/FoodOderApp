import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator } from 'react-native';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/Firebase';

const RestaurantDetailScreen = ({ route }: any) => {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ee4d2d" />;

  if (!restaurant) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Không tìm thấy nhà hàng</Text>;

  return (
    <View style={styles.container}>
      <Image source={{ uri: restaurant.image }} style={styles.image} />
      <Text style={styles.name}>{restaurant.name}</Text>
      <Text style={styles.address}>{restaurant.address}</Text>
      <Text style={styles.desc}>{restaurant.description}</Text>
      <Text style={styles.menuHeader}>Thực đơn</Text>
      <FlatList
        data={foods}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.foodCard}>
            <Image source={{ uri: item.image }} style={styles.foodImage} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.foodPrice}>{item.price?.toLocaleString()} đ</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Chưa có món ăn nào</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  image: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: '#eee' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  address: { fontSize: 14, color: '#555', marginTop: 2 },
  desc: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 10 },
  menuHeader: { fontSize: 18, fontWeight: 'bold', color: '#ee4d2d', marginVertical: 10 },
  foodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7f3', borderRadius: 8, padding: 10, marginBottom: 12 },
  foodImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' },
  foodName: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  foodPrice: { fontSize: 14, color: '#ee4d2d', marginTop: 2 },
});

export default RestaurantDetailScreen;
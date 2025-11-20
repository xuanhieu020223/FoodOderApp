import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/Firebase';

const RestaurantListScreen = ({ navigation }: any) => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'restaurants'));
        const data: any[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setRestaurants(data);
      } catch (e) {
        setRestaurants([]);
      }
      setLoading(false);
    };

    fetchRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return restaurants;
    return restaurants.filter(rest =>
      rest.name?.toLowerCase().includes(query) ||
      rest.address?.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Khám phá nhà hàng</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhà hàng, địa điểm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredRestaurants}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
          >
            <Image
              source={{ uri: item.image || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png' }}
              style={styles.image}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.rating ? `${item.rating.toFixed(1)} ★ · ` : ''}{item.deliveryTime || '20-30 phút'}
              </Text>
              <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có nhà hàng nào phù hợp.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7f3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  image: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee' },
  name: { fontWeight: '600', fontSize: 15, color: '#111827' },
  meta: { fontSize: 12, color: '#f97316', marginTop: 2 },
  address: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});

export default RestaurantListScreen;

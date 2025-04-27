import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const categories = [
  { id: '1', name: 'Pizza', icon: 'pizza-outline' },
  { id: '2', name: 'Burger', icon: 'fast-food-outline' },
  { id: '3', name: 'Sushi', icon: 'fish-outline' },
  { id: '4', name: 'Nước uống', icon: 'cafe-outline' },
];

const featuredFoods = [
  {
    id: '1',
    name: 'Pizza hải sản',
    price: '120.000đ',
    image: 'https://cdn.tgdd.vn/Files/2021/08/04/1373941/pizza-hai-san-1.jpg',
  },
  {
    id: '2',
    name: 'Burger bò Mỹ',
    price: '90.000đ',
    image: 'https://cdn.tgdd.vn/2021/08/content/Cover-800x450-9.jpg',
  },
];

const HomeScreen = () => {
  const renderCategory = ({ item }: any) => (
    <View style={styles.categoryItem}>
      <Ionicons name={item.icon} size={24} color="#3b82f6" />
      <Text style={styles.categoryText}>{item.name}</Text>
    </View>
  );

  const renderFood = ({ item }: any) => (
    <TouchableOpacity style={styles.foodCard}>
      <Image source={{ uri: item.image }} style={styles.foodImage} />
      <Text style={styles.foodName}>{item.name}</Text>
      <Text style={styles.foodPrice}>{item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Xin chào 👋</Text>
      <Text style={styles.subHeader}>Bạn muốn ăn gì hôm nay?</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
        <TextInput placeholder="Tìm món ăn..." style={styles.searchInput} />
      </View>

      <Text style={styles.sectionTitle}>Danh mục</Text>
      <FlatList
        horizontal
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />

      <Text style={styles.sectionTitle}>Món nổi bật</Text>
      <FlatList
        horizontal
        data={featuredFoods}
        renderItem={renderFood}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
  },
  categoryItem: {
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  categoryText: {
    marginTop: 6,
    fontSize: 14,
  },
  foodCard: {
    width: 150,
    marginRight: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  foodImage: {
    width: 120,
    height: 100,
    borderRadius: 8,
  },
  foodName: {
    marginTop: 8,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  foodPrice: {
    marginTop: 4,
    fontSize: 13,
    color: '#3b82f6',
  },
});

export default HomeScreen;

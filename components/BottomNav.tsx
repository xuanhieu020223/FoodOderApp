import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

const BottomNav = () => {
  const navigation = useNavigation<NavigationProp>();
  const currentRoute = navigation.getState().routes[navigation.getState().index].name;

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons 
          name={currentRoute === 'Home' ? 'home' : 'home-outline'} 
          size={24} 
          color={currentRoute === 'Home' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'Home' && styles.activeNavText]}>
          Trang chủ
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('OrdersScreen')}
      >
        <Ionicons 
          name={currentRoute === 'OrdersScreen' ? 'receipt' : 'receipt-outline'} 
          size={24} 
          color={currentRoute === 'OrdersScreen' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'OrdersScreen' && styles.activeNavText]}>
          Đơn hàng
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('FavoritesScreen')}
      >
        <Ionicons 
          name={currentRoute === 'FavoritesScreen' ? 'heart' : 'heart-outline'} 
          size={24} 
          color={currentRoute === 'FavoritesScreen' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'FavoritesScreen' && styles.activeNavText]}>
          Thích
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('NotificationsScreen')}
      >
        <Ionicons 
          name={currentRoute === 'NotificationsScreen' ? 'notifications' : 'notifications-outline'} 
          size={24} 
          color={currentRoute === 'NotificationsScreen' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'NotificationsScreen' && styles.activeNavText]}>
          Thông báo
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('ProfileScreen')}
      >
        <Ionicons 
          name={currentRoute === 'ProfileScreen' ? 'person' : 'person-outline'} 
          size={24} 
          color={currentRoute === 'ProfileScreen' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'ProfileScreen' && styles.activeNavText]}>
          Tôi
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeNavText: {
    color: '#ee4d2d',
  },
});

export default BottomNav; 
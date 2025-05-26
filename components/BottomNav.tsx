import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Orders: undefined;
  Favorites: undefined;
  Notifications: undefined;
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BottomNav = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const currentRoute = route.name;

  return (
    <View style={styles.container}>
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
        onPress={() => navigation.navigate('Orders')}
      >
        <Ionicons 
          name={currentRoute === 'Orders' ? 'receipt' : 'receipt-outline'} 
          size={24} 
          color={currentRoute === 'Orders' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'Orders' && styles.activeNavText]}>
          Đơn hàng
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Favorites')}
      >
        <Ionicons 
          name={currentRoute === 'Favorites' ? 'heart' : 'heart-outline'} 
          size={24} 
          color={currentRoute === 'Favorites' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'Favorites' && styles.activeNavText]}>
          Yêu thích
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Ionicons 
          name={currentRoute === 'Notifications' ? 'notifications' : 'notifications-outline'} 
          size={24} 
          color={currentRoute === 'Notifications' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'Notifications' && styles.activeNavText]}>
          Thông báo
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('Profile')}
      >
        <Ionicons 
          name={currentRoute === 'Profile' ? 'person' : 'person-outline'} 
          size={24} 
          color={currentRoute === 'Profile' ? '#ee4d2d' : '#666'} 
        />
        <Text style={[styles.navText, currentRoute === 'Profile' && styles.activeNavText]}>
          Tôi
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navItem: {
    alignItems: 'center',
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
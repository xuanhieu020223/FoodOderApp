import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { NavigatorScreenParams } from '@react-navigation/native';

// Import user screens
import HomeScreen from '../screens/user/HomeScreen';
import CartScreen from '../screens/user/CartScreen';
import OrdersScreen from '../screens/user/OrdersScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import FoodDetailScreen from '../screens/user/FoodDetailScreen';
import CheckoutScreen from '../screens/user/CheckoutScreen';
import AccountInfoScreen from '../screens/user/AccountInfoScreen';
import AddressScreen from '../screens/user/AddressScreen';
import AddAddressScreen from '../screens/user/AddAddressScreen';
import PaymentScreen from '../screens/user/PaymentScreen';
import VouchersScreen from '../screens/user/VouchersScreen';
import FavoritesScreen from '../screens/user/FavoritesScreen';
import SettingsScreen from '../screens/user/SettingsScreen';
import HelpScreen from '../screens/user/HelpScreen';

export type TabParamList = {
  Home: undefined;
  Orders: undefined;
  Notifications: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type UserStackParamList = {
  TabNavigator: NavigatorScreenParams<TabParamList>;
  FoodDetail: { foodId: string };
  Cart: undefined;
  Checkout: { selectedItems: string[] };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Settings: undefined;
  Help: undefined;
  About: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Vouchers: undefined;
  AccountInfo: undefined;
  Address: undefined;
  AddAddress: undefined;
  Payment: undefined;
};

const Stack = createNativeStackNavigator<UserStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ee4d2d',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Trang chủ'
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Đơn hàng'
        }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Yêu thích'
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Thông báo'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Tài khoản'
        }}
      />
    </Tab.Navigator>
  );
};

const UserNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TabNavigator"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FoodDetail"
        component={FoodDetailScreen}
        options={{ title: 'Chi tiết món ăn' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Giỏ hàng' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Thanh toán' }}
      />
      <Stack.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{ title: 'Thông tin tài khoản' }}
      />
      <Stack.Screen
        name="Address"
        component={AddressScreen}
        options={{ title: 'Sổ địa chỉ' }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={{ title: 'Thêm địa chỉ mới' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Phương thức thanh toán' }}
      />
      <Stack.Screen
        name="Vouchers"
        component={VouchersScreen}
        options={{ title: 'Voucher của tôi' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: 'Trung tâm trợ giúp' }}
      />
    </Stack.Navigator>
  );
};

export default UserNavigator;

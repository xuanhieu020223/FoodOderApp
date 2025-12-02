import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import Shipper screens (to be created)
import ShipperOrdersScreen from '../screens/shipper/ShipperOrdersScreen';
import ShipperNotificationsScreen from '../screens/shipper/ShipperNotificationsScreen';
import ShipperMapScreen from '../screens/shipper/ShipperMapScreen';
import ShipperFinanceScreen from '../screens/shipper/ShipperFinanceScreen';
import ShipperProfileScreen from '../screens/shipper/ShipperProfileScreen';
import ShipperChatbotScreen from '../screens/shipper/ShipperChatbotScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';

// Định nghĩa type cho các tab
export type ShipperTabParamList = {
  Orders: undefined;
  Map: undefined;
  Finance: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ShipperStackParamList = {
  ShipperTabNavigator: undefined;
  OrderTracking: { orderId: string; userRole?: 'customer' | 'shipper' | 'restaurant' };
  Chatbot: undefined;
  // Thêm các màn hình chi tiết nếu cần
};

const Tab = createBottomTabNavigator<ShipperTabParamList>();
const Stack = createNativeStackNavigator<ShipperStackParamList>();

const ShipperTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Orders') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
        else if (route.name === 'Map') iconName = focused ? 'map' : 'map-outline';
        else if (route.name === 'Finance') iconName = focused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#ee4d2d',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Orders" component={ShipperOrdersScreen} options={{ headerShown: false, tabBarLabel: 'Đơn hàng' }} />
    <Tab.Screen name="Map" component={ShipperMapScreen} options={{ headerShown: false, tabBarLabel: 'Bản đồ' }} />
    <Tab.Screen name="Finance" component={ShipperFinanceScreen} options={{ headerShown: false, tabBarLabel: 'Tài chính' }} />
    <Tab.Screen name="Notifications" component={ShipperNotificationsScreen} options={{ headerShown: false, tabBarLabel: 'Thông báo' }} />
    <Tab.Screen name="Profile" component={ShipperProfileScreen} options={{ headerShown: false, tabBarLabel: 'Tài khoản' }} />
  </Tab.Navigator>
);

const ShipperNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="ShipperTabNavigator" component={ShipperTabNavigator} options={{ headerShown: false }} />
    <Stack.Screen
      name="OrderTracking"
      component={OrderTrackingScreen}
      options={{ title: 'Theo dõi đơn hàng', headerShown: false }}
    />
    <Stack.Screen
      name="Chatbot"
      component={ShipperChatbotScreen}
      options={{ title: 'Chatbot AI', headerShown: false }}
    />
    {/* Thêm các màn hình chi tiết ở đây nếu cần */}
  </Stack.Navigator>
);

export default ShipperNavigator;

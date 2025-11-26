import React from 'react';
import { createStackNavigator, StackHeaderLeftProps } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { StackNavigationOptions } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import ManageUsersScreen from '../screens/customer/ManageUsersScreen';
import ManageFoodsScreen from '../screens/customer/ManageFoodsScreen';
import ManageCategoriesScreen from '../screens/customer/ManageCategoriesScreen';
import ManageOrdersScreen from '../screens/customer/ManageOrdersScreen';
import StatisticsScreen from '../screens/customer/StatisticsScreen';
import PromotionManagementScreen from '../screens/customer/PromotionManagementScreen';
import SupportCenterScreen from '../screens/customer/SupportCenterScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import RestaurantAccountScreen from '../screens/customer/RestaurantAccountScreen';

export type RestaurantTabParamList = {
  Orders: undefined;
  Menu: undefined;
  Revenue: undefined;
  Promotions: undefined;
  Account: undefined;
};

type AdminStackParamList = {
  AdminTabs: undefined;
  ManageCategories: undefined;
  ManageUsers: undefined;
  OrderTracking: { orderId: string; userRole?: 'customer' | 'shipper' | 'restaurant' };
};

const Stack = createStackNavigator<AdminStackParamList>();
const Tab = createBottomTabNavigator<RestaurantTabParamList>();

const HeaderLeft = ({ canGoBack }: StackHeaderLeftProps) => {
  const navigation = useNavigation();
  if (!canGoBack) return null;
  
  return (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={() => navigation.goBack()}
    >
      <MaterialIcons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const screenOptions: StackNavigationOptions = {
  headerStyle: {
    backgroundColor: '#ee4d2d',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerLeft: HeaderLeft,
  headerTitleAlign: 'center',
};

const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#ee4d2d',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: {
        height: 70,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: '#fff',
      },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        switch (route.name) {
          case 'Orders':
            iconName = focused ? 'reader' : 'reader-outline';
            break;
          case 'Menu':
            iconName = focused ? 'restaurant' : 'restaurant-outline';
            break;
          case 'Revenue':
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            break;
          case 'Promotions':
            iconName = focused ? 'gift' : 'gift-outline';
            break;
          case 'Account':
            iconName = focused ? 'person' : 'person-outline';
            break;
          default:
            break;
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Orders" component={ManageOrdersScreen} options={{ tabBarLabel: 'Đơn hàng' }} />
    <Tab.Screen name="Menu" component={ManageFoodsScreen} options={{ tabBarLabel: 'Thực đơn' }} />
    <Tab.Screen name="Revenue" component={StatisticsScreen} options={{ tabBarLabel: 'Doanh thu' }} />
    <Tab.Screen name="Promotions" component={PromotionManagementScreen} options={{ tabBarLabel: 'Khuyến mãi' }} />
    <Tab.Screen name="Account" component={RestaurantAccountScreen} options={{ tabBarLabel: 'Tài khoản' }} />
  </Tab.Navigator>
);

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AdminTabs"
        component={AdminTabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageCategories"
        component={ManageCategoriesScreen}
        options={{
          title: 'Quản lý danh mục',
        }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{
          title: 'Quản lý người dùng',
        }}
      />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{
          title: 'Theo dõi đơn hàng',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    marginLeft: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export type { AdminStackParamList, RestaurantTabParamList };
export default AdminNavigator; 
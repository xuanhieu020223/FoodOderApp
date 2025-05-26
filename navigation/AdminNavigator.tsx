import React from 'react';
import { createStackNavigator, StackHeaderLeftProps } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import type { StackNavigationOptions } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import ManageFoodsScreen from '../screens/admin/ManageFoodsScreen';
import ManageCategoriesScreen from '../screens/admin/ManageCategoriesScreen';
import ManageOrdersScreen from '../screens/admin/ManageOrdersScreen';
import StatisticsScreen from '../screens/admin/StatisticsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

type AdminStackParamList = {
  AdminDashboard: undefined;
  ManageOrders: undefined;
  ManageProducts: undefined;
  ManageCategories: undefined;
  ManageUsers: undefined;
  Statistics: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

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
    elevation: 0, // Android
    shadowOpacity: 0, // iOS
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerLeft: HeaderLeft,
  headerTitleAlign: 'center',
};

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageOrders"
        component={ManageOrdersScreen}
        options={{
          title: 'Quản lý đơn hàng',
        }}
      />
      <Stack.Screen
        name="ManageProducts"
        component={ManageFoodsScreen}
        options={{
          title: 'Quản lý món ăn',
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
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: 'Thống kê doanh thu',
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

export type { AdminStackParamList };
export default AdminNavigator; 
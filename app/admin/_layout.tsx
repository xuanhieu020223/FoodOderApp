import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ee4d2d',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="shopping-cart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-foods"
        options={{
          title: 'Món ăn',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="restaurant" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="bar-chart" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 
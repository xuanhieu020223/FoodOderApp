import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GOOGLE_MAPS_API_KEY } from '../../config/GoogleMaps';

const ShipperMapScreen = () => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    
    // Setup real-time listener
    const user = auth.currentUser;
    if (user?.uid) {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shipperId', '==', user.uid),
        where('status', 'in', ['accepted', 'picking', 'delivering'])
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(docSnap => {
          data.push({ id: docSnap.id, ...docSnap.data() });
        });
        setActiveOrders(data);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error listening to orders:', error);
        setLoading(false);
        setRefreshing(false);
      });

      return () => unsubscribe();
    }
  }, []);

  const fetchActiveOrders = async () => {
    setRefreshing(true);
    try {
      const user = auth.currentUser;
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shipperId', '==', user?.uid),
        where('status', 'in', ['accepted', 'picking', 'delivering'])
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setActiveOrders(data);
    } catch (e) {
      console.error('Error fetching active orders:', e);
      setActiveOrders([]);
    }
    setRefreshing(false);
  };

  const openGoogleMaps = (address: string, label: string) => {
    if (!address || address.trim() === '') {
      Alert.alert('Lỗi', 'Địa chỉ không hợp lệ');
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Lỗi', 'Không thể mở Google Maps. Vui lòng cài đặt ứng dụng Google Maps.');
    });
  };

  const openDirections = async (pickupAddress: string, deliveryAddress: string) => {
    if (!pickupAddress || !deliveryAddress) {
      Alert.alert('Lỗi', 'Thiếu thông tin địa chỉ');
      return;
    }

    // Lấy tuyến đường tối ưu
    const optimizedRoute = await getOptimizedRoute(pickupAddress, deliveryAddress);
    
    if (optimizedRoute) {
      const distance = optimizedRoute.legs[0]?.distance?.text || '';
      const duration = optimizedRoute.legs[0]?.duration?.text || '';
      Alert.alert(
        'Tuyến đường tối ưu',
        `Khoảng cách: ${distance}\nThời gian: ${duration}\n\nĐang mở Google Maps...`
      );
    }

    const encodedPickup = encodeURIComponent(pickupAddress);
    const encodedDelivery = encodeURIComponent(deliveryAddress);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodedPickup}&destination=${encodedDelivery}&travelmode=driving`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Lỗi', 'Không thể mở Google Maps. Vui lòng cài đặt ứng dụng Google Maps.');
    });
  };

  const calculateDistance = async (address1: string, address2: string) => {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY') {
        return '~5.2 km';
      }

      // Sử dụng Google Maps Distance Matrix API
      const origin = encodeURIComponent(address1);
      const destination = encodeURIComponent(address2);
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${GOOGLE_MAPS_API_KEY}&language=vi`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0]?.elements[0]?.distance) {
        const distance = data.rows[0].elements[0].distance;
        const distanceKm = (distance.value / 1000).toFixed(1);
        return `${distanceKm} km`;
      }
    } catch (e) {
      // Không log lỗi ra console để tránh hiển thị cho người dùng
      // Chỉ log trong development mode nếu cần debug
      if (__DEV__) {
        console.warn('Distance calculation error (silent)');
      }
    }
    return '~5.2 km';
  };

  const getOptimizedRoute = async (pickupAddress: string, deliveryAddress: string) => {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY') {
        return null;
      }

      // Sử dụng Google Maps Directions API để tối ưu tuyến đường
      const origin = encodeURIComponent(pickupAddress);
      const destination = encodeURIComponent(deliveryAddress);
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}&language=vi&alternatives=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        // Chọn tuyến đường ngắn nhất
        const routes = data.routes.sort((a: any, b: any) => {
          const distanceA = a.legs[0]?.distance?.value || 0;
          const distanceB = b.legs[0]?.distance?.value || 0;
          return distanceA - distanceB;
        });

        return routes[0];
      }
    } catch (e) {
      console.error('Error getting optimized route:', e);
    }
    return null;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'accepted':
        return { label: 'Đã nhận đơn', color: '#2196F3', icon: 'check-circle' };
      case 'picking':
        return { label: 'Đang lấy hàng', color: '#FFC107', icon: 'store' };
      case 'delivering':
        return { label: 'Đang giao hàng', color: '#F44336', icon: 'local-shipping' };
      default:
        return { label: status, color: '#666', icon: 'info' };
    }
  };

  if (loading && activeOrders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="map" size={28} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bản đồ & Chỉ đường</Text>
            <Text style={styles.headerSubtitle}>
              {activeOrders.length} đơn hàng đang giao
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchActiveOrders} />
        }
      >
        {activeOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="map" size={80} color="#ddd" />
            </View>
            <Text style={styles.emptyText}>Không có đơn hàng đang giao</Text>
            <Text style={styles.emptySubtext}>
              Nhận đơn hàng để xem chỉ đường và điều hướng
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchActiveOrders}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.refreshButtonText}>Làm mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.orderIdContainer}>
                      <View style={styles.orderIdIcon}>
                        <MaterialIcons name="receipt" size={20} color="#fff" />
                      </View>
                      <Text style={styles.orderId}>Đơn #{order.id.slice(-8).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                      <MaterialIcons name={statusInfo.icon as any} size={14} color="#fff" />
                      <Text style={styles.statusText}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  {/* Route Section */}
                  <View style={styles.routeSection}>
                    {/* Pickup Point */}
                    <View style={styles.routePoint}>
                      <View style={[styles.pointIcon, styles.pickupIcon]}>
                        <MaterialIcons name="store" size={20} color="#2196F3" />
                      </View>
                      <View style={styles.pointInfo}>
                        <Text style={styles.pointLabel}>Điểm lấy hàng</Text>
                        <Text style={styles.pointAddress} numberOfLines={2}>
                          {order.restaurantAddress || order.restaurantName || 'Chưa có địa chỉ'}
                        </Text>
                        {order.restaurantName && (
                          <Text style={styles.pointName}>{order.restaurantName}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.mapButton}
                          onPress={() => openGoogleMaps(
                            order.restaurantAddress || order.restaurantName || '',
                            'Điểm lấy hàng'
                          )}
                        >
                          <MaterialIcons name="directions" size={16} color="#2196F3" />
                          <Text style={styles.mapButtonText}>Mở bản đồ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Route Line */}
                    <View style={styles.routeLineContainer}>
                      <View style={styles.routeLine}>
                        <View style={styles.lineDot} />
                        <View style={styles.line} />
                        <View style={styles.lineDot} />
                      </View>
                      <View style={styles.distanceBadge}>
                        <MaterialIcons name="straighten" size={14} color="#666" />
                        <Text style={styles.distanceText}>Đang tính...</Text>
                      </View>
                    </View>

                    {/* Delivery Point */}
                    <View style={styles.routePoint}>
                      <View style={[styles.pointIcon, styles.deliveryIcon]}>
                        <MaterialIcons name="place" size={20} color="#F44336" />
                      </View>
                      <View style={styles.pointInfo}>
                        <Text style={styles.pointLabel}>Điểm giao hàng</Text>
                        <Text style={styles.pointAddress} numberOfLines={2}>
                          {order.address || 'Chưa có địa chỉ'}
                        </Text>
                        {(order.customerName || order.fullName) && (
                          <Text style={styles.pointName}>
                            {order.customerName || order.fullName}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={[styles.mapButton, styles.deliveryMapButton]}
                          onPress={() => openGoogleMaps(order.address || '', 'Điểm giao hàng')}
                        >
                          <MaterialIcons name="directions" size={16} color="#F44336" />
                          <Text style={[styles.mapButtonText, { color: '#F44336' }]}>Mở bản đồ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={styles.directionsButton}
                      onPress={() => openDirections(
                        order.restaurantAddress || order.restaurantName || '',
                        order.address || ''
                      )}
                    >
                      <MaterialIcons name="navigation" size={20} color="#fff" />
                      <Text style={styles.directionsButtonText}>Chỉ đường từ lấy đến giao</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerInfo}>
                    <View style={styles.customerInfoLeft}>
                      <MaterialIcons name="person" size={18} color="#666" />
                      <Text style={styles.customerText}>
                        {order.customerName || order.fullName || 'Khách hàng'}
                      </Text>
                    </View>
                    {order.customerPhone && (
                      <TouchableOpacity
                        style={styles.phoneButton}
                        onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                      >
                        <Ionicons name="call" size={18} color="#4CAF50" />
                        <Text style={styles.phoneButtonText}>Gọi</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Order Amount */}
                  {order.totalAmount && (
                    <View style={styles.amountInfo}>
                      <MaterialIcons name="attach-money" size={18} color="#4CAF50" />
                      <Text style={styles.amountText}>
                        Phí giao: {order.totalAmount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Info Note */}
            <View style={styles.noteContainer}>
              <View style={styles.noteIconContainer}>
                <MaterialIcons name="info" size={24} color="#2196F3" />
              </View>
              <View style={styles.noteContent}>
                <Text style={styles.noteTitle}>Hướng dẫn sử dụng</Text>
                <Text style={styles.note}>
                  • Nhấn "Mở bản đồ" để xem vị trí trên Google Maps{'\n'}
                  • Nhấn "Chỉ đường" để xem lộ trình từ điểm lấy đến điểm giao{'\n'}
                  • Đảm bảo đã cài đặt ứng dụng Google Maps trên thiết bị
                </Text>
              </View>
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ee4d2d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  routeSection: {
    marginBottom: 20,
  },
  routePoint: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pointIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickupIcon: {
    backgroundColor: '#E3F2FD',
  },
  deliveryIcon: {
    backgroundColor: '#FFEBEE',
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  pointAddress: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  pointName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  deliveryMapButton: {
    backgroundColor: '#FFEBEE',
  },
  mapButtonText: {
    fontSize: 13,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '600',
  },
  routeLineContainer: {
    alignItems: 'center',
    marginVertical: 8,
    marginLeft: 24,
  },
  routeLine: {
    alignItems: 'center',
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  line: {
    width: 3,
    height: 30,
    backgroundColor: '#2196F3',
    marginVertical: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  actionSection: {
    marginBottom: 16,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 12,
  },
  customerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  phoneButtonText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  amountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  amountText: {
    fontSize: 15,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noteIconContainer: {
    marginRight: 12,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 20,
  },
});

export default ShipperMapScreen;

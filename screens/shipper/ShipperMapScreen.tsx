import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// Để tích hợp bản đồ thực tế, cài đặt: expo install react-native-maps
// import MapView, { Marker } from 'react-native-maps';

const ShipperMapScreen = () => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  const fetchActiveOrders = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const openGoogleMaps = (address: string, label: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Lỗi', 'Không thể mở Google Maps');
    });
  };

  const openDirections = (pickupAddress: string, deliveryAddress: string) => {
    const encodedPickup = encodeURIComponent(pickupAddress);
    const encodedDelivery = encodeURIComponent(deliveryAddress);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodedPickup}&destination=${encodedDelivery}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Lỗi', 'Không thể mở Google Maps');
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="map" size={24} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bản đồ & Chỉ đường</Text>
            <Text style={styles.headerSubtitle}>Điều hướng đơn hàng</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="map" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có đơn hàng đang giao</Text>
            <Text style={styles.emptySubtext}>Nhận đơn hàng để xem chỉ đường</Text>
          </View>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View style={styles.orderInfo}>
                  <MaterialIcons name="receipt" size={20} color="#ee4d2d" />
                  <Text style={styles.orderId}>Đơn #{order.id.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#1976d2' }]}>
                  <Text style={styles.statusText}>
                    {order.status === 'accepted' ? 'Đã nhận' : 
                     order.status === 'picking' ? 'Đang lấy' : 'Đang giao'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeSection}>
                <View style={styles.routePoint}>
                  <View style={styles.pointIcon}>
                    <MaterialIcons name="store" size={20} color="#1976d2" />
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointLabel}>Điểm lấy hàng</Text>
                    <Text style={styles.pointAddress} numberOfLines={2}>
                      {order.restaurantAddress || order.restaurantName || 'Chưa có địa chỉ'}
                    </Text>
                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={() => openGoogleMaps(
                        order.restaurantAddress || order.restaurantName || '',
                        'Điểm lấy hàng'
                      )}
                    >
                      <MaterialIcons name="directions" size={16} color="#1976d2" />
                      <Text style={styles.mapButtonText}>Mở bản đồ</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.routeLine}>
                  <View style={styles.lineDot} />
                  <View style={styles.line} />
                  <View style={styles.lineDot} />
                </View>

                <View style={styles.routePoint}>
                  <View style={[styles.pointIcon, styles.deliveryIcon]}>
                    <MaterialIcons name="place" size={20} color="#ee4d2d" />
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointLabel}>Điểm giao hàng</Text>
                    <Text style={styles.pointAddress} numberOfLines={2}>
                      {order.address || 'Chưa có địa chỉ'}
                    </Text>
                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={() => openGoogleMaps(order.address || '', 'Điểm giao hàng')}
                    >
                      <MaterialIcons name="directions" size={16} color="#ee4d2d" />
                      <Text style={[styles.mapButtonText, { color: '#ee4d2d' }]}>Mở bản đồ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

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

              <View style={styles.customerInfo}>
                <MaterialIcons name="person" size={16} color="#666" />
                <Text style={styles.customerText}>
                  {order.customerName || order.fullName || 'Khách hàng'}
                </Text>
                {order.customerPhone && (
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                  >
                    <Ionicons name="call" size={16} color="#ee4d2d" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        <View style={styles.noteContainer}>
          <MaterialIcons name="info" size={20} color="#666" />
          <Text style={styles.note}>
            Sử dụng Google Maps để điều hướng. Đảm bảo đã cài đặt ứng dụng Google Maps trên thiết bị.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeSection: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deliveryIcon: {
    backgroundColor: '#ffebee',
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  mapButtonText: {
    fontSize: 13,
    color: '#1976d2',
    marginLeft: 4,
    fontWeight: '500',
  },
  routeLine: {
    alignItems: 'center',
    marginVertical: 4,
    marginLeft: 20,
  },
  lineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  line: {
    width: 2,
    height: 20,
    backgroundColor: '#ccc',
    marginVertical: 2,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  customerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  phoneButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  note: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default ShipperMapScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/Firebase';
import { GOOGLE_MAPS_API_KEY } from '../config/GoogleMaps';
import * as Location from 'expo-location';
import LoadingSpinner from '../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

interface Order {
  id: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantLocation?: { latitude: number; longitude: number };
  userId: string;
  customerName?: string;
  address: string;
  customerLocation?: { latitude: number; longitude: number };
  status: string;
  shipperId?: string;
  shipperLocation?: { latitude: number; longitude: number };
  items?: any[];
  totalAmount?: number;
}

interface RouteParams {
  orderId: string;
  userRole?: 'customer' | 'shipper' | 'restaurant';
}

const OrderTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const { orderId, userRole } = (route.params as RouteParams) || {};

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantLocation, setRestaurantLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [shipperLocation, setShipperLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapHtml, setMapHtml] = useState<string>('');

  useEffect(() => {
    if (!orderId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
      navigation.goBack();
      return;
    }

    loadOrderData();
    const unsubscribe = subscribeToOrder();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [orderId]);

  useEffect(() => {
    if (order) {
      fetchLocations();
    }
  }, [order]);

  useEffect(() => {
    if (restaurantLocation && customerLocation) {
      generateMapHtml();
    }
  }, [restaurantLocation, customerLocation, shipperLocation]);

  const loadOrderData = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
        setOrder(orderData);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrder = () => {
    const orderRef = doc(db, 'orders', orderId);
    return onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
        setOrder(orderData);
      }
    });
  };

  const fetchLocations = async () => {
    if (!order) return;

    try {
      // Get restaurant location
      if (order.restaurantId) {
        const restaurantDoc = await getDoc(doc(db, 'restaurants', order.restaurantId));
        if (restaurantDoc.exists()) {
          const restaurantData = restaurantDoc.data();
          if (restaurantData.location) {
            setRestaurantLocation(restaurantData.location);
          } else if (restaurantData.address) {
            const coords = await geocodeAddress(restaurantData.address);
            if (coords) {
              setRestaurantLocation(coords);
              // Save to restaurant document
              await updateDoc(doc(db, 'restaurants', order.restaurantId), {
                location: coords,
              });
            }
          }
        }
      }

      // Get customer location
      if (order.userId) {
        const userDoc = await getDoc(doc(db, 'users', order.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.location) {
            setCustomerLocation(userData.location);
          } else if (order.address) {
            const coords = await geocodeAddress(order.address);
            if (coords) {
              setCustomerLocation(coords);
            }
          }
        } else if (order.address) {
          const coords = await geocodeAddress(order.address);
          if (coords) {
            setCustomerLocation(coords);
          }
        }
      }

      // Get shipper location (real-time)
      if (order.shipperId) {
        const shipperDoc = await getDoc(doc(db, 'users', order.shipperId));
        if (shipperDoc.exists()) {
          const shipperData = shipperDoc.data();
          if (shipperData.location) {
            setShipperLocation(shipperData.location);
          }
        }

        // Subscribe to shipper location updates
        const shipperRef = doc(db, 'users', order.shipperId);
        const unsubscribeShipper = onSnapshot(shipperRef, (snapshot) => {
          if (snapshot.exists()) {
            const shipperData = snapshot.data();
            if (shipperData.location) {
              setShipperLocation(shipperData.location);
            }
          }
        });

        return () => unsubscribeShipper();
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
    return null;
  };

  const generateMapHtml = () => {
    if (!restaurantLocation || !customerLocation) return;

    const locations = [restaurantLocation, customerLocation];
    if (shipperLocation) {
      locations.push(shipperLocation);
    }

    // Calculate center and zoom
    const minLat = Math.min(...locations.map(loc => loc.latitude));
    const maxLat = Math.max(...locations.map(loc => loc.latitude));
    const minLng = Math.min(...locations.map(loc => loc.longitude));
    const maxLng = Math.max(...locations.map(loc => loc.longitude));

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;
    const maxDelta = Math.max(latDelta, lngDelta);
    
    // Calculate zoom level (approximate)
    let zoom = 13;
    if (maxDelta > 0.1) zoom = 11;
    else if (maxDelta > 0.05) zoom = 12;
    else if (maxDelta > 0.02) zoom = 13;
    else if (maxDelta > 0.01) zoom = 14;
    else zoom = 15;

    const apiKey = GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places"></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
            #map { height: 100%; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function initMap() {
              const center = { lat: ${centerLat}, lng: ${centerLng} };
              const map = new google.maps.Map(document.getElementById('map'), {
                zoom: ${zoom},
                center: center,
                mapTypeId: 'roadmap',
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              });

              // Restaurant marker
              const restaurantMarker = new google.maps.Marker({
                position: { lat: ${restaurantLocation.latitude}, lng: ${restaurantLocation.longitude} },
                map: map,
                title: '${order?.restaurantName || 'Nhà hàng'}',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#ee4d2d',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 3
                },
                label: {
                  text: '🏪',
                  fontSize: '20px'
                }
              });

              const restaurantInfo = new google.maps.InfoWindow({
                content: '<div style="padding: 8px;"><strong>${order?.restaurantName || 'Nhà hàng'}</strong><br>${order?.restaurantAddress || ''}</div>'
              });
              restaurantMarker.addListener('click', () => restaurantInfo.open(map, restaurantMarker));

              // Customer marker
              const customerMarker = new google.maps.Marker({
                position: { lat: ${customerLocation.latitude}, lng: ${customerLocation.longitude} },
                map: map,
                title: 'Địa chỉ giao hàng',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#4A90E2',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 3
                },
                label: {
                  text: '📍',
                  fontSize: '20px'
                }
              });

              const customerInfo = new google.maps.InfoWindow({
                content: '<div style="padding: 8px;"><strong>Địa chỉ giao hàng</strong><br>${order?.address || ''}</div>'
              });
              customerMarker.addListener('click', () => customerInfo.open(map, customerMarker));

              ${shipperLocation ? `
              // Shipper marker
              const shipperMarker = new google.maps.Marker({
                position: { lat: ${shipperLocation.latitude}, lng: ${shipperLocation.longitude} },
                map: map,
                title: 'Shipper',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#00BCD4',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 3
                },
                label: {
                  text: '🚴',
                  fontSize: '20px'
                }
              });

              const shipperInfo = new google.maps.InfoWindow({
                content: '<div style="padding: 8px;"><strong>Shipper</strong><br>Đang giao hàng</div>'
              });
              shipperMarker.addListener('click', () => shipperInfo.open(map, shipperMarker));
              ` : ''}

              // Draw route
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#ee4d2d',
                  strokeWeight: 4,
                  strokeOpacity: 0.8
                }
              });

              directionsService.route({
                origin: { lat: ${restaurantLocation.latitude}, lng: ${restaurantLocation.longitude} },
                destination: { lat: ${customerLocation.latitude}, lng: ${customerLocation.longitude} },
                travelMode: google.maps.TravelMode.DRIVING
              }, (result, status) => {
                if (status === 'OK') {
                  directionsRenderer.setDirections(result);
                } else {
                  // Fallback: draw straight line
                  const route = new google.maps.Polyline({
                    path: [
                      { lat: ${restaurantLocation.latitude}, lng: ${restaurantLocation.longitude} },
                      { lat: ${customerLocation.latitude}, lng: ${customerLocation.longitude} }
                    ],
                    geodesic: true,
                    strokeColor: '#ee4d2d',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    map: map
                  });
                }
              });

              // Fit bounds to show all markers
              const bounds = new google.maps.LatLngBounds();
              bounds.extend({ lat: ${restaurantLocation.latitude}, lng: ${restaurantLocation.longitude} });
              bounds.extend({ lat: ${customerLocation.latitude}, lng: ${customerLocation.longitude} });
              ${shipperLocation ? `bounds.extend({ lat: ${shipperLocation.latitude}, lng: ${shipperLocation.longitude} });` : ''}
              map.fitBounds(bounds);
            }
            initMap();
          </script>
        </body>
      </html>
    `;

    setMapHtml(html);
  };

  const updateShipperLocation = async () => {
    if (userRole !== 'shipper' || !order?.shipperId) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập vị trí', 'Vui lòng cấp quyền để cập nhật vị trí');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setShipperLocation(newLocation);

      // Update shipper location in database
      const shipperRef = doc(db, 'users', order.shipperId);
      await updateDoc(shipperRef, {
        location: newLocation,
        lastLocationUpdate: new Date(),
      });
    } catch (error) {
      console.error('Error updating shipper location:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật vị trí');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      shipping: 'Đang giao',
      delivering: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#FF9800',
      confirmed: '#2196F3',
      preparing: '#9C27B0',
      shipping: '#00BCD4',
      delivering: '#00BCD4',
      delivered: '#4CAF50',
      cancelled: '#F44336',
    };
    return colorMap[status] || '#666';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mapHtml ? (
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#ee4d2d" />
            </View>
          )}
        />
      ) : (
        <View style={styles.mapLoadingContainer}>
          <ActivityIndicator size="large" color="#ee4d2d" />
          <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
        </View>
      )}

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <View>
            <Text style={styles.orderId}>Đơn hàng #{order.id.slice(-8).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContent}>
          {order.restaurantName && (
            <View style={styles.infoRow}>
              <Ionicons name="restaurant" size={20} color="#ee4d2d" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Nhà hàng</Text>
                <Text style={styles.infoValue}>{order.restaurantName}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#4A90E2" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Địa chỉ giao hàng</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{order.address}</Text>
            </View>
          </View>

          {order.totalAmount && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={20} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Tổng tiền</Text>
                <Text style={styles.infoValue}>{order.totalAmount.toLocaleString('vi-VN')} đ</Text>
              </View>
            </View>
          )}
        </View>

        {userRole === 'shipper' && order.shipperId === auth.currentUser?.uid && (
          <TouchableOpacity style={styles.updateLocationButton} onPress={updateShipperLocation}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.updateLocationButtonText}>Cập nhật vị trí</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: height * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  updateLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderTrackingScreen;

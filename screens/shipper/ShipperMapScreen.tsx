import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// Để tích hợp bản đồ thực tế, cài đặt: expo install react-native-maps
// import MapView, { Marker } from 'react-native-maps';

// Dummy data for route
const routeInfo = {
  pickup: {
    lat: 10.7769,
    lng: 106.7009,
    address: '123 Lê Lợi, Q.1',
  },
  dropoff: {
    lat: 10.762622,
    lng: 106.660172,
    address: '456 Nguyễn Trãi, Q.5',
  },
  distance: 4.2,
  duration: 15, // minutes
};

const ShipperMapScreen = () => {
  const [showRoute, setShowRoute] = useState(false);

  const handleShowRoute = () => {
    setShowRoute(true);
    Alert.alert('Lộ trình', `Từ: ${routeInfo.pickup.address}\nĐến: ${routeInfo.dropoff.address}\nKhoảng cách: ${routeInfo.distance} km\nThời gian dự kiến: ${routeInfo.duration} phút`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bản đồ & Chỉ đường</Text>
      {/* Để hiển thị bản đồ thực tế, bỏ comment đoạn dưới và cài react-native-maps */}
      {/*
      <MapView
        style={{ width: '100%', height: 300 }}
        initialRegion={{
          latitude: routeInfo.pickup.lat,
          longitude: routeInfo.pickup.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={{ latitude: routeInfo.pickup.lat, longitude: routeInfo.pickup.lng }} title="Điểm lấy hàng" />
        <Marker coordinate={{ latitude: routeInfo.dropoff.lat, longitude: routeInfo.dropoff.lng }} title="Điểm giao hàng" />
      </MapView>
      */}
      <View style={styles.infoBox}>
        <Text>Điểm lấy hàng: {routeInfo.pickup.address}</Text>
        <Text>Điểm giao hàng: {routeInfo.dropoff.address}</Text>
        <Text>Khoảng cách: {routeInfo.distance} km</Text>
        <Text>Thời gian dự kiến: {routeInfo.duration} phút</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleShowRoute}>
        <Text style={styles.buttonText}>Xem lộ trình tối ưu</Text>
      </TouchableOpacity>
      <Text style={styles.note}>* Để dẫn đường thực tế, tích hợp Google Maps hoặc Mapbox.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  infoBox: { backgroundColor: '#f1f8e9', borderRadius: 10, padding: 16, marginVertical: 16, width: '100%' },
  button: { backgroundColor: '#1976d2', padding: 12, borderRadius: 8, marginVertical: 12, minWidth: 180 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  note: { color: '#888', fontSize: 12, marginTop: 16, textAlign: 'center' },
});

export default ShipperMapScreen;

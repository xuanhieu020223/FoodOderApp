import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface MomoQRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  amount: number;
  orderId: string;
}

const MomoQRScanner: React.FC<MomoQRScannerProps> = ({
  visible,
  onClose,
  onScanSuccess,
  amount,
  orderId,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;

    setIsProcessing(true);
    setScanned(true);

    // Kiểm tra xem có phải mã QR MoMo không
    if (data.startsWith('momo://') || data.includes('momo.vn') || data.includes('MoMo')) {
      onScanSuccess(data);
      setTimeout(() => {
        setIsProcessing(false);
        setScanned(false);
        onClose();
      }, 1000);
    } else {
      Alert.alert(
        'Mã QR không hợp lệ',
        'Vui lòng quét mã QR MoMo để thanh toán',
        [
          {
            text: 'Thử lại',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]
      );
    }
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Đang kiểm tra quyền truy cập camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="camera-outline" size={64} color="#ee4d2d" />
            <Text style={styles.title}>Cần quyền truy cập camera</Text>
            <Text style={styles.subtitle}>
              Ứng dụng cần quyền truy cập camera để quét mã QR MoMo
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Cấp quyền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quét mã QR MoMo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={CameraType.back}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
                <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
              </View>
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#ee4d2d" />
                  <Text style={styles.processingText}>Đang xử lý...</Text>
                </View>
              )}
            </View>
          </CameraView>
        </View>

        <View style={styles.footer}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#ee4d2d" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Hướng dẫn thanh toán</Text>
              <Text style={styles.infoText}>
                1. Mở ứng dụng MoMo trên điện thoại{'\n'}
                2. Chọn "Quét mã" hoặc "Thanh toán"{'\n'}
                3. Quét mã QR này để thanh toán
              </Text>
            </View>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Mã đơn hàng:</Text>
            <Text style={styles.orderValue}>{orderId}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Số tiền:</Text>
            <Text style={styles.orderAmount}>
              {amount.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeIconButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: width,
    height: height * 0.6,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#ee4d2d',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ee4d2d',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
  },
  closeButtonText: {
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MomoQRScanner;


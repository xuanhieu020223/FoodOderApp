import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMomoPayment, generateMomoQRData } from '../services/momoService';
import MomoQRScanner from './MomoQRScanner';

interface MomoQRDisplayProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  orderId: string;
  orderInfo: string;
  momoPhone?: string;
}

const MomoQRDisplay: React.FC<MomoQRDisplayProps> = ({
  visible,
  onClose,
  onPaymentSuccess,
  amount,
  orderId,
  orderInfo,
  momoPhone,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      generateQRCode();
    }
  }, [visible, amount, orderId]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      
      // Nếu có số điện thoại MoMo, tạo QR code theo format MoMo
      if (momoPhone) {
        const qrData = generateMomoQRData(momoPhone, amount, orderId);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
        setQrCodeUrl(qrUrl);
      } else {
        // Tạo payment request với MoMo API
        const result = await createMomoPayment({
          orderId,
          amount,
          orderInfo,
        });
        setQrCodeUrl(result.qrCodeUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (data: string) => {
    // Xử lý khi quét thành công
    console.log('Scanned QR data:', data);
    onPaymentSuccess();
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thanh toán bằng MoMo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <View style={styles.qrContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ee4d2d" />
                  <Text style={styles.loadingText}>Đang tạo mã QR...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.qrWrapper}>
                    <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} />
                  </View>
                  <Text style={styles.qrInstruction}>
                    Quét mã QR bằng ứng dụng MoMo để thanh toán
                  </Text>
                </>
              )}
            </View>

            <View style={styles.orderInfoCard}>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Mã đơn hàng:</Text>
                <Text style={styles.orderInfoValue}>{orderId}</Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Số tiền:</Text>
                <Text style={styles.orderInfoAmount}>
                  {amount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Nội dung:</Text>
                <Text style={styles.orderInfoValue}>{orderInfo}</Text>
              </View>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Hướng dẫn thanh toán:</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2f9c68" />
                <Text style={styles.instructionText}>
                  Mở ứng dụng MoMo trên điện thoại
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2f9c68" />
                <Text style={styles.instructionText}>
                  Chọn "Quét mã" hoặc "Thanh toán"
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2f9c68" />
                <Text style={styles.instructionText}>
                  Quét mã QR này để thanh toán
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2f9c68" />
                <Text style={styles.instructionText}>
                  Xác nhận thanh toán trong ứng dụng MoMo
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScannerVisible(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={styles.scanButtonText}>Quét mã QR từ MoMo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshButton} onPress={generateQRCode}>
              <Ionicons name="refresh" size={20} color="#ee4d2d" />
              <Text style={styles.refreshButtonText}>Làm mới mã QR</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <MomoQRScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanSuccess={handleScanSuccess}
        amount={amount}
        orderId={orderId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  qrInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  orderInfoCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderInfoAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ee4d2d',
  },
  instructionsCard: {
    backgroundColor: '#fff3f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ee4d2d',
  },
  refreshButtonText: {
    color: '#ee4d2d',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MomoQRDisplay;


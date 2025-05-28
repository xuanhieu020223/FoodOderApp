import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'Làm thế nào để đặt đơn hàng?',
    answer: 'Để đặt đơn hàng, bạn chỉ cần chọn món ăn yêu thích, thêm vào giỏ hàng và tiến hành thanh toán. Bạn có thể chọn địa chỉ giao hàng và phương thức thanh toán phù hợp.',
  },
  {
    id: '2',
    question: 'Các phương thức thanh toán?',
    answer: 'Chúng tôi hỗ trợ nhiều phương thức thanh toán như: Tiền mặt khi nhận hàng (COD), thẻ ngân hàng, ví điện tử (MoMo, ZaloPay), và chuyển khoản ngân hàng.',
  },
  {
    id: '3',
    question: 'Thời gian giao hàng?',
    answer: 'Thời gian giao hàng trung bình từ 20-30 phút tùy thuộc vào khoảng cách và điều kiện giao thông. Bạn có thể theo dõi đơn hàng theo thời gian thực trên ứng dụng.',
  },
  {
    id: '4',
    question: 'Chính sách hoàn tiền?',
    answer: 'Chúng tôi cam kết hoàn tiền 100% nếu đơn hàng không đúng với mô tả hoặc có vấn đề về chất lượng. Vui lòng liên hệ với chúng tôi trong vòng 24h sau khi nhận hàng.',
  },
  {
    id: '5',
    question: 'Làm thế nào để hủy đơn hàng?',
    answer: 'Bạn có thể hủy đơn hàng trong vòng 5 phút sau khi đặt hàng. Sau thời gian này, vui lòng liên hệ trực tiếp với bộ phận hỗ trợ khách hàng để được giúp đỡ.',
  },
];

const supportChannels = [
  {
    id: 'phone',
    title: 'Tổng đài hỗ trợ',
    description: '1900 1234 (8:00 - 22:00)',
    icon: 'call-outline',
    action: 'tel:19001234',
  },
  {
    id: 'email',
    title: 'Email hỗ trợ',
    description: 'support@foodapp.com',
    icon: 'mail-outline',
    action: 'mailto:support@foodapp.com',
  },
  {
    id: 'facebook',
    title: 'Facebook',
    description: 'Food App Vietnam',
    icon: 'logo-facebook',
    action: 'https://facebook.com/foodapp',
  },
  {
    id: 'zalo',
    title: 'Zalo',
    description: 'Food App Official',
    icon: 'chatbubble-outline',
    action: 'https://zalo.me/foodapp',
  },
];

const HelpScreen = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSupportChannel = async (action: string) => {
    try {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else {
        Alert.alert('Lỗi', 'Không thể mở liên kết này');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    }
  };

  const renderFAQItem = (item: FAQItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.faqItem}
      onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons
          name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </View>
      {expandedId === item.id && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kênh hỗ trợ</Text>
        {supportChannels.map(channel => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelItem}
            onPress={() => handleSupportChannel(channel.action)}
          >
            <View style={styles.channelInfo}>
              <View style={[styles.iconContainer, { backgroundColor: getChannelColor(channel.id) }]}>
                <Ionicons name={channel.icon as any} size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.channelTitle}>{channel.title}</Text>
                <Text style={styles.channelDescription}>{channel.description}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
        {faqs.map(faq => renderFAQItem(faq))}
      </View>

      <TouchableOpacity
        style={styles.feedbackButton}
        onPress={() => Alert.alert('Thông báo', 'Tính năng đang được phát triển')}
      >
        <Text style={styles.feedbackButtonText}>Gửi phản hồi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const getChannelColor = (id: string) => {
  const colors: { [key: string]: string } = {
    phone: '#4CAF50',
    email: '#2196F3',
    facebook: '#3b5998',
    zalo: '#0068ff',
  };
  return colors[id] || '#666';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#666',
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  feedbackButton: {
    backgroundColor: '#ee4d2d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HelpScreen; 
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AIChatbox from '../../components/AIChatbox';
import CustomerScreenWrapper from '../../components/CustomerScreenWrapper';

const ChatbotScreen = () => {
  const [showChatbox, setShowChatbox] = useState(true);
  const navigation = useNavigation();

  const handleClose = () => {
    setShowChatbox(false);
    // Quay lại màn hình trước sau một chút để animation mượt
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  return (
    <CustomerScreenWrapper gradientHeight={200} barStyle="light-content">
      <View style={styles.content}>
        <AIChatbox visible={showChatbox} onClose={handleClose} />
      </View>
    </CustomerScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export default ChatbotScreen;


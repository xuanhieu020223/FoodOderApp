import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AIChatbox from '../../components/AIChatbox';

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ee4d2d" />
      <View style={styles.content}>
        <AIChatbox visible={showChatbox} onClose={handleClose} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});

export default ChatbotScreen;


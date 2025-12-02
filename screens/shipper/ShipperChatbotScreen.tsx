import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AIChatbox from '../../components/AIChatbox';

const ShipperChatbotScreen = () => {
  const [showChatbox, setShowChatbox] = useState(true);
  const navigation = useNavigation();

  const handleClose = () => {
    setShowChatbox(false);
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  return (
    <View style={styles.container}>
      <AIChatbox visible={showChatbox} onClose={handleClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default ShipperChatbotScreen;


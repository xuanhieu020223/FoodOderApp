import React, { useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Animatable from 'react-native-animatable';


type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

const Colors = {
  DEFAULT_WHITE: '#FFFFFF',
  DEFAULT_GREEN: '#34A853',
  DEFAULT_GREY: '#666666',
};

const Fonts = {
  POPPINS_MEDIUM: 'Poppins-Medium',
};

const Display = {
  setWidth: (percent: number) => (Dimensions.get('window').width * percent) / 100,
  setHeight: (percent: number) => (Dimensions.get('window').height * percent) / 100,
};

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const navigateToLogIn = () => {
    navigation.navigate('Login'); 
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.DEFAULT_WHITE}
        translucent
      />

      <Animatable.View
        animation="fadeInDown"
        duration={1000}
        style={styles.welcomeContainer}
      >
        <Text style={styles.title}> Bắt đầu ngay!</Text>
        <Text style={styles.description}>
          Sẵn sàng khám phá thế giới ẩm thực cùng chúng tôi?
        </Text>

        <Animatable.View animation="pulse" iterationCount="infinite">
          <TouchableOpacity
            style={styles.gettingStartedButton}
            activeOpacity={0.8}
            onPress={navigateToLogIn}
          >
            <Text style={styles.gettingStartedButtonText}>Bắt đầu</Text>
          </TouchableOpacity>
        </Animatable.View>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.DEFAULT_WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    width: '85%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.DEFAULT_GREEN,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.DEFAULT_GREY,
    textAlign: 'center',
    marginBottom: 24,
  },
  gettingStartedButton: {
    backgroundColor: Colors.DEFAULT_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gettingStartedButtonText: {
    fontSize: 18,
    color: Colors.DEFAULT_WHITE,
    fontFamily: Fonts.POPPINS_MEDIUM,
  },
});

export default WelcomeScreen;

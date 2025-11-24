import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'large', 
  color = '#ee4d2d' 
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const ringRotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Icon rotation animation (slower)
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Ring rotation animation (faster, opposite direction)
    const ringRotateAnimation = Animated.loop(
      Animated.timing(ringRotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Scale pulse animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Opacity pulse animation
    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    ringRotateAnimation.start();
    scaleAnimation.start();
    opacityAnimation.start();

    return () => {
      rotateAnimation.stop();
      ringRotateAnimation.stop();
      scaleAnimation.stop();
      opacityAnimation.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringSpin = ringRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'], // Rotate opposite direction
  });

  const iconSize = size === 'large' ? 60 : 30;

  return (
    <View style={styles.container}>
      {/* Outer rotating ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [{ rotate: ringSpin }],
            borderColor: color,
            width: iconSize + 30,
            height: iconSize + 30,
            borderRadius: (iconSize + 30) / 2,
            borderWidth: size === 'large' ? 4 : 3,
          },
        ]}
      />
      {/* Icon with rotation and pulse */}
      <Animated.View
        style={[
          styles.spinnerContainer,
          {
            transform: [{ rotate: spin }, { scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name="restaurant" size={iconSize} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  ring: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftWidth: 0,
    zIndex: 1,
    opacity: 0.6,
  },
});

export default LoadingSpinner;


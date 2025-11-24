import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AIChatbox from './AIChatbox';

const BUTTON_SIZE = 64;

interface FloatingChatButtonProps {
  bottom?: number;
  right?: number;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  bottom = 100,
  right = 20,
}) => {
  const [showChatbox, setShowChatbox] = useState(false);
  const { width, height } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const initialPosition = useRef({
    x: Math.max(16, width - (right + BUTTON_SIZE)),
    y: Math.max(96, height - (bottom + BUTTON_SIZE)),
  });
  const pan = useRef(new Animated.ValueXY(initialPosition.current)).current;
  const lastOffset = useRef(initialPosition.current);

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const safeX = clamp(lastOffset.current.x, 12, width - BUTTON_SIZE - 12);
    const safeY = clamp(lastOffset.current.y, 72, height - BUTTON_SIZE - 16);
    lastOffset.current = { x: safeX, y: safeY };
    pan.setValue(lastOffset.current);
  }, [width, height, pan]);

  const clampPosition = (x: number, y: number) => {
    const MIN_HORIZONTAL = 12;
    const MIN_VERTICAL = 72;
    const MAX_X = width - BUTTON_SIZE - MIN_HORIZONTAL;
    const MAX_Y = height - BUTTON_SIZE - MIN_HORIZONTAL;
    return {
      x: Math.min(Math.max(x, MIN_HORIZONTAL), MAX_X),
      y: Math.min(Math.max(y, MIN_VERTICAL), MAX_Y),
    };
  };

  const finalizePosition = () => {
    pan.flattenOffset();
    const currentX = pan.x.__getValue();
    const currentY = pan.y.__getValue();
    const target = clampPosition(currentX, currentY);
    lastOffset.current = target;
    Animated.spring(pan, {
      toValue: target,
      useNativeDriver: false,
      tension: 80,
      friction: 9,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.stopAnimation();
          pan.setOffset(lastOffset.current);
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: finalizePosition,
        onPanResponderTerminate: finalizePosition,
      }),
    [pan]
  );

  const handlePress = () => {
    // Animation khi nhấn
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowChatbox((prev) => !prev);
  };

  return (
    <>
      <Animated.View
        style={[styles.container, pan.getLayout()]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulse,
              {
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.8],
                    }),
                  },
                ],
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.45, 0.25, 0],
                }),
              },
            ]}
          />
          <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
            <LinearGradient
              colors={['#ffe0d2', '#fff6ee']}
              style={styles.outerRing}
            >
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={['#ff9068', '#ff4b1f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCore}
                >
                  <MaterialIcons name="smart-toy" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.sparkle} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
      <AIChatbox visible={showChatbox} onClose={() => setShowChatbox(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  pulse: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#ff7a45',
  },
  outerRing: {
    width: BUTTON_SIZE + 10,
    height: BUTTON_SIZE + 10,
    borderRadius: (BUTTON_SIZE + 10) / 2,
    padding: 5,
    shadowColor: '#ff8a65',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: (BUTTON_SIZE + 10) / 2,
    backgroundColor: '#fff',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCore: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.35,
  },
});

export default FloatingChatButton;


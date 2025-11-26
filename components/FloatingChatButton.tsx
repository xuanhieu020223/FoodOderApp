import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
  View,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AIChatbox from './AIChatbox';
import BotAvatar from './BotAvatar';
import { palette, shadows } from '../constants/theme';

const BUTTON_SIZE = 68;

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
                      outputRange: [1, 1.9],
                    }),
                  },
                ],
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.4, 0.2, 0],
                }),
              },
            ]}
          />
          <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.2)']}
              style={styles.outerRing}
            >
              <View style={styles.avatarWrapper}>
                <BotAvatar size={BUTTON_SIZE} />
                <Text style={styles.avatarLabel}>Chat AI</Text>
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
    width: BUTTON_SIZE + 18,
    height: BUTTON_SIZE + 18,
    borderRadius: (BUTTON_SIZE + 18) / 2,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadows.floating,
  },
  avatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: (BUTTON_SIZE + 18) / 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 12,
    fontWeight: '600',
    color: palette.neutral100,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default FloatingChatButton;


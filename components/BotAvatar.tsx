import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../constants/theme';

type BotAvatarProps = {
  size?: number;
  showStatus?: boolean;
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BotAvatar: React.FC<BotAvatarProps> = ({
  size = 56,
  showStatus = true,
  showBadge = true,
  style,
}) => {
  const faceSize = size - 16;
  const badgeSize = Math.max(20, size * 0.38);
  const statusSize = Math.max(9, size * 0.16);

  return (
    <LinearGradient
      colors={['#ff8354', '#ff4b1f']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatarCore,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.botFace,
          {
            width: faceSize,
            height: faceSize,
            borderRadius: faceSize / 2,
          },
        ]}
      >
        <View style={styles.eyeRow}>
          <View style={[styles.eye, { height: faceSize * 0.35 }]} />
          <View style={[styles.eye, { height: faceSize * 0.35 }]} />
        </View>
        <View style={styles.mouthWrapper}>
          <View style={styles.mouthGlow} />
        </View>
      </View>
      {showBadge && (
        <LinearGradient
          colors={['#ffd089', '#fff4df']}
          style={[
            styles.sparkleBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              top: size * 0.15,
              left: size * 0.18,
            },
          ]}
        >
          <Ionicons name="sparkles" size={badgeSize * 0.55} color="#ff7a45" />
        </LinearGradient>
      )}
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              bottom: size * 0.15,
              right: size * 0.18,
            },
          ]}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  avatarCore: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  botFace: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '46%',
  },
  eye: {
    width: 9,
    borderRadius: 6,
    backgroundColor: '#fff',
    shadowColor: '#ffb597',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mouthWrapper: {
    width: '54%',
    marginTop: 8,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mouthGlow: {
    width: '78%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    opacity: 0.95,
  },
  sparkleBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffd089',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statusDot: {
    position: 'absolute',
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});

export default BotAvatar;



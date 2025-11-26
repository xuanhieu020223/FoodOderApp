import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../constants/theme';

type CustomerScreenWrapperProps = {
  children: React.ReactNode;
  gradientHeight?: number;
  barStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

const CustomerScreenWrapper: React.FC<CustomerScreenWrapperProps> = ({
  children,
  gradientHeight = 240,
  barStyle = 'dark-content',
  backgroundColor = palette.neutral200,
  contentStyle,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
      <View style={styles.fill}>
        <LinearGradient
          pointerEvents="none"
          colors={[palette.primary, palette.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { height: gradientHeight }]}
        />
        <View style={[styles.content, { backgroundColor }, contentStyle]}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  fill: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 12,
  },
});

export default CustomerScreenWrapper;



import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

interface RestaurantScreenWrapperProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  headerExtras?: React.ReactNode;
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

const RestaurantScreenWrapper: React.FC<RestaurantScreenWrapperProps> = ({
  title,
  subtitle,
  rightContent,
  headerExtras,
  children,
  scrollable = true,
  contentContainerStyle,
}) => {
  const ContentComponent = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#ff8a5c', '#ee4d2d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightContent}
        </View>
        {headerExtras}
      </LinearGradient>

      <ContentComponent
        style={styles.contentWrapper}
        contentContainerStyle={
          scrollable
            ? [styles.scrollContent, contentContainerStyle]
            : contentContainerStyle
        }
      >
        {children}
      </ContentComponent>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6f8',
  },
  headerBackground: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  contentWrapper: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});

export default RestaurantScreenWrapper;


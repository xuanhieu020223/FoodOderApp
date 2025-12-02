/**
 * Ant Design styled components for React Native
 * Tạo các component theo design system của Ant Design
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  extra?: React.ReactNode;
  bordered?: boolean;
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  title,
  extra,
  bordered = true,
  shadow = true,
}) => (
  <View
    style={[
      styles.card,
      bordered && styles.cardBordered,
      shadow && styles.cardShadow,
      style,
    ]}
  >
    {title && (
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {extra && <View>{extra}</View>}
      </View>
    )}
    <View style={styles.cardBody}>{children}</View>
  </View>
);

// Statistic Component
interface StatisticProps {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  valueStyle?: TextStyle;
  titleStyle?: TextStyle;
}

export const Statistic: React.FC<StatisticProps> = ({
  title,
  value,
  prefix,
  suffix,
  valueStyle,
  titleStyle,
}) => (
  <View style={styles.statistic}>
    <Text style={[styles.statisticTitle, titleStyle]}>{title}</Text>
    <View style={styles.statisticValueContainer}>
      {prefix && <View style={styles.statisticPrefix}>{prefix}</View>}
      <Text style={[styles.statisticValue, valueStyle]}>{value}</Text>
      {suffix && <View style={styles.statisticSuffix}>{suffix}</View>}
    </View>
  </View>
);

// Button Component
interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  type?: 'default' | 'primary' | 'ghost' | 'dashed' | 'link' | 'text';
  size?: 'small' | 'middle' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  style?: ViewStyle;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  type = 'default',
  size = 'middle',
  loading = false,
  disabled = false,
  icon,
  style,
  block = false,
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button${type.charAt(0).toUpperCase() + type.slice(1)}`],
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    block && styles.buttonBlock,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    styles[`buttonText${type.charAt(0).toUpperCase() + type.slice(1)}`],
    styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}`],
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={type === 'primary' ? '#fff' : '#1890ff'}
        />
      ) : (
        <>
          {icon && (
            <MaterialIcons
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 20 : 18}
              color={type === 'primary' ? '#fff' : '#1890ff'}
              style={styles.buttonIcon}
            />
          )}
          <Text style={textStyle}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Tag Component
interface TagProps {
  children: React.ReactNode;
  color?: string;
  closable?: boolean;
  onClose?: () => void;
  style?: ViewStyle;
}

export const Tag: React.FC<TagProps> = ({
  children,
  color = '#1890ff',
  closable = false,
  onClose,
  style,
}) => (
  <View style={[styles.tag, { backgroundColor: `${color}15`, borderColor: color }, style]}>
    <Text style={[styles.tagText, { color }]}>{children}</Text>
    {closable && onClose && (
      <TouchableOpacity onPress={onClose} style={styles.tagClose}>
        <MaterialIcons name="close" size={14} color={color} />
      </TouchableOpacity>
    )}
  </View>
);

// Badge Component
interface BadgeProps {
  count?: number;
  dot?: boolean;
  children?: React.ReactNode;
  color?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  dot = false,
  children,
  color = '#ff4d4f',
}) => {
  if (!children) {
    return (
      <View style={[styles.badge, dot && styles.badgeDot, { backgroundColor: color }]}>
        {!dot && count !== undefined && count > 0 && (
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.badgeWrapper}>
      {children}
      {(count !== undefined && count > 0) || dot ? (
        <View style={[styles.badge, dot && styles.badgeDot, { backgroundColor: color }]}>
          {!dot && count !== undefined && count > 0 && (
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

// Divider Component
interface DividerProps {
  orientation?: 'left' | 'right' | 'center';
  children?: React.ReactNode;
  dashed?: boolean;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'center',
  children,
  dashed = false,
}) => (
  <View style={styles.dividerContainer}>
    {orientation === 'left' && children && (
      <Text style={styles.dividerText}>{children}</Text>
    )}
    <View style={[styles.divider, dashed && styles.dividerDashed]} />
    {orientation === 'center' && children && (
      <Text style={styles.dividerText}>{children}</Text>
    )}
    {orientation === 'right' && children && (
      <Text style={styles.dividerText}>{children}</Text>
    )}
  </View>
);

// Empty Component
interface EmptyProps {
  description?: string;
  image?: React.ReactNode;
}

export const Empty: React.FC<EmptyProps> = ({
  description = 'Không có dữ liệu',
  image,
}) => (
  <View style={styles.empty}>
    {image || <MaterialIcons name="inbox" size={64} color="#d9d9d9" />}
    <Text style={styles.emptyDescription}>{description}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardBordered: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  cardBody: {
    padding: 16,
  },

  // Statistic
  statistic: {
    alignItems: 'center',
  },
  statisticTitle: {
    fontSize: 14,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  statisticValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statisticPrefix: {
    marginRight: 4,
  },
  statisticValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#262626',
  },
  statisticSuffix: {
    marginLeft: 4,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonDefault: {
    backgroundColor: '#fff',
    borderColor: '#d9d9d9',
  },
  buttonPrimary: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: '#1890ff',
  },
  buttonDashed: {
    backgroundColor: '#fff',
    borderColor: '#d9d9d9',
    borderStyle: 'dashed',
  },
  buttonLink: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonText: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 24,
  },
  buttonMiddle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 32,
  },
  buttonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 40,
  },
  buttonBlock: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextDefault: {
    color: '#262626',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextGhost: {
    color: '#1890ff',
  },
  buttonTextDashed: {
    color: '#262626',
  },
  buttonTextLink: {
    color: '#1890ff',
  },
  buttonTextText: {
    color: '#1890ff',
  },
  buttonTextSmall: {
    fontSize: 12,
  },
  buttonTextMiddle: {
    fontSize: 14,
  },
  buttonTextLarge: {
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Tag
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagClose: {
    marginLeft: 4,
  },

  // Badge
  badgeWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeDot: {
    width: 8,
    height: 8,
    minWidth: 8,
    paddingHorizontal: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dividerDashed: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },

  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyDescription: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },
});


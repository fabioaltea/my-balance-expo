import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useThemeColor } from '@/src/hooks/use-theme-color';

interface CardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}

/**
 * Web card surface.
 *
 * Kept separate from the native implementation so the denser desktop layout can
 * use a quieter border, a smaller radius and web-specific interaction states.
 */
const Card: React.FC<CardProps> = ({
  backgroundColor,
  color,
  label,
  headerAction,
  children,
  style,
  compact = false,
}) => {
  const themeBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const mutedColor = useThemeColor({ light: '#617068', dark: '#AEB8B2' }, 'tabIconDefault');
  const hasFlex = Boolean(style && 'flex' in style);

  return (
    <View style={[styles.wrapper, style]}>
      <View
        // @ts-ignore: web-only data attribute used for hover and focus-within styling.
        dataSet={{ dashboardCard: '' }}
        style={[
          styles.card,
          {
            backgroundColor: backgroundColor ?? themeBackground,
            borderColor,
          },
          hasFlex && styles.fill,
          label && styles.contentTop,
          compact && styles.compact,
        ]}
      >
        {label || headerAction ? (
          <View style={styles.header}>
            {label ? (
              <Text style={[styles.label, { color: mutedColor }]} numberOfLines={1}>
                {label}
              </Text>
            ) : (
              <View />
            )}
            {headerAction}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 0,
  },
  fill: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
    minHeight: 0,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(17, 31, 24, 0.03), 0 10px 28px rgba(17, 31, 24, 0.05)',
  },
  compact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contentTop: {
    justifyContent: 'flex-start',
  },
  header: {
    minHeight: 30,
    marginBottom: 6,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

export default Card;

import { useThemeColor } from '@/src/hooks/use-theme-color';
import { StyleSheet, View, Text } from 'react-native';
import React from 'react';
import { webPanelBackground } from '@/src/constants/theme';

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  style?: import('react-native').ViewStyle;
  compact?: boolean;
}

const Card: React.FC<ICardProps> = ({
  backgroundColor,
  label,
  headerAction,
  children,
  style,
  compact = false,
}) => {
  const themeBackground = useThemeColor(webPanelBackground, 'cardBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const mutedColor = useThemeColor({ light: '#617068', dark: '#AEB8B2' }, 'tabIconDefault');
  const hasFlex = Boolean(style && 'flex' in style);

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.card,
          { backgroundColor: backgroundColor ?? themeBackground, borderColor },
          hasFlex && styles.fill,
          Boolean(label || headerAction) && styles.contentTop,
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
  wrapper: { width: '100%', minHeight: 0 },
  card: {
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
    minHeight: 0,
    shadowColor: '#173126',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  fill: { flex: 1 },
  compact: { paddingHorizontal: 14, paddingVertical: 12 },
  contentTop: { justifyContent: 'flex-start' },
  header: {
    minHeight: 28,
    marginBottom: 8,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: -0.1 },
});

export default Card;

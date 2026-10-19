import { useThemeColor } from '@/src/hooks/use-theme-color';
import { StyleSheet, View, Text } from 'react-native';
import React from 'react';

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  /** Rendered by the web implementation; accepted here for platform-resolved typing. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

const InputGroup: React.FC<ICardProps> = ({ backgroundColor, color, label, children }) => {
  const themeBackground = useThemeColor({}, 'cardBackground');
  const labelColor = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const borderBottomColor = useThemeColor({ light: '#DFE6E1', dark: '#343C37' }, 'cardBorder');

  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <View>
      {label && (
        <View>
          <Text style={[styles.cardLabel, { color: color ?? labelColor }]}>{label}</Text>
        </View>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: backgroundColor ?? themeBackground,
            borderColor: borderBottomColor,
          },
        ]}
      >
        {validChildren.map((child, index) => (
          <View
            key={index}
            style={[
              styles.item,
              { borderBottomColor },
              index === validChildren.length - 1 && styles.lastItem,
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    overflow: 'visible' as const,
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 2,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
    minHeight: 52,
    justifyContent: 'center',
    overflow: 'visible' as const,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
});

export default InputGroup;

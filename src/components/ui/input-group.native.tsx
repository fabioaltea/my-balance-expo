import { useThemeColor } from '@/src/hooks/use-theme-color';
import { StyleSheet, View, Text } from 'react-native';
import React from 'react';

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
}

const InputGroup: React.FC<ICardProps> = ({ backgroundColor, color, label, children }) => {
  const themeBackground = useThemeColor({}, 'cardBackground');
  const themeColor = useThemeColor({}, 'cardColor');
  const borderBottomColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');

  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <View>
      {label && (
        <View>
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: backgroundColor ?? themeBackground,
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
    borderRadius: 30,
    marginBottom: 20,
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: 'visible' as const,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#848484ff',
    marginBottom: 10,
    marginLeft: 10,
  },
  item: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'visible' as const,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
});

export default InputGroup;

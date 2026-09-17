import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/src/hooks/use-theme-color';
import List from './list';

interface InputGroupProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** Desktop form section used by the add and edit movement drawer. */
const InputGroup: React.FC<InputGroupProps> = ({ backgroundColor, label, action, children }) => {
  const surfaceColor = useThemeColor({ light: '#FFFFFF', dark: '#232725' }, 'cardBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.11)', dark: 'rgba(255, 255, 255, 0.11)' },
    'cardBorder',
  );
  const labelColor = useThemeColor({ light: '#657169', dark: '#AEB8B2' }, 'tabIconDefault');

  return (
    <View style={styles.wrapper}>
      {label || action ? (
        <View style={styles.header}>
          {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : <View />}
          {action}
        </View>
      ) : null}
      <View
        style={[styles.surface, { backgroundColor: backgroundColor || surfaceColor, borderColor }]}
      >
        <List>{children}</List>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  header: {
    minHeight: 32,
    marginBottom: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  surface: {
    paddingHorizontal: 2,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'visible',
  },
});

export default InputGroup;

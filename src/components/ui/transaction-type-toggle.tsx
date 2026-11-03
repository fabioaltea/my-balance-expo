import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable } from '@/src/components/core/interactive';
import { ThemedText } from '@/src/components/core';
import { useThemeColor } from '@/src/hooks/use-theme-color';

interface TransactionTypeToggleProps {
  type?: 'income' | 'expense';
  onChange: (type: 'income' | 'expense') => void;
  disabled?: boolean;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Shared direction control for transaction entry and statement review. */
export default function TransactionTypeToggle({
  type,
  onChange,
  disabled = false,
  showLabel = false,
  style,
}: TransactionTypeToggleProps) {
  const muted = useThemeColor({ light: '#657169', dark: '#AEB8B2' }, 'tabIconDefault');
  const neutral = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const color = type === 'income' ? '#22c55e' : type === 'expense' ? '#ef4444' : muted;
  const label = type === 'income' ? 'Entrata' : type === 'expense' ? 'Uscita' : 'Scegli';
  const next = type === 'expense' ? 'income' : 'expense';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${type ? label : 'Tipologia non selezionata'}. Imposta ${next === 'income' ? 'entrata' : 'uscita'}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={({ pressed }) => [
        styles.toggle,
        { backgroundColor: type ? `${color}20` : neutral },
        style,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <MaterialIcons
        name={type === 'income' ? 'call-made' : type === 'expense' ? 'call-received' : 'swap-vert'}
        size={16}
        color={color}
      />
      {showLabel && <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});

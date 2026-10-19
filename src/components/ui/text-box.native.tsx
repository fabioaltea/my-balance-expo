import { ThemedText } from '../core/themed-text.native';
import { View, StyleSheet, TextInput } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import React from 'react';
interface ITextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const TextBox: React.FC<ITextBoxProps> = ({
  value,
  onChange,
  label,
  placeholder,
  onFocus,
  onBlur,
}) => {
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        accessibilityLabel={label || placeholder}
        style={[styles.textInput, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor={placeholderColor}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 4,
    alignItems: 'center',
  },
  label: {
    flexShrink: 0,
    marginRight: 12,
    width: 96,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  textInput: {
    display: 'flex',
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minWidth: 0, // Prevents text from overflowing
    outlineColor: 'transparent',
  },
});

export default TextBox;

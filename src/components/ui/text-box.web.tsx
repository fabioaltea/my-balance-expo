import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/src/components/core/themed-text';
import { useThemeColor } from '@/src/hooks/use-theme-color';

interface TextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  placeholder?: string;
}

const TextBox: React.FC<TextBoxProps> = ({ value, onChange, label, placeholder }) => {
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');

  return (
    <View style={styles.container}>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <TextInput
        accessibilityLabel={label}
        style={[styles.textInput, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor={placeholderColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    width: 110,
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderWidth: 0,
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 20,
    outlineColor: 'transparent',
  },
});

export default TextBox;

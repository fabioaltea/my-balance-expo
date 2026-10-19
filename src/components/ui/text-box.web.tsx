import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/src/components/core/themed-text';
import { useThemeColor } from '@/src/hooks/use-theme-color';

interface TextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  placeholder?: string;
}

const TextBox: React.FC<TextBoxProps> = ({ value, onChange, label, placeholder }) => {
  const [isHovered, setIsHovered] = useState(false);
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');
  const hoverColor = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');

  return (
    <View style={styles.container}>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <TextInput
        accessibilityLabel={label}
        style={[
          styles.textInput,
          { color: textColor, backgroundColor: isHovered ? hoverColor : 'transparent' },
        ]}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor={placeholderColor}
      />
      <View style={styles.inputIcon} pointerEvents="none" aria-hidden>
        <MaterialIcons name="edit" size={12} color={placeholderColor} />
      </View>
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
    paddingHorizontal: 10,
    paddingRight: 36,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 10,
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 20,
    outlineColor: 'transparent',
  },
  inputIcon: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TextBox;

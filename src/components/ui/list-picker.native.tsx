import { ThemedText } from '../core/themed-text';
import { View, StyleSheet, Pressable } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import ModalPanel from './modal-panel';
import React from 'react';
import IconSymbol from './icon-symbol';

export interface IListPickerItem {
  label: string;
  value: string;
}

interface IListPickerProps {
  value: string;
  onChange: (value: string) => void;
  items: IListPickerItem[];
  label?: string;
  placeholder?: string;
  title?: string;
  iconName?: string;
}

const ListPicker: React.FC<IListPickerProps> = ({
  value,
  onChange,
  items,
  label,
  placeholder = 'Select...',
  title = 'Select an option',
  iconName = 'chevron.down',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Theme colors
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');

  const getDisplayValue = () => {
    const selectedItem = items.find((item) => item.value === value);
    return selectedItem ? selectedItem.label : placeholder;
  };

  const showModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempValue(value);
    setIsVisible(true);
  };

  const hideModal = () => {
    setIsVisible(false);
  };

  const confirmSelection = () => {
    onChange(tempValue);
  };

  const isPlaceholder = !items.find((item) => item.value === value);

  return (
    <Pressable
      onPress={showModal}
      accessibilityRole="button"
      accessibilityLabel={label || title}
      accessibilityValue={{ text: getDisplayValue() }}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View style={styles.inputContainer}>
        <ThemedText
          numberOfLines={1}
          style={[
            styles.valueText,
            {
              color: isPlaceholder ? placeholderColor : textColor,
            },
          ]}
        >
          {getDisplayValue()}
        </ThemedText>
        <IconSymbol name="chevron-right" size={16} color={placeholderColor} />
      </View>

      <ModalPanel
        isVisible={isVisible}
        onClose={hideModal}
        onConfirm={confirmSelection}
        title={title}
        showConfirmButton={true}
        showCancelButton={true}
      >
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={tempValue}
            onValueChange={(itemValue) => setTempValue(itemValue)}
            style={styles.picker}
            itemStyle={[styles.pickerItem, { color: textColor }]}
          >
            <Picker.Item key={''} label={''} value={''} />
            {items.map((item) => (
              <Picker.Item key={item.value} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>
      </ModalPanel>
    </Pressable>
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
  inputContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  valueText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    flex: 1,
  },
  icon: {
    marginLeft: 8,
  },
  pressed: { opacity: 0.65 },
  pickerContainer: {
    alignItems: 'center',
    minHeight: 200,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  pickerItem: {
    fontSize: 18,
    height: 200,
  },
});

export default ListPicker;

import { ThemedText } from '../core/themed-text';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useState, useRef } from 'react';
import React from 'react';

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<View>(null);

  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({ light: '#666', dark: '#99999984' }, 'tabIconDefault');
  const dropdownBg = useThemeColor({ light: '#fff', dark: '#2a2a2a' }, 'background');
  const dropdownBorder = useThemeColor({ light: '#e0e0e0', dark: '#444' }, 'tabIconDefault');
  const hoverColor = useThemeColor({ light: '#f0f0f0', dark: '#3a3a3a' }, 'tabIconDefault');
  const selectedBg = useThemeColor({ light: '#e8f5e9', dark: '#1b3a26' }, 'tabIconDefault');

  const getDisplayValue = () => {
    const selectedItem = items.find((item) => item.value === value);
    return selectedItem ? selectedItem.label : placeholder;
  };

  const handleSelect = (itemValue: string) => {
    onChange(itemValue);
    setIsOpen(false);
  };

  const isPlaceholder = !items.find((item) => item.value === value);

  return (
    <View ref={containerRef} style={styles.wrapper}>
      <Pressable onPress={() => setIsOpen(!isOpen)} style={styles.container}>
        {label && (
          <ThemedText type="default" style={styles.label}>
            {label}
          </ThemedText>
        )}
        <View style={styles.inputContainer}>
          <ThemedText
            style={[
              styles.valueText,
              {
                color: isPlaceholder ? placeholderColor : textColor,
              },
            ]}
          >
            {getDisplayValue()}
          </ThemedText>
          <ThemedText style={[styles.chevron, { color: placeholderColor }]}>
            {isOpen ? '▲' : '▼'}
          </ThemedText>
        </View>
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: dropdownBg,
              borderColor: dropdownBorder,
            },
          ]}
        >
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {items.map((item) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleSelect(item.value)}
                  style={({ hovered }: any) => [
                    styles.dropdownItem,
                    { backgroundColor: isSelected ? selectedBg : dropdownBg },
                    hovered && !isSelected && { backgroundColor: hoverColor },
                  ]}
                >
                  <ThemedText
                    style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: 'center',
    flex: 1,
  },
  label: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 80,
    maxWidth: 120,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
  },
  valueText: {
    fontSize: 18,
    textAlign: 'right',
    flex: 1,
  },
  chevron: {
    fontSize: 10,
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99999,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
});

export default ListPicker;

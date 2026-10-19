import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import ModalPanel from './modal-panel.native';
import React from 'react';
import { ThemedText } from '../core';
import IconSymbol from './icon-symbol';

interface IDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  mode?: 'date' | 'time' | 'datetime';
}

const DatePicker: React.FC<IDatePickerProps> = ({ value, onChange, label, mode = 'date' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Theme colors
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const mutedColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');

  const formatDate = (date: Date) => {
    switch (mode) {
      case 'time':
        return date.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'datetime':
        return date.toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      default:
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    }
  };

  const showModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempDate(value);
    setIsVisible(true);
  };

  const hideModal = () => {
    setIsVisible(false);
  };

  const confirmSelection = () => {
    onChange(tempDate);
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'time':
        return 'Select Time';
      case 'datetime':
        return 'Select Date and Time';
      default:
        return 'Select Date';
    }
  };

  return (
    <Pressable
      onPress={showModal}
      accessibilityRole="button"
      accessibilityLabel={label || getModalTitle()}
      accessibilityValue={{ text: formatDate(value) }}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <ThemedText style={[styles.dateText, { color: textColor }]}>{formatDate(value)}</ThemedText>
      <IconSymbol name="chevron-right" size={16} color={mutedColor} />

      <ModalPanel
        isVisible={isVisible}
        onClose={hideModal}
        onConfirm={confirmSelection}
        title={getModalTitle()}
        showConfirmButton={true}
        showCancelButton={true}
      >
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={tempDate}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                setTempDate(selectedDate);
              }
            }}
            style={styles.picker}
          />
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
  textInput: {
    display: 'flex',
    flex: 1,
    textAlign: 'right',
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0, // Prevents text from overflowing
  },
  dateText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
  },
  pressed: { opacity: 0.65 },
  pickerContainer: {
    alignItems: 'center',
  },
  picker: {
    width: '100%',
    height: 200,
  },
});

export default DatePicker;

import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useState, useEffect } from 'react';
import { ThemedText } from '../core/themed-text.native';
import * as Haptics from 'expo-haptics';
import DatePicker from './date-picker.native';
import InputGroup from './input-group.native';
import ModalPanel from './modal-panel.native';
import React from 'react';

interface IRecurrencyPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (pattern: string | null, startDate: Date) => void;
  startDate: Date;
  initialPattern?: string | null; // e.g., "P1M", "P2W", or null for none
}

type RecurrencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurrencyOption {
  type: RecurrencyType;
  label: string;
}

const RECURRENCY_OPTIONS: RecurrencyOption[] = [
  { type: 'daily', label: 'Daily' },
  { type: 'weekly', label: 'Weekly' },
  { type: 'monthly', label: 'Monthly' },
  { type: 'yearly', label: 'Yearly' },
];

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 30];

// Parse ISO 8601 duration pattern (e.g., "P1M", "P2W") into type and frequency
const parsePattern = (pattern: string): { type: RecurrencyType; frequency: number } | null => {
  const match = pattern.match(/^P(\d+)([DWMY])$/);
  if (!match) {
    return null;
  }

  const freq = parseInt(match[1], 10);
  const unit = match[2];

  let type: RecurrencyType;
  switch (unit) {
    case 'D':
      type = 'daily';
      break;
    case 'W':
      type = 'weekly';
      break;
    case 'M':
      type = 'monthly';
      break;
    case 'Y':
      type = 'yearly';
      break;
    default:
      return null;
  }

  return { type, frequency: freq };
};

const RecurrencyPicker: React.FC<IRecurrencyPickerProps> = ({
  isVisible,
  onClose,
  onSave,
  startDate,
  initialPattern,
}) => {
  const [selectedType, setSelectedType] = useState<RecurrencyType | null>(null);
  const [frequency, setFrequency] = useState<number>(1);
  const [pickerStartDate, setPickerStartDate] = useState<Date>(startDate);
  const { height } = useWindowDimensions();

  // Initialize state from initialPattern when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setPickerStartDate(startDate);
      if (initialPattern) {
        const parsed = parsePattern(initialPattern);
        if (parsed) {
          setSelectedType(parsed.type);
          setFrequency(parsed.frequency);
        } else {
          setSelectedType(null);
          setFrequency(1);
        }
      } else {
        // New recurrence: default to blank
        setSelectedType(null);
        setFrequency(1);
      }
    }
  }, [isVisible, initialPattern, startDate]);

  // Theme colors
  const chipActiveBackground = useThemeColor(
    { light: '#E7EEE9', dark: '#2C3E33' },
    'cardBackground',
  );
  const chipInactiveBackground = useThemeColor({}, 'cardBackground');
  const chipActiveText = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const chipInactiveText = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const borderColor = useThemeColor({ light: '#DFE6E1', dark: '#343C37' }, 'cardBorder');
  const frequencyOptions = FREQUENCY_OPTIONS.includes(frequency)
    ? FREQUENCY_OPTIONS
    : [...FREQUENCY_OPTIONS, frequency].sort((first, second) => first - second);
  const handleTypeSelect = (type: RecurrencyType | null) => {
    Haptics.selectionAsync();
    setSelectedType(type);
  };

  const handleFrequencySelect = (freq: number) => {
    Haptics.selectionAsync();
    setFrequency(freq);
  };

  const handleSave = () => {
    if (selectedType === null) {
      onSave(null, pickerStartDate);
      return;
    }

    let durationUnit: string;
    switch (selectedType) {
      case 'daily':
        durationUnit = 'D';
        break;
      case 'weekly':
        durationUnit = 'W';
        break;
      case 'monthly':
        durationUnit = 'M';
        break;
      case 'yearly':
        durationUnit = 'Y';
        break;
      default:
        durationUnit = 'M';
    }

    const pattern = `P${frequency}${durationUnit}`;
    onSave(pattern, pickerStartDate);
  };

  const getRecurrenceDescription = (): string => {
    if (selectedType === null) {
      return 'No recurrence pattern';
    }
    const typeLabels: Record<RecurrencyType, string> = {
      daily: frequency === 1 ? 'day' : 'days',
      weekly: frequency === 1 ? 'week' : 'weeks',
      monthly: frequency === 1 ? 'month' : 'months',
      yearly: frequency === 1 ? 'year' : 'years',
    };
    return `Every ${frequency} ${typeLabels[selectedType]}`;
  };

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={handleSave}
      title="Recurrence"
      showCancelButton={true}
      showConfirmButton={true}
      confirmText="Save"
      cancelText="Cancel"
      maxHeight={Math.min(640, height * 0.85)}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Start Date - Editable */}
        <InputGroup>
          <DatePicker value={pickerStartDate} onChange={setPickerStartDate} label="Start date" />
        </InputGroup>

        {/* Recurrence Type */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: chipInactiveText }]}>Repeat</ThemedText>
          <View accessibilityRole="radiogroup" style={styles.chipsContainer}>
            {/* None option */}
            <Pressable
              onPress={() => handleTypeSelect(null)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedType === null }}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: selectedType === null ? chipActiveText : borderColor,
                  backgroundColor:
                    selectedType === null ? chipActiveBackground : chipInactiveBackground,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: selectedType === null ? chipActiveText : chipInactiveText,
                  },
                ]}
              >
                None
              </ThemedText>
            </Pressable>
            {RECURRENCY_OPTIONS.map((option) => {
              const isActive = selectedType === option.type;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => handleTypeSelect(option.type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: isActive ? chipActiveText : borderColor,
                      backgroundColor: isActive ? chipActiveBackground : chipInactiveBackground,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isActive ? chipActiveText : chipInactiveText },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Frequency - only show when a type is selected */}
        {selectedType !== null && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: chipInactiveText }]}>
              Every
            </ThemedText>
            <View accessibilityRole="radiogroup" style={styles.frequencyContainer}>
              {frequencyOptions.map((freq) => {
                const isActive = frequency === freq;
                return (
                  <Pressable
                    key={freq}
                    onPress={() => handleFrequencySelect(freq)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Every ${freq}`}
                    accessibilityState={{ checked: isActive }}
                    style={({ pressed }) => [
                      styles.frequencyChip,
                      {
                        borderColor: isActive ? chipActiveText : borderColor,
                        backgroundColor: isActive ? chipActiveBackground : chipInactiveBackground,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.frequencyText,
                        { color: isActive ? chipActiveText : chipInactiveText },
                      ]}
                    >
                      {freq}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Summary */}
        <View
          style={[styles.summaryContainer, { borderColor, backgroundColor: chipActiveBackground }]}
        >
          <ThemedText
            accessibilityLiveRegion="polite"
            style={[styles.summaryText, { color: chipActiveText }]}
          >
            {getRecurrenceDescription()}
          </ThemedText>
        </View>
      </ScrollView>
    </ModalPanel>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 80,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  pressed: { opacity: 0.65 },
});

export default RecurrencyPicker;

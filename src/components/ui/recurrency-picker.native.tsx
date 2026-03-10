import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useState, useEffect } from "react";
import { ThemedText } from "../core/themed-text.native";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import ModalPanel from "./modal-panel.native";
import React from "react";

interface IRecurrencyPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (pattern: string | null, startDate: Date) => void;
  startDate: Date;
  initialPattern?: string | null; // e.g., "P1M", "P2W", or null for none
}

type RecurrencyType = "daily" | "weekly" | "monthly" | "yearly";

interface RecurrencyOption {
  type: RecurrencyType;
  label: string;
}

const RECURRENCY_OPTIONS: RecurrencyOption[] = [
  { type: "daily", label: "Daily" },
  { type: "weekly", label: "Weekly" },
  { type: "monthly", label: "Monthly" },
  { type: "yearly", label: "Yearly" },
];

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 30];

// Parse ISO 8601 duration pattern (e.g., "P1M", "P2W") into type and frequency
const parsePattern = (
  pattern: string,
): { type: RecurrencyType; frequency: number } | null => {
  const match = pattern.match(/^P(\d+)([DWMY])$/);
  if (!match) {
    return null;
  }

  const freq = parseInt(match[1], 10);
  const unit = match[2];

  let type: RecurrencyType;
  switch (unit) {
    case "D":
      type = "daily";
      break;
    case "W":
      type = "weekly";
      break;
    case "M":
      type = "monthly";
      break;
    case "Y":
      type = "yearly";
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
    { light: "#2F4F3F", dark: "#4a7c59" },
    "tabIconDefault",
  );
  const chipInactiveBackground = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );
  const chipActiveText = useThemeColor(
    { light: "#fff", dark: "#fff" },
    "background",
  );
  const chipInactiveText = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault",
  );
  const subtextColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault",
  );
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
      case "daily":
        durationUnit = "D";
        break;
      case "weekly":
        durationUnit = "W";
        break;
      case "monthly":
        durationUnit = "M";
        break;
      case "yearly":
        durationUnit = "Y";
        break;
      default:
        durationUnit = "M";
    }

    const pattern = `P${frequency}${durationUnit}`;
    onSave(pattern, pickerStartDate);
  };

  const getRecurrenceDescription = (): string => {
    if (selectedType === null) {
      return "No recurrence pattern";
    }
    const typeLabels: Record<RecurrencyType, string> = {
      daily: frequency === 1 ? "day" : "days",
      weekly: frequency === 1 ? "week" : "weeks",
      monthly: frequency === 1 ? "month" : "months",
      yearly: frequency === 1 ? "year" : "years",
    };
    return `Every ${frequency} ${typeLabels[selectedType]}`;
  };

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={handleSave}
      title="Recurring Movement"
      showCancelButton={true}
      showConfirmButton={true}
      confirmText="Save"
      cancelText="Cancel"
      maxHeight={520}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Start Date - Editable */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Start Date</ThemedText>
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={pickerStartDate}
              mode="date"
              display={Platform.OS === "ios" ? "compact" : "default"}
              onChange={(_event, selectedDate) => {
                if (selectedDate) {
                  setPickerStartDate(selectedDate);
                }
              }}
              style={styles.datePicker}
            />
          </View>
        </View>

        {/* Recurrence Type */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Repeat</ThemedText>
          <View style={styles.chipsContainer}>
            {/* None option */}
            <Pressable
              onPress={() => handleTypeSelect(null)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedType === null
                      ? chipActiveBackground
                      : chipInactiveBackground,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color:
                      selectedType === null
                        ? chipActiveText
                        : chipInactiveText,
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
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive
                        ? chipActiveBackground
                        : chipInactiveBackground,
                    },
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
            <ThemedText style={styles.sectionLabel}>Every</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.frequencyContainer}
            >
              {FREQUENCY_OPTIONS.map((freq) => {
                const isActive = frequency === freq;
                return (
                  <Pressable
                    key={freq}
                    onPress={() => handleFrequencySelect(freq)}
                    style={[
                      styles.frequencyChip,
                      {
                        backgroundColor: isActive
                          ? chipActiveBackground
                          : chipInactiveBackground,
                      },
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
            </ScrollView>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <ThemedText style={[styles.summaryText, { color: subtextColor }]}>
            {getRecurrenceDescription()}
          </ThemedText>
        </View>
      </ScrollView>
    </ModalPanel>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  datePickerContainer: {
    alignItems: "flex-start",
  },
  datePicker: {
    marginLeft: -10,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  frequencyContainer: {
    gap: 10,
    paddingRight: 20,
  },
  frequencyChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  summaryText: {
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default RecurrencyPicker;

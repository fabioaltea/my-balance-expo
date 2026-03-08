import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useState, useEffect } from "react";
import { ThemedText } from "../core/themed-text.native";
import GlassButton from "./glass-button.native";
import React from "react";

interface IRecurrencyPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (pattern: string) => void;
  startDate: Date;
  initialPattern?: string;
}

type RecurrencyType = "daily" | "weekly" | "monthly" | "yearly";

interface RecurrencyOption {
  type: RecurrencyType;
  label: string;
  pattern: string;
}

const RECURRENCY_OPTIONS: RecurrencyOption[] = [
  { type: "daily", label: "Daily", pattern: "P" },
  { type: "weekly", label: "Weekly", pattern: "P" },
  { type: "monthly", label: "Monthly", pattern: "P" },
  { type: "yearly", label: "Yearly", pattern: "P" },
];

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 30];

const parsePattern = (
  pattern: string,
): { type: RecurrencyType; frequency: number } => {
  const match = pattern.match(/^P(\d+)([DWMY])$/);
  if (!match) {
    return { type: "monthly", frequency: 1 };
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
      type = "monthly";
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
  const [selectedType, setSelectedType] = useState<RecurrencyType>("monthly");
  const [frequency, setFrequency] = useState<number>(1);

  useEffect(() => {
    if (isVisible && initialPattern) {
      const parsed = parsePattern(initialPattern);
      setSelectedType(parsed.type);
      setFrequency(parsed.frequency);
    }
  }, [isVisible, initialPattern]);

  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#1a1a1a" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );
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

  const handleSave = () => {
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
    onSave(pattern);
  };

  const formatStartDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getRecurrenceDescription = (): string => {
    const typeLabels: Record<RecurrencyType, string> = {
      daily: frequency === 1 ? "day" : "days",
      weekly: frequency === 1 ? "week" : "weeks",
      monthly: frequency === 1 ? "month" : "months",
      yearly: frequency === 1 ? "year" : "years",
    };
    return `Every ${frequency} ${typeLabels[selectedType]}`;
  };

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <GlassButton onPress={onClose} type="dismiss" />
        <ThemedText type="defaultSemiBold" style={styles.title}>
          Recurring Movement
        </ThemedText>
        <GlassButton onPress={handleSave} type="confirm" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Start Date Display */}
        <View style={styles.sectionHorizontal}>
          <ThemedText style={styles.sectionLabel}>Start Date</ThemedText>
          <ThemedText style={styles.dateDisplay}>
            {formatStartDate(startDate)}
          </ThemedText>
        </View>

        {/* Recurrence Type */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Repeat</ThemedText>
          <View style={styles.chipsContainer}>
            {RECURRENCY_OPTIONS.map((option) => {
              const isActive = selectedType === option.type;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => setSelectedType(option.type)}
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

        {/* Frequency */}
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
                  onPress={() => setFrequency(freq)}
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

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <ThemedText style={[styles.summaryText, { color: subtextColor }]}>
            {getRecurrenceDescription()}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHorizontal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  dateDisplay: {
    fontSize: 18,
    fontWeight: "500",
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

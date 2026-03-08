import { ThemedText } from "../core/themed-text.native";
import { View, StyleSheet, TextInput } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useCallback } from "react";

interface IDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  mode?: "date" | "time" | "datetime";
}

const DatePicker: React.FC<IDatePickerProps> = ({
  value,
  onChange,
  label,
  mode = "date",
}) => {
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  // Format date for HTML input
  const formatForInput = useCallback(
    (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      switch (mode) {
        case "time":
          return `${hours}:${minutes}`;
        case "datetime":
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        default:
          return `${year}-${month}-${day}`;
      }
    },
    [mode],
  );

  const getInputType = (): string => {
    switch (mode) {
      case "time":
        return "time";
      case "datetime":
        return "datetime-local";
      default:
        return "date";
    }
  };

  const handleChange = useCallback(
    (text: string) => {
      if (!text) return;

      let newDate: Date;

      switch (mode) {
        case "time": {
          const [hours, minutes] = text.split(":").map(Number);
          newDate = new Date(value);
          newDate.setHours(hours, minutes);
          break;
        }
        case "datetime": {
          newDate = new Date(text);
          break;
        }
        default: {
          // date: "YYYY-MM-DD"
          const [year, month, day] = text.split("-").map(Number);
          newDate = new Date(year, month - 1, day);
          break;
        }
      }

      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    },
    [mode, value, onChange],
  );

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        // @ts-ignore — type prop is for web input element
        type={getInputType()}
        value={formatForInput(value)}
        onChangeText={handleChange}
        style={[styles.input, { color: textColor }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: "center",
    flex: 1,
  },
  label: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 80,
    maxWidth: 120,
  },
  input: {
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0,
    // @ts-ignore — web-specific styles
    outlineStyle: "none",
    cursor: "pointer",
  },
});

export default DatePicker;

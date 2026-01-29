import { ThemedText } from "../core/themed-text";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import ModalPanel from "./modal-panel";
import React from "react";

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
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Theme colors
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  const formatDate = (date: Date) => {
    switch (mode) {
      case "time":
        return date.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "datetime":
        return date.toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      default:
        return date.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
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
      case "time":
        return "Select Time";
      case "datetime":
        return "Select Date and Time";
      default:
        return "Select Date";
    }
  };

  return (
    <>
      <Pressable onPress={showModal} style={styles.container}>
        {label && (
          <ThemedText type="default" style={styles.label}>
            {label}
          </ThemedText>
        )}
        <ThemedText style={styles.dateText}>{formatDate(value)}</ThemedText>
      </Pressable>

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
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                setTempDate(selectedDate);
              }
            }}
            style={styles.picker}
          />
        </View>
      </ModalPanel>
    </>
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
  textInput: {
    display: "flex",
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0, // Prevents text from overflowing
  },
  dateText: {
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
  },
  pickerContainer: {
    alignItems: "center",
  },
  picker: {
    width: "100%",
    height: 200,
  },
});

export default DatePicker;

import { View, StyleSheet } from "react-native";
import ChipButton from "./chip-button";
import { useState } from "react";
import React from "react";

export type ViewMode = "recent" | "recurring" | "next";

interface ViewModePickerProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const ViewModePicker: React.FC<ViewModePickerProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const modes: { label: string; value: ViewMode }[] = [
    { label: "Recent", value: "recent" },
    { label: "Recurring", value: "recurring" },
    { label: "Next", value: "next" },
  ];

  return (
    <View style={styles.container}>
      {modes.map((mode) => (
        <ChipButton
          key={mode.value}
          text={mode.label}
          active={selectedMode === mode.value}
          onPress={() => onModeChange(mode.value)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
});

export default ViewModePicker;

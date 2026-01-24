import { View, StyleSheet } from "react-native";
import ChipButton from "./chip-button";
import React from "react";

export type ViewMode = "recent" | "recurring" | "unconfirmed";

interface ViewModePickerProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  pendingCount?: number;
  unconfirmedCount?: number;
}

const ViewModePicker: React.FC<ViewModePickerProps> = ({
  selectedMode,
  onModeChange,
  pendingCount = 0,
  unconfirmedCount = 0,
}) => {
  const modes: { label: string; value: ViewMode; badge?: number }[] = [
    { label: "Recent", value: "recent" },
    { label: "Recurring", value: "recurring", badge: pendingCount > 0 ? pendingCount : undefined },
    { label: "Unconfirmed", value: "unconfirmed", badge: unconfirmedCount > 0 ? unconfirmedCount : undefined },
  ];

  return (
    <View style={styles.container}>
      {modes.map((mode) => (
        <ChipButton
          key={mode.value}
          text={mode.label}
          active={selectedMode === mode.value}
          onPress={() => onModeChange(mode.value)}
          badge={mode.badge}
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

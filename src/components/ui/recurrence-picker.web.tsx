import { View, StyleSheet, Pressable } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useRef, useEffect, useState } from "react";
import { ThemedText } from "../core/themed-text.native";

interface RecurringMovement {
  recurrenceId?: string;
  description: string;
  category: string;
}

interface IRecurrencePickerWebProps {
  isRecurrent: boolean;
  onToggle: () => void;
  recurrenceSelection: string;
  onSelectionChange: (value: string) => void;
  recurrenceUnit: string;
  onUnitChange: (value: string) => void;
  recurrenceFrequency: number;
  onFrequencyChange: (value: number) => void;
  recurringMovements: RecurringMovement[];
}

const ROW_HEIGHT = 40;

const RecurrencePickerWeb: React.FC<IRecurrencePickerWebProps> = ({
  isRecurrent,
  onToggle,
  recurrenceSelection,
  onSelectionChange,
  recurrenceUnit,
  onUnitChange,
  recurrenceFrequency,
  onFrequencyChange,
  recurringMovements,
}) => {
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  // Calculate target height based on visible rows
  let rowCount = 1; // toggle row always visible
  if (isRecurrent) {
    rowCount += 1; // recurrence select
    if (recurrenceSelection === "new") {
      rowCount += 2; // repeat + every
    }
  }
  const targetHeight = rowCount * ROW_HEIGHT;
  const [currentHeight, setCurrentHeight] = useState(targetHeight);
  const prevTarget = useRef(targetHeight);

  useEffect(() => {
    if (prevTarget.current === targetHeight) return;
    prevTarget.current = targetHeight;
    requestAnimationFrame(() => {
      setCurrentHeight(targetHeight);
    });
  }, [targetHeight]);

  const selectStyle = {
    flex: 1,
    fontSize: 18,
    textAlign: "right" as const,
    color: textColor,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    cursor: "pointer",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    width: "100%",
  };

  return (
    // @ts-ignore
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: currentHeight,
        transition: "height 250ms ease-out",
      }}
    >
      {/* @ts-ignore */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        {/* Toggle */}
        <View style={styles.fieldRow}>
          <ThemedText type="default" style={styles.fieldLabel}>
            Recurrent
          </ThemedText>
          <Pressable
            onPress={onToggle}
            style={[
              styles.toggle,
              { backgroundColor: isRecurrent ? "#2F4F3F" : "#ccc" },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                { transform: [{ translateX: isRecurrent ? 20 : 2 }] },
              ]}
            />
          </Pressable>
        </View>

        {/* Recurrence select */}
        <View style={styles.fieldRow}>
          <ThemedText type="default" style={styles.fieldLabel}>
            Recurrence
          </ThemedText>
          <View style={styles.fieldValue}>
            {/* @ts-ignore */}
            <select
              value={recurrenceSelection}
              onChange={(e: any) => onSelectionChange(e.target.value)}
              style={selectStyle}
            >
              <option value="new">New</option>
              {recurringMovements.map((m) => (
                <option key={m.recurrenceId} value={m.recurrenceId || ""}>
                  {m.description} - {m.category}
                </option>
              ))}
            </select>
          </View>
        </View>

        {/* Repeat */}
        <View style={styles.fieldRow}>
          <ThemedText type="default" style={styles.fieldLabel}>
            Repeat
          </ThemedText>
          <View style={styles.fieldValue}>
            {/* @ts-ignore */}
            <select
              value={recurrenceUnit}
              onChange={(e: any) => onUnitChange(e.target.value)}
              style={selectStyle}
            >
              <option value="D">Daily</option>
              <option value="W">Weekly</option>
              <option value="M">Monthly</option>
              <option value="Y">Yearly</option>
            </select>
          </View>
        </View>

        {/* Every */}
        <View style={styles.fieldRow}>
          <ThemedText type="default" style={styles.fieldLabel}>
            Every
          </ThemedText>
          <View style={styles.fieldValue}>
            {/* @ts-ignore */}
            <select
              value={recurrenceFrequency}
              onChange={(e: any) => onFrequencyChange(Number(e.target.value))}
              style={selectStyle}
            >
              {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </View>
        </View>
        {/* @ts-ignore */}
      </div>
      {/* @ts-ignore */}
    </div>
  );
};

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: "center",
    height: ROW_HEIGHT,
    flex: 1,
  },
  fieldLabel: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 100,
    maxWidth: 140,
  },
  fieldValue: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center" as const,
    marginLeft: "auto" as const,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
});

export default RecurrencePickerWeb;

import { View, StyleSheet, Pressable } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import React, { useRef, useEffect, useState } from 'react';
import { ThemedText } from '@/src/components/core/themed-text';

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

const ROW_HEIGHT = 44;

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
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const accentColor = useThemeColor({ light: '#2F4F3F', dark: '#D6E8DE' }, 'tint');

  // Calculate target height based on visible rows
  let rowCount = 1; // toggle row always visible
  if (isRecurrent) {
    rowCount += 1; // recurrence select
    if (recurrenceSelection === 'new') {
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

  const selectStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'right',
    color: textColor,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  };

  return (
    // @ts-ignore
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: currentHeight,
        transition: 'height 250ms ease-out',
      }}
    >
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        {/* Toggle */}
        <View style={[styles.fieldRow, styles.toggleRow]}>
          <ThemedText type="default" style={styles.fieldLabel}>
            Recurrent
          </ThemedText>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isRecurrent }}
            accessibilityLabel="Recurring movement"
            onPress={onToggle}
            style={[styles.toggle, { backgroundColor: isRecurrent ? accentColor : '#AAB3AE' }]}
          >
            <View
              style={[styles.toggleThumb, { transform: [{ translateX: isRecurrent ? 20 : 2 }] }]}
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
              aria-label="Recurrence"
              value={recurrenceSelection}
              onChange={(e: any) => onSelectionChange(e.target.value)}
              style={selectStyle}
            >
              <option value="new">New</option>
              {recurringMovements.map((m) => (
                <option key={m.recurrenceId} value={m.recurrenceId || ''}>
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
              aria-label="Repeat interval"
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
              aria-label="Repeat frequency"
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
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    minWidth: 100,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  fieldValue: {
    flex: 1,
    minWidth: 0,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    marginLeft: 'auto' as const,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});

export default RecurrencePickerWeb;

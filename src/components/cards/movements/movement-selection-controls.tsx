import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/src/hooks/use-theme-color';

interface MovementSelectionToolbarProps {
  actions: SelectionAction[];
}

export interface SelectionAction {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function MovementSelectionToolbar({ actions }: MovementSelectionToolbarProps) {
  const textColor = useThemeColor({ light: '#2F4F3F', dark: '#DCE8E1' }, 'text');
  const controlBackground = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.07)', dark: 'rgba(214, 232, 222, 0.09)' },
    'menuBackground',
  );
  const controlBorder = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.13)', dark: 'rgba(214, 232, 222, 0.15)' },
    'cardBorder',
  );

  if (!actions.length) return null;

  return (
    <View style={styles.toolbar}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: controlBackground, borderColor: controlBorder },
            action.disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            name={action.icon}
            size={16}
            color={action.destructive ? '#C64040' : textColor}
          />
        </Pressable>
      ))}
    </View>
  );
}

interface MovementSelectionBoxProps {
  selected: boolean;
  onToggle: () => void;
  label: string;
}

export function MovementSelectionBox({ selected, onToggle, label }: MovementSelectionBoxProps) {
  const borderColor = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.28)', dark: 'rgba(214, 232, 222, 0.30)' },
    'cardBorder',
  );
  const accentColor = useThemeColor({ light: '#2F4F3F', dark: '#D6E8DE' }, 'tint');
  const checkColor = useThemeColor({ light: '#FFFFFF', dark: '#183027' }, 'background');

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={({ pressed }) => [styles.selectionHitArea, pressed && styles.pressed]}
    >
      <View
        // @ts-ignore: web-only data attribute used for CSS state transitions.
        dataSet={{ movementSelectionControl: '' }}
        style={[
          styles.checkbox,
          { borderColor },
          selected && { backgroundColor: accentColor, borderColor: accentColor },
        ]}
      >
        {selected ? <MaterialIcons name="check" size={14} color={checkColor} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  control: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionHitArea: {
    width: 30,
    height: 36,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.35,
  },
});

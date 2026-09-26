import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/src/hooks/use-theme-color';
import ContextMenu from './context-menu';

export interface IChipButtonProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
  options?: string[];
  defaultOption?: string;
  onOptionSelect?: (option: string) => void;
  badge?: number;
  minWidth?: number;
}

const ChipButton: React.FC<IChipButtonProps> = ({
  text,
  active = false,
  onPress,
  options,
  defaultOption,
  onOptionSelect,
  badge,
  minWidth,
}) => {
  const [selectedOption, setSelectedOption] = useState(defaultOption || options?.[0] || '');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const surfaceColor = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const activeColor = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const textColor = useThemeColor({ light: '#34443C', dark: '#E7ECE9' }, 'text');
  const activeTextColor = useThemeColor({ light: '#F7FAF8', dark: '#183027' }, 'background');
  const borderColor = useThemeColor(
    { light: 'rgba(36, 68, 55, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );

  useEffect(() => {
    setSelectedOption(defaultOption || options?.[0] || '');
  }, [defaultOption, options]);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    onOptionSelect?.(option);
  };

  const visual = (
    <View
      style={[
        styles.button,
        minWidth ? { minWidth } : null,
        {
          backgroundColor: active ? activeColor : surfaceColor,
          borderColor: active ? activeColor : borderColor,
        },
      ]}
    >
      <Text
        style={[styles.text, { color: active ? activeTextColor : textColor }]}
        numberOfLines={1}
      >
        {selectedOption || text}
      </Text>
    </View>
  );

  const badgeView =
    badge && badge > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : null;

  if (options?.length) {
    return (
      <View
        style={styles.wrapper}
        onLayout={(event) => {
          const nextSize = event.nativeEvent.layout;
          if (nextSize.width !== size.width || nextSize.height !== size.height) {
            setSize({ width: nextSize.width, height: nextSize.height });
          }
        }}
      >
        <View style={styles.measurer}>{visual}</View>
        <View style={StyleSheet.absoluteFill}>
          {size.width > 0 ? (
            <ContextMenu
              options={options}
              selectedOption={selectedOption}
              onSelectOption={handleSelect}
              hostStyle={{ width: size.width, height: size.height }}
              activationMethod="longPress"
            >
              <Pressable
                accessibilityRole="button"
                onPress={onPress}
                style={({ pressed }) => [
                  styles.pressable,
                  { width: size.width, height: size.height },
                  pressed && styles.pressed,
                ]}
              >
                {visual}
              </Pressable>
            </ContextMenu>
          ) : null}
        </View>
        {badgeView}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
      {visual}
      {badgeView}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  pressable: {
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
  measurer: {
    opacity: 0,
  },
  button: {
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B43838',
  },
  badgeText: {
    color: '#FDFDFC',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ChipButton;

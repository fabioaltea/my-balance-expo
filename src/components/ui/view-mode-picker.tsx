import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChipButton from './chip-button';
import React from 'react';
import { useThemeColor } from '@/src/hooks/use-theme-color';

export type ViewMode = 'recent' | 'recurring' | 'unconfirmed';

interface ViewModePickerProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  pendingCount?: number;
  unconfirmedCount?: number;
  fadeOpacity?: Animated.AnimatedInterpolation<number>;
}

const ViewModePicker: React.FC<ViewModePickerProps> = ({
  selectedMode,
  onModeChange,
  pendingCount = 0,
  unconfirmedCount = 0,
  fadeOpacity,
}) => {
  const backgroundColor = useThemeColor({}, 'menuBackground');
  const modes: { label: string; value: ViewMode; badge?: number }[] = [
    { label: 'Recent', value: 'recent' },
    {
      label: 'Recurring',
      value: 'recurring',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Unconfirmed',
      value: 'unconfirmed',
      badge: unconfirmedCount > 0 ? unconfirmedCount : undefined,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {modes.map((mode) => (
        <ChipButton
          key={mode.value}
          text={mode.label}
          active={selectedMode === mode.value}
          onPress={() => onModeChange(mode.value)}
          badge={mode.badge}
        />
      ))}
      <Animated.View
        style={[styles.bottomFade, fadeOpacity != null ? { opacity: fadeOpacity } : undefined]}
        pointerEvents="none"
      >
        <LinearGradient colors={[backgroundColor, backgroundColor + '00']} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    overflow: 'visible' as const,
  },
  bottomFade: {
    position: 'absolute' as const,
    bottom: -20,
    left: 0,
    right: 0,
    height: 20,
  },
});

export default ViewModePicker;

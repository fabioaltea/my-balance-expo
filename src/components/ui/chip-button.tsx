import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import ContextMenu from "./context-menu";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React from "react";
import { usePlatformContext } from "@/src/state";

export interface IChipButtonProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
  options?: string[];
  defaultOption?: string;
  onOptionSelect?: (option: string) => void;
  badge?: number;
}

const ChipButton: React.FC<IChipButtonProps> = ({
  text,
  active,
  onPress,
  options,
  defaultOption,
  onOptionSelect,
  badge,
}) => {
  const { orientation } = usePlatformContext();

  const isLandscape = orientation === "landscape";
  const [selectedOption, setSelectedOption] = useState("");

  // Colori del tema
  const inactiveBackground = useThemeColor(
    { light: "#a8a8a8ff", dark: "#4a4a4a" },
    "tabIconDefault",
  );
  const activeBackground = useThemeColor(
    { light: "#000", dark: "#fff" },
    "text",
  );
  const textColor = useThemeColor(
    { light: "#fff", dark: active ? "#000" : "#fff" },
    "background",
  );

  const dynamicStyles = StyleSheet.create({
    chipButton: {
      ...styles.chipButton,
      backgroundColor: active ? activeBackground : inactiveBackground,
    },
    chipText: {
      ...styles.chipText,
      color: textColor,
      fontSize: isLandscape ? 13 : 18,
    },
  });

  useEffect(() => {
    if (defaultOption) {
      setSelectedOption(defaultOption);
    } else if (options && options.length > 0) {
      setSelectedOption(options[0]);
    }
  }, [options, defaultOption]);

  const handlePress = async () => {
    if (onPress) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("Haptic feedback error:", error);
      }

      onPress();
    }
  };

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    onOptionSelect?.(option);
  };

  const chipContent = (
    <View style={styles.chipWrapper}>
      <View style={dynamicStyles.chipButton}>
        <Text style={dynamicStyles.chipText}>{selectedOption || text}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );

  if (options && options.length > 0) {
    return (
      <Pressable onPress={handlePress}>
        <ContextMenu
          options={options}
          selectedOption={selectedOption}
          onSelectOption={handleSelectOption}
        >
          {chipContent}
        </ContextMenu>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      {chipContent}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chipWrapper: {
    position: "relative",
    flexGrow: 1,
  },
  chipButton: {
    padding: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    display: "flex",
  },
  chipText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -2,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default ChipButton;

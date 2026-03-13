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
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  const chipVisual = (
    <View style={dynamicStyles.chipButton}>
      <Text style={dynamicStyles.chipText}>{selectedOption || text}</Text>
    </View>
  );

  if (options && options.length > 0) {
    return (
      <View
        style={styles.chipWrapper}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== size.width || height !== size.height) {
            setSize({ width, height });
          }
        }}
      >
        {/* Hidden measurer for layout */}
        <View style={{ opacity: 0 }}>
          {chipVisual}
        </View>
        {/* ContextMenu with measured size, Pressable inside for tap */}
        <View style={StyleSheet.absoluteFill}>
          {size.width > 0 && (
            <ContextMenu
              options={options}
              selectedOption={selectedOption}
              onSelectOption={handleSelectOption}
              hostStyle={{ width: size.width, height: size.height }}
              activationMethod="longPress"
            >
              <Pressable
                onPress={handlePress}
                style={{ width: size.width, height: size.height }}
              >
                {chipVisual}
              </Pressable>
            </ContextMenu>
          )}
        </View>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.chipWrapper}>
      {chipVisual}
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chipWrapper: {
    position: "relative",
    flexGrow: 2,
  },
  chipButton: {
    padding: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    display: "flex",
    flexGrow: 1,
  },
  chipText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    wordWrap: "normal",
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

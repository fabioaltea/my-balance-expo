import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useRef } from "react";
import ContextMenu from "./context-menu";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { usePlatformContext } from "@/state";

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>();
  const buttonRef = useRef<View>(null);

  // Colori del tema
  const inactiveBackground = useThemeColor(
    { light: "#a8a8a8ff", dark: "#4a4a4a" },
    "tabIconDefault"
  );
  const activeBackground = useThemeColor(
    { light: "#000", dark: "#fff" },
    "text"
  );
  const textColor = useThemeColor(
    { light: "#fff", dark: active ? "#000" : "#fff" },
    "background"
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
    if (!active) {
      setMenuVisible(false);
    }
  }, [active]);

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

  const handleOpenMenu = async () => {
    // Misura la posizione del button prima di aprire il menu
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setButtonPosition({ x: pageX, y: pageY, width, height });
    });

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error("Haptic feedback error:", error);
    }
    setMenuVisible(!menuVisible);
  };
  const handleDismissMenu = () => {
    setMenuVisible(false);
  };

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    onOptionSelect?.(option);
  };

  return (
    <>
      {menuVisible && buttonPosition && (
        <ContextMenu
          options={options || []}
          selectedOption={selectedOption}
          onSelectOption={handleSelectOption}
          onDismiss={handleDismissMenu}
          buttonPosition={buttonPosition}
        />
      )}
      <View style={styles.chipWrapper}>
        <Pressable
          ref={buttonRef}
          onLongPress={handleOpenMenu}
          onPress={handlePress}
          style={dynamicStyles.chipButton}
        >
          <Text style={dynamicStyles.chipText}>{selectedOption || text}</Text>
        </Pressable>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </>
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
  menu: {
    height: 200,
    width: 150,
    backgroundColor: "#edededee",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 400,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
  },
  menuItem: {
    padding: 5,
    borderRadius: 20,
  },
  menuItemSelected: {},
});

export default ChipButton;

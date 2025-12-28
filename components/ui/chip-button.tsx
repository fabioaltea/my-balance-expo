import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useRef } from "react";
import ContextMenu from "./context-menu";
import { useThemeColor } from "@/hooks/use-theme-color";

export interface IChipButtonProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
  options?: string[];
}

const ChipButton: React.FC<IChipButtonProps> = ({
  text,
  active,
  onPress,
  options,
}) => {
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
    },
  });

  useEffect(() => {
    if (!active) {
      setMenuVisible(false);
    }
  }, [active]);

  useEffect(() => {
    if (options && options.length > 0) {
      setSelectedOption(options[0]);
    }
  }, [options]);

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
      <Pressable
        ref={buttonRef}
        onLongPress={handleOpenMenu}
        onPress={handlePress}
        style={dynamicStyles.chipButton}
      >
        <Text style={dynamicStyles.chipText}>{selectedOption || text}</Text>
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
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

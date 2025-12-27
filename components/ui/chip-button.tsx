import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import ContextMenu from "./context-menu";

export interface IChipButtonProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
  options?: string[];
}

const ChipButton: React.FC<IChipButtonProps> = ({text, active, onPress, options}) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedOption, setSelectedOption] = useState("");

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
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
          console.error("Haptic feedback error:", error);
        }
        setMenuVisible(!menuVisible);
      }
        const handleDismissMenu = () => {
        setMenuVisible(false);
      }

      const handleSelectOption = (option: string) => {
        setSelectedOption(option);
        handleDismissMenu();
      }

  return (
    <>
      {menuVisible && (
        <ContextMenu options={options || []} selectedOption={selectedOption} onSelectOption={handleSelectOption}/>
      )}
      <Pressable
        onLongPress={handleOpenMenu}
        onPress={handlePress}
        style={[styles.chipButton, active ? styles.active : {}]}
      >
        <Text style={styles.chipText}>{selectedOption || text}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  chipButton: {
    padding: 8,
    paddingHorizontal: 20,
    backgroundColor: "#a8a8a8ff",
    borderRadius: 20,
  },
  active: {
    backgroundColor: "#000",
  },
  chipText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  menu: {
    height: 200,
    width: 150,
    backgroundColor: "#edededee",
    position: "absolute",
    top: 40,
    left: 0,
    zIndex: 400,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
  },
  menuItem: {
    padding:5,
    borderRadius: 20,
  },
  menuItemSelected:{

  }
});

export default ChipButton;
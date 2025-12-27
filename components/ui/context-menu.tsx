import { Pressable, ScrollView, View, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useThemeColor } from "@/hooks/use-theme-color";

export interface IContextMenuProps {
  options: string[];
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

const ContextMenu: React.FC<IContextMenuProps> = ({options, selectedOption, onSelectOption}) => {
  // Colori del tema per il context menu
  const menuBackground = useThemeColor({ light: "#edededee", dark: "#2a2a2a" }, "cardBackground");
  const borderColor = useThemeColor({ light: "#ccc", dark: "#555" }, "border");
  const textColor = useThemeColor({}, "text");
  const selectedBackground = useThemeColor({ light: "#ccc", dark: "#444" }, "tabIconDefault");

  const dynamicStyles = StyleSheet.create({
    menu: {
      ...styles.menu,
      backgroundColor: menuBackground,
      borderColor: borderColor,
    },
    menuItem: {
      ...styles.menuItem,
      color: textColor,
    },
  });

  const handleSelect=(option: string) => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Haptic feedback error:", error);
    }
    onSelectOption(option);
  }
  
    return (
    <View style={dynamicStyles.menu}>
                <ScrollView>
                    {options?.map((option)=>(
                        <Pressable style={styles.menuItem} key={option} onPress={() => handleSelect(option)}>
                            <Text style={{...dynamicStyles.menuItem, backgroundColor: selectedOption === option ? selectedBackground : "transparent"}}>{option}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
              
            </View>);
}

const styles = StyleSheet.create({
  menu: {
    height: 200,
    width: 150,
    position: "absolute",
    top: 40,
    left: 0,
    zIndex: 400,
    borderWidth: 1,
    borderRadius: 20,
  },
  menuItem: {
    padding: 10,
    fontSize: 16,
    borderRadius: 15,
  },
});

export default ContextMenu;
import { Pressable, ScrollView, View, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useState } from "react";

export interface IContextMenuProps {
  options: string[];
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

const ContextMenu: React.FC<IContextMenuProps> = ({options, selectedOption, onSelectOption}) => {
  const handleSelect=(option: string) => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Haptic feedback error:", error);
    }
    onSelectOption(option);
  }
  
    return (
    <View style={styles.menu}>
                <ScrollView>
                    {options?.map((option)=>(
                        <Pressable style={styles.menuItem} key={option} onPress={() => handleSelect(option)}>
                            <Text style={{...styles.menuItem, backgroundColor: selectedOption === option ? "#ccc" : "transparent"}}>{option}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
              
            </View>);
}

const styles = StyleSheet.create({
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
    padding: 10,
    fontSize: 16,
    borderRadius: 15,
  },
});

export default ContextMenu;
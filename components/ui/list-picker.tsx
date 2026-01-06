import { ThemedText } from "../themed-text";
import { View, StyleSheet, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import { IconSymbol } from "./icon-symbol.ios";
import * as Haptics from "expo-haptics";
import ModalPanel from "./modal-panel";
import React from "react";

export interface IListPickerItem {
  label: string;
  value: string;
}

interface IListPickerProps {
  value: string;
  onChange: (value: string) => void;
  items: IListPickerItem[];
  label?: string;
  placeholder?: string;
  title?: string;
  iconName?: string;
}

const ListPicker: React.FC<IListPickerProps> = ({
  value,
  onChange,
  items,
  label,
  placeholder = "Select...",
  title = "Select an option",
  iconName = "chevron.down",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Theme colors
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault"
  );

  const getDisplayValue = () => {
    const selectedItem = items.find((item) => item.value === value);
    return selectedItem ? selectedItem.label : placeholder;
  };

  const showModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempValue(value);
    setIsVisible(true);
  };

  const hideModal = () => {
    setIsVisible(false);
  };

  const confirmSelection = () => {
    onChange(tempValue);
  };

  const isPlaceholder = !items.find((item) => item.value === value);

  return (
    <>
      <Pressable onPress={showModal} style={styles.container}>
        {label && (
          <ThemedText type="default" style={styles.label}>
            {label}
          </ThemedText>
        )}
        <View style={styles.inputContainer}>
          <ThemedText
            style={[
              styles.valueText,
              {
                color: isPlaceholder ? placeholderColor : textColor,
              },
            ]}
          >
            {getDisplayValue()}
          </ThemedText>
          
        </View>
      </Pressable>

      <ModalPanel
        isVisible={isVisible}
        onClose={hideModal}
        onConfirm={confirmSelection}
        title={title}
        showConfirmButton={true}
        showCancelButton={true}
      >
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={tempValue}
            onValueChange={(itemValue) => setTempValue(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {items.map((item) => (
              <Picker.Item
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </Picker>
        </View>
      </ModalPanel>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: "center",
    flex: 1,
  },
  label: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 80,
    maxWidth: 120,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  valueText: {
    fontSize: 18,
    textAlign: "right",
    flex: 1,
  },
  icon: {
    marginLeft: 8,
  },
  pickerContainer: {
    alignItems: "center",
    minHeight: 200,
  },
  picker: {
    width: "100%",
    height: 200,
  },
  pickerItem: {
    fontSize: 18,
    height: 200,
  },
});

export default ListPicker;

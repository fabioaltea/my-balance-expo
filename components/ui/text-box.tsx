import { ThemedText } from "../core/themed-text";
import { View, StyleSheet, TextInput } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
interface ITextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  placeholder?:string;
}

const TextBox: React.FC<ITextBoxProps> = ({ value, onChange, label, placeholder }) => {
  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[styles.textInput, { color: useThemeColor({ light: "#000", dark: "#fff" }, "text") }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ""}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
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
    minWidth: 120,
    maxWidth: 200,
  },
  textInput: {
    display: "flex",
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0, // Prevents text from overflowing
    outlineColor:"transparent"
  },
});

export default TextBox;

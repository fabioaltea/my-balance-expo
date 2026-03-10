import { ThemedText } from "../core/themed-text.native";
import { View, StyleSheet, TextInput, Text } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React from "react";
interface ITextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const TextBox: React.FC<ITextBoxProps> = ({
  value,
  onChange,
  label,
  placeholder,
  onFocus,
  onBlur,
}) => {
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#aaa", dark: "#666" },
    "tabIconDefault",
  );

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[styles.textInput, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ""}
        placeholderTextColor={placeholderColor}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: "center",
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
    outlineColor: "transparent",
  },
});

export default TextBox;

import { ThemedText } from "../themed-text";
import { View, StyleSheet, TextInput } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
interface ITextBoxProps {
  value: string;
  onChange: (text: string) => void;
  label?: string;
}

const TextBox: React.FC<ITextBoxProps> = ({ value, onChange, label }) => {
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
    minWidth: 80,
    maxWidth: 120,
  },
  textInput: {
    display: "flex",
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0, // Prevents text from overflowing
  },
});

export default TextBox;

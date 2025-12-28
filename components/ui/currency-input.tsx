import { View, StyleSheet, Pressable, Text } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "./icon-symbol.ios";
import * as Haptics from "expo-haptics";

interface ICurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
}

const CurrencyInput: React.FC<ICurrencyInputProps> = ({ value, onChange }) => {
  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "transparent", dark: "transparent" },
    "tabIconDefault"
  );
  const buttonColor = useThemeColor(
    { light: "#fff", dark: "#3a3a3a" },
    "background"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "tabIconDefault"
  );

  const handleNumberPress = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (digit === ",") {
      // Handle comma - move to decimal editing
      const currentString = value.toFixed(2);
      const [integerPart] = currentString.split(".");
      // For comma functionality, we could implement decimal cursor positioning
      return;
    }

    if (digit === "backspace") {
      const currentCents = Math.round(value * 100);
      const newCents = Math.floor(currentCents / 10);
      onChange(newCents / 100);
      return;
    }

    // Handle numeric input
    const currentCents = Math.round(value * 100);
    const newCents = currentCents * 10 + parseInt(digit);

    // Limit to reasonable amount (999,999.99)
    if (newCents <= 99999999) {
      onChange(newCents / 100);
    }
  };

  const KeypadButton = ({
    children,
    onPress,
    style,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    style?: any;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.keypadButton,
        { backgroundColor: buttonColor, borderColor },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.keypadText, { color: textColor }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.keypadGrid}>
        {/* Row 1 */}
        <KeypadButton onPress={() => handleNumberPress("1")}>1</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("2")}>2</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("3")}>3</KeypadButton>

        {/* Row 2 */}
        <KeypadButton onPress={() => handleNumberPress("4")}>4</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("5")}>5</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("6")}>6</KeypadButton>

        {/* Row 3 */}
        <KeypadButton onPress={() => handleNumberPress("7")}>7</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("8")}>8</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("9")}>9</KeypadButton>

        {/* Row 4 */}
        <KeypadButton onPress={() => handleNumberPress(",")}>
          <Text style={[styles.keypadText, { color: textColor }]}>,</Text>
        </KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("0")}>0</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress("backspace")}>
          <IconSymbol name="delete.left" size={24} color={textColor} />
        </KeypadButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  keypadButton: {
    width: "30%",
    aspectRatio: 1.5,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  keypadText: {
    fontSize: 24,
    fontWeight: "600",
  },
});

export default CurrencyInput;

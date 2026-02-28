import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/core/themed-text";

interface IInlineCurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholderColor?: string;
}

const InlineCurrencyInput: React.FC<IInlineCurrencyInputProps> = ({
  value,
  onChange,
  placeholderColor: phColor,
}) => {
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = phColor || useThemeColor(
    { light: "#aaa", dark: "#666" },
    "tabIconDefault"
  );

  const [integerPart, setIntegerPart] = useState("0");
  const [decimalPart, setDecimalPart] = useState("00");
  const [typingDecimal, setTypingDecimal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalUpdate = useRef(false);

  // Blinker animation
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isFocused) {
      blinkAnim.setValue(0);
      return;
    }
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [isFocused, typingDecimal]);

  // Sync from parent value
  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    const int = Math.floor(value).toString();
    const dec = Math.round((value % 1) * 100).toString().padStart(2, "0");
    setIntegerPart(int);
    setDecimalPart(dec);
  }, [value]);

  // Notify parent of changes
  const notifyChange = useCallback((int: string, dec: string) => {
    internalUpdate.current = true;
    const newValue = parseInt(int || "0") + parseInt(dec || "0") / 100;
    onChange(newValue);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    if (
      key === "," || key === "." ||
      (key >= "0" && key <= "9") ||
      key === "Backspace" ||
      key === "Delete"
    ) {
      e.preventDefault();
    } else {
      return;
    }

    if (key === "," || key === ".") {
      setTypingDecimal((prev) => !prev);
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      if (typingDecimal) {
        const newDec = "0" + decimalPart[0];
        setDecimalPart(newDec);
        notifyChange(integerPart, newDec);
      } else {
        const newInt = integerPart.length > 1
          ? integerPart.slice(0, -1)
          : "0";
        setIntegerPart(newInt);
        notifyChange(newInt, decimalPart);
      }
      return;
    }

    if (key >= "0" && key <= "9") {
      if (!typingDecimal) {
        let newInt: string;
        if (integerPart === "0") {
          newInt = key === "0" ? "0" : key;
        } else if (integerPart.length < 7) {
          newInt = integerPart + key;
        } else {
          return;
        }
        setIntegerPart(newInt);
        notifyChange(newInt, decimalPart);
      } else {
        let newDec: string;
        if (decimalPart === "00") {
          newDec = "0" + key;
        } else {
          newDec = decimalPart[1] + key;
        }
        setDecimalPart(newDec);
        notifyChange(integerPart, newDec);
      }
    }
  };

  const isEmpty = integerPart === "0" && decimalPart === "00";

  return (
    <View style={styles.container}>
      {/* Hidden input to capture keyboard events */}
      {/* @ts-ignore — HTML input for web */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value=""
        onKeyDown={handleKeyDown as any}
        onChange={() => {}}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: "absolute" as any,
          opacity: 0,
          width: 1,
          height: 1,
          border: "none",
          outline: "none",
          padding: 0,
          margin: 0,
        }}
      />
      {/* Visible display */}
      <View
        style={styles.display}
        // @ts-ignore — web onClick
        onClick={() => inputRef.current?.focus()}
      >
        <ThemedText style={[
          styles.text,
          { color: isEmpty && !isFocused ? placeholderColor : textColor },
          !typingDecimal && isFocused && styles.activeText,
        ]}>
          {integerPart}
        </ThemedText>
        {/* Blinker after integer part */}
        {isFocused && !typingDecimal && (
          <Animated.View style={[styles.blinker, { opacity: blinkAnim }]} />
        )}
        <ThemedText style={[
          styles.comma,
          { color: isEmpty && !isFocused ? placeholderColor : textColor },
        ]}>
          ,
        </ThemedText>
        <ThemedText style={[
          styles.text,
          { color: isEmpty && !isFocused ? placeholderColor : textColor },
          typingDecimal && isFocused && styles.activeText,
        ]}>
          {decimalPart}
        </ThemedText>
        {/* Blinker after decimal part */}
        {isFocused && typingDecimal && (
          <Animated.View style={[styles.blinker, { opacity: blinkAnim }]} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  display: {
    flexDirection: "row",
    alignItems: "center",
    cursor: "text",
    paddingVertical: 4,
    paddingHorizontal: 4,
  } as any,
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
  activeText: {},
  comma: {
    fontSize: 15,
    fontWeight: "600",
  },
  blinker: {
    width: 1.5,
    height: 16,
    backgroundColor: "#2F4F3F",
    marginLeft: 1,
  },
});

export default InlineCurrencyInput;

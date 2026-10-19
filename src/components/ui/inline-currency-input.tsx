import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { ThemedText } from '@/src/components/core/themed-text';

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
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const defaultPlaceholderColor = useThemeColor(
    { light: '#77847D', dark: '#929C97' },
    'tabIconDefault',
  );
  const placeholderColor = phColor || defaultPlaceholderColor;
  const hoverColor = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const cursorColor = useThemeColor({ light: '#2F4F3F', dark: '#D6E8DE' }, 'tint');

  const [integerPart, setIntegerPart] = useState('0');
  const [decimalPart, setDecimalPart] = useState('00');
  const [typingDecimal, setTypingDecimal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalUpdate = useRef(false);

  // Blinker animation
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isFocused) {
      blinkAnim.setValue(0);
      return;
    }
    blinkAnim.setValue(1);
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
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim, isFocused]);

  // Sync from parent value
  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    const int = Math.floor(value).toString();
    const dec = Math.round((value % 1) * 100)
      .toString()
      .padStart(2, '0');
    setIntegerPart(int);
    setDecimalPart(dec);
  }, [value]);

  // Notify parent of changes
  const notifyChange = useCallback(
    (int: string, dec: string) => {
      internalUpdate.current = true;
      const newValue = parseInt(int || '0') + parseInt(dec || '0') / 100;
      onChange(newValue);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    if (
      key === ',' ||
      key === '.' ||
      (key >= '0' && key <= '9') ||
      key === 'Backspace' ||
      key === 'Delete'
    ) {
      e.preventDefault();
    } else {
      return;
    }

    if (key === ',' || key === '.') {
      setTypingDecimal((prev) => !prev);
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      if (typingDecimal) {
        const newDec = '0' + decimalPart[0];
        setDecimalPart(newDec);
        notifyChange(integerPart, newDec);
      } else {
        const newInt = integerPart.length > 1 ? integerPart.slice(0, -1) : '0';
        setIntegerPart(newInt);
        notifyChange(newInt, decimalPart);
      }
      return;
    }

    if (key >= '0' && key <= '9') {
      if (!typingDecimal) {
        let newInt: string;
        if (integerPart === '0') {
          newInt = key === '0' ? '0' : key;
        } else if (integerPart.length < 7) {
          newInt = integerPart + key;
        } else {
          return;
        }
        setIntegerPart(newInt);
        notifyChange(newInt, decimalPart);
      } else {
        let newDec: string;
        if (decimalPart === '00') {
          newDec = '0' + key;
        } else {
          newDec = decimalPart[1] + key;
        }
        setDecimalPart(newDec);
        notifyChange(integerPart, newDec);
      }
    }
  };

  const isEmpty = integerPart === '0' && decimalPart === '00';

  return (
    <View style={styles.container}>
      {/* Hidden input to capture keyboard events */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        aria-label="Amount in euros"
        value=""
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
        }}
      />
      {/* Visible display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'text',
          minHeight: 36,
          boxSizing: 'border-box',
          padding: '8px 10px',
          borderRadius: 10,
          backgroundColor: isHovered || isFocused ? hoverColor : 'transparent',
        }}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onPointerDown={(event) => {
          event.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
        aria-hidden
      >
        <View style={styles.segment} onPointerDown={() => setTypingDecimal(false)}>
          <ThemedText
            style={[styles.text, { color: isEmpty && !isFocused ? placeholderColor : textColor }]}
          >
            {integerPart}
          </ThemedText>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blinker,
              {
                backgroundColor: cursorColor,
                opacity: isFocused && !typingDecimal ? blinkAnim : 0,
              },
            ]}
          />
        </View>
        <View onPointerDown={() => setTypingDecimal(true)}>
          <ThemedText
            style={[styles.text, { color: isEmpty && !isFocused ? placeholderColor : textColor }]}
          >
            ,
          </ThemedText>
        </View>
        <View style={styles.segment} onPointerDown={() => setTypingDecimal(true)}>
          <ThemedText
            style={[styles.text, { color: isEmpty && !isFocused ? placeholderColor : textColor }]}
          >
            {decimalPart}
          </ThemedText>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blinker,
              { backgroundColor: cursorColor, opacity: isFocused && typingDecimal ? blinkAnim : 0 },
            ]}
          />
        </View>
        <ThemedText
          style={[styles.currencySymbol, { color: isEmpty ? placeholderColor : textColor }]}
        >
          €
        </ThemedText>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  segment: {
    position: 'relative',
    paddingRight: 3,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
    userSelect: 'none',
  },
  currencySymbol: {
    width: 18,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    userSelect: 'none',
  },
  blinker: {
    position: 'absolute',
    right: 0,
    top: 2,
    width: 1.5,
    height: 16,
  },
});

export default InlineCurrencyInput;

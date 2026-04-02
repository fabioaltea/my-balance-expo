import { View, StyleSheet, Pressable, Text, Animated } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import React, { useState, useEffect, useRef } from 'react';
import IconSymbol from './icon-symbol';

interface ICurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onConfirm?: () => void;
  showConfirmButton?: boolean;
}

const CurrencyInput: React.FC<ICurrencyInputProps> = ({
  value,
  onChange,
  onConfirm,
  showConfirmButton = false,
}) => {
  // Parse initial value into integer and decimal parts
  const initialInt = Math.floor(value).toString();
  const initialDec = Math.round((value % 1) * 100)
    .toString()
    .padStart(2, '0');

  const [integerPart, setIntegerPart] = useState(initialInt);
  const [decimalPart, setDecimalPart] = useState(initialDec);
  const [typingDecimal, setTypingDecimal] = useState(false);

  // Blinker animations - separate for integer and decimal
  const integerBlinkAnim = useRef(new Animated.Value(1)).current;
  const decimalBlinkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const integerBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(integerBlinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(integerBlinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    const decimalBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(decimalBlinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(decimalBlinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    if (typingDecimal) {
      integerBlinkAnim.setValue(0);
      integerBlink.stop();
      decimalBlink.start();
    } else {
      decimalBlinkAnim.setValue(0);
      decimalBlink.stop();
      integerBlink.start();
    }

    return () => {
      integerBlink.stop();
      decimalBlink.stop();
    };
  }, [typingDecimal]);

  // Sync with parent value when it changes externally
  useEffect(() => {
    const newInt = Math.floor(value).toString();
    const newDec = Math.round((value % 1) * 100)
      .toString()
      .padStart(2, '0');
    setIntegerPart(newInt);
    setDecimalPart(newDec);
  }, [value]);

  // Update parent when internal state changes
  useEffect(() => {
    const newValue = parseInt(integerPart || '0') + parseInt(decimalPart || '0') / 100;
    onChange(newValue);
  }, [integerPart, decimalPart]);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: 'transparent', dark: 'transparent' },
    'tabIconDefault',
  );
  const buttonColor = useThemeColor({ light: '#fff', dark: '#3a3a3a' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#404040' }, 'tabIconDefault');
  const activeColor = '#2F4F3F';

  const handleNumberPress = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!typingDecimal) {
      // Typing integer part
      if (parseInt(integerPart) > 0) {
        // Limit to reasonable amount
        if (integerPart.length < 7) {
          setIntegerPart(integerPart + digit);
        }
      } else {
        setIntegerPart(digit);
      }
    } else {
      // Typing decimal part (max 2 digits, shift left)
      if (parseInt(decimalPart) > 0) {
        if (parseInt(decimalPart) < 10) {
          // First decimal digit entered, shift and add new
          const unitChar = decimalPart[1];
          setDecimalPart(unitChar + digit);
        } else {
          // Both digits filled, shift left
          const decChar = decimalPart[0];
          setDecimalPart(decChar + digit);
        }
      } else {
        setDecimalPart('0' + digit);
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (typingDecimal) {
      const firstChar = decimalPart[0];
      const secondChar = decimalPart[1];
      if (secondChar === '0') {
        setDecimalPart('00');
      } else {
        setDecimalPart(firstChar + '0');
      }
    } else {
      const newVal = integerPart.substring(0, integerPart.length - 1);
      setIntegerPart(newVal.length > 0 ? newVal : '0');
    }
  };

  const handleCommaPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTypingDecimal(true);
  };

  const handleBackToInteger = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTypingDecimal(false);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm?.();
  };

  const KeypadButton = ({
    children,
    onPress,
    style,
    isActive,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    style?: any;
    isActive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.keypadButton,
        {
          backgroundColor: isActive ? activeColor : buttonColor,
          borderColor,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.keypadText, { color: isActive ? '#fff' : textColor }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Value Display with Blinker */}
      <View style={styles.valueDisplay}>
        <Text style={[styles.currencySymbol, { color: textColor }]}>€</Text>
        <Pressable onPress={handleBackToInteger}>
          <View style={styles.valueSection}>
            <Text style={[styles.valueText, { color: textColor }]}>{integerPart}</Text>
            <Animated.View style={[styles.blinker, { opacity: integerBlinkAnim }]} />
          </View>
        </Pressable>
        <Text style={[styles.comma, { color: textColor }]}>,</Text>
        <Pressable onPress={handleCommaPress}>
          <View style={styles.valueSection}>
            <View>
              <Text style={[styles.valueText, styles.decimalText, { color: textColor }]}>
                {decimalPart}
              </Text>
            </View>
            <Animated.View style={[styles.blinker, { opacity: decimalBlinkAnim }]} />
          </View>
        </Pressable>
      </View>

      {/* Keypad */}
      <View style={styles.keypadGrid}>
        {/* Row 1 */}
        <KeypadButton onPress={() => handleNumberPress('1')}>1</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('2')}>2</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('3')}>3</KeypadButton>

        {/* Row 2 */}
        <KeypadButton onPress={() => handleNumberPress('4')}>4</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('5')}>5</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('6')}>6</KeypadButton>

        {/* Row 3 */}
        <KeypadButton onPress={() => handleNumberPress('7')}>7</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('8')}>8</KeypadButton>
        <KeypadButton onPress={() => handleNumberPress('9')}>9</KeypadButton>

        {/* Row 4 */}
        {!typingDecimal ? (
          <KeypadButton onPress={handleCommaPress}>
            <Text style={[styles.keypadText, { color: textColor }]}>,</Text>
          </KeypadButton>
        ) : (
          <KeypadButton onPress={handleBackToInteger} isActive>
            <IconSymbol name="chevron-left" size={24} color="#fff" />
          </KeypadButton>
        )}
        <KeypadButton onPress={() => handleNumberPress('0')}>0</KeypadButton>
        <KeypadButton onPress={handleBackspace}>
          <IconSymbol name="backspace" size={24} color={textColor} />
        </KeypadButton>
      </View>

      {/* Confirm Button */}
      {showConfirmButton && (
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Conferma</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: 30,
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    marginRight: 4,
  },
  valueSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
  },
  valueTextActive: {
    color: '#2F4F3F',
  },
  decimalText: {
    fontSize: 28,
  },
  comma: {
    fontSize: 36,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  blinker: {
    width: 2,
    height: 36,
    backgroundColor: '#2F4F3F',
    marginLeft: 2,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.5,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
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
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#2F4F3F',
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CurrencyInput;

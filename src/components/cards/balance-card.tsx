import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated } from 'react-native';
import Card from '@/src/components/core/card';
import type { Account } from '@/src/state';
import { useDataContext } from '../../state/DataProvider';
import IconSymbol from '@/src/components/ui/icon-symbol';

const DIGIT_HEIGHT = 36;
const DIGIT_WIDTH = 24;
const ROLL_ROWS = 50;
const START_VALUE = 10457; // €10,457

const DigitRoller: React.FC<{ digit: number; color: string }> = ({ digit, color }) => {
  const posRef = useRef(10 + digit);
  const ty = useRef(new Animated.Value(-(10 + digit) * DIGIT_HEIGHT)).current;
  const prevRef = useRef(digit);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === digit) return;
    let steps = digit - prev;
    if (steps < 0) steps += 10;
    posRef.current += steps;
    prevRef.current = digit;
    Animated.timing(ty, {
      toValue: -posRef.current * DIGIT_HEIGHT,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [digit]);

  return (
    <View style={styles.digitContainer}>
      <Animated.View style={{ transform: [{ translateY: ty }] }}>
        {Array.from({ length: ROLL_ROWS }, (_, i) => (
          <Text key={i} style={[styles.digitText, { color }]}>
            {i % 10}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

const extractDigits = (value: number): number[] => {
  const str = String(Math.max(0, value)).padStart(5, '0').slice(-5);
  return str.split('').map(Number);
};

interface IBalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<IBalanceCardProps> = ({ account }) => {
  const { isLoading } = useDataContext();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [counter, setCounter] = useState(START_VALUE);
  const counterRef = useRef(START_VALUE);

  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => {
      counterRef.current += 1;
      setCounter(counterRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [isLoading]);

  const renderBalanceContent = () => {
    if (isLoading) {
      const color = account?.textColor || '#FFFFFF';
      const digits = extractDigits(counter);
      return (
        <View style={styles.odometerRow}>
          <Text style={[styles.odometerSymbol, { color }]}>{'€ '}</Text>
          {digits.slice(0, 5).map((d, i) => (
            <DigitRoller key={`i${i}`} digit={d} color={color} />
          ))}
          <Text style={[styles.odometerSymbol, { color }]}>,00</Text>
        </View>
      );
    }

    return (
      <Text style={[styles.balanceAmount, { color: account?.textColor || '#FFFFFF' }]}>
        {isBalanceVisible
          ? `€ ${account?.balance.toFixed(2).replace('.', ',') ?? ''}`
          : '€ *****,**'}
      </Text>
    );
  };

  return (
    <Card backgroundColor={account?.color || '#2F4F3F'} color={account?.textColor || '#FFFFFF'}>
      <View style={styles.balanceContent}>
        {renderBalanceContent()}
        <TouchableOpacity
          onPress={() => setIsBalanceVisible(!isBalanceVisible)}
          disabled={isLoading}
        >
          <IconSymbol
            name={isBalanceVisible ? 'remove-red-eye' : 'visibility-off'}
            size={24}
            color={account?.textColor || '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    minHeight: 36,
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
    overflow: 'hidden',
  },
  odometerSymbol: {
    fontSize: DIGIT_HEIGHT,
    fontWeight: 'bold',
    lineHeight: DIGIT_HEIGHT,
    includeFontPadding: false,
  },
  digitContainer: {
    height: DIGIT_HEIGHT,
    width: DIGIT_WIDTH,
    overflow: 'hidden',
  },
  digitText: {
    height: DIGIT_HEIGHT,
    lineHeight: DIGIT_HEIGHT,
    fontSize: DIGIT_HEIGHT,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    flex: 1,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    marginRight: 16,
  },
});

export default BalanceCard;

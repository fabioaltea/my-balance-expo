import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import Card from '@/src/components/core/card';
import type { Account } from '@/src/state';
import { useDataContext } from '../../state/DataProvider';
import IconSymbol from '@/src/components/ui/icon-symbol';
import AnimatedNumbers from 'react-native-animated-numbers';

interface IBalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<IBalanceCardProps> = ({ account }) => {
  const { isLoading } = useDataContext();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [animateToNumber, setAnimateToNumber] = useState(1000);
  const textColor = account?.textColor || '#FFFFFF';

  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => setAnimateToNumber((value) => value + 1999), 100);
    return () => clearInterval(id);
  }, [isLoading]);

  const formattedBalance = (account?.balance ?? 0).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Card backgroundColor={account?.color || '#2F4F3F'} color={textColor} style={styles.card}>
      <View style={styles.balanceContent}>
        {isLoading ? (
          <View style={styles.odometerRow}>
            <Text style={[styles.odometerCurrency, { color: textColor }]}>€</Text>
            <AnimatedNumbers
              includeComma
              animateToNumber={animateToNumber}
              animationDuration={100}
              fontStyle={{ fontSize: 32, fontWeight: '700', color: textColor }}
            />
          </View>
        ) : (
          <Text
            style={[styles.balanceAmount, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isBalanceVisible ? formattedBalance : '€ ••••••'}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => setIsBalanceVisible((visible) => !visible)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={isBalanceVisible ? 'Hide balance' : 'Show balance'}
          style={styles.visibilityButton}
        >
          <IconSymbol
            name={isBalanceVisible ? 'remove-red-eye' : 'visibility-off'}
            size={18}
            color={textColor}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1 },
  balanceContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: 10,
  },
  odometerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  odometerCurrency: { fontSize: 32, lineHeight: 40, fontWeight: '700', marginRight: 4 },
  balanceAmount: {
    flex: 1,
    minWidth: 0,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  visibilityButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
});

export default BalanceCard;

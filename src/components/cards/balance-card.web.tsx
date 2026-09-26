import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '@/src/components/core/card';
import Skeleton from '@/src/components/ui/skeleton';
import { useDataContext } from '@/src/state/DataProvider';
import type { Account } from '@/src/state';

interface BalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ account }) => {
  const { isLoading } = useDataContext();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const textColor = account?.textColor || '#F7FAF8';
  const balance = account?.balance ?? 0;
  const formattedBalance = balance.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Card backgroundColor={account?.color || '#2F4F3F'} color={textColor}>
      <Text style={[styles.accountName, { color: textColor }]} numberOfLines={1}>
        {account?.name === 'All' ? 'All accounts' : account?.name || 'Balance'}
      </Text>
      <View style={styles.amountRow}>
        {isLoading ? (
          <View style={styles.amountPlaceholder}>
            <Skeleton
              width="68%"
              height={35}
              borderRadius={6}
              style={{ backgroundColor: textColor, opacity: 0.28 }}
            />
          </View>
        ) : (
          <Text
            style={[styles.amount, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isBalanceVisible ? formattedBalance : '€ ••••••'}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isBalanceVisible ? 'Hide balance' : 'Show balance'}
          onPress={() => setIsBalanceVisible((visible) => !visible)}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.visibilityButton,
            pressed && styles.visibilityButtonPressed,
          ]}
        >
          <MaterialIcons
            name={isBalanceVisible ? 'visibility' : 'visibility-off'}
            size={18}
            color={textColor}
          />
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  amountPlaceholder: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  amount: {
    flex: 1,
    minWidth: 0,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  visibilityButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  visibilityButtonPressed: {
    opacity: 0.76,
    transform: [{ translateY: 1 }],
  },
});

export default BalanceCard;

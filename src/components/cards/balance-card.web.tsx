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
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={[styles.accountName, { color: textColor }]} numberOfLines={1}>
            {account?.name === 'All' ? 'All accounts' : account?.name || 'Balance'}
          </Text>
          <Text style={[styles.label, { color: textColor }]}>Available balance</Text>
        </View>
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

      {isLoading ? (
        <Skeleton
          width="68%"
          height={35}
          borderRadius={6}
          style={{ marginTop: 14, backgroundColor: textColor, opacity: 0.28 }}
        />
      ) : (
        <Text style={[styles.amount, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {isBalanceVisible ? formattedBalance : '€ ••••••'}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.72,
  },
  amount: {
    marginTop: 14,
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

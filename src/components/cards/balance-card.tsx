import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated } from 'react-native';
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

  const [animateToNumber, setAnimateToNumber] = React.useState(1000);

  const increase = () => {
    setAnimateToNumber(animateToNumber + 1999);
  };

  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => {
      increase();
    }, 100);
    return () => clearInterval(id);
  }, [isLoading]);

  const renderBalanceContent = () => {
    if (isLoading) {
      return (
        <View style={styles.odometerRow}>
          <Text
            style={{ fontSize: 36, fontWeight: 'bold', color: account?.textColor || '#FFFFFF' }}
          >
            {'€'}
          </Text>
          <AnimatedNumbers
            includeComma
            animateToNumber={animateToNumber}
            animationDuration={100}
            fontStyle={{ fontSize: 36, fontWeight: 'bold', color: account?.textColor || '#FFFFFF' }}
          />
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
          onPress={() => {
            setIsBalanceVisible(!isBalanceVisible);
            increase();
          }}
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

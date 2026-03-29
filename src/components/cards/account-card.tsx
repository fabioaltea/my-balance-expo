import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '../core/themed-text.native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { Account } from '@/src/state';
import * as Haptics from 'expo-haptics';
import IconSymbol from '@/src/components/ui/icon-symbol';

interface IAccountCardProps {
  account: Account;
  onPress?: (account: Account) => void;
}

const AccountCard: React.FC<IAccountCardProps> = ({ account, onPress }) => {
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');

  const formatBalance = (amount: number) => {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(account);
    }
  };

  const getTransactionText = (count: number = 0) => {
    if (count === 0) return 'No transactions';
    if (count === 1) return '1 transaction';
    return `${count} transactions`;
  };

  return (
    <Pressable onPress={handlePress} style={[styles.container, { borderColor }]}>
      {/* Account Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.colorIndicator,
            {
              backgroundColor: account.color,
              borderColor: account.color === '#ffffff' ? borderColor : 'transparent',
              borderWidth: account.color === '#ffffff' ? 1 : 0,
            },
          ]}
        />
        <View style={styles.headerContent}>
          <ThemedText style={styles.accountName} numberOfLines={1}>
            {account.name}
          </ThemedText>
          <ThemedText style={styles.transactionCount}>
            {getTransactionText((account as any).transactions ?? 0)}
          </ThemedText>
        </View>
        <IconSymbol
          name="chevron-right"
          size={16}
          color={useThemeColor({ light: '#666', dark: '#999' }, 'text')}
        />
      </View>

      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
        <ThemedText
          style={[
            styles.balanceAmount,
            {
              color: account.balance >= 0 ? '#22c55e' : '#ef4444',
            },
          ]}
        >
          {formatBalance(account.balance)}
        </ThemedText>
      </View>

      {/* Account Color Preview */}
      <View style={styles.colorPreview}>
        <View
          style={[
            styles.colorSample,
            {
              backgroundColor: account.color,
              borderColor: account.color === '#ffffff' ? borderColor : 'transparent',
              borderWidth: account.color === '#ffffff' ? 1 : 0,
            },
          ]}
        >
          <ThemedText style={[styles.colorSampleText, { color: account.textColor }]}>Aa</ThemedText>
        </View>
        <View style={styles.colorInfo}>
          <ThemedText style={styles.colorLabel}>Brand Colors</ThemedText>
          <ThemedText style={styles.colorValues}>
            {account.color} • {account.textColor}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  balanceSection: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  colorSample: {
    width: 40,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  colorSampleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorInfo: {
    flex: 1,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  colorValues: {
    fontSize: 11,
    opacity: 0.6,
    fontFamily: 'monospace',
  },
});

export default AccountCard;

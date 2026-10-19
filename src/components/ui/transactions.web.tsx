import { View, StyleSheet, Pressable } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import React, { useRef, useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import InlineCurrencyInput from './inline-currency-input';
import FormSelect from './form-select.web';

export interface ITransaction {
  id: number;
  accountName: string;
  amount: number;
  type: 'income' | 'expense';
  transactionID?: string;
  movementID?: string;
}

interface ITransactionsWebProps {
  transactions: ITransaction[];
  accounts: { label: string; value: string }[];
  onTypeToggle: (id: number) => void;
  onAccountChange: (id: number, accountName: string) => void;
  onAmountChange: (id: number, amount: number) => void;
  onDelete: (id: number) => void;
}

const ROW_HEIGHT = 52;

const TransactionsWeb: React.FC<ITransactionsWebProps> = ({
  transactions,
  accounts,
  onTypeToggle,
  onAccountChange,
  onAmountChange,
  onDelete,
}) => {
  const placeholderColor = useThemeColor({ light: '#aaa', dark: '#666' }, 'tabIconDefault');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');
  const rowBackground = useThemeColor({ light: '#FFFFFF', dark: '#232725' }, 'menuBackground');
  const targetHeight = transactions.length * ROW_HEIGHT;
  const [currentHeight, setCurrentHeight] = useState(targetHeight);
  const prevTarget = useRef(targetHeight);

  useEffect(() => {
    if (prevTarget.current === targetHeight) return;
    prevTarget.current = targetHeight;

    // Animate using CSS transition via requestAnimationFrame
    // First frame: keep old height, second frame: set new height (CSS transition handles the rest)
    requestAnimationFrame(() => {
      setCurrentHeight(targetHeight);
    });
  }, [targetHeight]);

  return (
    // @ts-ignore: native div wrapper for reliable overflow clipping and CSS transition on web
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: currentHeight,
        transition: 'height 250ms ease-out',
      }}
    >
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        {transactions.map((t, index) => (
          <View
            key={t.id}
            style={[
              styles.transactionRow,
              {
                backgroundColor: rowBackground,
                borderBottomColor: borderColor,
                borderBottomWidth: index < transactions.length - 1 ? 1 : 0,
              },
            ]}
          >
            {/* Type toggle */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.type === 'income' ? 'Set as expense' : 'Set as income'}
              onPress={() => onTypeToggle(t.id)}
              style={[
                styles.typeToggle,
                {
                  backgroundColor: t.type === 'income' ? '#22c55e20' : '#ef444420',
                },
              ]}
            >
              <MaterialIcons
                name={t.type === 'income' ? 'call-made' : 'call-received'}
                size={16}
                color={t.type === 'income' ? '#22c55e' : '#ef4444'}
              />
            </Pressable>

            {/* Account dropdown */}
            <FormSelect
              accessibilityLabel="Account"
              value={t.accountName}
              onChange={(value) => onAccountChange(t.id, value)}
              options={accounts}
              placeholder="Account"
              style={{ marginLeft: 8 }}
            />

            {/* Amount input */}
            <InlineCurrencyInput
              value={t.amount}
              onChange={(amount) => onAmountChange(t.id, amount)}
              placeholderColor={placeholderColor}
            />

            {/* Delete button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete transaction"
              onPress={() => onDelete(t.id)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete-outline" size={18} color="#999" />
            </Pressable>
          </View>
        ))}

        {/* @ts-ignore */}
      </div>
      {/* @ts-ignore */}
    </div>
  );
};

const styles = StyleSheet.create({
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingHorizontal: 2,
  },
  typeToggle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TransactionsWeb;

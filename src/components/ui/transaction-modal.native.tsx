import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { ThemedText } from '../core/themed-text.native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import ListPicker, { IListPickerItem } from './list-picker.native';
import CurrencyInput from './currency-input';
import * as Haptics from 'expo-haptics';
import ModalPanel from './modal-panel.native';
import React from 'react';
import InputGroup from './input-group.native';
import IconSymbol from './icon-symbol';

export interface ITransactionData {
  accountName: string;
  amount: number;
  type: 'income' | 'expense';
}

interface ITransactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialData?: ITransactionData | null;
  accounts: IListPickerItem[];
  onSave: (data: ITransactionData) => void;
  title?: string;
}

const TransactionModal: React.FC<ITransactionModalProps> = ({
  isVisible,
  onClose,
  initialData,
  accounts,
  onSave,
  title = 'Transaction',
}) => {
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    initialData?.type || 'expense',
  );
  const [selectedAccount, setSelectedAccount] = useState(initialData?.accountName || '');
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const { height } = useWindowDimensions();

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (initialData) {
        // Edit mode: precompile with existing data
        setTransactionType(initialData.type || 'expense');
        setSelectedAccount(initialData.accountName || '');
        setAmount(initialData.amount || 0);
      } else {
        // New transaction: reset to defaults
        setTransactionType('expense');
        setSelectedAccount(accounts.length === 1 ? accounts[0].value : ''); // Auto-select if only one account
        setAmount(0);
      }
      setShowKeyboard(false);
    }
  }, [isVisible, initialData]);

  // Theme colors
  const mutedColor = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const borderColor = useThemeColor({ light: '#DFE6E1', dark: '#343C37' }, 'cardBorder');
  const incomeColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const expenseColor = useThemeColor({ light: '#A33A3A', dark: '#F09292' }, 'tint');
  const selectedBackground = useThemeColor({ light: '#E7EEE9', dark: '#2C3E33' }, 'cardBackground');

  const handleToggle = (type: 'income' | 'expense') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTransactionType(type);
  };

  const handleConfirm = () => {
    if (selectedAccount && amount > 0) {
      onSave({
        accountName: selectedAccount,
        amount,
        type: transactionType,
      });
    }
  };

  const isValid = selectedAccount && amount > 0;

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={isValid ? handleConfirm : undefined}
      title={title}
      showConfirmButton={Boolean(isValid)}
      showCancelButton={true}
      confirmText="Save"
      cancelText="Cancel"
      maxHeight={height * 0.85}
    >
      <View style={styles.container}>
        {/* Toggle Section */}
        <View accessibilityRole="tablist" style={[styles.toggleContainer, { borderColor }]}>
          {(['expense', 'income'] as const).map((type) => {
            const selected = transactionType === type;
            const color = type === 'income' ? incomeColor : expenseColor;
            return (
              <Pressable
                key={type}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => handleToggle(type)}
                style={({ pressed }) => [
                  styles.toggleButton,
                  selected && { backgroundColor: selectedBackground },
                  pressed && styles.pressed,
                ]}
              >
                <IconSymbol
                  name={type === 'income' ? 'add' : 'remove'}
                  size={18}
                  color={selected ? color : mutedColor}
                />
                <ThemedText style={[styles.toggleText, { color: selected ? color : mutedColor }]}>
                  {type === 'income' ? 'Income' : 'Expense'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Amount Section */}
        <InputGroup>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit amount"
            onPress={() => setShowKeyboard(true)}
            style={({ pressed }) => [styles.inputRow, pressed && styles.pressed]}
          >
            <ThemedText style={styles.label}>Amount</ThemedText>
            <View style={styles.valueContainer}>
              <ThemedText style={styles.amountText}>
                {amount.toFixed(2).replace('.', ',')} €
              </ThemedText>
              <IconSymbol name="chevron-right" size={16} color={mutedColor} />
            </View>
          </Pressable>

          {/* Account Section */}
          <ListPicker
            value={selectedAccount}
            onChange={setSelectedAccount}
            items={accounts}
            placeholder="Select account"
            title="Select account"
            label="Account"
          />
        </InputGroup>

        {/* Currency Input - Show only when requested */}
        {showKeyboard && (
          <ModalPanel
            isVisible={showKeyboard}
            onClose={() => setShowKeyboard(false)}
            onConfirm={() => setShowKeyboard(false)}
            title="Edit amount"
            showConfirmButton={true}
            showCancelButton={true}
            confirmText="Conferma"
            cancelText="Annulla"
          >
            <CurrencyInput value={amount} onChange={setAmount} showConfirmButton={false} />
          </ModalPanel>
        )}
      </View>
    </ModalPanel>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 8,
    gap: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    minHeight: 80, // Increased height for amount
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    width: 96,
    flexShrink: 0,
  },
  valueContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  centerSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  amountText: {
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  confirmSection: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  currencyToggle: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  currencyToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  toggleActiveExpense: {
    backgroundColor: '#dc2626',
  },
  toggleActiveIncome: {
    backgroundColor: '#16a34a',
  },
  toggleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  toggleActiveText: {
    color: '#fff',
    fontWeight: '600',
  },
  pressed: { opacity: 0.65 },
});

export default TransactionModal;

import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import ModalPanel from './modal-panel.native';
import TextBox from './text-box.native';
import CurrencyInput from './currency-input';
import { COLOR_PALETTE, DEFAULT_TEXT_COLOR } from '@/src/constants/colors';
import { ThemedText } from '../core/themed-text.native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AccountModalData {
  name: string;
  color: string;
  balance: number;
}

interface AccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (data: AccountModalData) => void;
  title?: string;
  initialData?: { name: string; color: string; balance?: number };
  balanceEditable?: boolean;
}

const AccountModal: React.FC<AccountModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title = 'Account',
  initialData,
  balanceEditable = false,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [balance, setBalance] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setName(initialData?.name ?? '');
      setColor(initialData?.color ?? COLOR_PALETTE[0]);
      setBalance(initialData?.balance ?? 0);
      setShowKeyboard(false);
    }
  }, [isVisible, initialData]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm({ name: name.trim(), color, balance });
  };

  const formatBalance = (amount: number): string => {
    return amount.toFixed(2).replace('.', ',') + ' €';
  };

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={name.trim() ? handleConfirm : undefined}
      title={title}
      maxHeight={SCREEN_HEIGHT * 0.95}
    >
      <View style={{ minHeight: 400 }}>
        {/* Preview */}
        {/* <View style={styles.previewContainer}>
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewDot,
                { backgroundColor: color, borderColor: DEFAULT_TEXT_COLOR },
              ]}
            />
            <ThemedText style={styles.previewName}>
              {name || "Account name"}
            </ThemedText>
          </View>
        </View> */}

        <View style={{ height: 200 }}>
          {/* Name input */}
          <TextBox
            value={name}
            onChange={setName}
            label="Name"
            placeholder="e.g. Checking Account"
          />

          {/* Balance section */}
          {balanceEditable && (
            <Pressable onPress={() => setShowKeyboard(true)} style={styles.inputRow}>
              <ThemedText style={styles.label}>Balance</ThemedText>
              <ThemedText style={styles.balanceText}>{formatBalance(balance)}</ThemedText>
            </Pressable>
          )}

          {/* Color selection */}
          <View style={styles.inputRow}>
            <ThemedText style={styles.label}>Color</ThemedText>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorScrollView}
          contentContainerStyle={styles.colorScrollContent}
        >
          {COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorItem,
                { backgroundColor: c },
                color === c && styles.selectedColorItem,
              ]}
            />
          ))}
        </ScrollView>
      </View>

      {/* Nested keyboard modal */}
      {showKeyboard && (
        <ModalPanel
          isVisible={showKeyboard}
          onClose={() => setShowKeyboard(false)}
          onConfirm={() => setShowKeyboard(false)}
          title="Edit Balance"
          maxHeight={SCREEN_HEIGHT * 0.5}
        >
          <CurrencyInput value={balance} onChange={setBalance} showConfirmButton={false} />
        </ModalPanel>
      )}
    </ModalPanel>
  );
};

export default AccountModal;

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 80,
  },
  balanceText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'right',
    flex: 1,
  },
  colorScrollView: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  colorScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selectedColorItem: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
});

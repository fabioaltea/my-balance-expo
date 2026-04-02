import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import TextBox from '@/src/components/ui/text-box';
import InlineCurrencyInput from '@/src/components/ui/inline-currency-input';
import { COLOR_PALETTE, DEFAULT_COLOR } from '@/src/constants/colors';
import { ThemedText } from '../core/themed-text.native';

interface AccountPanelProps {
  name: string;
  balance: number;
  selectedColor: string;
  onNameChange?: (name: string) => void;
  onBalanceChange?: (balance: number) => void;
  onColorChange: (color: string) => void;
  readonly?: boolean;
}

const AccountPanel: React.FC<AccountPanelProps> = ({
  name,
  balance,
  selectedColor,
  onNameChange,
  onBalanceChange,
  onColorChange,
  readonly = false,
}) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Name input */}
      {!readonly && onNameChange && (
        <View style={styles.fieldContainer}>
          <TextBox
            value={name}
            onChange={onNameChange}
            label="Account name"
            placeholder="e.g. Unicredit"
          />
        </View>
      )}

      {/* Current balance */}
      {!readonly && onBalanceChange && (
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.sectionTitle}>Current Balance</ThemedText>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
          >
            <InlineCurrencyInput value={balance} onChange={onBalanceChange} />
            <ThemedText>€</ThemedText>
          </View>
        </View>
      )}

      {/* Color selection */}
      <ThemedText style={styles.sectionTitle}>Color</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorScrollView}
        contentContainerStyle={styles.colorScrollContent}
      >
        {COLOR_PALETTE.map((color) => (
          <Pressable
            key={color}
            onPress={() => onColorChange(color)}
            style={[
              styles.colorItem,
              { backgroundColor: color },
              selectedColor === color && styles.selectedItem,
            ]}
          />
        ))}
      </ScrollView>
    </ScrollView>
  );
};

export default AccountPanel;

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
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
  selectedItem: {
    borderWidth: 3,
    borderColor: DEFAULT_COLOR,
  },
});

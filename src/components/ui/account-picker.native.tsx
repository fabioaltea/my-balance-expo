import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/src/components/core/themed-text.native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { Account } from '@/src/state';

export interface IAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

type Anchor = { x: number; y: number; width: number; height: number };

const AccountPicker: React.FC<IAccountPickerProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
}) => {
  const triggerRef = useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const textColor = useThemeColor({}, 'text');
  const surfaceColor = useThemeColor({ light: '#F9FBFA', dark: '#232725' }, 'cardBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.12)', dark: 'rgba(255, 255, 255, 0.12)' },
    'cardBorder',
  );
  const selectedColor = useThemeColor({ light: '#EAF2EC', dark: '#35453B' }, 'menuBackground');
  const accentColor = useThemeColor({ light: '#25633F', dark: '#9EDBB2' }, 'tint');

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const menuWidth = Math.min(screenWidth - 32, Math.max(anchor?.width ?? 0, 224));
  const menuHeight = Math.min(accounts.length * 48 + 12, 320, screenHeight - 32);
  const left = Math.max(16, Math.min(anchor?.x ?? 16, screenWidth - menuWidth - 16));
  const below = (anchor?.y ?? 0) + (anchor?.height ?? 0) + 6;
  const top =
    below + menuHeight <= screenHeight - 16
      ? below
      : Math.max(16, (anchor?.y ?? 0) - menuHeight - 6);

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Account: ${selectedAccount === 'All' ? 'All accounts' : selectedAccount}`}
        accessibilityHint="Opens the account list"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <ThemedText type="title" style={styles.triggerText} numberOfLines={1}>
          {selectedAccount === 'All' ? 'All accounts' : selectedAccount || 'Select Account'}
        </ThemedText>
        <Ionicons name="chevron-down" size={17} color={textColor} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} />
          <View
            style={[
              styles.menu,
              {
                top,
                left,
                width: menuWidth,
                maxHeight: menuHeight,
                backgroundColor: surfaceColor,
                borderColor,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {accounts.map((account) => {
                const selected = account.name === selectedAccount;
                return (
                  <Pressable
                    key={account.accountId}
                    onPress={() => {
                      setSelectedAccount(account.name);
                      setIsOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && { backgroundColor: selectedColor },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: account.color }]} />
                    <ThemedText style={styles.optionText} numberOfLines={1}>
                      {account.name === 'All' ? 'All accounts' : account.name}
                    </ThemedText>
                    {selected && <Ionicons name="checkmark" size={18} color={accentColor} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  triggerText: { flexShrink: 1 },
  pressed: { opacity: 0.72 },
  overlay: { flex: 1 },
  menu: {
    position: 'absolute',
    padding: 6,
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: '#173126',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600' },
});

export default AccountPicker;

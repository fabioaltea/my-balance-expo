import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/src/components/core/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import ContextMenu from './context-menu';
import type { Account } from '@/src/state';

export interface IAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

const AccountPicker: React.FC<IAccountPickerProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
}) => {
  const textColor = useThemeColor({}, 'text');
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {/* Hidden measurer */}
      <View style={styles.pressable} pointerEvents="none">
        <ThemedText type="title">{selectedAccount || 'Select Account'}</ThemedText>
        <Ionicons name="chevron-down" size={16} color={textColor} />
      </View>
      {/* ContextMenu overlay with measured size */}
      {size.width > 0 && (
        <View style={[StyleSheet.absoluteFill, { width: size.width, height: size.height }]}>
          <ContextMenu
            options={accounts.map((a) => a.name)}
            selectedOption={selectedAccount}
            onSelectOption={setSelectedAccount}
            hostStyle={{ width: size.width, height: size.height }}
            activationMethod="singlePress"
          >
            {/* <View style={[styles.pressable, { width: size.width, height: size.height }]}>
              <ThemedText type="title">
                {selectedAccount || "Select Account"}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={textColor} />
            </View> */}
            <></>
          </ContextMenu>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default AccountPicker;

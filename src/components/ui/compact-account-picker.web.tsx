import { View, StyleSheet } from 'react-native';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { Account } from '@/src/state';
import { Fonts } from '@/src/constants/theme';
import ContextMenu from './context-menu.web';

export interface CompactAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

/**
 * Compact account picker for landscape command bar
 * Web version with the app's themed menu
 */
const CompactAccountPicker: React.FC<CompactAccountPickerProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
}) => {
  const backgroundColor = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor(
    { light: 'rgba(36, 68, 55, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const selectedLabel = selectedAccount === 'All' ? 'All accounts' : selectedAccount;

  return (
    <ContextMenu
      accessibilityLabel={`Account: ${selectedLabel}`}
      align="start"
      itemSpacing={4}
      options={accounts.map((account) => ({
        label: account.name === 'All' ? 'All accounts' : account.name,
        value: account.name,
      }))}
      selectedOption={selectedAccount}
      onSelectOption={setSelectedAccount}
    >
      <View style={[styles.container, { backgroundColor, borderColor }]}>
        <span
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            fontWeight: 500,
            color: textColor,
            minWidth: 112,
            paddingRight: 24,
          }}
        >
          {selectedLabel}
        </span>
        <View style={styles.chevron} pointerEvents="none">
          <MaterialIcons name="expand-more" size={18} color={textColor} />
        </View>
      </View>
    </ContextMenu>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 34,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    position: 'relative',
  },
  chevron: {
    opacity: 0.6,
    position: 'absolute',
    right: 12,
  },
});

export default CompactAccountPicker;

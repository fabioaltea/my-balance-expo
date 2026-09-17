import { View, StyleSheet } from 'react-native';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { Account } from '@/src/state';

export interface CompactAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

/**
 * Compact account picker for landscape command bar
 * Web version with native HTML select
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
  const optionBackground = useThemeColor({ light: '#F9FBFA', dark: '#232725' }, 'cardBackground');

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(event.target.value);
  };

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <select
        aria-label="Account"
        value={selectedAccount}
        onChange={handleSelectChange}
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: textColor,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          minWidth: 112,
          paddingRight: 24,
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
        }}
      >
        {accounts.map((account) => (
          <option
            key={account.name}
            value={account.name}
            style={{ backgroundColor: optionBackground, color: textColor }}
          >
            {account.name === 'All' ? 'All accounts' : account.name}
          </option>
        ))}
      </select>
      <View style={styles.chevron} pointerEvents="none">
        <MaterialIcons name="expand-more" size={18} color={textColor} />
      </View>
    </View>
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
    right: 8,
  },
});

export default CompactAccountPicker;

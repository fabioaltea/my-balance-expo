import { View, StyleSheet } from "react-native";
import React from "react";
import { ThemedText } from "../core/themed-text.native";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Account } from "@/state";

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
  const backgroundColor = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.1)" },
    "background",
  );
  const textColor = useThemeColor({}, "text");

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(event.target.value);
  };

  // Display label
  const displayLabel =
    selectedAccount === "All" ? "All accounts" : selectedAccount;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <select
        value={selectedAccount}
        onChange={handleSelectChange}
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: textColor,
          backgroundColor: "transparent",
          border: "none",
          outline: "none",
          cursor: "pointer",
          paddingRight: 20,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
        }}
      >
        {accounts.map((account) => (
          <option key={account.name} value={account.name}>
            {account.name === "All" ? "All accounts" : account.name}
          </option>
        ))}
      </select>
      <ThemedText style={styles.chevron}>▾</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
    position: "relative",
  },
  chevron: {
    fontSize: 10,
    opacity: 0.6,
    pointerEvents: "none",
    position: "absolute",
    right: 12,
  },
});

export default CompactAccountPicker;

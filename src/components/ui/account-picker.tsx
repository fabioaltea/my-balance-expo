import { View, StyleSheet, Pressable } from "react-native";
import React from "react";
import { ThemedText } from "../core/themed-text.native";
import ContextMenu from "./context-menu.native";
import type { Account } from "@/state";

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
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleSelectOption = (option: string) => {
    setSelectedAccount(option);
  };

  const handleOpenMenu = () => {
    setMenuOpen(true);
  };

  const handleDismissMenu = () => {
    setMenuOpen(false);
  };

  return (
    <View>
      <Pressable style={styles.pressable} onPress={handleOpenMenu}>
        <ThemedText type="title">
          {selectedAccount || "Select Account"}
        </ThemedText>
        {/* <IconSymbol name="chevron-down" color="#2F4F3F" /> */}
      </Pressable>
      {menuOpen && (
        <ContextMenu
          options={accounts.map((a) => a.name) || []}
          onSelectOption={(option) => handleSelectOption(option)}
          onDismiss={handleDismissMenu}
          selectedOption={selectedAccount}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});

export default AccountPicker;

import { View, StyleSheet, Pressable } from "react-native";
import React from "react";
import { ThemedText } from "../themed-text";
import ContextMenu from "./context-menu";
import { IAccount } from "@/models/Account";
import { Account } from "@/hooks/useMyBalanceData";

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
      <Pressable onPress={handleOpenMenu}>
        <ThemedText type="title">
          {selectedAccount || "Select Account"} ▼
        </ThemedText>
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

export default AccountPicker;

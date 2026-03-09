import { View, StyleSheet } from "react-native";
import React from "react";
import { ThemedText } from "@/src/components/core/themed-text";
import ContextMenu from "./context-menu";
import type { Account } from "@/src/state";

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
  return (
    <View>
      <ContextMenu
        options={accounts.map((a) => a.name)}
        selectedOption={selectedAccount}
        onSelectOption={setSelectedAccount}
      >
        <View style={styles.pressable}>
          <ThemedText type="title">
            {selectedAccount || "Select Account"}
          </ThemedText>
        </View>
      </ContextMenu>
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

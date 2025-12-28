import { View, StyleSheet, Pressable } from "react-native";
import React from "react";
import { ThemedText } from "../themed-text";
import ContextMenu from "./context-menu";

export interface IAccountPickerProps {
    accounts: string[];
    selectedAccount: string;
    setSelectedAccount: (account: string) => void;
}

const AccountPicker: React.FC<IAccountPickerProps> = ({accounts, selectedAccount, setSelectedAccount}) => {
const [menuOpen, setMenuOpen] = React.useState(false);

const handleSelectOption = (option: string) => {
    setSelectedAccount(option);
}

const handleOpenMenu = () => {
    setMenuOpen(true);
};

const handleDismissMenu = () => {
    setMenuOpen(false);
}

    return (
    <View style={styles.container}>
      <Pressable onPress={handleOpenMenu}>
        <ThemedText type="title">{selectedAccount || "Select Account"} ▼</ThemedText>
      </Pressable>
      {menuOpen && <ContextMenu options={accounts || []} onSelectOption={(option) => handleSelectOption(option)} onDismiss={handleDismissMenu} selectedOption={selectedAccount} />}
    </View>
  );
};

const styles=StyleSheet.create({
    container:{
        marginVertical: 16,
    }
});

export default AccountPicker;
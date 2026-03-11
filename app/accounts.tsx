import { StyleSheet, View } from 'react-native';
import React from 'react';
import GlassButton from "@/src/components/ui/glass-button";
import { useDataContext } from "@/src/state/DataProvider";
import { useAuthContext } from "@/src/state/AuthProvider";
import AccountsView from "@/src/views/accounts-view";
import { ScreenView, ThemedText } from "@/src/components/core";

export default function Accounts() {
  const { accounts } = useDataContext();
  const { selectedSpreadsheetId } = useAuthContext();

  const handleButtonPress = () => {
    // router.push("/add");
  };

  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Accounts</ThemedText>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>
      <AccountsView
        accounts={accounts}
        selectedSpreadsheetId={selectedSpreadsheetId}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

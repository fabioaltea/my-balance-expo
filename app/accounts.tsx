import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ScreenView from '@/layout/screen-view';
import React from 'react';
import GlassButton from '@/components/ui/glass-button';
import { useDataContext } from '@/state/DataProvider';
import { useAuthContext } from '@/state/AuthProvider';
import AccountsView from '@/views/accounts-view';

export default function Accounts() {
  const { accounts, reloadData } = useDataContext();
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
        reloadData={reloadData}
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

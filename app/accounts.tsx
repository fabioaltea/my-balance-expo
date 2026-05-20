import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import GlassButton from '@/src/components/ui/glass-button';
import { useDataContext } from '@/src/state/DataProvider';
import { useAuthContext } from '@/src/state/AuthProvider';
import AccountsView from '@/src/views/accounts-view';
import { ScreenView, ThemedText } from '@/src/components/core';

export default function Accounts() {
  const { accounts } = useDataContext();
  const { selectedSpreadsheetId } = useAuthContext();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Accounts</ThemedText>
        <GlassButton onPress={() => setShowAddModal(true)} />
      </View>
      <AccountsView
        accounts={accounts}
        selectedSpreadsheetId={selectedSpreadsheetId}
        showAddModal={showAddModal}
        onAddModalClose={() => setShowAddModal(false)}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

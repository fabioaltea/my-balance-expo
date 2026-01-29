import { StyleSheet, View, ScrollView, Pressable, Dimensions, Alert, TextInput } from 'react-native';
import { ThemedText } from '@/components/core/themed-text';
import React, { useState } from 'react';
import Card from '@/components/core/card';
import List from '@/components/ui/list';
import ModalPanel from '@/components/ui/modal-panel';
import { Account } from '@/hooks/useMyBalanceData';
import * as Haptics from 'expo-haptics';
import { AccountsApiHelper } from '@/helpers/AccountsApiHelper';
import { COLOR_PALETTE, DEFAULT_COLOR, DEFAULT_TEXT_COLOR } from '@/constants/colors';

interface AccountsViewProps {
  accounts: Account[];
  selectedSpreadsheetId: string | null;
  reloadData: () => Promise<void>;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });
};

const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  selectedSpreadsheetId,
  reloadData,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [editedName, setEditedName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAccountLongPress = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAccount(account);
    setSelectedColor(account.color || DEFAULT_COLOR);
    setEditedName(account.name);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedAccount(null);
    setEditedName('');
  };

  const performUpdate = async () => {
    if (!selectedAccount || !selectedSpreadsheetId) return;

    setIsUpdating(true);
    try {
      await AccountsApiHelper.updateAccount(
        selectedSpreadsheetId,
        selectedAccount.accountId,
        {
          name: editedName,
          color: selectedColor,
        }
      );
      await reloadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error updating account:', error);
      Alert.alert('Errore', 'Impossibile aggiornare il conto');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAccount) return;

    const nameChanged = editedName !== selectedAccount.name;

    if (nameChanged) {
      await Alert.alert(
        'Conferma modifica',
        `Stai per rinominare il conto da "${selectedAccount.name}" a "${editedName}".\n\nTutte le transazioni associate a questo conto saranno aggiornate con il nuovo nome.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Conferma', onPress: performUpdate },
        ]
      );
    } else {
      performUpdate();
    }
  };

  return (
    <>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <List>
            {accounts.map((account) => (
              <Pressable
                key={account.accountId}
                onLongPress={() => handleAccountLongPress(account)}
                delayLongPress={300}
              >
                <View style={styles.accountRow}>
                  <View style={styles.accountLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: account.color || DEFAULT_COLOR,
                          borderColor: account.textColor || DEFAULT_TEXT_COLOR,
                        },
                      ]}
                    />
                    <ThemedText style={styles.accountName}>{account.name}</ThemedText>
                  </View>
                  <ThemedText style={styles.balanceText}>
                    {formatCurrency(account.balance)}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </List>
        </Card>
      </ScrollView>

      <ModalPanel
        isVisible={modalVisible}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        title="Edit Account"
        maxHeight={Dimensions.get('window').height * 0.7}
      >
        <View>
          {/* Preview */}
          <View style={styles.previewContainer}>
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewDot,
                  { backgroundColor: selectedColor, borderColor: DEFAULT_TEXT_COLOR },
                ]}
              />
              <ThemedText style={styles.previewName}>{editedName || 'Account Name'}</ThemedText>
            </View>
          </View>

          {/* Name input */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Name</ThemedText>
          <TextInput
            style={styles.nameInput}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Account Name"
            placeholderTextColor="#999"
          />

          {/* Color selection */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Color</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorScrollView}
            contentContainerStyle={styles.colorScrollContent}
          >
            {COLOR_PALETTE.map((color) => (
              <Pressable
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorItem,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedItem,
                ]}
              />
            ))}
          </ScrollView>
        </View>
      </ModalPanel>
    </>
  );
};

export default AccountsView;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
  },
  accountName: {
    fontSize: 18,
    flex: 1,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  nameInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  colorScrollView: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  colorScrollContent: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selectedItem: {
    borderWidth: 3,
    borderColor: "#007AFF",
  },
});

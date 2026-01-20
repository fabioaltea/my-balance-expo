import { StyleSheet, View, ScrollView, Pressable, Dimensions, Alert, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ScreenView from '@/layout/screen-view';
import React, { useState } from 'react';
import GlassButton from '@/components/ui/glass-button';
import { useDataContext } from '@/state/DataProvider';
import Card from '@/components/card';
import List from '@/components/ui/list';
import ModalPanel from '@/components/ui/modal-panel';
import { Account } from '@/hooks/useMyBalanceData';
import * as Haptics from 'expo-haptics';
import { AccountsApiHelper } from '@/helpers/AccountsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

// Color palette (ordered by hue)
const COLOR_PALETTE = [
  // Reds
  '#C0392B', '#E74C3C',
  // Oranges
  '#D35400', '#E67E22', '#F39C12',
  // Yellows
  '#F1C40F',
  // Greens
  '#27AE60', '#2ECC71', '#16A085', '#1ABC9C',
  // Blues
  '#2980B9', '#3498DB', '#1E3A5F',
  // Purples
  '#8E44AD', '#9B59B6', '#3D2E4F',
  // Browns
  '#5C3D2E', '#4A2C2A', '#4A3D2E',
  // Teals/Dark greens
  '#2F4F3F', '#2E4A3D', '#3D4A2E', '#2E5C3D', '#2E3D5C',
  // Grays
  '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1',
];

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });
};

export default function Accounts() {
  const { accounts, reloadData } = useDataContext();
  const { selectedSpreadsheetId } = useAuthContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#2F4F3F');
  const [editedName, setEditedName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleButtonPress = () => {
    // router.push("/add");
  };

  const handleAccountLongPress = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAccount(account);
    setSelectedColor(account.color || '#2F4F3F');
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
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Accounts</ThemedText>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>

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
                          backgroundColor: account.color || '#2F4F3F',
                          borderColor: account.textColor || '#FFFFFF',
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
                  { backgroundColor: selectedColor, borderColor: '#FFFFFF' },
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

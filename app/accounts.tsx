import { StyleSheet, View, ScrollView, Pressable, Dimensions } from 'react-native';
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
  const { accounts } = useDataContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#2F4F3F');

  const handleButtonPress = () => {
    // router.push("/add");
  };

  const handleAccountLongPress = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAccount(account);
    setSelectedColor(account.color || '#2F4F3F');
    setModalVisible(true);
  };

  const handleConfirm = () => {
    // TODO: save color to account
    console.log('Save:', selectedAccount?.accountId, selectedColor);
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
                  <ThemedText style={styles.accountName}>{account.name}</ThemedText>
                  <View style={[styles.balanceBadge, { backgroundColor: account.color || '#2F4F3F' }]}>
                    <ThemedText style={[styles.balanceText, { color: account.textColor || '#FFFFFF' }]}>
                      {formatCurrency(account.balance)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </List>
        </Card>
      </ScrollView>

      <ModalPanel
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
        title={selectedAccount?.name || 'Modifica Conto'}
        maxHeight={Dimensions.get('window').height * 0.4}
      >
        <View>
          {/* Preview */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewBadge, { backgroundColor: selectedColor }]}>
              <ThemedText style={styles.previewText}>
                {selectedAccount ? formatCurrency(selectedAccount.balance) : '€ 0,00'}
              </ThemedText>
            </View>
          </View>

          {/* Color selection */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Colore</ThemedText>
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
    paddingVertical: 8,
  },
  accountName: {
    fontSize: 16,
    flex: 1,
  },
  balanceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  previewText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
    textAlign: "center",
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

import { StyleSheet, View, Animated, Pressable, Alert } from 'react-native';
import React, { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import Card from '@/src/components/core/card';
import List from '@/src/components/ui/list';
import AccountModal from '@/src/components/ui/account-modal';
import type { Account } from '@/src/types/models';
import * as Haptics from 'expo-haptics';
import { DEFAULT_COLOR, DEFAULT_TEXT_COLOR } from '@/src/constants/colors';
import { useSpreadsheetMutation } from '@/src/hooks/useSpreadsheetMutation';
import { AccountsApiHelper } from '@/src/helpers/AccountsApiHelper';
import {
  AccountsMutationHelpers,
  type UpdateAccountData,
  type AccountSnapshot,
} from '@/src/helpers/AccountsMutationHelpers';
import { ThemedText } from '@/src/components/core/themed-text';

interface AccountsViewProps {
  accounts: Account[];
  selectedSpreadsheetId: string | null;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });
};

const AccountsView: React.FC<AccountsViewProps> = ({ accounts, selectedSpreadsheetId }) => {
  // React Query mutation
  const updateAccount = useSpreadsheetMutation<UpdateAccountData, AccountSnapshot>({
    mutationFn: (spreadsheetId, data) => {
      const { accountId, ...updates } = data;
      return AccountsApiHelper.updateAccount(spreadsheetId, accountId, updates);
    },
    onMutate: (qc, data) => AccountsMutationHelpers.optimisticUpdateAccount(qc, data),
    onError: (qc, ctx) => AccountsMutationHelpers.rollbackAccounts(qc, ctx),
    onSuccess: (qc, variables) =>
      AccountsMutationHelpers.invalidateAccountCaches(qc, !!variables.name),
  });
  const menuBackground = useThemeColor({}, 'menuBackground');
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const handleAccountLongPress = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAccount(account);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedAccount(null);
  };

  const performUpdate = async (name: string, color: string) => {
    if (!selectedAccount || !selectedSpreadsheetId) return;

    try {
      await updateAccount.mutateAsync({
        accountId: selectedAccount.accountId,
        name,
        color,
      });
      handleCloseModal();
    } catch (error) {
      console.error('Error updating account:', error);
      Alert.alert('Errore', 'Impossibile aggiornare il conto');
    }
  };

  const handleAccountModalConfirm = (data: { name: string; color: string; balance: number }) => {
    if (!selectedAccount) return;

    const nameChanged = data.name !== selectedAccount.name;

    if (nameChanged) {
      Alert.alert(
        'Conferma modifica',
        `Stai per rinominare il conto da "${selectedAccount.name}" a "${data.name}".\n\nTutte le transazioni associate a questo conto saranno aggiornate con il nuovo nome.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Conferma', onPress: () => performUpdate(data.name, data.color) },
        ],
      );
    } else {
      performUpdate(data.name, data.color);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ height: 20, marginBottom: -20, zIndex: 1, opacity: fadeOpacity }}
        pointerEvents="none"
      >
        <LinearGradient colors={[menuBackground, menuBackground + '00']} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
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
      </Animated.ScrollView>

      <AccountModal
        isVisible={modalVisible}
        onClose={handleCloseModal}
        onConfirm={handleAccountModalConfirm}
        title="Edit Account"
        initialData={
          selectedAccount
            ? { name: selectedAccount.name, color: selectedAccount.color || DEFAULT_COLOR }
            : undefined
        }
      />
    </View>
  );
};

export default AccountsView;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
  },
});

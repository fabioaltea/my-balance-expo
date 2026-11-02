import { Alert, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import HomeView from '@/src/views/home-view';
import React, { useCallback, useMemo, useState } from 'react';
import GlassButton from '@/src/components/ui/glass-button';
import AccountPicker from '@/src/components/ui/account-picker';
import { IContextMenuOption } from '@/src/components/ui/context-menu';
import { useDataContext } from '@/src/state';
import type { Movement } from '@/src/state';
import * as ImagePicker from 'expo-image-picker';
import { OCRHelper } from '@/src/helpers/OCRHelper';
import { formatDateToDDMMYYYY } from '@/src/utils/dateUtils';
import { ScreenView } from '@/src/components/core';
import { useStatementImport } from '@/src/hooks/use-statement-import';

const contextMenuOptions: IContextMenuOption[] = [
  { label: 'Fotocamera/Galleria', icon: 'camera' },
  { label: 'Importa estratto conto', icon: 'document-attach' },
];

export default function Home() {
  const { openStatementImport, statementImportModal } = useStatementImport();
  // Get data from centralized context
  const {
    accounts,
    movements,
    pendingRecurrences,
    unconfirmedMovements,
    isLoading,
    getTotalIncome,
    getTotalExpense,
    calculateForecast,
  } = useDataContext();

  const handleButtonPress = () => {
    router.push('/add');
  };

  const navigateWithOCR = useCallback(async (imageUri: string) => {
    try {
      const ocrData = await OCRHelper.extractTransactionData(imageUri);
      const movement: Partial<Movement> = {
        description: ocrData.description || '',
        date: ocrData.date || formatDateToDDMMYYYY(new Date()),
        category: '',
        type: ocrData.type || 'expense',
        totalAmount: ocrData.amount ? -ocrData.amount : 0,
        transactions: ocrData.amount
          ? [
              {
                movementId: '',
                transactionId: '',
                date: ocrData.date || formatDateToDDMMYYYY(new Date()),
                description: ocrData.description || '',
                amount: ocrData.amount,
                type: (ocrData.type || 'expense') as 'income' | 'expense',
                account: '',
                category: '',
              },
            ]
          : [],
      };
      router.push({
        pathname: '/add',
        params: { initialMovement: JSON.stringify(movement) },
      });
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('Errore', "Impossibile analizzare l'immagine. Riprova.");
    }
  }, []);

  const handleContextMenuSelect = useCallback(
    async (option: string) => {
      if (option === 'Fotocamera/Galleria') {
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          mediaTypes: ['images'],
        });
        if (!result.canceled && result.assets.length > 0) {
          await navigateWithOCR(result.assets[0].uri);
        }
      } else if (option === 'Importa estratto conto') {
        if (Platform.OS === 'web') void openStatementImport();
        else router.push('/import-statement');
      }
    },
    [navigateWithOCR, openStatementImport],
  );

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce(
      (sum: number, acc: { balance: number }) => sum + acc.balance,
      0,
    );
    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);
    return [
      {
        accountId: 'all',
        name: 'All',
        balance: totalBalance,
        color: '#2F4F3F',
        textColor: '#FFFFFF',
      },
      ...sortedAccounts,
    ];
  }, [accounts]);

  const [selectedAccount, setSelectedAccount] = useState<string>('All');

  return (
    <ScreenView>
      {Platform.OS === 'web' && statementImportModal}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AccountPicker
            accounts={availableAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        </View>
        <View style={styles.headerActions}>
          <GlassButton
            type="menu"
            onPress={() => {}}
            contextMenuOptions={contextMenuOptions}
            contextMenuActivationMethod="singlePress"
            onContextMenuSelect={handleContextMenuSelect}
            accessibilityLabel="Home menu"
          />
          <GlassButton onPress={handleButtonPress} />
        </View>
      </View>
      <HomeView
        accounts={availableAccounts}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
        movements={movements}
        pendingRecurrences={pendingRecurrences}
        unconfirmedCount={unconfirmedMovements?.length || 0}
        isLoading={isLoading}
        getTotalIncome={getTotalIncome}
        getTotalExpense={getTotalExpense}
        calculateForecast={calculateForecast}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import HomeView from "@/src/views/home-view";
import React, { useCallback, useMemo, useState } from "react";
import GlassButton from "@/src/components/ui/glass-button";
import AccountPicker from "@/src/components/ui/account-picker";
import { IContextMenuOption } from "@/src/components/ui/context-menu";
import { useDataContext } from "@/src/state";
import type { Movement } from "@/src/state";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { OCRHelper } from "@/src/helpers/OCRHelper";
import { formatDateToDDMMYYYY } from "@/src/utils/dateUtils";
import * as Crypto from "expo-crypto";
import { ScreenView } from "@/src/components/core";
import { useSpreadsheetMutation } from "@/src/hooks/useSpreadsheetMutation";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import {
  TransactionsMutationHelpers,
  type CreateMovementData,
  type OptimisticSnapshot,
} from "@/src/helpers/TransactionsMutationHelpers";

const contextMenuOptions: IContextMenuOption[] = [
  { label: "Fotocamera/Galleria", icon: "camera" },
  { label: "File", icon: "document-attach" },
];

export default function Home() {
  const addMovement = useSpreadsheetMutation<
    CreateMovementData,
    OptimisticSnapshot
  >({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.createTransaction(spreadsheetId, data),
    onMutate: (qc, data) =>
      TransactionsMutationHelpers.optimisticAddMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

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
    router.push("/add");
  };

  const navigateWithOCR = useCallback(async (imageUri: string) => {
    try {
      const ocrData = await OCRHelper.extractTransactionData(imageUri);
      const movement: Partial<Movement> = {
        description: ocrData.description || "",
        date: ocrData.date || formatDateToDDMMYYYY(new Date()),
        category: "",
        type: ocrData.type || "expense",
        totalAmount: ocrData.amount ? -ocrData.amount : 0,
        transactions: ocrData.amount
          ? [
              {
                movementId: "",
                transactionId: "",
                date: ocrData.date || formatDateToDDMMYYYY(new Date()),
                description: ocrData.description || "",
                amount: ocrData.amount,
                type: (ocrData.type || "expense") as "income" | "expense",
                account: "",
                category: "",
              },
            ]
          : [],
      };
      router.push({
        pathname: "/add",
        params: { initialMovement: JSON.stringify(movement) },
      });
    } catch (error) {
      console.error("OCR error:", error);
      Alert.alert("Errore", "Impossibile analizzare l'immagine. Riprova.");
    }
  }, []);

  const importStatementFromData = useCallback(
    async (
      statementData: Awaited<ReturnType<typeof OCRHelper.extractStatementData>>,
    ) => {
      try {
        if (statementData.transactions.length === 0) {
          Alert.alert(
            "Nessuna transazione",
            "Non sono state trovate transazioni nel documento.",
          );
          return;
        }

        // Resolve account name: try to match OCR result with existing accounts
        let accountName = "";
        if (statementData.accountName) {
          const match = accounts.find((a: { name: string }) =>
            statementData
              .accountName!.toLowerCase()
              .includes(a.name.toLowerCase()),
          );
          if (match) accountName = match.name;
        }

        // Save each transaction as an unconfirmed movement
        let saved = 0;
        for (const tx of statementData.transactions) {
          try {
            const movementId = Crypto.randomUUID();
            await addMovement.mutateAsync({
              movementId,
              description: tx.description,
              category: "",
              date: tx.date,
              status: "unconfirmed",
              transactions: [
                {
                  amount:
                    (tx.type === "income" ? "" : "-") +
                    String(tx.amount).replace(".", ","),
                  account: accountName,
                  type: tx.type === "income" ? "in" : "out",
                },
              ],
            });
            saved++;
          } catch (error) {
            console.error("Error saving statement transaction:", error);
          }
        }

        Alert.alert(
          "Importazione completata",
          `${saved} di ${statementData.transactions.length} transazioni importate come da confermare.`,
        );
      } catch (error) {
        console.error("Statement OCR error:", error);
        Alert.alert("Errore", "Impossibile analizzare il documento. Riprova.");
      }
    },
    [accounts, addMovement],
  );

  const handleContextMenuSelect = useCallback(
    async (option: string) => {
      if (option === "Fotocamera/Galleria") {
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          mediaTypes: ["images"],
        });
        if (!result.canceled && result.assets.length > 0) {
          await navigateWithOCR(result.assets[0].uri);
        }
      } else if (option === "File") {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets.length > 0) {
          const asset = result.assets[0];
          const isPdf =
            asset.mimeType === "application/pdf" ||
            asset.uri.toLowerCase().endsWith(".pdf");

          try {
            const statementData = isPdf
              ? await OCRHelper.extractStatementDataFromPDF(asset.uri)
              : await OCRHelper.extractStatementData(asset.uri);
            await importStatementFromData(statementData);
          } catch (error) {
            console.error("Statement import error:", error);
            Alert.alert(
              "Errore",
              "Impossibile analizzare il documento. Riprova.",
            );
          }
        }
      }
    },
    [navigateWithOCR, importStatementFromData],
  );

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce(
      (sum: number, acc: { balance: number }) => sum + acc.balance,
      0,
    );
    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);
    return [
      {
        accountId: "all",
        name: "All",
        balance: totalBalance,
        color: "#2F4F3F",
        textColor: "#FFFFFF",
      },
      ...sortedAccounts,
    ];
  }, [accounts]);

  const [selectedAccount, setSelectedAccount] = useState<string>("All");

  return (
    <ScreenView>
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
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

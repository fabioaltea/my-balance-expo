import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import ScreenView from "@/layout/screen-view";
import HomeView from "@/views/home-view";
import React, { useCallback, useRef, useMemo, useState } from "react";
import GlassButton from "@/components/ui/glass-button";
import AccountPicker from "@/components/ui/account-picker";
import ContextMenu, { IContextMenuOption } from "@/components/ui/context-menu";
import { useDataContext } from "@/state";
import type { Movement } from "@/state";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { OCRHelper } from "@/helpers/OCRHelper";
import { formatDateToDDMMYYYY } from "@/utils/dateUtils";
import { useAddMovement } from "@/hooks/mutations";
import * as Crypto from "expo-crypto";

const contextMenuOptions: IContextMenuOption[] = [
  { label: "Fotocamera/Galleria", icon: "camera" },
  { label: "File", icon: "document-attach" },
];

export default function Home() {
  const addMovement = useAddMovement();

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

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);

  const handleLongPress = useCallback(() => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height });
      setShowContextMenu(true);
    });
  }, []);

  const navigateWithOCR = useCallback(async (imageUri: string) => {
    try {
      const ocrData = await OCRHelper.extractTransactionData(imageUri);
      const movement: Partial<Movement> = {
        description: ocrData.description || "",
        date: ocrData.date || formatDateToDDMMYYYY(new Date()),
        category: "",
        type: ocrData.type || "expense",
        totalAmount: ocrData.amount ? -(ocrData.amount) : 0,
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

  const importStatement = useCallback(async (imageUri: string) => {
    try {
      const statementData = await OCRHelper.extractStatementData(imageUri);

      if (statementData.transactions.length === 0) {
        Alert.alert("Nessuna transazione", "Non sono state trovate transazioni nel documento.");
        return;
      }

      // Resolve account name: try to match OCR result with existing accounts
      let accountName = "";
      if (statementData.accountName) {
        const match = accounts.find((a) =>
          statementData.accountName!.toLowerCase().includes(a.name.toLowerCase())
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
                amount: (tx.type === "income" ? "" : "-") + String(tx.amount).replace(".", ","),
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
        `${saved} di ${statementData.transactions.length} transazioni importate come da confermare.`
      );
    } catch (error) {
      console.error("Statement OCR error:", error);
      Alert.alert("Errore", "Impossibile analizzare il documento. Riprova.");
    }
  }, [accounts, addMovement]);

  const handleContextMenuSelect = useCallback(async (option: string) => {
    setShowContextMenu(false);
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
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        await importStatement(result.assets[0].uri);
      }
    }
  }, [navigateWithOCR, importStatement]);

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
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
        <AccountPicker
          accounts={availableAccounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
        ></AccountPicker>
        <View ref={buttonRef}>
          <GlassButton onPress={handleButtonPress} onLongPress={handleLongPress} />
          {showContextMenu && (
            <ContextMenu
              options={contextMenuOptions}
              selectedOption=""
              onSelectOption={handleContextMenuSelect}
              onDismiss={() => setShowContextMenu(false)}
              buttonPosition={buttonPosition}
            />
          )}
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
});

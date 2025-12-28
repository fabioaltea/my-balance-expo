import { View, StyleSheet, Text, Pressable } from "react-native";
import { ThemedText } from "../themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useState } from "react";
import ListPicker, { IListPickerItem } from "./list-picker";
import CurrencyInput from "./currency-input";
import * as Haptics from "expo-haptics";
import ModalPanel from "./modal-panel";

export interface ITransactionData {
  accountName: string;
  amount: number;
  type: "income" | "expense";
}

interface ITransactionPickerProps {
  initialData?: ITransactionData;
  accounts: IListPickerItem[];
  onSave: (data: ITransactionData) => void;
}

const TransactionPicker: React.FC<ITransactionPickerProps> = ({
  initialData,
  accounts,
  onSave,
}) => {
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    initialData?.type || "expense"
  );
  const [selectedAccount, setSelectedAccount] = useState(
    initialData?.accountName || ""
  );
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#1a1a1a" },
    "background"
  );

  const handleToggle = (type: "income" | "expense") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTransactionType(type);
  };

  const handleSave = () => {
    if (selectedAccount && amount > 0) {
      onSave({
        accountName: selectedAccount,
        amount,
        type: transactionType,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Toggle Section */}
      <View style={styles.inputRow}>
        <ThemedText style={styles.label}>Tipologia</ThemedText>
        <View style={styles.toggleContainer}>
          <Pressable
            onPress={() => handleToggle("expense")}
            style={[
              styles.toggleButton,
              styles.toggleLeft,
              transactionType === "expense" && styles.toggleActiveExpense,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                transactionType === "expense" && styles.toggleActiveText,
              ]}
            >
              Uscita
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleToggle("income")}
            style={[
              styles.toggleButton,
              styles.toggleRight,
              transactionType === "income" && styles.toggleActiveIncome,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                transactionType === "income" && styles.toggleActiveText,
              ]}
            >
              Entrata
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Amount Section */}
      <View style={styles.inputRow}>
        <ThemedText style={styles.label}>Importo</ThemedText>
        <Pressable
          onPress={() => setShowKeyboard(!showKeyboard)}
          style={styles.valueContainer}
        >
          <ThemedText style={styles.amountText}>
            {amount.toFixed(2).replace(".", ",")} €
          </ThemedText>
        </Pressable>
      </View>

      {/* Account Section */}
      <View style={styles.inputRow}>
        <ThemedText style={styles.label}>Conto</ThemedText>
        <View style={styles.valueContainer}>
          <ListPicker
            value={selectedAccount}
            onChange={setSelectedAccount}
            items={accounts}
            placeholder="Seleziona conto..."
            title="Seleziona Conto"
          />
        </View>
      </View>

      {/* Currency Input - Show only when requested */}
      {showKeyboard && <ModalPanel isVisible={showKeyboard} onClose={() => setShowKeyboard(false)}><CurrencyInput value={amount} onChange={setAmount} /></ModalPanel>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove flex: 1 as it can cause issues in modal
    minHeight: 700,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    height: 40,    
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    flex: 0,
    minWidth: 80,
  },
  valueContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  centerSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  amountText: {
    fontSize: 32,
    fontWeight: "bold",
  },
  currencyToggle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
    alignItems: "center",
  },
  currencyToggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 200,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  toggleActiveExpense: {
    backgroundColor: "#dc2626",
  },
  toggleActiveIncome: {
    backgroundColor: "#16a34a",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  toggleActiveText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default TransactionPicker;

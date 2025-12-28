import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import ChipButton from "@/components/ui/chip-button";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Haptics from "expo-haptics";
import Input from "@/components/ui/text-box";
import TextBox from "@/components/ui/text-box";
import Card from "@/components/card";
import List from "@/components/ui/list";
import InputGroup from "@/components/ui/input-group";
import DatePicker from "@/components/ui/date-picker";
import ListPicker from "@/components/ui/list-picker";
import Transactions, { ITransaction } from "@/components/ui/transactions";
import TransactionModal, {
  ITransactionData,
} from "@/components/ui/transaction-modal";

const AddView: React.FC = () => {
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [location, setLocation] = useState("sestu");
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<ITransaction | null>(null);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const cardColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "tabIconDefault"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault"
  );

  const categories = [
    { label: "Spesa", value: "spesa" },
    { label: "Trasporti", value: "trasporti" },
    { label: "Ristoranti", value: "ristoranti" },
    { label: "Shopping", value: "shopping" },
    { label: "Salute", value: "salute" },
    { label: "Sport", value: "sport" },
    { label: "Viaggi", value: "viaggi" },
    { label: "Casa", value: "casa" },
    { label: "Altro", value: "altro" },
  ];

  const accounts = [
    { label: "Trade Republic", value: "Trade Republic" },
    { label: "Intesa San Paolo", value: "Intesa San Paolo" },
    { label: "Carta di Credito", value: "Carta di Credito" },
    { label: "Cash", value: "Cash" },
  ];

  const handleTransactionPress = (transaction: ITransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionPicker(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionPicker(true);
  };

  const handleTransactionSave = (data: ITransactionData) => {
    console.log("Saving transaction:", data);
    
    // Validate data
    if (!data.accountName || data.amount <= 0) {
      Alert.alert("Error, please complete all fields with valid data");
      return;
    }

    if (editingTransaction) {
      // Update existing transaction
      setTransactions(
        transactions.map((t) =>
          t.id === editingTransaction.id ? { ...t, ...data } : t
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Add new transaction
      const newTransaction: ITransaction = {
        id: Math.max(...transactions.map((t) => t.id), 0) + 1,
        ...data,
      };
      setTransactions([...transactions, newTransaction]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Close modal and reset editing state
    setShowTransactionPicker(false);
    setEditingTransaction(null);
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert("Errore", "Inserisci una descrizione");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Successo", "Movimento inserito correttamente");
    // Here you would typically save the data
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: backgroundColor,
    },
    inputCard: {
      backgroundColor: cardColor,
      borderColor: borderColor,
    },
    input: {
      color: textColor,
    },
    dateText: {
      color: textColor,
    },
    totalContainer: {
      backgroundColor: "#2F4F3F",
    },
    submitButton: {
      backgroundColor: "#4a4a4a",
    },
  });

  return (
    <View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          Inserisci Movimento
        </ThemedText>
        <InputGroup>
          <TextBox
            value={description}
            onChange={setDescription}
            label="Description"
          />
          <ListPicker
            value={selectedCategory}
            onChange={setSelectedCategory}
            items={categories}
            label="Category"
            placeholder="Select category"
          />

          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            label="Date"
          />
        </InputGroup>

        {/* Transactions Component */}
        <InputGroup label="Transactions">
          <Transactions
            transactions={transactions}
            onTransactionPress={handleTransactionPress}
            onAddPress={handleAddTransaction}
          />
        </InputGroup>
      </ScrollView>

      {/* Transaction Modal */}
      <TransactionModal
        isVisible={showTransactionPicker}
        onClose={() => {
          setShowTransactionPicker(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
        initialData={editingTransaction}
        accounts={accounts}
        onSave={handleTransactionSave}
      />

      {/* Bottom Total and Submit */}
      {/* {transactions.length > 0 && (
        <View style={[styles.bottomSection, dynamicStyles.totalContainer]}>
          <ThemedText style={styles.totalLabel}>Importo totale:</ThemedText>
          <ThemedText style={styles.totalAmount}>
            {getTotalAmount().toFixed(2).replace(".", ",")}€
          </ThemedText>
          <Pressable
            onPress={handleSubmit}
            style={[styles.submitButton, dynamicStyles.submitButton]}
          >
            <ThemedText style={styles.submitText}>Inserisci</ThemedText>
          </Pressable>
        </View>
      )} */}
    </View>
  );
};

export default AddView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    marginBottom: 30,
    textAlign: "left",
  },
  inputCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 40,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 16,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  transactionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  amountInput: {
    fontSize: 16,
    textAlign: "right",
    flex: 1,
    marginRight: 8,
    paddingVertical: 4,
  },
  removeButton: {
    marginLeft: 12,
  },
  addButton: {
    marginLeft: 12,
  },
  addTransactionButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  locationText: {
    fontSize: 16,
    marginBottom: 12,
  },
  mapPlaceholder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: {
    fontSize: 14,
    fontWeight: "600",
  },
  mapSubtext: {
    fontSize: 12,
    color: "#0066cc",
    marginTop: 4,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 8,
  },
  submitButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
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
import LocationPicker, { ILocation } from "@/components/ui/location-picker";
import Transactions, { ITransaction } from "@/components/ui/transactions";
import TransactionModal, {
  ITransactionData,
} from "@/components/ui/transaction-modal";
import ModalPanel from "@/components/ui/modal-panel";
import ScreenView from "@/layout/screen-view";
import { useAuthContext, useDataContext } from "@/state";
import { TransactionsApiHelper } from "@/helpers/TransactionsApiHelper";
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from "@/utils/dateUtils";
import { useRouter } from "expo-router";

type ModalStatus = "loading" | "success" | "error";

interface AddViewProps {
  editingMovementId?: string;
  recurrenceId?: string;
}

const AddView: React.FC<AddViewProps> = ({
  editingMovementId,
  recurrenceId,
}) => {
  const router = useRouter();
  const { selectedSpreadsheetId } = useAuthContext();
  const { accounts, categories, movements, recurringMovements, reloadData } =
    useDataContext();

  // Find the movement being edited from the global movements list
  const editingMovement = editingMovementId
    ? movements.find((m) => m.id === editingMovementId)
    : undefined;

  // Find the recurring movement template if recurrenceId is provided
  const recurringTemplate = recurrenceId
    ? recurringMovements.find((m) => m.recurrenceId === recurrenceId)
    : undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("loading");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ILocation>({
    address: "",
  });
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<ITransaction | null>(null);

  const isEditing = !!editingMovementId;

  // Pre-populate form when editing an existing movement
  useEffect(() => {
    if (!editingMovement) return;

    setDescription(editingMovement.description);
    setSelectedCategory(editingMovement.category);

    const parsedDate = parseDateFromDDMMYYYY(editingMovement.date);
    if (parsedDate) {
      setSelectedDate(parsedDate);
    }

    // Map transactions from the movement
    const mappedTransactions: ITransaction[] = editingMovement.transactions.map(
      (t, index) => ({
        id: index + 1,
        accountName: t.account,
        amount: t.amount,
        type: t.type,
        transactionID: t.transactionId,
        movementID: t.movementId,
      })
    );
    setTransactions(mappedTransactions);
    setSelectedLocation({ address: editingMovement.location || "" });
  }, [editingMovement]);

  // Pre-populate form when adding from recurring template
  useEffect(() => {
    if (!recurringTemplate || editingMovement) return; // Don't override if editing

    setDescription(recurringTemplate.description);
    setSelectedCategory(recurringTemplate.category);
    // Keep today's date (already set in state initialization)

    // Map transactions from the recurring template
    const mappedTransactions: ITransaction[] =
      recurringTemplate.transactions.map((t, index) => ({
        id: index + 1,
        accountName: t.account,
        amount: t.amount,
        type: t.type,
        // Don't copy transactionId and movementId - these are new transactions
      }));
    setTransactions(mappedTransactions);
    setSelectedLocation({ address: recurringTemplate.location || "" });
  }, [recurringTemplate, editingMovement]);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "transparent", dark: "#1a1a1a" },
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

  const allCategories = categories.map((category) => ({
    label: category.name,
    value: category.name,
  }));

  const allAccounts = accounts.map((account) => ({
    label: account.name,
    value: account.name,
  }));

  const handleTransactionPress = (transaction: ITransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionPicker(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionPicker(true);
  };

  const handleDeleteTransaction = (transaction: ITransaction) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransactions(transactions.filter((t) => t.id !== transaction.id));
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

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Validazione descrizione
    if (!description.trim()) {
      Alert.alert("Errore", "Inserisci una descrizione");
      return;
    }

    // Validazione categoria
    if (!selectedCategory) {
      Alert.alert("Errore", "Seleziona una categoria");
      return;
    }

    // Validazione data
    if (!selectedDate) {
      Alert.alert("Errore", "Seleziona una data");
      return;
    }

    // Validazione transazioni (almeno una con conto e importo validi)
    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );

    if (validTransactions.length === 0) {
      Alert.alert(
        "Errore",
        "Inserisci almeno una transazione con conto e importo validi"
      );
      return;
    }

    // Verifica spreadsheetId
    if (!selectedSpreadsheetId) {
      Alert.alert("Errore", "Nessun foglio di calcolo selezionato");
      return;
    }

    setIsSubmitting(true);
    setModalStatus("loading");
    setShowStatusModal(true);

    try {
      const formattedDate = formatDateToDDMMYYYY(selectedDate);

      // Prepara il movimento con l'array di transazioni (formato IMovementRequest)
      const movementData = {
        movementId:
          isEditing && editingMovementId ? editingMovementId : undefined,
        description: description.trim(),
        category: selectedCategory,
        date: formattedDate,
        location: selectedLocation.address || "",
        transactions: validTransactions.map((transaction) => ({
          amount:
            transaction.type === "income"
              ? String(transaction.amount).replace(".", ",")
              : String(-transaction.amount).replace(".", ","),
          account: transaction.accountName,
          type: transaction.type === "income" ? "in" : "out",
        })),
      };

      let result;
      if (isEditing && editingMovementId) {
        // Update existing movement
        result = await TransactionsApiHelper.updateMovement(
          selectedSpreadsheetId,
          editingMovementId,
          movementData
        );
      } else {
        // Create new movement
        result = await TransactionsApiHelper.createTransaction(
          selectedSpreadsheetId,
          movementData
        );
      }

      const allSuccessful = result !== null;

      if (allSuccessful) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalStatus("success");

        // Reset del form
        setDescription("");
        setSelectedCategory("");
        setSelectedDate(new Date());
        setTransactions([]);
        setSelectedLocation({ address: "" });

        // Ricarica i dati
        await reloadData();

        // Timeout di mezzo secondo, poi chiudi e torna alla dashboard
        setTimeout(() => {
          setShowStatusModal(false);
          router.back();
        }, 500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setModalStatus("error");
      }
    } catch (error) {
      console.error("Errore durante il salvataggio:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setModalStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowStatusModal(false);
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
      height: 180,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
    },
    submitButton: {
      backgroundColor: "#ffffffff",
    },
    submitButtonText: {
      color: "#2F4F3F",
    },
  });

  return (
    <ScreenView>
      <View style={[styles.container, dynamicStyles.container]}>
        <ThemedText type="title" style={styles.title}>
          {isEditing ? "Edit Movement" : "New Movement"}
        </ThemedText>
        <ScrollView showsVerticalScrollIndicator={false}>
          <InputGroup>
            <TextBox
              value={description}
              onChange={setDescription}
              label="Description"
              placeholder="Insert Description"
            />
            <ListPicker
              value={selectedCategory}
              onChange={setSelectedCategory}
              items={allCategories}
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
              onDeletePress={handleDeleteTransaction}
            />
          </InputGroup>

          {/* Location Card */}
          <InputGroup>
            <LocationPicker
              value={selectedLocation.address}
              onChange={setSelectedLocation}
              label="Location"
              placeholder="Enter location"
              googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
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
          accounts={allAccounts}
          onSave={handleTransactionSave}
        />

        <ModalPanel
          isVisible={showStatusModal}
          onClose={handleModalClose}
          onConfirm={handleModalClose}
          title={
            modalStatus === "loading"
              ? "Saving"
              : modalStatus === "success"
              ? "Completed"
              : "Error"
          }
          showCancelButton={modalStatus !== "loading"}
          showConfirmButton={modalStatus !== "loading"}
          confirmText={modalStatus === "success" ? "OK" : "Retry"}
          cancelText="Close"
          maxHeight={250}
        >
          <View style={styles.statusModalContent}>
            {modalStatus === "loading" && (
              <>
                <ActivityIndicator size="large" color="#2F4F3F" />
                <ThemedText style={styles.statusText}>
                  {isEditing ? "Updating movement..." : "Saving movement..."}
                </ThemedText>
              </>
            )}
            {modalStatus === "success" && (
              <>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={48}
                  color="#22c55e"
                />
                <ThemedText style={styles.statusText}>
                  {isEditing
                    ? "Movement updated successfully!"
                    : "Movement saved successfully!"}
                </ThemedText>
              </>
            )}
            {modalStatus === "error" && (
              <>
                <IconSymbol
                  name="xmark.circle.fill"
                  size={48}
                  color="#ef4444"
                />
                <ThemedText style={styles.statusText}>
                  An error occurred while saving.
                </ThemedText>
              </>
            )}
          </View>
        </ModalPanel>
      </View>

      {/* Status Modal (Loading/Success/Error) */}

      {/* Bottom Total and Submit */}
      {
        <View style={[styles.bottomSection, dynamicStyles.totalContainer]}>
          <View
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <ThemedText style={styles.totalLabel}>Total:</ThemedText>
            <ThemedText style={styles.totalAmount}>
              {getTotalAmount().toFixed(2).replace(".", ",")}€
            </ThemedText>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              dynamicStyles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            <ThemedText
              style={[
                styles.submitText,
                isSubmitting && styles.submitTextDisabled,
              ]}
            >
              {isSubmitting ? "Saving" : isEditing ? "Update" : "Insert"}
            </ThemedText>
          </Pressable>
        </View>
      }
    </ScreenView>
  );
};

export default AddView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    fontSize: 22,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowColor: "#000",
  },
  submitText: {
    color: "#2F4F3F",
    fontSize: 18,
    fontWeight: "600",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitTextDisabled: {
    opacity: 0.6,
  },
  statusModalContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 16,
    height: 150,
  },
  statusText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
});

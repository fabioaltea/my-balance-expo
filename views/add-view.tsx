import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import * as Crypto from "expo-crypto";
import { ThemedText } from "@/components/core/themed-text";
import ChipButton from "@/components/ui/chip-button";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Haptics from "expo-haptics";
import Input from "@/components/ui/text-box";
import TextBox from "@/components/ui/text-box";
import Card from "@/components/core/card";
import List from "@/components/ui/list";
import InputGroup from "@/components/ui/input-group";
import DatePicker from "@/components/ui/date-picker";
import ListPicker from "@/components/ui/list-picker";
import Transactions, { ITransaction } from "@/components/ui/transactions";
import TransactionModal, {
  ITransactionData,
} from "@/components/ui/transaction-modal";
import ModalPanel from "@/components/ui/modal-panel";
import GlassButton from "@/components/ui/glass-button";
import ContextMenu, { IContextMenuOption } from "@/components/ui/context-menu";
import RecurrencyPicker from "@/components/ui/recurrency-picker";
import ScreenView from "@/layout/screen-view";
import { useAuthContext, useDataContext } from "@/state";
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from "@/utils/dateUtils";
import { useRouter } from "expo-router";
import IconSymbol from "@/components/ui/icon-symbol";
import LocationPicker, { ILocation } from "@/components/ui/location-picker";
import { useAddMovement, useUpdateMovement, useDeleteMovement } from "@/hooks/mutations";

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
  const { accounts, categories, movements, recurringMovements, unconfirmedMovements } =
    useDataContext();

  // React Query mutations
  const addMovement = useAddMovement();
  const updateMovement = useUpdateMovement();
  const deleteMovement = useDeleteMovement();

  // Find the movement being edited from the global movements list
  // Also search in recurringMovements for editing recurring templates
  // Also search in unconfirmedMovements for editing unconfirmed movements
  const editingMovement = editingMovementId
    ? movements?.find((m) => m.id === editingMovementId) ||
      recurringMovements?.find((m) => m.id === editingMovementId) ||
      unconfirmedMovements?.find((m) => m.id === editingMovementId)
    : undefined;

 
  // Find the recurring movement template if recurrenceId is provided
  const recurringTemplate = recurrenceId
    ? recurringMovements.find((m) => m.recurrenceId === recurrenceId)
    : undefined;

  // Derive submitting state from mutations
  const isSubmitting = addMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [showRecurrencyPicker, setShowRecurrencyPicker] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("");
  const menuButtonRef = useRef<View>(null);

  const isEditing = !!editingMovementId;
  const isEditingRecurring = isEditing && editingMovement && (editingMovement.status?.toLowerCase() === "recurrent" || editingMovement.recurrencePattern);

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
    setRecurrencePattern(editingMovement.recurrencePattern || "");
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
    { light: "transparent", dark: "transparent" },
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

  const handleMenuPress = () => {
    menuButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setButtonPosition({ x: pageX, y: pageY, width, height });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuVisible(true);
  };

  const validateMovement = (): boolean => {
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return false;
    }
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return false;
    }
    if (!selectedDate) {
      Alert.alert("Error", "Please select a date");
      return false;
    }
    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );
    if (validTransactions.length === 0) {
      Alert.alert("Error", "Please add at least one transaction with a valid account and amount");
      return false;
    }
    if (!selectedSpreadsheetId) {
      Alert.alert("Error", "No spreadsheet selected");
      return false;
    }
    return true;
  };

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    if (option === "Save as recurring") {
      if (!validateMovement()) {
        return;
      }
      // Open RecurrencyPicker instead of alert
      setShowRecurrencyPicker(true);
    } else if (option === "Delete movement") {
      handleDeleteMovement();
    }
  };

  const handleRecurrencySave = async (pattern: string) => {
    setShowRecurrencyPicker(false);
    // If editing a recurring movement, just update the pattern state
    if (isEditingRecurring) {
      setRecurrencePattern(pattern);
    } else {
      // Save with the recurrence pattern (new recurring movement)
      await handleSubmit(true, pattern);
    }
  };

  const handleDeleteMovement = async () => {
    Alert.alert(
      "Delete Movement",
      "Are you sure you want to delete this movement? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!selectedSpreadsheetId || !editingMovementId) return;

            setModalStatus("loading");
            setShowStatusModal(true);

            try {
              // Use React Query mutation for delete
              await deleteMovement.mutateAsync({
                movementId: editingMovementId,
              });

              // Success - mutation handles cache invalidation automatically
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setModalStatus("success");
              setTimeout(() => {
                setShowStatusModal(false);
                router.back();
              }, 100);
            } catch (error) {
              console.error("Error deleting movement:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setModalStatus("error");
            }
          },
        },
      ]
    );
  };

  const getMenuOptions = (): IContextMenuOption[] => {
    if (isEditing) {
      return [
        {
          label: "Delete movement",
          icon: "trash-outline",
          destructive: true,
        },
      ];
    }
    return [
      {
        label: "Save as recurring",
        icon: "repeat-outline",
      },
    ];
  };

  const handleSubmit = async (asRecurrent: boolean = false, newRecurrencePattern?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!validateMovement()) {
      return;
    }

    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );

    setShowStatusModal(true);

    try {
      const formattedDate = formatDateToDDMMYYYY(selectedDate);

      // Prepare movement data with transactions array (IMovementRequest format)
      const movementData: Record<string, any> = {
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

      // If the movement should be saved as recurring, add recurrenceId, status, and pattern
      if (asRecurrent && !isEditing) {
        movementData.recurrenceId = Crypto.randomUUID();
        movementData.status = "recurrent";
        if (newRecurrencePattern) {
          movementData.recurrencePattern = newRecurrencePattern;
        }
      }

      // If this is a new movement created from a recurring template, link it to the template
      if (recurrenceId && recurringTemplate && !isEditing && !asRecurrent) {
        movementData.recurrenceId = recurrenceId;
      }

      // If editing a recurring movement, preserve recurrence data
      if (isEditingRecurring && editingMovement) {
        movementData.recurrenceId = editingMovement.recurrenceId;
        movementData.status = "recurrent";
        movementData.recurrencePattern = recurrencePattern;
      }

      if (isEditing && editingMovementId) {
        // Update existing movement using React Query mutation
        await updateMovement.mutateAsync({
          movementId: editingMovementId,
          ...movementData,
        });
      } else {
        // Create new movement using React Query mutation
        await addMovement.mutateAsync(movementData);
      }

      // Success - mutation hooks handle cache invalidation automatically
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalStatus("success");

      // For recurring saves, stay on page with form still filled
      // For normal saves, reset form and go back
      if (asRecurrent && !isEditing) {
        setTimeout(() => {
          setShowStatusModal(false);
        }, 100);
      } else {
        // Reset form
        setDescription("");
        setSelectedCategory("");
        setSelectedDate(new Date());
        setTransactions([]);
        setSelectedLocation({ address: "" });

        setTimeout(() => {
          setShowStatusModal(false);
          router.back();
        }, 100);
      }
    } catch (error) {
      console.error("Error saving movement:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setModalStatus("error");
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
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {isEditingRecurring ? "Edit Recurrent" : isEditing ? "Edit Movement" : "New Movement"}
          </ThemedText>
          <View ref={menuButtonRef} collapsable={false}>
            <GlassButton
              type="menu"
              size={20}
              onPress={handleMenuPress}
              accessibilityLabel="Menu opzioni"
            />
          </View>
          {menuVisible && buttonPosition && (
            <ContextMenu
              options={getMenuOptions()}
              selectedOption=""
              onSelectOption={handleMenuOption}
              onDismiss={() => setMenuVisible(false)}
              buttonPosition={buttonPosition}
            />
          )}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ overflow: "visible" }}>
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
              label={isEditingRecurring ? "Start" : "Date"}
            />
          </InputGroup>

          {/* Recurrence Pattern - only visible when editing a recurring movement */}
          {isEditingRecurring && (
            <InputGroup>
              <Pressable
                onPress={() => setShowRecurrencyPicker(true)}
                style={styles.recurrenceField}
              >
                <ThemedText style={styles.recurrenceLabel}>Recurrence</ThemedText>
                <View style={styles.recurrenceValueContainer}>
                  <ThemedText style={styles.recurrenceValue}>
                    {recurrencePattern || "Not set"}
                  </ThemedText>
                  <IconSymbol name="chevron-right" size={16} color={placeholderColor} />
                </View>
              </Pressable>
            </InputGroup>
          )}

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

        {/* Recurrency Picker Modal */}
        <RecurrencyPicker
          isVisible={showRecurrencyPicker}
          onClose={() => setShowRecurrencyPicker(false)}
          onSave={handleRecurrencySave}
          startDate={selectedDate}
          initialPattern={isEditingRecurring ? recurrencePattern : undefined}
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
                  name="check-circle"
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
                  name="close-circle"
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
            onPress={() => handleSubmit()}
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    flex: 1,
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
  recurrenceField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  recurrenceLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  recurrenceValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recurrenceValue: {
    fontSize: 16,
    opacity: 0.7,
  },
});

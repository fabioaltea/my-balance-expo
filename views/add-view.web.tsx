import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import * as Crypto from "expo-crypto";
import { ThemedText } from "@/components/core/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import TextBox from "@/components/ui/text-box";
import InputGroup from "@/components/ui/input-group";
import ContextMenu, { IContextMenuOption } from "@/components/ui/context-menu";
import RecurrencyPicker from "@/components/ui/recurrency-picker";
import ScreenView from "@/layout/screen-view";
import { useAuthContext, useDataContext } from "@/state";
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from "@/utils/dateUtils";
import { useRouter } from "expo-router";
import { ITransaction } from "@/components/ui/transactions";
import { useAddMovement, useUpdateMovement, useDeleteMovement } from "@/hooks/mutations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import InlineCurrencyInput from "@/components/ui/inline-currency-input";

export type ToastStatus = "loading" | "success" | "error";

interface AddViewProps {
  editingMovementId?: string;
  recurrenceId?: string;
  onClose?: () => void;
  onToast?: (status: ToastStatus) => void;
}

const AddView: React.FC<AddViewProps> = ({
  editingMovementId,
  recurrenceId,
  onClose,
  onToast,
}) => {
  const router = useRouter();

  const closeView = () => {
    onClose ? onClose() : router.back();
  };
  const { selectedSpreadsheetId } = useAuthContext();
  const { accounts, categories, movements, recurringMovements, unconfirmedMovements } =
    useDataContext();

  // React Query mutations
  const addMovement = useAddMovement();
  const updateMovement = useUpdateMovement();
  const deleteMovement = useDeleteMovement();

  // Find the movement being edited
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

  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
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
    setRecurrencePattern(editingMovement.recurrencePattern || "");
  }, [editingMovement]);

  // Pre-populate form when adding from recurring template
  useEffect(() => {
    if (!recurringTemplate || editingMovement) return;

    setDescription(recurringTemplate.description);
    setSelectedCategory(recurringTemplate.category);

    const mappedTransactions: ITransaction[] =
      recurringTemplate.transactions.map((t, index) => ({
        id: index + 1,
        accountName: t.account,
        amount: t.amount,
        type: t.type,
      }));
    setTransactions(mappedTransactions);
  }, [recurringTemplate, editingMovement]);

  // Theme colors
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#aaa", dark: "#666" },
    "tabIconDefault"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
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

  // --- Transaction inline handlers ---

  const handleAddTransaction = () => {
    const newId = Math.max(...transactions.map((t) => t.id), 0) + 1;
    setTransactions([
      ...transactions,
      { id: newId, accountName: "", amount: 0, type: "expense" },
    ]);
  };

  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleTransactionAccountChange = (id: number, accountName: string) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, accountName } : t))
    );
  };

  const handleTransactionAmountChange = (id: number, amount: number) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, amount: Math.abs(amount) } : t))
    );
  };

  const handleTransactionTypeToggle = (id: number) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id
          ? { ...t, type: t.type === "income" ? "expense" : "income" }
          : t
      )
    );
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
  };

  // --- Date helpers ---
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (text: string) => {
    if (!text) return;
    const [year, month, day] = text.split("-").map(Number);
    const newDate = new Date(year, month - 1, day);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  // --- Menu ---
  const handleMenuPress = () => {
    menuButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setButtonPosition({ x: pageX, y: pageY, width, height });
    });
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
      if (!validateMovement()) return;
      setShowRecurrencyPicker(true);
    } else if (option === "Delete movement") {
      handleDeleteMovement();
    }
  };

  const handleRecurrencySave = async (pattern: string) => {
    setShowRecurrencyPicker(false);
    if (isEditingRecurring) {
      setRecurrencePattern(pattern);
    } else {
      await handleSubmit(true, pattern);
    }
  };

  const handleDeleteMovement = async () => {
    if (!confirm("Are you sure you want to delete this movement? This action cannot be undone.")) return;
    if (!selectedSpreadsheetId || !editingMovementId) return;

    onToast?.("loading");
    closeView();

    try {
      await deleteMovement.mutateAsync({ movementId: editingMovementId });
      onToast?.("success");
    } catch (error) {
      console.error("Error deleting movement:", error);
      onToast?.("error");
    }
  };

  const isFormValid = (): boolean => {
    if (!description.trim()) return false;
    if (!selectedCategory) return false;
    if (!selectedDate) return false;
    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );
    if (validTransactions.length === 0) return false;
    if (!selectedSpreadsheetId) return false;
    return true;
  };

  const getMenuOptions = (): IContextMenuOption[] => {
    if (isEditing) {
      return [{ label: "Delete movement", icon: "trash-outline", destructive: true }];
    }
    return [{ label: "Save as recurring", icon: "repeat-outline", disabled: !isFormValid() }];
  };

  const handleSubmit = async (asRecurrent: boolean = false, newRecurrencePattern?: string) => {
    if (!validateMovement()) return;

    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );

    // Capture form values before closing
    const formattedDate = formatDateToDDMMYYYY(selectedDate);
    const movementData: Record<string, any> = {
      movementId: isEditing && editingMovementId ? editingMovementId : undefined,
      description: description.trim(),
      category: selectedCategory,
      date: formattedDate,
      location: "",
      transactions: validTransactions.map((transaction) => ({
        amount:
          transaction.type === "income"
            ? String(transaction.amount).replace(".", ",")
            : String(-transaction.amount).replace(".", ","),
        account: transaction.accountName,
        type: transaction.type === "income" ? "in" : "out",
      })),
    };

    if (asRecurrent && !isEditing) {
      movementData.recurrenceId = Crypto.randomUUID();
      movementData.status = "recurrent";
      if (newRecurrencePattern) {
        movementData.recurrencePattern = newRecurrencePattern;
      }
    }

    if (recurrenceId && recurringTemplate && !isEditing && !asRecurrent) {
      movementData.recurrenceId = recurrenceId;
    }

    if (isEditingRecurring && editingMovement) {
      movementData.recurrenceId = editingMovement.recurrenceId;
      movementData.status = "recurrent";
      movementData.recurrencePattern = recurrencePattern;
    }

    // Close panel immediately and show toast (except for recurring saves)
    onToast?.("loading");
    if (!asRecurrent || isEditing) {
      closeView();
    }

    try {
      if (isEditing && editingMovementId) {
        await updateMovement.mutateAsync({
          movementId: editingMovementId,
          ...movementData,
        });
      } else {
        await addMovement.mutateAsync(movementData);
      }

      onToast?.("success");
    } catch (error) {
      console.error("Error saving movement:", error);
      onToast?.("error");
    }
  };

  return (
    <ScreenView>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {isEditingRecurring ? "Edit Recurrent" : isEditing ? "Edit Movement" : "New Movement"}
          </ThemedText>
          <View ref={menuButtonRef} collapsable={false}>
            <Pressable
              onPress={handleMenuPress}
              style={styles.iconButton}
              accessibilityLabel="Menu options"
            >
              <MaterialIcons name="more-vert" size={20} color={textColor} />
            </Pressable>
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

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Description + Category + Date */}
          <InputGroup>
            <TextBox
              value={description}
              onChange={setDescription}
              label="Description"
              placeholder="Insert Description"
            />

            {/* Category — native HTML select */}
            <View style={styles.fieldRow}>
              <ThemedText type="default" style={styles.fieldLabel}>
                Category
              </ThemedText>
              <View style={styles.fieldValue}>
                {/* @ts-ignore — HTML select element for web */}
                <select
                  value={selectedCategory}
                  onChange={(e: any) => setSelectedCategory(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 18,
                    textAlign: "right",
                    color: selectedCategory ? textColor : placeholderColor,
                    backgroundColor: "transparent",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    width: "100%",
                  }}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {allCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </View>
            </View>

            {/* Date — native HTML date input */}
            <View style={styles.fieldRow}>
              <ThemedText type="default" style={styles.fieldLabel}>
                {isEditingRecurring ? "Start" : "Date"}
              </ThemedText>
              <View style={styles.fieldValue}>
                {/* @ts-ignore — HTML input element for web */}
                <input
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={(e: any) => handleDateChange(e.target.value)}
                  style={{
                    flex: 1,
                    textAlign: "right" as any,
                    fontSize: 18,
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: textColor,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    cursor: "pointer",
                  }}
                />
              </View>
            </View>
          </InputGroup>

          {/* Recurrence Pattern — only when editing recurring */}
          {isEditingRecurring && (
            <InputGroup>
              <Pressable
                onPress={() => setShowRecurrencyPicker(true)}
                style={styles.fieldRow}
              >
                <ThemedText type="default" style={styles.fieldLabel}>
                  Recurrence
                </ThemedText>
                <View style={[styles.fieldValue, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                  <ThemedText style={{ fontSize: 16, opacity: 0.7, color: textColor }}>
                    {recurrencePattern || "Not set"}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={16} color={placeholderColor} />
                </View>
              </Pressable>
            </InputGroup>
          )}

          {/* Transactions — inline list */}
          <InputGroup label="Transactions">
            {transactions.map((t) => (
              <View key={t.id} style={[styles.transactionRow, { borderBottomColor: borderColor }]}>
                {/* Type toggle */}
                <Pressable
                  onPress={() => handleTransactionTypeToggle(t.id)}
                  style={[
                    styles.typeToggle,
                    { backgroundColor: t.type === "income" ? "#22c55e20" : "#ef444420" },
                  ]}
                >
                  <MaterialIcons
                    name={t.type === "income" ? "arrow-downward" : "arrow-upward"}
                    size={16}
                    color={t.type === "income" ? "#22c55e" : "#ef4444"}
                  />
                </Pressable>

                {/* Account dropdown */}
                {/* @ts-ignore — HTML select for web */}
                <select
                  value={t.accountName}
                  onChange={(e: any) =>
                    handleTransactionAccountChange(t.id, e.target.value)
                  }
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: t.accountName ? textColor : placeholderColor,
                    backgroundColor: "transparent",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    marginLeft: 8,
                  }}
                >
                  <option value="" disabled>
                    Account
                  </option>
                  {allAccounts.map((acc) => (
                    <option key={acc.value} value={acc.value}>
                      {acc.label}
                    </option>
                  ))}
                </select>

                {/* Amount input */}
                <InlineCurrencyInput
                  value={t.amount}
                  onChange={(amount) => handleTransactionAmountChange(t.id, amount)}
                  placeholderColor={placeholderColor}
                />

                <ThemedText style={{ fontSize: 14, opacity: 0.5, marginRight: 8 }}>
                  €
                </ThemedText>

                {/* Delete button */}
                <Pressable
                  onPress={() => handleDeleteTransaction(t.id)}
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}

            {/* Add transaction button */}
            <Pressable onPress={handleAddTransaction} style={styles.addButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
            </Pressable>
          </InputGroup>
        </ScrollView>

        {/* Recurrency Picker Modal */}
        <RecurrencyPicker
          isVisible={showRecurrencyPicker}
          onClose={() => setShowRecurrencyPicker(false)}
          onSave={handleRecurrencySave}
          startDate={selectedDate}
          initialPattern={isEditingRecurring ? recurrencePattern : undefined}
        />

      </View>

      {/* Bottom Total and Submit */}
      <View style={styles.bottomSection}>
        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Total:</ThemedText>
          <ThemedText style={styles.totalAmount}>
            {getTotalAmount().toFixed(2).replace(".", ",")}€
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleSubmit()}
          disabled={isSubmitting || !isFormValid()}
          style={[
            styles.submitButton,
            (isSubmitting || !isFormValid()) && styles.submitButtonDisabled,
          ]}
        >
          <ThemedText style={[styles.submitText, (isSubmitting || !isFormValid()) && { opacity: 0.6 }]}>
            {isSubmitting ? "Saving" : isEditing ? "Update" : "Insert"}
          </ThemedText>
        </Pressable>
      </View>
    </ScreenView>
  );
};

export default AddView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  iconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(47, 79, 63, 0.08)",
  },
  fieldRow: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 5,
    alignItems: "center",
    flex: 1,
  },
  fieldLabel: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 80,
    maxWidth: 120,
  },
  fieldValue: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  dateInput: {
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0,
  } as any,
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  typeToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "#2F4F3F",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
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
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
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
});

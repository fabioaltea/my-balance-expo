import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as Crypto from "expo-crypto";
import { ThemedText } from "@/src/components/core/themed-text";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import TextBox from "@/src/components/ui/text-box";
import InputGroup from "@/src/components/ui/input-group";
import { useAuthContext, useDataContext } from "@/src/state";
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from "@/src/utils/dateUtils";
import { useRouter } from "expo-router";
import { ITransaction } from "@/src/components/ui/transactions";
import TransactionsWeb from "@/src/components/ui/transactions.web";
import { useAddMovement, useUpdateMovement, useDeleteMovement } from "@/src/hooks/mutations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import LocationPicker, { ILocation } from "@/src/components/ui/location-picker";
import RecurrencePickerWeb from "@/src/components/ui/recurrence-picker.web";
import { ScreenView } from "../components";

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
  const [selectedLocation, setSelectedLocation] = useState<ILocation>({ address: "" });
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceSelection, setRecurrenceSelection] = useState<string>("new");
  const [recurrenceUnit, setRecurrenceUnit] = useState<string>("M");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<number>(1);

  const recurrencePattern = `P${recurrenceFrequency}${recurrenceUnit}`;

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

    setSelectedLocation({ address: editingMovement.location || "" });

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
    if (editingMovement.recurrencePattern) {
      const match = editingMovement.recurrencePattern.match(/^P(\d+)([DWMY])$/);
      if (match) {
        setRecurrenceFrequency(parseInt(match[1], 10));
        setRecurrenceUnit(match[2]);
      }
    }
    // Pre-populate recurrence link for non-template movements
    if (editingMovement.recurrenceId && editingMovement.status?.toLowerCase() !== "recurrent") {
      setIsRecurrent(true);
      setRecurrenceSelection(editingMovement.recurrenceId);
    }
  }, [editingMovement]);

  // Pre-populate form when adding from recurring template
  useEffect(() => {
    if (!recurringTemplate || editingMovement) return;

    setDescription(recurringTemplate.description);
    setSelectedCategory(recurringTemplate.category);
    setSelectedLocation({ address: recurringTemplate.location || "" });

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

  // --- Menu action handler ---
  const handleMenuAction = (value: string) => {
    if (value === "delete") {
      handleDeleteMovement();
    }
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
    if (isRecurrent && recurrenceSelection === "new" && !recurrencePattern) return false;
    if (isRecurrent && recurrenceSelection !== "new" && !recurrenceSelection) return false;
    return true;
  };


  const handleSubmit = async () => {
    if (!validateMovement()) return;

    const validTransactions = transactions.filter(
      (t) => t.accountName && t.amount > 0
    );

    const formattedDate = formatDateToDDMMYYYY(selectedDate);
    const transactionsData = validTransactions.map((transaction) => ({
      amount:
        transaction.type === "income"
          ? String(transaction.amount).replace(".", ",")
          : String(-transaction.amount).replace(".", ","),
      account: transaction.accountName,
      type: (transaction.type === "income" ? "in" : "out") as "in" | "out",
    }));

    const baseData = {
      description: description.trim(),
      category: selectedCategory,
      date: formattedDate,
      location: selectedLocation.address || "",
      transactions: transactionsData,
    };

    onToast?.("loading");
    closeView();

    try {
      if (isEditing && editingMovementId) {
        // Editing existing movement or recurring template
        const movementData: Record<string, any> = {
          movementId: editingMovementId,
          ...baseData,
        };
        if (isEditingRecurring && editingMovement) {
          movementData.recurrenceId = editingMovement.recurrenceId;
          movementData.status = "recurrent";
          movementData.recurrencePattern = recurrencePattern;
        } else if (isRecurrent && recurrenceSelection !== "new") {
          // Link to existing recurrence
          movementData.recurrenceId = recurrenceSelection;
        } else if (isRecurrent && recurrenceSelection === "new") {
          // Create new recurrence template, then link this movement
          const newRecurrenceId = Crypto.randomUUID();
          await addMovement.mutateAsync({
            ...baseData,
            recurrenceId: newRecurrenceId,
            status: "recurrent",
            recurrencePattern,
          });
          movementData.recurrenceId = newRecurrenceId;
        }
        await updateMovement.mutateAsync({
          movementId: editingMovementId,
          ...movementData,
        });
      } else if (isRecurrent && recurrenceSelection === "new") {
        // Create new recurring template + linked movement
        const newRecurrenceId = Crypto.randomUUID();
        await addMovement.mutateAsync({
          ...baseData,
          recurrenceId: newRecurrenceId,
          status: "recurrent",
          recurrencePattern,
        });
        await addMovement.mutateAsync({
          ...baseData,
          recurrenceId: newRecurrenceId,
        });
      } else if (isRecurrent && recurrenceSelection !== "new") {
        // Link to existing recurrence
        await addMovement.mutateAsync({
          ...baseData,
          recurrenceId: recurrenceSelection,
        });
      } else {
        // Regular movement (or from recurring template via prop)
        const movementData: Record<string, any> = { ...baseData };
        if (recurrenceId && recurringTemplate) {
          movementData.recurrenceId = recurrenceId;
        }
        await addMovement.mutateAsync(movementData as any);
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
            {isEditingRecurring
              ? "Edit Recurrent"
              : isEditing
                ? "Edit Movement"
                : "New Movement"}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isEditing && (
              <View style={styles.iconButton}>
                <MaterialIcons name="more-vert" size={20} color={textColor} />
                {/* @ts-ignore — HTML select element for web */}
                <select
                  value=""
                  onChange={(e: any) => {
                    handleMenuAction(e.target.value);
                    e.target.value = "";
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled />
                  <option value="delete">Delete movement</option>
                </select>
              </View>
            )}
            <Pressable onPress={closeView} style={styles.iconButton}>
              <MaterialIcons name="close" size={20} color={textColor} />
            </Pressable>
          </View>
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
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: textColor,
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    cursor: "pointer",
                  }}
                />
              </View>
            </View>
          </InputGroup>

          {/* Recurrence Pattern — only when editing recurring */}
          {isEditingRecurring && (
            <InputGroup label="Recurrence">
              <View style={styles.fieldRow}>
                <ThemedText type="default" style={styles.fieldLabel}>
                  Repeat
                </ThemedText>
                <View style={styles.fieldValue}>
                  {/* @ts-ignore — HTML select for web */}
                  <select
                    value={recurrenceUnit}
                    onChange={(e: any) => setRecurrenceUnit(e.target.value)}
                    style={{
                      flex: 1,
                      fontSize: 18,
                      textAlign: "right",
                      color: textColor,
                      backgroundColor: "transparent",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      width: "100%",
                    }}
                  >
                    <option value="D">Daily</option>
                    <option value="W">Weekly</option>
                    <option value="M">Monthly</option>
                    <option value="Y">Yearly</option>
                  </select>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <ThemedText type="default" style={styles.fieldLabel}>
                  Every
                </ThemedText>
                <View style={styles.fieldValue}>
                  {/* @ts-ignore — HTML select for web */}
                  <select
                    value={recurrenceFrequency}
                    onChange={(e: any) =>
                      setRecurrenceFrequency(Number(e.target.value))
                    }
                    style={{
                      flex: 1,
                      fontSize: 18,
                      textAlign: "right",
                      color: textColor,
                      backgroundColor: "transparent",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      width: "100%",
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </View>
              </View>
            </InputGroup>
          )}

          {/* Transactions — inline list */}
          <InputGroup label="Transactions">
            <TransactionsWeb
              transactions={transactions}
              accounts={allAccounts}
              onTypeToggle={handleTransactionTypeToggle}
              onAccountChange={handleTransactionAccountChange}
              onAmountChange={handleTransactionAmountChange}
              onDelete={handleDeleteTransaction}
              onAdd={handleAddTransaction}
            />
          </InputGroup>

          {/* Recurrence section — for new movements and editing non-recurring */}
          {!isEditingRecurring && !recurrenceId && (
            <InputGroup label="Recurrence">
              <RecurrencePickerWeb
                isRecurrent={isRecurrent}
                onToggle={() => setIsRecurrent(!isRecurrent)}
                recurrenceSelection={recurrenceSelection}
                onSelectionChange={setRecurrenceSelection}
                recurrenceUnit={recurrenceUnit}
                onUnitChange={setRecurrenceUnit}
                recurrenceFrequency={recurrenceFrequency}
                onFrequencyChange={setRecurrenceFrequency}
                recurringMovements={recurringMovements}
              />
            </InputGroup>
          )}

          {/* Location */}
          <InputGroup>
            <LocationPicker
              value={selectedLocation.address}
              onChange={setSelectedLocation}
              label="Location"
              placeholder="Enter location"
              googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY}
            />
          </InputGroup>

          {/* Spacer to scroll content above the bottom section */}
          <View style={{ height: 160 }} />
        </ScrollView>
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
          <ThemedText
            style={[
              styles.submitText,
              (isSubmitting || !isFormValid()) && { opacity: 0.6 },
            ]}
          >
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
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    padding:10
  },
  title: {
    flex: 1,
    textAlign: "left",
  },
  iconButton: {
    padding: 10,
    borderRadius: 15,
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
    minWidth: 100,
    maxWidth: 140,
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

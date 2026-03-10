import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Switch,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import * as Haptics from "expo-haptics";
import InputGroup from "@/src/components/ui/input-group";
import TransactionModal, {
  ITransactionData,
} from "@/src/components/ui/transaction-modal";
import GlassButton from "@/src/components/ui/glass-button";
import ContextMenu, { IContextMenuOption } from "@/src/components/ui/context-menu";
import RecurrencyPicker from "@/src/components/ui/recurrency-picker";
import { useAuthContext, useDataContext } from "@/src/state";
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from "@/src/utils/dateUtils";
import { useRouter } from "expo-router";
import IconSymbol from "@/src/components/ui/icon-symbol";
import LocationPicker, { ILocation } from "@/src/components/ui/location-picker";
import { useAddMovement, useUpdateMovement, useDeleteMovement } from "@/src/hooks/mutations";
import type { Movement } from "@/src/state";
import TextBox from "@/src/components/ui/text-box";
import ListPicker from "@/src/components/ui/list-picker.native";
import DatePicker from "@/src/components/ui/date-picker.native";
import { ThemedText } from "@/src/components/core/themed-text.native";
import { ScreenView } from "../components";
import Transactions, { ITransaction } from "../components/ui/transactions.native";

export type ToastStatus = "loading" | "success" | "error";

interface AddViewProps {
  editingMovementId?: string;
  recurrenceId?: string;
  initialMovement?: Partial<Movement>;
  onClose?: () => void;
  onToast?: (status: ToastStatus) => void;
}

const AddView: React.FC<AddViewProps> = ({
  editingMovementId,
  recurrenceId,
  initialMovement,
  onClose,
  onToast,
}) => {
  console.log("[AddView.native] render");
  const router = useRouter();

  const closeView = () => {
    onClose ? onClose() : router.back();
  };

  const { selectedSpreadsheetId } = useAuthContext();
  const { accounts, categories, movements, recurringMovements, unconfirmedMovements } =
    useDataContext();
  console.log("[AddView.native] accounts:", accounts?.length, "categories:", categories?.length, "movements:", movements?.length);

  // React Query mutations
  const addMovement = useAddMovement();
  const updateMovement = useUpdateMovement();
  const deleteMovement = useDeleteMovement();

  // Find the movement being edited from the global movements list
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
  const [selectedLocation, setSelectedLocation] = useState<ILocation>({
    address: "",
  });
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<ITransaction | null>(null);
  const [showRecurrencyPicker, setShowRecurrencyPicker] = useState(false);
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceSelection, setRecurrenceSelection] = useState<string>("new");
  const [recurrenceUnit, setRecurrenceUnit] = useState<string>("M");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<number>(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(new Date());
  const [hasRecurrencePattern, setHasRecurrencePattern] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const recurrencePattern = hasRecurrencePattern ? `P${recurrenceFrequency}${recurrenceUnit}` : null;

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

    if (editingMovement.recurrencePattern) {
      const match = editingMovement.recurrencePattern.match(/^P(\d+)([DWMY])$/);
      if (match) {
        setRecurrenceFrequency(parseInt(match[1], 10));
        setRecurrenceUnit(match[2]);
        setHasRecurrencePattern(true);
      }
    }
    // Set recurrence start date from the movement date
    const recStartDate = parseDateFromDDMMYYYY(editingMovement.date);
    if (recStartDate) {
      setRecurrenceStartDate(recStartDate);
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

    const mappedTransactions: ITransaction[] =
      recurringTemplate.transactions.map((t, index) => ({
        id: index + 1,
        accountName: t.account,
        amount: t.amount,
        type: t.type,
      }));
    setTransactions(mappedTransactions);
    setSelectedLocation({ address: recurringTemplate.location || "" });
  }, [recurringTemplate, editingMovement]);

  // Pre-populate form from OCR/initial movement data
  useEffect(() => {
    if (!initialMovement || editingMovement || recurringTemplate) return;

    if (initialMovement.description) setDescription(initialMovement.description);
    if (initialMovement.category) setSelectedCategory(initialMovement.category);
    if (initialMovement.date) {
      const parsedDate = parseDateFromDDMMYYYY(initialMovement.date);
      if (parsedDate) setSelectedDate(parsedDate);
    }
    if (initialMovement.location) {
      setSelectedLocation({ address: initialMovement.location });
    }
    if (initialMovement.transactions && initialMovement.transactions.length > 0) {
      const mappedTransactions: ITransaction[] = initialMovement.transactions.map(
        (t, index) => ({
          id: index + 1,
          accountName: t.account,
          amount: t.amount,
          type: t.type,
        })
      );
      setTransactions(mappedTransactions);
    }
  }, [initialMovement]);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "transparent", dark: "transparent" },
    "background"
  );
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault"
  );
  const menuBackground = useThemeColor({}, "menuBackground");

  // Scroll fade animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const allCategories = categories.map((category) => ({
    label: category.name,
    value: category.name,
  }));

  const allAccounts = accounts.map((account) => ({
    label: account.name,
    value: account.name,
  }));

  // Build recurrence options for ListPicker (existing recurrences + "new")
  const recurrenceOptions = [
    { label: "New recurrence", value: "new" },
    ...recurringMovements.map((m) => ({
      label: m.description,
      value: m.recurrenceId || m.id,
    })),
  ];

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
    if (!data.accountName || data.amount <= 0) {
      Alert.alert("Error, please complete all fields with valid data");
      return;
    }

    if (editingTransaction) {
      setTransactions(
        transactions.map((t) =>
          t.id === editingTransaction.id ? { ...t, ...data } : t
        )
      );
    } else {
      const newTransaction: ITransaction = {
        id: Math.max(...transactions.map((t) => t.id), 0) + 1,
        ...data,
      };
      setTransactions([...transactions, newTransaction]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTransactionPicker(false);
    setEditingTransaction(null);
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
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

  const handleMenuAction = (option: string) => {
    if (option === "Delete movement") {
      handleDeleteMovement();
    }
  };

  const handleRecurrencySave = (pattern: string | null, startDate: Date) => {
    setShowRecurrencyPicker(false);
    setRecurrenceStartDate(startDate);
    if (pattern) {
      const match = pattern.match(/^P(\d+)([DWMY])$/);
      if (match) {
        setRecurrenceFrequency(parseInt(match[1], 10));
        setRecurrenceUnit(match[2]);
        setHasRecurrencePattern(true);
      }
    } else {
      setHasRecurrencePattern(false);
    }
  };

  const handleDeleteMovement = async () => {
    Alert.alert(
      "Delete Movement",
      "Are you sure you want to delete this movement? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!selectedSpreadsheetId || !editingMovementId) return;

            onToast?.("loading");
            closeView();

            try {
              await deleteMovement.mutateAsync({
                movementId: editingMovementId,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onToast?.("success");
            } catch (error) {
              console.error("Error deleting movement:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              onToast?.("error");
            }
          },
        },
      ]
    );
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
    // recurrencePattern can be null (no pattern) — that's valid
    if (isRecurrent && recurrenceSelection !== "new" && !recurrenceSelection) return false;
    return true;
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
    return [];
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

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

    const formattedRecurrenceStartDate = formatDateToDDMMYYYY(recurrenceStartDate);

    onToast?.("loading");
    closeView();

    try {
      if (isEditing && editingMovementId) {
        const movementData: Record<string, any> = {
          movementId: editingMovementId,
          ...baseData,
        };
        if (isEditingRecurring && editingMovement) {
          movementData.recurrenceId = editingMovement.recurrenceId;
          movementData.status = "recurrent";
          movementData.recurrencePattern = recurrencePattern || undefined;
          movementData.date = formattedRecurrenceStartDate;
        } else if (isRecurrent && recurrenceSelection !== "new") {
          movementData.recurrenceId = recurrenceSelection;
        } else if (isRecurrent && recurrenceSelection === "new") {
          const newRecurrenceId = Crypto.randomUUID();
          await addMovement.mutateAsync({
            ...baseData,
            date: formattedRecurrenceStartDate,
            recurrenceId: newRecurrenceId,
            status: "recurrent",
            recurrencePattern: recurrencePattern || undefined,
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
          date: formattedRecurrenceStartDate,
          recurrenceId: newRecurrenceId,
          status: "recurrent",
          recurrencePattern: recurrencePattern || undefined,
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onToast?.("success");
    } catch (error) {
      console.error("Error saving movement:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onToast?.("error");
    }
  };

  return (
    <ScreenView>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {isEditingRecurring
              ? "Edit Recurrent"
              : isEditing
                ? "Edit Movement"
                : "New Movement"}
          </ThemedText>
          {isEditing && (
            <GlassButton
              type="menu"
              size={20}
              onPress={() => {}}
              accessibilityLabel="Menu opzioni"
              contextMenuActivationMethod="longPress"
              contextMenuOptions={getMenuOptions()}
              onContextMenuSelect={handleMenuAction}
            />
          )}
        </View>

        <Animated.View
          style={{ height: 20, marginBottom: -20, zIndex: 1, opacity: fadeOpacity }}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[menuBackground, menuBackground + "00"]}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <Animated.ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
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

          {/* Recurrence Pattern — only when editing recurring */}
          {isEditingRecurring && (
            <InputGroup>
              <Pressable
                onPress={() => setShowRecurrencyPicker(true)}
                style={styles.recurrenceField}
              >
                <ThemedText style={styles.recurrenceLabel}>
                  Recurrence
                </ThemedText>
                <View style={styles.recurrenceValueContainer}>
                  <ThemedText style={styles.recurrenceValue}>
                    {recurrencePattern ?? "Not set"}
                  </ThemedText>
                  <IconSymbol
                    name="chevron-right"
                    size={16}
                    color={placeholderColor}
                  />
                </View>
              </Pressable>
            </InputGroup>
          )}

          {/* Transactions Component */}
          <InputGroup label="Transactions">
            <Transactions
              transactions={transactions}
              onAddPress={handleAddTransaction}
              onDeletePress={handleDeleteTransaction} 
              onTransactionPress={handleTransactionPress}
                          />
          </InputGroup>

          {/* Recurrence section — for new movements and editing non-recurring */}
          {!isEditingRecurring && !recurrenceId && (
            <InputGroup label="Recurrence">
              <View style={styles.recurrenceToggleRow}>
                <ThemedText style={styles.recurrenceLabel}>
                  Make recurring
                </ThemedText>
                <Switch
                  trackColor={{ true: "#2F4F3F" }}
                  ios_backgroundColor="#ccc"
                  onValueChange={() => setIsRecurrent(!isRecurrent)}
                  value={isRecurrent}
                />
              </View>
              {isRecurrent && (
                <>
                  <ListPicker
                    value={recurrenceSelection}
                    onChange={setRecurrenceSelection}
                    items={recurrenceOptions}
                    label="Link to"
                    placeholder="Select recurrence"
                  />
                  {recurrenceSelection === "new" && (
                    <Pressable
                      onPress={() => setShowRecurrencyPicker(true)}
                      style={styles.recurrenceField}
                    >
                      <ThemedText style={styles.recurrenceLabel}>
                        Pattern
                      </ThemedText>
                      <View style={styles.recurrenceValueContainer}>
                        <ThemedText style={styles.recurrenceValue}>
                          {recurrencePattern ?? "Not set"}
                        </ThemedText>
                        <IconSymbol
                          name="chevron-right"
                          size={16}
                          color={placeholderColor}
                        />
                      </View>
                    </Pressable>
                  )}
                </>
              )}
            </InputGroup>
          )}

          {/* Location */}
          <InputGroup>
            <LocationPicker
              value={selectedLocation.address}
              onChange={setSelectedLocation}
              label="Location"
              placeholder="Enter location"
              googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
          </InputGroup>

          {/* Spacer to scroll content above the bottom section */}
          <View style={{ height: 160 + keyboardHeight }} />
        </Animated.ScrollView>

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
          startDate={recurrenceStartDate}
          initialPattern={recurrencePattern}
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
          onPress={handleSubmit}
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
    paddingHorizontal: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    flex: 1,
    textAlign: "left",
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "#2F4F3F",
    paddingTop: 20,
    paddingBottom: 40,
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
  recurrenceField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  recurrenceToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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

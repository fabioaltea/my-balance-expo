import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import { ThemedText } from '@/src/components/core/themed-text';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import TextBox from '@/src/components/ui/text-box';
import InputGroup from '@/src/components/ui/input-group';
import { useAuthContext, useDataContext } from '@/src/state';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '@/src/utils/dateUtils';
import { useRouter } from 'expo-router';
import { ITransaction } from '@/src/components/ui/transactions';
import TransactionsWeb from '@/src/components/ui/transactions.web';
import { useSpreadsheetMutation } from '@/src/hooks/useSpreadsheetMutation';
import { TransactionsApiHelper } from '@/src/helpers/TransactionsApiHelper';
import {
  TransactionsMutationHelpers,
  type CreateMovementData,
  type UpdateMovementData,
  type DeleteMovementData,
  type OptimisticSnapshot,
} from '@/src/helpers/TransactionsMutationHelpers';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import LocationPicker, { ILocation } from '@/src/components/ui/location-picker';
import { parseLocationValue, serializeLocationValue } from '@/src/utils/locationValue';
import RecurrencePickerWeb from '@/src/components/ui/recurrence-picker.web';
import ScreenView from '@/src/components/core/screen-view.web';
import { MovementHelper } from '@/src/helpers/MovementHelper';

export type ToastStatus = 'loading' | 'success' | 'error';

interface AddViewProps {
  editingMovementId?: string;
  recurrenceId?: string;
  onClose?: () => void;
  onToast?: (status: ToastStatus) => void;
}

const AddView: React.FC<AddViewProps> = ({ editingMovementId, recurrenceId, onClose, onToast }) => {
  const router = useRouter();

  const closeView = () => {
    if (onClose) onClose();
    else router.back();
  };
  const { selectedSpreadsheetId } = useAuthContext();
  const { accounts, categories, movements, recurringMovements, unconfirmedMovements } =
    useDataContext();

  // React Query mutations
  const addMovement = useSpreadsheetMutation<CreateMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.createTransaction(spreadsheetId, data),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticAddMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });
  const updateMovement = useSpreadsheetMutation<UpdateMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) => {
      const { movementId, ...updates } = data;
      return TransactionsApiHelper.updateMovement(spreadsheetId, movementId, updates);
    },
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticUpdateMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });
  const deleteMovement = useSpreadsheetMutation<DeleteMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.deleteMovement(spreadsheetId, data.movementId),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticDeleteMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

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
  const isSubmitting =
    addMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<ITransaction[]>([
    { id: 1, accountName: '', amount: 0, type: 'expense' },
  ]);
  const [selectedLocation, setSelectedLocation] = useState<ILocation>({
    address: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRecurrent, setIsRecurrent] = useState(false);
  const hasManualCategorySelection = useRef(false);
  const [recurrenceSelection, setRecurrenceSelection] = useState<string>('new');
  const [recurrenceUnit, setRecurrenceUnit] = useState<string>('M');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<number>(1);

  const recurrencePattern = `P${recurrenceFrequency}${recurrenceUnit}`;

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (!hasManualCategorySelection.current && !isEditing) {
      const predicted = MovementHelper.predictCategory(text, movements, categories);
      if (predicted) setSelectedCategory(predicted);
    }
  };

  const handleCategoryChange = (value: string) => {
    hasManualCategorySelection.current = true;
    setSelectedCategory(value);
  };

  const isEditing = !!editingMovementId;
  const isEditingRecurring =
    isEditing &&
    editingMovement &&
    (editingMovement.status?.toLowerCase() === 'recurrent' || editingMovement.recurrencePattern);

  // Pre-populate form when editing an existing movement
  useEffect(() => {
    if (!editingMovement) return;

    setDescription(editingMovement.description);

    if (editingMovement.status?.toLowerCase() === 'unconfirmed' && editingMovement.description) {
      const predicted = MovementHelper.predictCategory(
        editingMovement.description,
        movements,
        categories,
      );
      setSelectedCategory(predicted || editingMovement.category);
    } else {
      setSelectedCategory(editingMovement.category);
    }

    const parsedDate = parseDateFromDDMMYYYY(editingMovement.date);
    if (parsedDate) {
      setSelectedDate(parsedDate);
    }

    setSelectedLocation(parseLocationValue(editingMovement.location));

    const mappedTransactions: ITransaction[] = editingMovement.transactions.map((t, index) => ({
      id: index + 1,
      accountName: t.account,
      amount: t.amount,
      type: t.type,
      transactionID: t.transactionId,
      movementID: t.movementId,
    }));
    setTransactions(
      mappedTransactions.length
        ? mappedTransactions
        : [{ id: 1, accountName: '', amount: 0, type: 'expense' }],
    );
    if (editingMovement.recurrencePattern) {
      const match = editingMovement.recurrencePattern.match(/^P(\d+)([DWMY])$/);
      if (match) {
        setRecurrenceFrequency(parseInt(match[1], 10));
        setRecurrenceUnit(match[2]);
      }
    }
    // Pre-populate recurrence link for non-template movements
    if (editingMovement.recurrenceId && editingMovement.status?.toLowerCase() !== 'recurrent') {
      setIsRecurrent(true);
      setRecurrenceSelection(editingMovement.recurrenceId);
    }
  }, [editingMovement]);

  // Pre-populate form when adding from recurring template
  useEffect(() => {
    if (!recurringTemplate || editingMovement) return;

    setDescription(recurringTemplate.description);
    setSelectedCategory(recurringTemplate.category);
    setSelectedLocation(parseLocationValue(recurringTemplate.location));

    const mappedTransactions: ITransaction[] = recurringTemplate.transactions.map((t, index) => ({
      id: index + 1,
      accountName: t.account,
      amount: t.amount,
      type: t.type,
    }));
    setTransactions(
      mappedTransactions.length
        ? mappedTransactions
        : [{ id: 1, accountName: '', amount: 0, type: 'expense' }],
    );
  }, [recurringTemplate, editingMovement]);

  // Theme colors
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');
  const drawerBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1D211F' },
    'menuBackground',
  );
  const accentTextColor = '#2F4F3F';

  const nativeFieldStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '8px 0',
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'right',
    color: textColor,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  };

  const compactSelectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'right',
    color: textColor,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  };

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
    setTransactions([...transactions, { id: newId, accountName: '', amount: 0, type: 'expense' }]);
  };

  const handleDeleteTransaction = (id: number) => {
    if (transactions.length === 1) {
      setTransactions([{ id: 1, accountName: '', amount: 0, type: 'expense' }]);
      return;
    }
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleTransactionAccountChange = (id: number, accountName: string) => {
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, accountName } : t)));
  };

  const handleTransactionAmountChange = (id: number, amount: number) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, amount: Math.abs(amount) } : t)),
    );
  };

  const handleTransactionTypeToggle = (id: number) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, type: t.type === 'income' ? 'expense' : 'income' } : t,
      ),
    );
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
  };

  // --- Date helpers ---
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (text: string) => {
    if (!text) return;
    const [year, month, day] = text.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  // --- Menu action handler ---
  const handleMenuAction = (value: string) => {
    if (value === 'delete') {
      handleDeleteMovement();
    }
  };

  const validateMovement = (): boolean => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return false;
    }
    const validTransactions = transactions.filter((t) => t.accountName && t.amount > 0);
    if (validTransactions.length === 0) {
      Alert.alert('Error', 'Please add at least one transaction with a valid account and amount');
      return false;
    }
    if (!selectedSpreadsheetId) {
      Alert.alert('Error', 'No spreadsheet selected');
      return false;
    }
    return true;
  };

  const handleDeleteMovement = async () => {
    if (!confirm('Are you sure you want to delete this movement? This action cannot be undone.'))
      return;
    if (!selectedSpreadsheetId || !editingMovementId) return;

    setIsSaving(true);
    onToast?.('loading');
    closeView();

    try {
      await deleteMovement.mutateAsync({ movementId: editingMovementId });
      onToast?.('success');
    } catch (error) {
      console.error('Error deleting movement:', error);
      onToast?.('error');
    }
  };

  const isFormValid = (): boolean => {
    if (!description.trim()) return false;
    if (!selectedCategory) return false;
    if (!selectedDate) return false;
    const validTransactions = transactions.filter((t) => t.accountName && t.amount > 0);
    if (validTransactions.length === 0) return false;
    if (!selectedSpreadsheetId) return false;
    if (isRecurrent && recurrenceSelection === 'new' && !recurrencePattern) return false;
    if (isRecurrent && recurrenceSelection !== 'new' && !recurrenceSelection) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validateMovement()) return;

    const validTransactions = transactions.filter((t) => t.accountName && t.amount > 0);

    const formattedDate = formatDateToDDMMYYYY(selectedDate);
    const transactionsData = validTransactions.map((transaction) => ({
      ...(transaction.transactionID ? { transactionId: transaction.transactionID } : {}),
      amount:
        transaction.type === 'income'
          ? String(transaction.amount).replace('.', ',')
          : String(-transaction.amount).replace('.', ','),
      account: transaction.accountName,
      type: (transaction.type === 'income' ? 'in' : 'out') as 'in' | 'out',
    }));

    const baseData = {
      description: description.trim(),
      category: selectedCategory,
      date: formattedDate,
      location: serializeLocationValue(selectedLocation),
      transactions: transactionsData,
    };

    setIsSaving(true);
    onToast?.('loading');
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
          movementData.status = 'recurrent';
          movementData.recurrencePattern = recurrencePattern;
        } else if (editingMovement?.status?.toLowerCase() === 'unconfirmed') {
          movementData.status = 'Confirmed';
        }
        if (isRecurrent && recurrenceSelection !== 'new') {
          // Link to existing recurrence
          movementData.recurrenceId = recurrenceSelection;
        } else if (isRecurrent && recurrenceSelection === 'new') {
          // Create new recurrence template, then link this movement
          const newRecurrenceId = Crypto.randomUUID();
          await addMovement.mutateAsync({
            ...baseData,
            recurrenceId: newRecurrenceId,
            status: 'recurrent',
            recurrencePattern,
          });
          movementData.recurrenceId = newRecurrenceId;
        }
        await updateMovement.mutateAsync({
          movementId: editingMovementId,
          ...movementData,
        });
      } else if (isRecurrent && recurrenceSelection === 'new') {
        // Create new recurring template + linked movement
        const newRecurrenceId = Crypto.randomUUID();
        await addMovement.mutateAsync({
          ...baseData,
          recurrenceId: newRecurrenceId,
          status: 'recurrent',
          recurrencePattern,
        });
        await addMovement.mutateAsync({
          ...baseData,
          recurrenceId: newRecurrenceId,
        });
      } else if (isRecurrent && recurrenceSelection !== 'new') {
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

      onToast?.('success');
    } catch (error) {
      console.error('Error saving movement:', error);
      onToast?.('error');
    }
  };

  return (
    <ScreenView backgroundColor={onClose ? drawerBackgroundColor : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {isEditingRecurring
              ? 'Edit recurring movement'
              : isEditing
                ? 'Edit movement'
                : 'New movement'}
          </ThemedText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isEditing && (
              <View style={styles.iconButton}>
                <MaterialIcons name="more-vert" size={20} color={textColor} />
                {/* @ts-ignore: HTML select element for web */}
                <select
                  value=""
                  disabled={isSaving}
                  onChange={(e: any) => {
                    handleMenuAction(e.target.value);
                    e.target.value = '';
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled />
                  <option value="delete">Delete movement</option>
                </select>
              </View>
            )}
            <Pressable onPress={closeView} disabled={isSaving} style={styles.iconButton}>
              <MaterialIcons name="close" size={20} color={textColor} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          pointerEvents={isSaving ? 'none' : 'auto'}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Description + Category + Date */}
          <InputGroup>
            <TextBox
              value={description}
              onChange={handleDescriptionChange}
              label="Description"
              placeholder="Insert Description"
            />

            {/* Category, native HTML select */}
            <View style={styles.fieldRow}>
              <ThemedText type="default" style={styles.fieldLabel}>
                Category
              </ThemedText>
              {/* @ts-ignore: native HTML select element for web */}
              <select
                aria-label="Category"
                value={selectedCategory}
                onChange={(e: any) => handleCategoryChange(e.target.value)}
                style={{
                  ...nativeFieldStyle,
                  color: selectedCategory ? textColor : placeholderColor,
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

            {/* Date, native HTML date input */}
            <View style={styles.fieldRow}>
              <ThemedText type="default" style={styles.fieldLabel}>
                {isEditingRecurring ? 'Start' : 'Date'}
              </ThemedText>
              {/* @ts-ignore: native HTML date input for web */}
              <input
                aria-label={isEditingRecurring ? 'Start date' : 'Date'}
                type="date"
                value={formatDateForInput(selectedDate)}
                onChange={(e: any) => handleDateChange(e.target.value)}
                style={nativeFieldStyle}
              />
            </View>
          </InputGroup>

          {/* Recurrence pattern, only when editing recurring */}
          {isEditingRecurring && (
            <InputGroup>
              <View style={styles.compactFieldRow}>
                <ThemedText type="default" style={styles.compactFieldLabel}>
                  Repeat
                </ThemedText>
                {/* @ts-ignore: native HTML select for web */}
                <select
                  aria-label="Repeat interval"
                  value={recurrenceUnit}
                  onChange={(e: any) => setRecurrenceUnit(e.target.value)}
                  style={compactSelectStyle}
                >
                  <option value="D">Daily</option>
                  <option value="W">Weekly</option>
                  <option value="M">Monthly</option>
                  <option value="Y">Yearly</option>
                </select>
              </View>
              <View style={styles.compactFieldRow}>
                <ThemedText type="default" style={styles.compactFieldLabel}>
                  Every
                </ThemedText>
                {/* @ts-ignore: native HTML select for web */}
                <select
                  aria-label="Repeat frequency"
                  value={recurrenceFrequency}
                  onChange={(e: any) => setRecurrenceFrequency(Number(e.target.value))}
                  style={compactSelectStyle}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </View>
            </InputGroup>
          )}

          {/* Transactions, inline list */}
          <InputGroup
            label="Transactions"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add transaction"
                onPress={handleAddTransaction}
                style={styles.addTransactionButton}
              >
                <MaterialIcons name="add" size={19} color="#FFFFFF" />
              </Pressable>
            }
          >
            <TransactionsWeb
              transactions={transactions}
              accounts={allAccounts}
              onTypeToggle={handleTransactionTypeToggle}
              onAccountChange={handleTransactionAccountChange}
              onAmountChange={handleTransactionAmountChange}
              onDelete={handleDeleteTransaction}
            />
          </InputGroup>

          {/* Recurrence section for new movements and editing non-recurring */}
          {!isEditingRecurring && !recurrenceId && (
            <InputGroup>
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
              location={selectedLocation}
              onChange={setSelectedLocation}
              label="Location"
              placeholder="Enter location"
              googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY}
            />
          </InputGroup>

          {/* Spacer to scroll content above the bottom section */}
          <View style={{ height: 128 }} />
        </ScrollView>
      </View>

      {/* Bottom Total and Submit */}
      <View style={styles.bottomSection}>
        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Total</ThemedText>
          <ThemedText style={styles.totalAmount}>
            {getTotalAmount().toFixed(2).replace('.', ',')}€
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleSubmit()}
          disabled={isSaving || isSubmitting || !isFormValid()}
          style={[
            styles.submitButton,
            (isSaving || isSubmitting || !isFormValid()) && styles.submitButtonDisabled,
          ]}
        >
          <ThemedText
            style={[
              styles.submitText,
              { color: accentTextColor },
              (isSaving || isSubmitting || !isFormValid()) && { opacity: 0.6 },
            ]}
          >
            {isSaving || isSubmitting ? 'Saving' : isEditing ? 'Update' : 'Insert'}
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
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    textAlign: 'left',
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(47, 79, 63, 0.08)',
  },
  fieldRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldLabel: {
    width: 110,
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  compactFieldRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactFieldLabel: {
    minWidth: 80,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  addTransactionButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F4F3F',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#2F4F3F',
    boxShadow: '0 10px 32px rgba(17, 31, 24, 0.12)',
  },
  totalRow: {
    flex: 1,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.72,
  },
  totalAmount: {
    marginTop: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  submitButton: {
    minWidth: 132,
    minHeight: 44,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  submitText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Switch,
  Dimensions,
} from "react-native";
import { ThemedText } from "../core/themed-text.native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useEffect, useState } from "react";
import ListPicker, { IListPickerItem } from "./list-picker.native";
import CurrencyInput from "./currency-input";
import * as Haptics from "expo-haptics";
import ModalPanel from "./modal-panel.native";
import React from "react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface ITransactionData {
  accountName: string;
  amount: number;
  type: "income" | "expense";
}

interface ITransactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialData?: ITransactionData | null;
  accounts: IListPickerItem[];
  onSave: (data: ITransactionData) => void;
  title?: string;
}

const TransactionModal: React.FC<ITransactionModalProps> = ({
  isVisible,
  onClose,
  initialData,
  accounts,
  onSave,
  title = "Transaction",
}) => {
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    initialData?.type || "expense",
  );
  const [selectedAccount, setSelectedAccount] = useState(
    initialData?.accountName || "",
  );
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (initialData) {
        // Edit mode: precompile with existing data
        setTransactionType(initialData.type || "expense");
        setSelectedAccount(initialData.accountName || "");
        setAmount(initialData.amount || 0);
      } else {
        // New transaction: reset to defaults
        setTransactionType("expense");
        setSelectedAccount("");
        setAmount(0);
      }
      setShowKeyboard(false);
    }
  }, [isVisible, initialData]);

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#1a1a1a" },
    "background",
  );

  const handleToggle = (type: "income" | "expense") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTransactionType(type);
  };

  const handleConfirm = () => {
    if (selectedAccount && amount > 0) {
      onSave({
        accountName: selectedAccount,
        amount,
        type: transactionType,
      });
    }
  };

  const isValid = selectedAccount && amount > 0;

  return (
    <ModalPanel
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={isValid ? handleConfirm : undefined}
      title={title}
      showConfirmButton={true}
      showCancelButton={true}
      confirmText="Save"
      cancelText="Cancel"
      maxHeight={SCREEN_HEIGHT * 0.85}
    >
      <View style={[styles.container, { backgroundColor }]}>
        {/* Toggle Section */}
        <View style={styles.inputRow}>
          <ThemedText style={styles.label}>Type</ThemedText>
          <Switch
            trackColor={{ true: "#59a25bff" }}
            ios_backgroundColor={"#9c1414ff"}
            onValueChange={(value) =>
              setTransactionType(value ? "income" : "expense")
            }
            value={transactionType === "income"}
          />
        </View>

        {/* Amount Section */}
        <View style={styles.inputRow}>
          <ThemedText style={styles.label}>Amount</ThemedText>
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
          <ListPicker
            value={selectedAccount}
            onChange={setSelectedAccount}
            items={accounts}
            placeholder="Select account"
            title="Select Account"
            label="Account"
          />
        </View>

        {/* Currency Input - Show only when requested */}
        {showKeyboard && (
          <ModalPanel
            isVisible={showKeyboard}
            onClose={() => setShowKeyboard(false)}
            onConfirm={() => setShowKeyboard(false)}
            title="Edit Amount"
            showConfirmButton={true}
            showCancelButton={true}
            confirmText="Conferma"
            cancelText="Annulla"
          >
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              showConfirmButton={false}
            />
          </ModalPanel>
        )}
      </View>
    </ModalPanel>
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove flex: 1 as it can cause issues in modal
    minHeight: 600,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    minHeight: 80, // Increased height for amount
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
    fontWeight: "bold",
    fontSize: 24,
  },
  confirmSection: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
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

export default TransactionModal;

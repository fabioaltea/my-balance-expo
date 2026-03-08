import { View, StyleSheet, Pressable, Switch, TextInput } from "react-native";
import { ThemedText } from "../core/themed-text.native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useEffect, useState } from "react";
import ListPicker, { IListPickerItem } from "./list-picker.native";
import GlassButton from "./glass-button.native";
import React from "react";

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
  const [amountText, setAmountText] = useState(
    initialData?.amount ? initialData.amount.toFixed(2) : "",
  );

  useEffect(() => {
    if (isVisible) {
      if (initialData) {
        setTransactionType(initialData.type || "expense");
        setSelectedAccount(initialData.accountName || "");
        setAmount(initialData.amount || 0);
        setAmountText(initialData.amount ? initialData.amount.toFixed(2) : "");
      } else {
        setTransactionType("expense");
        setSelectedAccount("");
        setAmount(0);
        setAmountText("");
      }
    }
  }, [isVisible, initialData]);

  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#1a1a1a" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  const handleAmountChange = (text: string) => {
    // Allow numbers, dot and comma
    const sanitized = text.replace(",", ".");
    setAmountText(text);
    const parsed = parseFloat(sanitized);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    } else if (text === "" || text === "0") {
      setAmount(0);
    }
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

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <GlassButton onPress={onClose} type="dismiss" />
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        {isValid ? (
          <GlassButton onPress={handleConfirm} type="confirm" />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Type Toggle */}
      <View style={styles.inputRow}>
        <ThemedText style={styles.label}>Type</ThemedText>
        <Switch
          trackColor={{ true: "#59a25bff" }}
          // @ts-ignore — ios_backgroundColor works on web too
          ios_backgroundColor={"#9c1414ff"}
          onValueChange={(value) =>
            setTransactionType(value ? "income" : "expense")
          }
          value={transactionType === "income"}
        />
      </View>

      {/* Amount */}
      <View style={styles.inputRow}>
        <ThemedText style={styles.label}>Amount</ThemedText>
        <TextInput
          value={amountText}
          onChangeText={handleAmountChange}
          placeholder="0,00"
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: textColor }]}
          placeholderTextColor="#999"
        />
        <ThemedText style={[styles.currency, { color: textColor }]}>
          €
        </ThemedText>
      </View>

      {/* Account */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 48,
    height: 48,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    flex: 0,
    minWidth: 80,
  },
  amountInput: {
    flex: 1,
    textAlign: "right",
    fontSize: 24,
    fontWeight: "bold",
    paddingVertical: 4,
    paddingHorizontal: 8,
    // @ts-ignore — web-specific
    outlineStyle: "none",
  },
  currency: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 4,
  },
});

export default TransactionModal;

import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "../themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "./icon-symbol.ios";
import * as Haptics from "expo-haptics";
import Card from "../card";

export interface ITransaction {
  id: number;
  accountName: string;
  amount: number;
  type: "income" | "expense";
}

interface ITransactionsProps {
  transactions: ITransaction[];
  onTransactionPress: (transaction: ITransaction) => void;
  onAddPress: () => void;
}

const Transactions: React.FC<ITransactionsProps> = ({
  transactions,
  onTransactionPress,
  onAddPress,
}) => {
  // Theme colors
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );

  const formatAmount = (amount: number, type: "income" | "expense") => {
    const formattedAmount = amount.toFixed(2).replace(".", ",");
    const prefix = type === "income" ? "+ " : "- ";
    return `${prefix}${formattedAmount}€`;
  };

  const handleTransactionPress = (transaction: ITransaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTransactionPress(transaction);
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddPress();
  };

  return (
    

    <View style={styles.container}>
      {/* <ThemedText type="defaultSemiBold" style={styles.title}>
        Transazioni
      </ThemedText> */}

      {/* Transaction List */}
      {transactions.map((transaction) => (
        <Pressable
          key={transaction.id}
          onPress={() => handleTransactionPress(transaction)}
          style={[styles.transactionRow, { borderBottomColor: borderColor }]}
        >
          <View style={styles.transactionContent}>
            <ThemedText style={styles.accountName}>
              {transaction.accountName}
            </ThemedText>
            <ThemedText
              style={[
                styles.amount,
                {
                  color: transaction.type === "income" ? "#22c55e" : "#ef4444",
                },
              ]}
            >
              {formatAmount(transaction.amount, transaction.type)}
            </ThemedText>
          </View>
          <IconSymbol
            name="chevron.right"
            size={16}
            color={textColor}
            style={styles.chevron}
          />
        </Pressable>
      ))}

      {/* Add Button */}
      <Pressable onPress={handleAddPress} style={styles.addButton}>
        <IconSymbol name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountName: {
    fontSize: 16,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  chevron: {
    opacity: 0.6,
  },
  addButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
});

export default Transactions;

import {
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useRef, useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "../core/themed-text.native";
import InlineCurrencyInput from "./inline-currency-input";

export interface ITransaction {
  id: number;
  accountName: string;
  amount: number;
  type: "income" | "expense";
  transactionID?: string;
  movementID?: string;
}

interface ITransactionsWebProps {
  transactions: ITransaction[];
  accounts: { label: string; value: string }[];
  onTypeToggle: (id: number) => void;
  onAccountChange: (id: number, accountName: string) => void;
  onAmountChange: (id: number, amount: number) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

const ROW_HEIGHT = 48;
const ADD_BUTTON_HEIGHT = 50;

const TransactionsWeb: React.FC<ITransactionsWebProps> = ({
  transactions,
  accounts,
  onTypeToggle,
  onAccountChange,
  onAmountChange,
  onDelete,
  onAdd,
}) => {
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#aaa", dark: "#666" },
    "tabIconDefault",
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );

  const targetHeight = transactions.length * ROW_HEIGHT + ADD_BUTTON_HEIGHT;
  const [currentHeight, setCurrentHeight] = useState(targetHeight);
  const prevTarget = useRef(targetHeight);

  useEffect(() => {
    if (prevTarget.current === targetHeight) return;
    prevTarget.current = targetHeight;

    // Animate using CSS transition via requestAnimationFrame
    // First frame: keep old height, second frame: set new height (CSS transition handles the rest)
    requestAnimationFrame(() => {
      setCurrentHeight(targetHeight);
    });
  }, [targetHeight]);

  return (
    // @ts-ignore — native div wrapper for reliable overflow clipping + CSS transition on web
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: currentHeight,
        transition: "height 250ms ease-out",
      }}
    >
      {/* @ts-ignore */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        {transactions.map((t) => (
          <View
            key={t.id}
            style={[styles.transactionRow, { borderBottomColor: borderColor }]}
          >
            {/* Type toggle */}
            <Pressable
              onPress={() => onTypeToggle(t.id)}
              style={[
                styles.typeToggle,
                {
                  backgroundColor:
                    t.type === "income" ? "#22c55e20" : "#ef444420",
                },
              ]}
            >
              <MaterialIcons
                name={t.type === "income" ? "call-made" : "call-received"}
                size={16}
                color={t.type === "income" ? "#22c55e" : "#ef4444"}
              />
            </Pressable>

            {/* Account dropdown */}
            {/* @ts-ignore — HTML select element for web */}
            <select
              value={t.accountName}
              onChange={(e: any) => onAccountChange(t.id, e.target.value)}
              style={{
                flex: 1,
                fontSize: 15,
                color: t.accountName ? textColor : placeholderColor,
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                cursor: "pointer",
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                marginLeft: 8,
              }}
            >
              <option value="" disabled>
                Account
              </option>
              {accounts.map((acc) => (
                <option key={acc.value} value={acc.value}>
                  {acc.label}
                </option>
              ))}
            </select>

            {/* Amount input */}
            <InlineCurrencyInput
              value={t.amount}
              onChange={(amount) => onAmountChange(t.id, amount)}
              placeholderColor={placeholderColor}
            />

            <ThemedText style={[styles.currencySymbol, t.amount > 0 && { opacity: 1 }]}>€</ThemedText>

            {/* Delete button */}
            <Pressable
              onPress={() => onDelete(t.id)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete-outline" size={18} color="#999" />
            </Pressable>
          </View>
        ))}

        {/* Add transaction button */}
        <Pressable onPress={onAdd} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      {/* @ts-ignore */}
      </div>
    {/* @ts-ignore */}
    </div>
  );
};

const styles = StyleSheet.create({
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    height: ROW_HEIGHT,
  },
  typeToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 14,
    opacity: 0.5,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 20,
    height: ADD_BUTTON_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TransactionsWeb;

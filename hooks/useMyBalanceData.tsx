/**
 * Single unified hook for MyBalance data management
 *
 * This hook:
 * - Loads transactions, accounts, and categories from backend
 * - Transforms backend data to frontend format
 * - Groups transactions into movements (1 transaction = 1 movement for now)
 * - Provides helper functions for calculations
 *
 * Architecture:
 * - Backend: Stores individual transactions
 * - Frontend: Groups transactions into movements for display
 * - Movement = one or more transactions (currently 1:1 mapping)
 */

import { useState, useEffect, useCallback } from "react";
import { TransactionsApiHelper } from "../helpers/TransactionsApiHelper";
import { AccountsApiHelper } from "../helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "../helpers/CategoriesApiHelper";
import { AuthStorageHelper } from "../helpers/AuthStorageHelper";
import { convertISOToLocalFormat } from "../utils/dateUtils";

// ===========================
// Types
// ===========================

export interface Transaction {
  movementId: string;
  transactionId: string;
  date: string; // dd-MM-yyyy format
  description: string;
  amount: number; // Always positive, use type for direction
  type: "income" | "expense";
  account: string;
  category: string;
  location?: string;
}

export interface Movement {
  id: string; // movementId
  date: string; // dd-MM-yyyy format
  description: string;
  category: string;
  location?: string;
  transactions: Transaction[]; // Can contain multiple transactions across different accounts
  totalAmount: number; // Signed: sum of all transactions (positive for net income, negative for net expense)
  type: "income" | "expense"; // Derived from totalAmount sign
}

export interface Account {
  accountId: string;
  name: string;
  balance: number;
  color?: string;
  textColor?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
}

// ===========================
// Hook
// ===========================

export const useMyBalanceData = (spreadsheetId: string | null) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all data from backend
   */
  const loadAllData = useCallback(async () => {
    if (!spreadsheetId) {
      console.warn("⚠️ useMyBalanceData: No spreadsheetId, skipping load");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokens = await AuthStorageHelper.getTokens();
      if (!tokens?.accessToken) {
        throw new Error("No access token");
      }

      console.log("📥 useMyBalanceData: Loading all data...");

      // ===== Load Transactions =====
      const rawTransactions = await TransactionsApiHelper.getTransactions(
        spreadsheetId
      );

      // Debug: log first raw transaction to see available fields
      if (rawTransactions?.length > 0) {
        console.log("🔍 Raw transaction sample:", JSON.stringify(rawTransactions[0], null, 2));
      }

      const transformedTransactions: Transaction[] = (rawTransactions || []).map((t: any) => {
        const amountStr = t.amount?.replace?.(/[€\s]/g, "")?.replace(".", "").replace?.(",", ".") || "0";
        const amount = parseFloat(amountStr);

        return {
          movementId: t.movementId,
          transactionId: t.transactionId || t.id || Math.random().toString(),
          date: t.date,
          description: t.description || "",
          amount: Math.abs(amount), // Always positive
          type: amount >= 0 ? ("income" as const) : ("expense" as const),
          account: t.account || "",
          category: t.category || "",
          location: t.location || "",
        };
      });

      console.log("✅ Transactions loaded:", transformedTransactions.length);

      // ===== Load Accounts =====
      const rawAccounts = await AccountsApiHelper.getAccounts(
        spreadsheetId
      );

      const transformedAccounts: Account[] = (rawAccounts || []).map((a: any) => ({
        accountId: a.accountId || a.id || Math.random().toString(),
        name: a.name || "",
        balance: parseFloat(
          a.balance?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
        ),
        color: a.color || "#2F4F3F",
        textColor: a.textColor || "#FFFFFF",
      }));

      console.log("✅ Accounts loaded:", transformedAccounts.length);

      // ===== Load Categories =====
      const rawCategories = await CategoriesApiHelper.getCategories(
        spreadsheetId
      );

      const transformedCategories: Category[] = (rawCategories || []).map((c: any) => ({
        id: c.id || Math.random().toString(),
        name: c.name || "",
        type: (c.type as "income" | "expense") || "expense",
        color: c.color || "#2F4F3F",
      }));

      console.log("✅ Categories loaded:", transformedCategories.length);

      // Update state
      setTransactions(transformedTransactions);
      setAccounts(transformedAccounts);
      setCategories(transformedCategories);

      console.log("✅ useMyBalanceData: All data loaded successfully");
    } catch (err: any) {
      console.error("❌ useMyBalanceData: Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId]);

  // Auto-load on mount and spreadsheetId change
  useEffect(() => {
    if (spreadsheetId) {
      loadAllData();
    }
  }, [spreadsheetId, loadAllData]);

  /**
   * Group transactions into movements by movementId
   * A movement can contain multiple transactions across different accounts
   */
  const movements: Movement[] = Object.values(
    transactions.reduce((acc, transaction) => {
      const movementId = transaction.movementId;

      if (!acc[movementId]) {
        // Create new movement
        acc[movementId] = {
          id: movementId,
          date: transaction.date,
          description: transaction.description,
          category: transaction.category,
          location: transaction.location,
          transactions: [],
          totalAmount: 0,
          type: "expense" as const, // Will be determined after calculating totalAmount
        };
      }

      // Add transaction to movement
      acc[movementId].transactions.push(transaction);

      // Update totalAmount (income is positive, expense is negative)
      const signedAmount = transaction.type === "income" ? transaction.amount : -transaction.amount;
      acc[movementId].totalAmount += signedAmount;

      // Update type based on net totalAmount
      acc[movementId].type = acc[movementId].totalAmount >= 0 ? "income" : "expense";

      return acc;
    }, {} as Record<string, Movement>)
  );

  /**
   * Helper functions
   */
  const getTotalIncome = (filteredMovements: Movement[]) => {
    return filteredMovements
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.totalAmount, 0);
  };

  const getTotalExpense = (filteredMovements: Movement[]) => {
    return filteredMovements
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);
  };

  const getBalance = (filteredMovements: Movement[]) => {
    return getTotalIncome(filteredMovements) - getTotalExpense(filteredMovements);
  };

  return {
    // Raw data from backend
    transactions,
    accounts,
    categories,

    // Derived data
    movements, // Transactions grouped into movements

    // State
    isLoading,
    error,

    // Actions
    reloadData: loadAllData,

    // Helpers
    getTotalIncome,
    getTotalExpense,
    getBalance,
  };
};

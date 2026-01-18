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

import { useState, useEffect, useCallback, useMemo } from "react";
import { TransactionsApiHelper } from "../helpers/TransactionsApiHelper";
import { AccountsApiHelper } from "../helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "../helpers/CategoriesApiHelper";
import { AuthStorageHelper } from "../helpers/AuthStorageHelper";
import {
  convertISOToLocalFormat,
  calculateExpectedOccurrences,
  getMonthPeriodsFromStartDate,
  isDateInRange,
} from "../utils/dateUtils";
import React from "react";

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
  recurrenceId?: string;
  recurrencePattern?: string; // ISO 8601 duration format (e.g., P1W, P1M)
  status?: string; // "Confirmed", "recurrent", "DELETED"
}

export interface Movement {
  id: string; // movementId
  date: string; // dd-MM-yyyy format
  description: string;
  category: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string; // ISO 8601 duration format (e.g., P1W, P1M)
  status?: string; // "Confirmed", "recurrent", "DELETED"
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

/**
 * Represents a pending/missing recurring movement occurrence
 * When a recurring template expects N occurrences in a period but fewer exist
 */
export interface PendingRecurrence {
  /** The recurring movement template */
  template: Movement;
  /** Period label (e.g., "Gennaio 2026") */
  periodLabel: string;
  /** Start of the period (dd-MM-yyyy) */
  periodStart: string;
  /** End of the period (dd-MM-yyyy) */
  periodEnd: string;
  /** Expected number of occurrences in this period */
  expectedCount: number;
  /** Actual number of occurrences tracked */
  actualCount: number;
  /** Number of missing occurrences (expected - actual) */
  missingCount: number;
  /** Whether this period is before the current month */
  isOverdue: boolean;
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
      const rawTransactions =
        await TransactionsApiHelper.getTransactions(spreadsheetId);

      // Debug: log first raw transaction to see available fields
      if (rawTransactions?.length > 0) {
        console.log(
          "🔍 Raw transaction sample:",
          JSON.stringify(rawTransactions[0], null, 2),
        );
      }

      const transformedTransactions: Transaction[] = (
        rawTransactions || []
      ).map((t: any) => {
        const amountStr =
          t.amount
            ?.replace?.(/[€\s]/g, "")
            ?.replace(".", "")
            .replace?.(",", ".") || "0";
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
          recurrenceId: t.recurrenceId || undefined,
          recurrencePattern: t.recurrencePattern || undefined,
          status: t.status || "Confirmed",
        };
      });

      console.log("✅ Transactions loaded:", transformedTransactions.length);

      // ===== Load Accounts =====
      const rawAccounts = await AccountsApiHelper.getAccounts(spreadsheetId);

      const transformedAccounts: Account[] = (rawAccounts || []).map(
        (a: any) => ({
          accountId: a.accountId || a.id || Math.random().toString(),
          name: a.name || "",
          balance: parseFloat(
            a.balance?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0",
          ),
          color: a.color || "#2F4F3F",
          textColor: a.textColor || "#FFFFFF",
        }),
      );

      console.log("✅ Accounts loaded:", transformedAccounts.length);

      // ===== Load Categories =====
      const rawCategories =
        await CategoriesApiHelper.getCategories(spreadsheetId);

      const transformedCategories: Category[] = (rawCategories || []).map(
        (c: any) => ({
          id: c.id || Math.random().toString(),
          name: c.name || "",
          type: (c.type as "income" | "expense") || "expense",
          color: c.color || "#2F4F3F",
        }),
      );

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
   * Excludes movements with status "recurrent" (these are templates, not actual movements)
   */
  const allMovements: Movement[] = Object.values(
    transactions.reduce(
      (acc, transaction) => {
        const movementId = transaction.movementId;

        if (!acc[movementId]) {
          // Create new movement
          acc[movementId] = {
            id: movementId,
            date: transaction.date,
            description: transaction.description,
            category: transaction.category,
            location: transaction.location,
            recurrenceId: transaction.recurrenceId,
            recurrencePattern: transaction.recurrencePattern,
            status: transaction.status,
            transactions: [],
            totalAmount: 0,
            type: "expense" as const, // Will be determined after calculating totalAmount
          };
        }

        // Add transaction to movement
        acc[movementId].transactions.push(transaction);

        // Update totalAmount (income is positive, expense is negative)
        const signedAmount =
          transaction.type === "income"
            ? transaction.amount
            : -transaction.amount;
        acc[movementId].totalAmount += signedAmount;

        // Update type based on net totalAmount
        acc[movementId].type =
          acc[movementId].totalAmount >= 0 ? "income" : "expense";

        return acc;
      },
      {} as Record<string, Movement>,
    ),
  );

  // Filter out recurring templates from recent movements
  // These are identified by status "recurrent" (new) or recurrencePattern (old)
  const movements = allMovements.filter(
    (m) => m.status?.toLowerCase() !== "recurrent" && !m.recurrencePattern,
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
    return (
      getTotalIncome(filteredMovements) - getTotalExpense(filteredMovements)
    );
  };

  /**
   * Identify recurring movements
   * A movement is recurring if it has status "recurrent" or recurrencePattern set
   * We get unique recurring movements by grouping by recurrenceId
   */
  const recurringMovements: Movement[] = Object.values(
    allMovements
      .filter(
        (m) =>
          m.recurrenceId &&
          (m.status?.toLowerCase() === "recurrent" || m.recurrencePattern),
      ) // Recurring templates (new: status, old: recurrencePattern)
      .reduce(
        (acc, movement) => {
          const recurrenceId = movement.recurrenceId!;

          // Keep only the most recent movement for each recurrenceId
          if (!acc[recurrenceId] || movement.date > acc[recurrenceId].date) {
            acc[recurrenceId] = movement;
          }

          return acc;
        },
        {} as Record<string, Movement>,
      ),
  );

  // Debug: log all movements with recurrenceId to see the data structure
  React.useEffect(() => {
    const movementsWithRecurrence = allMovements.filter((m) => m.recurrenceId);
    console.log(
      "🔍 All movements with recurrenceId:",
      movementsWithRecurrence.map((m) => ({
        id: m.id,
        recurrenceId: m.recurrenceId,
        recurrencePattern: m.recurrencePattern,
        status: m.status,
        date: m.date,
        description: m.description,
      })),
    );
  }, [allMovements]);

  /**
   * Calculate pending recurring movements
   * For each recurring template, check each period (month) from start date to now
   * and calculate how many occurrences are missing
   */
  const pendingRecurrences: PendingRecurrence[] = useMemo(() => {
    const result: PendingRecurrence[] = [];

    console.log("🔄 Calculating pending recurrences...");
    console.log("  - Recurring templates count:", recurringMovements.length);
    console.log(
      "  - Recurring templates:",
      recurringMovements.map((m) => ({
        id: m.recurrenceId,
        pattern: m.recurrencePattern,
        date: m.date,
        description: m.description,
        status: m.status,
      })),
    );

    // For each recurring template
    for (const template of recurringMovements) {
      const {
        recurrenceId,
        recurrencePattern,
        date: templateStartDate,
      } = template;

      console.log(`  - Processing template: ${template.description}`);
      console.log(`    recurrenceId: ${recurrenceId}`);
      console.log(`    recurrencePattern: ${recurrencePattern}`);
      console.log(`    templateStartDate: ${templateStartDate}`);

      if (!recurrenceId || !recurrencePattern) {
        console.log(
          `    ⚠️ Skipping - missing recurrenceId or recurrencePattern`,
        );
        continue;
      }

      // Get all periods from template start date to now (max 3 months back)
      const periods = getMonthPeriodsFromStartDate(templateStartDate, 3);
      console.log(
        `    Periods to check:`,
        periods.map((p) => p.label),
      );

      for (const period of periods) {
        // Calculate expected occurrences for this period based on pattern
        const expectedCount = calculateExpectedOccurrences(
          recurrencePattern,
          period.startDate,
          period.endDate,
        );

          // Count actual occurrences: movements with same recurrenceId in this period
        // Exclude the template itself (status = "recurrent")
        const matchingMovements = movements.filter(
          (m) =>
            m.recurrenceId === recurrenceId &&
            m.status?.toLowerCase() !== "recurrent" &&
            isDateInRange(m.date, period.startDate, period.endDate),
        );
        const actualCount = matchingMovements.length;
        const missingCount = expectedCount - actualCount;

        console.log(`    Period ${period.label}: expected=${expectedCount}, actual=${actualCount}, missing=${missingCount}`);

        if (expectedCount === 0) {
          continue;
        }

        // Only add if there are missing occurrences
        if (missingCount > 0) {
          result.push({
            template,
            periodLabel: period.label,
            periodStart: period.startDate,
            periodEnd: period.endDate,
            expectedCount,
            actualCount,
            missingCount,
            isOverdue: period.isOverdue,
          });
        }
      }
    }

    // Sort: overdue first, then by period (most recent first)
    const sorted = result.sort((a, b) => {
      // Overdue items come first
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      // Then by period start date (descending - most recent first)
      return b.periodStart.localeCompare(a.periodStart);
    });

    console.log("✅ Pending recurrences result:", sorted.length, "items");
    if (sorted.length > 0) {
      console.log("  First item:", JSON.stringify(sorted[0], null, 2));
    }

    return sorted;
  }, [recurringMovements, movements]);

  return {
    // Raw data from backend
    transactions,
    accounts,
    categories,

    // Derived data
    movements, // Transactions grouped into movements
    recurringMovements, // Unique recurring movement templates
    pendingRecurrences, // Missing recurring occurrences (current + overdue)

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

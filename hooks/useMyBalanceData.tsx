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
import { AuthenticationError } from "../helpers/HttpHelper";
import {
  convertISOToLocalFormat,
  calculateExpectedOccurrences,
  getMonthPeriodsFromStartDate,
  isDateInRange,
  getCurrentMonthPeriod,
  getLast12MonthsPeriods,
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
  icon?: string;
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

/**
 * Monthly forecast data for end-of-month balance prediction
 */
export interface MonthlyForecast {
  /** Current total balance (sum of all accounts) */
  currentBalance: number;
  /** Income already recorded this month */
  currentMonthIncome: number;
  /** Expenses already recorded this month */
  currentMonthExpense: number;
  /** Pending recurring income for this month */
  pendingRecurringIncome: number;
  /** Pending recurring expenses for this month */
  pendingRecurringExpense: number;
  /** Average monthly income (last 12 months) */
  avgMonthlyIncome: number;
  /** Average monthly expense (last 12 months) */
  avgMonthlyExpense: number;
  /** Predicted end-of-month balance */
  forecastBalance: number;
  /** Expected change from current balance */
  forecastDelta: number;
}

/**
 * Forecast data for a specific account
 */
export interface AccountForecast {
  accountId: string;
  accountName: string;
  currentBalance: number;
  forecastBalance: number;
  forecastDelta: number;
}

// ===========================
// Hook
// ===========================

export const useMyBalanceData = (
  spreadsheetId: string | null,
  onAuthError?: () => Promise<void>,
) => {
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
          icon: c.icon || "pricetag",
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

      // If authentication error, trigger logout
      if (err instanceof AuthenticationError) {
        console.log("🔐 Authentication error detected, triggering logout...");
        setError("Session expired. Please login again.");
        if (onAuthError) {
          await onAuthError();
        }
      } else {
        setError(err.message || "Failed to load data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId, onAuthError]);

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

  /**
   * Calculate pending recurring movements
   * For each recurring template, check each period (month) from start date to now
   * and calculate how many occurrences are missing
   */
  const pendingRecurrences: PendingRecurrence[] = useMemo(() => {
    const result: PendingRecurrence[] = [];

    // For each recurring template
    for (const template of recurringMovements) {
      const {
        recurrenceId,
        recurrencePattern,
        date: templateStartDate,
      } = template;
      if (!recurrenceId || !recurrencePattern) {
        continue;
      }

      // Get all periods from template start date to now (max 3 months back)
      const periods = getMonthPeriodsFromStartDate(templateStartDate, 3);

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

    return sorted;
  }, [recurringMovements, movements]);

  /**
   * Calculate monthly forecast for end-of-month balance prediction
   */
  const monthlyForecast = useMemo<MonthlyForecast>(() => {
    // 1. Current balance = sum of all account balances
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // 2. Get current month period
    const currentMonth = getCurrentMonthPeriod();

    // 3. Calculate current month income and expenses
    const currentMonthMovements = movements.filter((m) =>
      isDateInRange(m.date, currentMonth.startDate, currentMonth.endDate),
    );
    const currentMonthIncome = currentMonthMovements
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.totalAmount, 0);
    const currentMonthExpense = currentMonthMovements
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

    // 4. Calculate pending recurring for current month
    const currentMonthPending = pendingRecurrences.filter(
      (pr) => !pr.isOverdue,
    );
    const pendingRecurringIncome = currentMonthPending
      .filter((pr) => pr.template.type === "income")
      .reduce(
        (sum, pr) => sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
        0,
      );
    const pendingRecurringExpense = currentMonthPending
      .filter((pr) => pr.template.type === "expense")
      .reduce(
        (sum, pr) => sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
        0,
      );

    // 5. Calculate historical averages (last 12 months)
    const last12Months = getLast12MonthsPeriods();
    let totalHistoricalIncome = 0;
    let totalHistoricalExpense = 0;
    let monthsWithData = 0;

    for (const period of last12Months) {
      const periodMovements = movements.filter((m) =>
        isDateInRange(m.date, period.startDate, period.endDate),
      );

      if (periodMovements.length > 0) {
        monthsWithData++;
        totalHistoricalIncome += periodMovements
          .filter((m) => m.type === "income")
          .reduce((sum, m) => sum + m.totalAmount, 0);
        totalHistoricalExpense += periodMovements
          .filter((m) => m.type === "expense")
          .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);
      }
    }

    const avgMonthlyIncome =
      monthsWithData > 0 ? totalHistoricalIncome / monthsWithData : 0;
    const avgMonthlyExpense =
      monthsWithData > 0 ? totalHistoricalExpense / monthsWithData : 0;

    // 6. Calculate forecast
    // Expected remaining income = max(0, average - already recorded)
    // Expected remaining expense = max(0, average - already recorded)
    const expectedRemainingIncome = Math.max(
      0,
      avgMonthlyIncome - currentMonthIncome,
    );
    const expectedRemainingExpense = Math.max(
      0,
      avgMonthlyExpense - currentMonthExpense,
    );

    const forecastBalance =
      currentBalance +
      pendingRecurringIncome -
      pendingRecurringExpense +
      expectedRemainingIncome -
      expectedRemainingExpense;

    const forecastDelta = forecastBalance - currentBalance;

    return {
      currentBalance,
      currentMonthIncome,
      currentMonthExpense,
      pendingRecurringIncome,
      pendingRecurringExpense,
      avgMonthlyIncome,
      avgMonthlyExpense,
      forecastBalance,
      forecastDelta,
    };
  }, [accounts, movements, pendingRecurrences]);

  /**
   * Calculate forecast for each individual account
   */
  const accountForecasts = useMemo<AccountForecast[]>(() => {
    const currentMonth = getCurrentMonthPeriod();
    const last12Months = getLast12MonthsPeriods();

    return accounts.map((account) => {
      // Filter transactions for this account
      const accountTransactions = transactions.filter(
        (t) => t.account === account.name,
      );

      // Current month transactions for this account
      const currentMonthTx = accountTransactions.filter((t) =>
        isDateInRange(t.date, currentMonth.startDate, currentMonth.endDate),
      );
      const currentMonthIncome = currentMonthTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const currentMonthExpense = currentMonthTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      // Pending recurring for this account
      const accountPending = pendingRecurrences.filter(
        (pr) =>
          !pr.isOverdue &&
          pr.template.transactions.some((t) => t.account === account.name),
      );
      const pendingIncome = accountPending
        .filter((pr) => pr.template.type === "income")
        .reduce((sum, pr) => {
          const accountTx = pr.template.transactions.filter(
            (t) => t.account === account.name,
          );
          const accountAmount = accountTx.reduce((s, t) => s + t.amount, 0);
          return sum + accountAmount * pr.missingCount;
        }, 0);
      const pendingExpense = accountPending
        .filter((pr) => pr.template.type === "expense")
        .reduce((sum, pr) => {
          const accountTx = pr.template.transactions.filter(
            (t) => t.account === account.name,
          );
          const accountAmount = accountTx.reduce((s, t) => s + t.amount, 0);
          return sum + accountAmount * pr.missingCount;
        }, 0);

      // Historical averages for this account
      let totalIncome = 0;
      let totalExpense = 0;
      let monthsWithData = 0;

      for (const period of last12Months) {
        const periodTx = accountTransactions.filter((t) =>
          isDateInRange(t.date, period.startDate, period.endDate),
        );
        if (periodTx.length > 0) {
          monthsWithData++;
          totalIncome += periodTx
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          totalExpense += periodTx
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
        }
      }

      const avgIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
      const avgExpense = monthsWithData > 0 ? totalExpense / monthsWithData : 0;

      const expectedRemainingIncome = Math.max(
        0,
        avgIncome - currentMonthIncome,
      );
      const expectedRemainingExpense = Math.max(
        0,
        avgExpense - currentMonthExpense,
      );

      const forecastBalance =
        account.balance +
        pendingIncome -
        pendingExpense +
        expectedRemainingIncome -
        expectedRemainingExpense;

      return {
        accountId: account.accountId,
        accountName: account.name,
        currentBalance: account.balance,
        forecastBalance,
        forecastDelta: forecastBalance - account.balance,
      };
    });
  }, [accounts, transactions, pendingRecurrences]);

  return {
    // Raw data from backend
    transactions,
    accounts,
    categories,

    // Derived data
    movements, // Transactions grouped into movements
    recurringMovements, // Unique recurring movement templates
    pendingRecurrences, // Missing recurring occurrences (current + overdue)
    monthlyForecast, // End-of-month balance forecast (total)
    accountForecasts, // End-of-month balance forecast per account

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

/**
 * Single unified hook for MyBalance data management
 *
 * This hook:
 * - Uses React Query hooks for data fetching (useTransactions, useAccounts, useCategories)
 * - Transforms transactions into movements
 * - Provides helper functions for calculations
 * - Supports optimistic updates through React Query mutations
 *
 * Architecture:
 * - Backend: Stores individual transactions
 * - Frontend: Groups transactions into movements for display
 * - Movement = one or more transactions (currently 1:1 mapping)
 * - React Query: Manages caching, optimistic updates, and data synchronization
 */

import { useCallback, useMemo } from "react";
import { useTransactions } from './queries/useTransactions';
import { useAccounts } from './queries/useAccounts';
import { useCategories } from './queries/useCategories';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queries/queryKeys';
import {
  convertISOToLocalFormat,
  calculateExpectedOccurrences,
  getMonthPeriodsFromStartDate,
  isDateInRange,
  getCurrentMonthPeriod,
  getLast12MonthsPeriods,
  detectPeriodType,
  getDayOfYear,
  getDaysInYear,
  getPastYearsPeriods,
  getYearRangeUpToDay,
  getMonthStart,
  getMonthEnd,
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
 * Forecast data for end-of-period balance prediction
 * Supports both monthly and yearly forecasts
 */
export interface MonthlyForecast {
  /** Type of forecast period */
  periodType: "month" | "year";
  /** Current total balance (sum of all accounts) */
  currentBalance: number;
  /** Income already recorded in this period */
  currentMonthIncome: number;
  /** Expenses already recorded in this period */
  currentMonthExpense: number;
  /** Pending recurring income for this period */
  pendingRecurringIncome: number;
  /** Pending recurring expenses for this period */
  pendingRecurringExpense: number;
  /** Average income for this type of period (historical) */
  avgMonthlyIncome: number;
  /** Average expense for this type of period (historical) */
  avgMonthlyExpense: number;
  /** Predicted end-of-period balance */
  forecastBalance: number;
  /** Expected change from current balance */
  forecastDelta: number;
  /** Progress through the period (0-1) - how much of the period has passed */
  periodProgress: number;
  /** Historical average progress at this point in period (0-1) - how much was typically spent by now */
  historicalProgressAtThisPoint: number;
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
  const queryClient = useQueryClient();

  // Use React Query hooks for data fetching
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useTransactions();

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useAccounts();

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCategories();

  // Combine loading states
  const isLoading = isLoadingTransactions || isLoadingAccounts || isLoadingCategories;

  // Combine errors
  const error = transactionsError?.message || accountsError?.message || categoriesError?.message || null;

  /**
   * Reload data by invalidating all queries
   * This will trigger a refetch of all data
   */
  const reloadData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories.all }),
    ]);
  };

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

  // Filter out recurring templates and unconfirmed from recent movements
  // These are identified by status "recurrent" (new) or recurrencePattern (old)
  const movements = allMovements.filter(
    (m) =>
      m.status?.toLowerCase() !== "recurrent" &&
      m.status?.toLowerCase() !== "unconfirmed" &&
      !m.recurrencePattern,
  );

  // Get unconfirmed movements (from third party imports)
  const unconfirmedMovements = allMovements.filter(
    (m) => m.status?.toLowerCase() === "unconfirmed",
  );

  /**
   * Helper functions
   *
   * When accountFilter is provided (and not "All"), these functions sum only
   * the transactions belonging to that specific account, not the movement totals.
   * This allows accurate income/expense reporting when filtering by account.
   */
  const getTotalIncome = (filteredMovements: Movement[], accountFilter?: string) => {
    return filteredMovements.reduce((sum, m) => {
      if (accountFilter && accountFilter !== "All") {
        // Sum only income transactions for the selected account
        const accountIncome = m.transactions
          .filter(t => t.account === accountFilter && t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        return sum + accountIncome;
      } else {
        // Sum all income transactions across all accounts
        const totalIncome = m.transactions
          .filter(t => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        return sum + totalIncome;
      }
    }, 0);
  };

  const getTotalExpense = (filteredMovements: Movement[], accountFilter?: string) => {
    return filteredMovements.reduce((sum, m) => {
      if (accountFilter && accountFilter !== "All") {
        // Sum only expense transactions for the selected account
        const accountExpense = m.transactions
          .filter(t => t.account === accountFilter && t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        return sum + accountExpense;
      } else {
        // Sum all expense transactions across all accounts
        const totalExpense = m.transactions
          .filter(t => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        return sum + totalExpense;
      }
    }, 0);
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
   * Calculate forecast for end-of-period balance prediction
   * Uses historical data to project remaining income/expenses
   *
   * For MONTHLY forecast:
   * - Looks at same month in previous years
   * - Calculates what % of yearly income/expense typically happens in this month
   * - Projects based on historical patterns
   *
   * For YEARLY forecast:
   * - Looks at previous complete years
   * - Calculates what % of yearly income/expense had typically occurred by this day
   * - Projects based on time-based progress through the year
   */
  const calculateForecast = useCallback(
    (periodStartDate: string, periodEndDate: string): MonthlyForecast => {
      const periodType = detectPeriodType(periodStartDate, periodEndDate);
      const now = new Date();

      // 1. Current balance = sum of all account balances
      const currentBalance = accounts.reduce(
        (sum, acc) => sum + acc.balance,
        0,
      );

      // 2. Calculate current period income and expenses
      const currentPeriodMovements = movements.filter((m) =>
        isDateInRange(m.date, periodStartDate, periodEndDate),
      );
      const currentPeriodIncome = currentPeriodMovements
        .filter((m) => m.type === "income")
        .reduce((sum, m) => sum + m.totalAmount, 0);
      const currentPeriodExpense = currentPeriodMovements
        .filter((m) => m.type === "expense")
        .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

      // 3. Calculate pending recurring for this period
      const currentPeriodPending = pendingRecurrences.filter(
        (pr) => !pr.isOverdue,
      );
      const pendingRecurringIncome = currentPeriodPending
        .filter((pr) => pr.template.type === "income")
        .reduce(
          (sum, pr) =>
            sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
          0,
        );
      const pendingRecurringExpense = currentPeriodPending
        .filter((pr) => pr.template.type === "expense")
        .reduce(
          (sum, pr) =>
            sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
          0,
        );

      let avgIncome = 0;
      let avgExpense = 0;
      let periodProgress = 0;
      let historicalProgressAtThisPoint = 0;

      if (periodType === "year") {
        // YEARLY FORECAST
        const currentYear = now.getFullYear();
        const dayOfYear = getDayOfYear(now);
        const totalDaysInYear = getDaysInYear(currentYear);
        periodProgress = dayOfYear / totalDaysInYear;

        // Get past years data
        const pastYears = getPastYearsPeriods(5);
        let totalYearlyIncome = 0;
        let totalYearlyExpense = 0;
        let totalProgressIncome = 0;
        let totalProgressExpense = 0;
        let yearsWithData = 0;

        for (const yearPeriod of pastYears) {
          // Full year totals
          const yearMovements = movements.filter((m) =>
            isDateInRange(m.date, yearPeriod.startDate, yearPeriod.endDate),
          );

          if (yearMovements.length > 0) {
            yearsWithData++;
            const yearIncome = yearMovements
              .filter((m) => m.type === "income")
              .reduce((sum, m) => sum + m.totalAmount, 0);
            const yearExpense = yearMovements
              .filter((m) => m.type === "expense")
              .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

            totalYearlyIncome += yearIncome;
            totalYearlyExpense += yearExpense;

            // Get income/expense up to the same day of year in past years
            const upToDay = getYearRangeUpToDay(yearPeriod.year, dayOfYear);
            const upToDayMovements = movements.filter((m) =>
              isDateInRange(m.date, upToDay.startDate, upToDay.endDate),
            );
            const upToDayIncome = upToDayMovements
              .filter((m) => m.type === "income")
              .reduce((sum, m) => sum + m.totalAmount, 0);
            const upToDayExpense = upToDayMovements
              .filter((m) => m.type === "expense")
              .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

            // Calculate progress percentages
            if (yearIncome > 0) {
              totalProgressIncome += upToDayIncome / yearIncome;
            }
            if (yearExpense > 0) {
              totalProgressExpense += upToDayExpense / yearExpense;
            }
          }
        }

        if (yearsWithData > 0) {
          avgIncome = totalYearlyIncome / yearsWithData;
          avgExpense = totalYearlyExpense / yearsWithData;
          // Average of income and expense progress
          historicalProgressAtThisPoint =
            (totalProgressIncome + totalProgressExpense) / yearsWithData / 2;
        }
      } else {
        // MONTHLY FORECAST
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();
        const daysInMonth = new Date(
          now.getFullYear(),
          currentMonth + 1,
          0,
        ).getDate();
        periodProgress = currentDay / daysInMonth;

        // Look at same month in previous years to get percentage of yearly spending
        const pastYears = getPastYearsPeriods(5);
        let monthPercentagesIncome: number[] = [];
        let monthPercentagesExpense: number[] = [];
        let sameMonthTotalsIncome: number[] = [];
        let sameMonthTotalsExpense: number[] = [];

        for (const yearPeriod of pastYears) {
          // Get same month in this past year
          const sameMonthStart = getMonthStart(yearPeriod.year, currentMonth);
          const sameMonthEnd = getMonthEnd(yearPeriod.year, currentMonth);

          const monthMovements = movements.filter((m) =>
            isDateInRange(m.date, sameMonthStart, sameMonthEnd),
          );

          // Get full year totals for comparison
          const yearMovements = movements.filter((m) =>
            isDateInRange(m.date, yearPeriod.startDate, yearPeriod.endDate),
          );

          if (monthMovements.length > 0 && yearMovements.length > 0) {
            const monthIncome = monthMovements
              .filter((m) => m.type === "income")
              .reduce((sum, m) => sum + m.totalAmount, 0);
            const monthExpense = monthMovements
              .filter((m) => m.type === "expense")
              .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

            const yearIncome = yearMovements
              .filter((m) => m.type === "income")
              .reduce((sum, m) => sum + m.totalAmount, 0);
            const yearExpense = yearMovements
              .filter((m) => m.type === "expense")
              .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

            sameMonthTotalsIncome.push(monthIncome);
            sameMonthTotalsExpense.push(monthExpense);

            if (yearIncome > 0) {
              monthPercentagesIncome.push(monthIncome / yearIncome);
            }
            if (yearExpense > 0) {
              monthPercentagesExpense.push(monthExpense / yearExpense);
            }
          }
        }

        // Use average of same month totals from previous years
        if (sameMonthTotalsIncome.length > 0) {
          avgIncome =
            sameMonthTotalsIncome.reduce((a, b) => a + b, 0) /
            sameMonthTotalsIncome.length;
        }
        if (sameMonthTotalsExpense.length > 0) {
          avgExpense =
            sameMonthTotalsExpense.reduce((a, b) => a + b, 0) /
            sameMonthTotalsExpense.length;
        }

        // Historical progress is based on day of month
        historicalProgressAtThisPoint = periodProgress;
      }

      // 6. Calculate forecast
      // Expected remaining = max(0, average - already recorded)
      const expectedRemainingIncome = Math.max(
        0,
        avgIncome - currentPeriodIncome,
      );
      const expectedRemainingExpense = Math.max(
        0,
        avgExpense - currentPeriodExpense,
      );

      const forecastBalance =
        currentBalance +
        pendingRecurringIncome -
        pendingRecurringExpense +
        expectedRemainingIncome -
        expectedRemainingExpense;

      const forecastDelta = forecastBalance - currentBalance;

      return {
        periodType,
        currentBalance,
        currentMonthIncome: currentPeriodIncome,
        currentMonthExpense: currentPeriodExpense,
        pendingRecurringIncome,
        pendingRecurringExpense,
        avgMonthlyIncome: avgIncome,
        avgMonthlyExpense: avgExpense,
        forecastBalance,
        forecastDelta,
        periodProgress,
        historicalProgressAtThisPoint,
      };
    },
    [accounts, movements, pendingRecurrences],
  );

  /**
   * Default monthly forecast for current month (backward compatible)
   */
  const monthlyForecast = useMemo<MonthlyForecast>(() => {
    const currentMonth = getCurrentMonthPeriod();
    return calculateForecast(currentMonth.startDate, currentMonth.endDate);
  }, [calculateForecast]);

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
    unconfirmedMovements, // Movements from third party imports needing confirmation
    pendingRecurrences, // Missing recurring occurrences (current + overdue)
    monthlyForecast, // End-of-month balance forecast (total)
    accountForecasts, // End-of-month balance forecast per account

    // State
    isLoading,
    error,

    // Actions
    reloadData,

    // Helpers
    getTotalIncome,
    getTotalExpense,
    getBalance,
    calculateForecast, // Calculate forecast for any period
  };
};

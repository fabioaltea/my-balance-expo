/**
 * Hook to calculate monthly account balances for charts
 *
 * NOTE: This hook currently uses client-side calculation.
 * Future optimization: Backend can provide pre-calculated monthly balance snapshots
 *
 * Calculates the cumulative balance for each account at the end of each month.
 * This is done by:
 * 1. Getting all transactions
 * 2. For each month, summing all transactions up to the last day of that month
 * 3. Stacking account balances for total balance visualization
 */

import { useMemo } from "react";
import { Transaction, Account } from "./useMyBalanceData";
import { parseDateFromDDMMYYYY } from "../utils/dateUtils";

export interface MonthlyAccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
  color: string;
}

export interface MonthlyData {
  month: string; // "MM/YYYY" format for display
  year: number;
  monthIndex: number; // 0-11
  date: Date; // Last day of the month
  accounts: MonthlyAccountBalance[];
  totalBalance: number;
}

interface UseMonthlyBalancesParams {
  transactions: Transaction[];
  accounts: Account[];
  monthsToShow?: number; // Default 12
  monthOffset?: number; // Offset from current month (0 = current, 12 = 1 year ago)
}

export const useMonthlyBalances = ({
  transactions,
  accounts,
  monthsToShow = 12,
  monthOffset = 0,
}: UseMonthlyBalancesParams): MonthlyData[] => {
  return useMemo(() => {
    if (!transactions.length || !accounts.length) {
      return [];
    }

    // Get the date range we need to analyze
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate the months we want to display (from oldest to newest)
    // monthOffset shifts the window back in time
    const months: { year: number; month: number; endDate: Date }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      // Last day of the month
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, endDate });
    }

    // Create a map of account info by account name (since transactions use account name)
    const accountMap = new Map<string, Account>();
    accounts.forEach((acc) => {
      accountMap.set(acc.name, acc);
    });

    // For each month, calculate the cumulative balance for each account
    const monthlyData: MonthlyData[] = months.map(
      ({ year, month, endDate }) => {
        // Filter transactions up to this month's end date
        const transactionsUpToMonth = transactions.filter((t) => {
          const txDate = parseDateFromDDMMYYYY(t.date);
          if (!txDate) return false;
          return txDate <= endDate;
        });

        // Calculate balance per account
        const accountBalances = new Map<string, number>();
        accounts.forEach((acc) => {
          accountBalances.set(acc.name, 0);
        });

        transactionsUpToMonth.forEach((t) => {
          const currentBalance = accountBalances.get(t.account) || 0;
          const signedAmount = t.type === "income" ? t.amount : -t.amount;
          accountBalances.set(t.account, currentBalance + signedAmount);
        });

        // Build account balances array
        const accountsData: MonthlyAccountBalance[] = accounts.map((acc) => ({
          accountId: acc.accountId,
          accountName: acc.name,
          balance: accountBalances.get(acc.name) || 0,
          color: acc.color || "#2F4F3F",
        }));

        // Calculate total balance (sum of all positive account balances for stacking)
        const totalBalance = accountsData.reduce(
          (sum, acc) => sum + acc.balance,
          0,
        );

        // Format month for display
        const monthLabel = `${String(month + 1).padStart(2, "0")}/${year}`;

        return {
          month: monthLabel,
          year,
          monthIndex: month,
          date: endDate,
          accounts: accountsData,
          totalBalance,
        };
      },
    );

    return monthlyData;
  }, [transactions, accounts, monthsToShow, monthOffset]);
};

/**
 * Get short month label (e.g., "Jan", "Feb")
 */
export const getShortMonthLabel = (monthIndex: number): string => {
  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  return months[monthIndex] || "";
};

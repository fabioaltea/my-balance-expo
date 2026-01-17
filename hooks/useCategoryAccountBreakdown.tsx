/**
 * Hook to calculate income/expenses breakdown by category or account per period
 */

import { useMemo } from "react";
import { Transaction, Account } from "./useMyBalanceData";
import { parseDateFromDDMMYYYY } from "../utils/dateUtils";

export interface BreakdownItem {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface PeriodBreakdownData {
  month: string;
  year: number;
  monthIndex: number;
  date: Date;
  items: BreakdownItem[];
  total: number;
}

interface UseCategoryAccountBreakdownParams {
  transactions: Transaction[];
  accounts: Account[];
  type: "income" | "expense";
  groupBy: "category" | "account";
  monthsToShow?: number;
  monthOffset?: number;
}

// Default colors for categories
const CATEGORY_COLORS: Record<string, string> = {
  "Alimentari": "#4CAF50",
  "Trasporti": "#2196F3",
  "Salute": "#F44336",
  "Intrattenimento": "#9C27B0",
  "Shopping": "#FF9800",
  "Bollette": "#607D8B",
  "Affitto": "#795548",
  "Stipendio": "#4CAF50",
  "Investimenti": "#3F51B5",
  "Regalo": "#E91E63",
  "Altro": "#9E9E9E",
};

const getColorForCategory = (category: string, index: number): string => {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  // Generate a color based on index if not in predefined list
  const hue = (index * 137) % 360; // Golden angle for good distribution
  return `hsl(${hue}, 60%, 50%)`;
};

export const useCategoryAccountBreakdown = ({
  transactions,
  accounts,
  type,
  groupBy,
  monthsToShow = 12,
  monthOffset = 0,
}: UseCategoryAccountBreakdownParams): PeriodBreakdownData[] => {
  return useMemo(() => {
    if (!transactions.length) {
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate months
    const months: { year: number; month: number; startDate: Date; endDate: Date }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, startDate, endDate });
    }

    // Create account map for colors
    const accountMap = new Map<string, Account>();
    accounts.forEach((acc) => {
      accountMap.set(acc.name, acc);
    });

    // Track all unique categories/accounts for consistent coloring
    const allGroupKeys = new Set<string>();
    transactions.forEach((t) => {
      if ((type === "expense" && t.type === "expense") || (type === "income" && t.type === "income")) {
        if (groupBy === "category") {
          allGroupKeys.add(t.category || "Altro");
        } else {
          allGroupKeys.add(t.account);
        }
      }
    });
    const groupKeyArray = Array.from(allGroupKeys);

    // Calculate breakdown for each month
    const monthlyData: PeriodBreakdownData[] = months.map(({ year, month, startDate, endDate }) => {
      // Filter transactions for this month and type
      const monthTransactions = transactions.filter((t) => {
        const txDate = parseDateFromDDMMYYYY(t.date);
        if (!txDate) return false;
        if (txDate < startDate || txDate > endDate) return false;
        return t.type === type;
      });

      // Group by category or account
      const groupedAmounts = new Map<string, number>();

      monthTransactions.forEach((t) => {
        const key = groupBy === "category" ? (t.category || "Altro") : t.account;
        const current = groupedAmounts.get(key) || 0;
        groupedAmounts.set(key, current + t.amount);
      });

      // Build items array
      const items: BreakdownItem[] = [];
      groupedAmounts.forEach((amount, key) => {
        const index = groupKeyArray.indexOf(key);
        let color: string;

        if (groupBy === "account") {
          const account = accountMap.get(key);
          color = account?.color || getColorForCategory(key, index);
        } else {
          color = getColorForCategory(key, index);
        }

        items.push({
          id: key,
          name: key,
          amount,
          color,
        });
      });

      // Sort by amount descending
      items.sort((a, b) => b.amount - a.amount);

      const total = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        month: `${String(month + 1).padStart(2, "0")}/${year}`,
        year,
        monthIndex: month,
        date: endDate,
        items,
        total,
      };
    });

    return monthlyData;
  }, [transactions, accounts, type, groupBy, monthsToShow, monthOffset]);
};

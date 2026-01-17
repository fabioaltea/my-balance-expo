/**
 * Hook to calculate monthly/yearly income and expenses for charts
 *
 * Calculates total income and expenses for each month/year.
 */

import { useMemo } from "react";
import { Transaction } from "./useMyBalanceData";
import { parseDateFromDDMMYYYY } from "../utils/dateUtils";

export interface IncomeExpenseData {
  month: string; // "MM/YYYY" format for display
  year: number;
  monthIndex: number; // 0-11
  date: Date;
  income: number;
  expenses: number;
}

interface UseIncomeExpensesParams {
  transactions: Transaction[];
  monthsToShow?: number;
  monthOffset?: number;
}

export const useIncomeExpenses = ({
  transactions,
  monthsToShow = 12,
  monthOffset = 0,
}: UseIncomeExpensesParams): IncomeExpenseData[] => {
  return useMemo(() => {
    if (!transactions.length) {
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate the months we want to display (from oldest to newest)
    const months: { year: number; month: number; startDate: Date; endDate: Date }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, startDate, endDate });
    }

    // For each month, calculate income and expenses
    const monthlyData: IncomeExpenseData[] = months.map(({ year, month, startDate, endDate }) => {
      // Filter transactions for this specific month
      const monthTransactions = transactions.filter((t) => {
        const txDate = parseDateFromDDMMYYYY(t.date);
        if (!txDate) return false;
        return txDate >= startDate && txDate <= endDate;
      });

      // Calculate income and expenses
      let income = 0;
      let expenses = 0;

      monthTransactions.forEach((t) => {
        if (t.type === "income") {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
      });

      const monthLabel = `${String(month + 1).padStart(2, "0")}/${year}`;

      return {
        month: monthLabel,
        year,
        monthIndex: month,
        date: endDate,
        income,
        expenses,
      };
    });

    return monthlyData;
  }, [transactions, monthsToShow, monthOffset]);
};

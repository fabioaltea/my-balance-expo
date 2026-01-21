/**
 * Hook to calculate monthly/yearly income and expenses for charts
 *
 * Calculates total income and expenses for each month/year based on movement deltas.
 * Uses the net totalAmount of each movement (not individual transactions).
 */

import { useMemo } from "react";
import { Movement } from "./useMyBalanceData";
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
  movements: Movement[];
  monthsToShow?: number;
  monthOffset?: number;
}

export const useIncomeExpenses = ({
  movements,
  monthsToShow = 12,
  monthOffset = 0,
}: UseIncomeExpensesParams): IncomeExpenseData[] => {
  return useMemo(() => {
    if (!movements.length) {
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

    // For each month, calculate income and expenses based on movement deltas
    const monthlyData: IncomeExpenseData[] = months.map(({ year, month, startDate, endDate }) => {
      // Filter movements for this specific month
      const monthMovements = movements.filter((m) => {
        const movementDate = parseDateFromDDMMYYYY(m.date);
        if (!movementDate) return false;
        return movementDate >= startDate && movementDate <= endDate;
      });

      // Calculate income and expenses using movement totalAmount (delta)
      // totalAmount is positive for net income, negative for net expense
      let income = 0;
      let expenses = 0;

      monthMovements.forEach((m) => {
        if (m.totalAmount >= 0) {
          income += m.totalAmount;
        } else {
          expenses += Math.abs(m.totalAmount);
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
  }, [movements, monthsToShow, monthOffset]);
};

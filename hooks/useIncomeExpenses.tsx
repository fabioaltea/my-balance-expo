/**
 * Hook to calculate monthly/yearly income and expenses for charts
 *
 * OPTIMIZED VERSION: Uses pre-calculated aggregations from backend when available,
 * falls back to client-side calculation for backward compatibility.
 * 
 * Calculates total income and expenses for each month/year based on movement deltas.
 * Uses the net totalAmount of each movement (not individual transactions).
 */

import { useMemo } from "react";
import { Movement } from "./useMyBalanceData";
import { parseDateFromDDMMYYYY } from "../utils/dateUtils";
import { useMonthlyAggregations } from "./queries/useAggregations";

// Categories excluded from income/expense (only affect balances)
const EXCLUDED_CATEGORIES = ["Initial Balance"];

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
  useAggregations?: boolean; // Flag to enable backend aggregations
}

export const useIncomeExpenses = ({
  movements,
  monthsToShow = 12,
  monthOffset = 0,
  useAggregations = false, // Default false for backward compatibility
}: UseIncomeExpensesParams): IncomeExpenseData[] => {
  // Calculate date range for aggregation query
  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Oldest month in the range
    const oldestDate = new Date(currentYear, currentMonth - monthsToShow + 1 - monthOffset, 1);
    const fromDate = `${oldestDate.getFullYear()}-${String(oldestDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    // Newest month in the range
    const newestDate = new Date(currentYear, currentMonth - monthOffset + 1, 0);
    const toDate = `${newestDate.getFullYear()}-${String(newestDate.getMonth() + 1).padStart(2, '0')}-${newestDate.getDate()}`;
    
    return { fromDate, toDate };
  }, [monthsToShow, monthOffset]);

  // Try to use backend aggregations if enabled
  const { data: aggregations, isSuccess } = useMonthlyAggregations(
    dateRange.fromDate,
    dateRange.toDate
  );

  // Use aggregations if available and flag is enabled
  const useBackendData = useAggregations && isSuccess && aggregations && aggregations.length > 0;

  return useMemo(() => {
    // If backend aggregations are available and enabled, use them
    if (useBackendData && aggregations) {
      return aggregations.map((agg) => {
        const [year, month] = agg.month.split('-');
        const monthIndex = parseInt(month) - 1;
        const endDate = new Date(parseInt(year), monthIndex + 1, 0, 23, 59, 59);
        
        return {
          month: `${month}/${year}`,
          year: parseInt(year),
          monthIndex,
          date: endDate,
          income: agg.income,
          expenses: agg.expense,
        };
      });
    }

    // Otherwise fall back to client-side calculation
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

      monthMovements
        .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
        .forEach((m) => {
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
  }, [movements, monthsToShow, monthOffset, useBackendData, aggregations]);
};

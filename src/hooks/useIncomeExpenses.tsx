/**
 * Hook to calculate monthly/yearly income and expenses for charts
 *
 * OPTIMIZED VERSION: Uses pre-calculated aggregations from backend when available,
 * falls back to client-side calculation via ChartDataHelper.
 */

import { useMemo } from 'react';
import type { Movement } from '../types/models';
import type { IncomeExpenseData } from '../types/charts';
import { ChartDataHelper } from '../helpers/ChartDataHelper';
import { useSpreadsheetQuery } from './useSpreadsheetQuery';
import { QUERY_KEYS } from '@/src/constants/queryKeys';
import { AggregationsApiHelper, MonthlyAggregation } from '../helpers/AggregationsApiHelper';

// Re-export for backward compatibility
export type { IncomeExpenseData } from '../types/charts';

interface UseIncomeExpensesParams {
  movements: Movement[];
  monthsToShow?: number;
  monthOffset?: number;
  useAggregations?: boolean;
}

export const useIncomeExpenses = ({
  movements,
  monthsToShow = 12,
  monthOffset = 0,
  useAggregations = false,
}: UseIncomeExpensesParams): IncomeExpenseData[] => {
  // Calculate date range for aggregation query
  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const oldestDate = new Date(currentYear, currentMonth - monthsToShow + 1 - monthOffset, 1);
    const fromDate = `${oldestDate.getFullYear()}-${String(oldestDate.getMonth() + 1).padStart(2, '0')}-01`;

    const newestDate = new Date(currentYear, currentMonth - monthOffset + 1, 0);
    const toDate = `${newestDate.getFullYear()}-${String(newestDate.getMonth() + 1).padStart(2, '0')}-${newestDate.getDate()}`;

    return { fromDate, toDate };
  }, [monthsToShow, monthOffset]);

  const { data: aggregations, isSuccess } = useSpreadsheetQuery<MonthlyAggregation[]>({
    queryKey: QUERY_KEYS.aggregations.monthly(dateRange.fromDate, dateRange.toDate),
    fetchFn: (id) =>
      AggregationsApiHelper.getMonthlyAggregations(id, dateRange.fromDate, dateRange.toDate),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!dateRange.fromDate && !!dateRange.toDate,
  });

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

    // Fall back to client-side calculation via helper
    return ChartDataHelper.computeIncomeExpenses(movements, monthsToShow, monthOffset);
  }, [movements, monthsToShow, monthOffset, useBackendData, aggregations]);
};

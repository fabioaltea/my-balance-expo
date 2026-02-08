/**
 * React Query hook for aggregations
 * 
 * Features:
 * - Uses pre-calculated data from backend for optimal performance
 * - Reduces client-side computation for charts
 * - Medium caching (5 minutes) as aggregations can change with new transactions
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  AggregationsApiHelper,
  MonthlyAggregation,
  YearlyAggregation,
} from '@/helpers/AggregationsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

/**
 * Hook to fetch monthly aggregations for a date range
 * Perfect for income/expense charts
 */
export function useMonthlyAggregations(
  fromDate: string,
  toDate: string
): UseQueryResult<MonthlyAggregation[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.aggregations.monthly(fromDate, toDate),
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await AggregationsApiHelper.getMonthlyAggregations(
        selectedSpreadsheetId,
        fromDate,
        toDate
      );
    },
    enabled: !!selectedSpreadsheetId && !!fromDate && !!toDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch yearly aggregation
 * Includes all months for the specified year
 */
export function useYearlyAggregation(
  year: string
): UseQueryResult<YearlyAggregation | null, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.aggregations.yearly(year),
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await AggregationsApiHelper.getYearlyAggregation(
        selectedSpreadsheetId,
        year
      );
    },
    enabled: !!selectedSpreadsheetId && !!year,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

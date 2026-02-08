/**
 * API Helper for fetching pre-calculated aggregations from backend
 * 
 * These endpoints provide optimized data for charts and reports,
 * reducing client-side computation and improving performance
 */

import { HttpHelper, AuthenticationError } from './HttpHelper';

export interface MonthlyAggregation {
  month: string; // YYYY-MM format
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface YearlyAggregation {
  year: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  months: MonthlyAggregation[];
}

export class AggregationsApiHelper {
  /**
   * Get monthly aggregations for a date range
   * This is optimized for chart rendering
   */
  static async getMonthlyAggregations(
    spreadsheetId: string,
    fromDate: string,
    toDate: string
  ): Promise<MonthlyAggregation[]> {
    try {
      console.log('🔄 Loading monthly aggregations from API...');

      const response = await HttpHelper.get(
        `/aggregations/monthly?spreadsheet_id=${spreadsheetId}&from_date=${fromDate}&to_date=${toDate}`
      );

      if (response.success) {
        console.log(
          '✅ Monthly aggregations loaded successfully:',
          response.data?.length || 0
        );
        return response.data || [];
      } else {
        console.error('❌ Failed to load monthly aggregations:', response.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading monthly aggregations:', error);
      // Re-throw authentication errors to trigger logout
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Get yearly aggregation summary
   */
  static async getYearlyAggregation(
    spreadsheetId: string,
    year: string
  ): Promise<YearlyAggregation | null> {
    try {
      console.log('🔄 Loading yearly aggregation from API...');

      const response = await HttpHelper.get(
        `/aggregations/yearly?spreadsheet_id=${spreadsheetId}&year=${year}`
      );

      if (response.success) {
        console.log('✅ Yearly aggregation loaded successfully');
        return response.data;
      } else {
        console.error('❌ Failed to load yearly aggregation:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading yearly aggregation:', error);
      // Re-throw authentication errors to trigger logout
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return null;
    }
  }
}

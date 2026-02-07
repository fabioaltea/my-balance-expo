/**
 * React Query hook for transactions
 * 
 * Features:
 * - Intelligent caching with 5 minute stale time
 * - Offline capability through cache persistence
 * - Automatic refetch on reconnect
 * - Type-safe query keys
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QUERY_KEYS, TransactionFilters } from './queryKeys';
import { TransactionsApiHelper } from '@/helpers/TransactionsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

export interface TransactionData {
  transactionId: string;
  movementId: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  account: string;
  category: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
}

/**
 * Hook to fetch all transactions
 * Uses React Query for caching and automatic refetching
 */
export function useTransactions(
  filters?: TransactionFilters
): UseQueryResult<TransactionData[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.transactions.filtered(filters),
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await TransactionsApiHelper.getTransactions(selectedSpreadsheetId);
    },
    enabled: !!selectedSpreadsheetId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to fetch a single transaction by ID
 */
export function useTransaction(
  transactionId?: string
): UseQueryResult<TransactionData, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.transactions.byId(transactionId || ''),
    queryFn: async () => {
      if (!selectedSpreadsheetId || !transactionId) {
        throw new Error('No spreadsheet or transaction selected');
      }
      // Note: This assumes there's a getTransaction method in the API helper
      // If not available, we can filter from the full list
      const transactions = await TransactionsApiHelper.getTransactions(selectedSpreadsheetId);
      const transaction = transactions.find((t: any) => t.transactionId === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      return transaction;
    },
    enabled: !!selectedSpreadsheetId && !!transactionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

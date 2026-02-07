/**
 * React Query mutation hook for adding transactions
 * 
 * Features:
 * - Optimistic updates: UI updates immediately before server confirms
 * - Automatic rollback on error
 * - Intelligent cache invalidation for dependent queries
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queries/queryKeys';
import { TransactionsApiHelper } from '@/helpers/TransactionsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

export interface CreateTransactionData {
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

export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await TransactionsApiHelper.createTransaction(
        selectedSpreadsheetId,
        data
      );
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (newTransaction) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transactions.all });

      // Snapshot the previous value for rollback
      const previousTransactions = queryClient.getQueryData(
        QUERY_KEYS.transactions.filtered()
      );

      // Optimistically update the cache
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        (old: any[] = []) => [
          ...old,
          {
            ...newTransaction,
            transactionId: `temp-${Date.now()}`,
            isPending: true, // Flag to show as pending in UI
          },
        ]
      );

      // Return context for rollback
      return { previousTransactions };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, newTransaction, context) => {
      console.error('❌ Failed to add transaction:', error);
      
      if (context?.previousTransactions) {
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          context.previousTransactions
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log('✅ Transaction added successfully');

      // Invalidate and refetch all dependent queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });
      
      // Invalidate aggregations for the affected period
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all });
    },

    // Retry once on network errors
    retry: 1,
    retryDelay: 1000,
  });
}

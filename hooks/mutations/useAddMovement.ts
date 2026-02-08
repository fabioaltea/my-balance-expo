/**
 * React Query mutation hook for adding movements (with multiple transactions)
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

export interface CreateMovementData {
  movementId?: string;
  description: string;
  category: string;
  date: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
  transactions: Array<{
    amount: string;
    account: string;
    type: 'in' | 'out';
  }>;
}

export function useAddMovement() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: CreateMovementData) => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await TransactionsApiHelper.createTransaction(
        selectedSpreadsheetId,
        data
      );
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (newMovement) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transactions.all });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Snapshot previous values for rollback
      const previousTransactions = queryClient.getQueryData(
        QUERY_KEYS.transactions.filtered()
      );
      const previousAccounts = queryClient.getQueryData(QUERY_KEYS.accounts.all);

      // Create proper Transaction objects from the movement's transactions
      const tempMovementId = `temp-${Date.now()}`;
      const optimisticTransactions = newMovement.transactions.map((t, index) => {
        const amount = parseFloat(t.amount.replace(',', '.'));
        return {
          movementId: tempMovementId,
          transactionId: `temp-trans-${Date.now()}-${index}`,
          date: newMovement.date,
          description: newMovement.description,
          amount: Math.abs(amount),
          type: t.type === 'in' ? ('income' as const) : ('expense' as const),
          account: t.account,
          category: newMovement.category,
          location: newMovement.location || '',
          recurrenceId: newMovement.recurrenceId,
          recurrencePattern: newMovement.recurrencePattern,
          status: newMovement.status || 'Confirmed',
        };
      });

      // Optimistically add the transactions to the cache
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        (old: any[] = []) => [...old, ...optimisticTransactions]
      );

      // Optimistically update account balances
      queryClient.setQueryData(
        QUERY_KEYS.accounts.all,
        (old: any[] = []) =>
          old.map((account) => {
            // Find transactions affecting this account from the INPUT data
            const affectingTransactions = newMovement.transactions.filter(
              (t) => t.account === account.name
            );

            if (affectingTransactions.length === 0) return account;

            // Calculate balance delta for this account
            // Amount already has the correct sign (negative for expenses, positive for income)
            const balanceDelta = affectingTransactions.reduce((sum, t) => {
              const amount = parseFloat(t.amount.replace(',', '.'));
              const newSum = sum + amount;
              return newSum;
            }, 0);

            return {
              ...account,
              balance: account.balance + balanceDelta,
              isPending: true,
            };
          })
      );

      // Return context for rollback
      return { previousTransactions, previousAccounts };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, newMovement, context) => {
      console.error('❌ Failed to add movement:', error);

      if (context?.previousTransactions) {
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          context.previousTransactions
        );
      }

      if (context?.previousAccounts) {
        queryClient.setQueryData(
          QUERY_KEYS.accounts.all,
          context.previousAccounts
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log('✅ Movement added successfully');

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

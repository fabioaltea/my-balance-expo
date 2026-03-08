/**
 * React Query mutation hook for updating transactions
 *
 * Features:
 * - Optimistic updates: UI updates immediately before server confirms
 * - Automatic rollback on error
 * - Intelligent cache invalidation for dependent queries
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../queries/queryKeys";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import { useAuthContext } from "@/src/state/AuthProvider";

export interface UpdateTransactionData {
  transactionId: string;
  movementId?: string;
  date?: string;
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  account?: string;
  category?: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      if (!selectedSpreadsheetId) {
        throw new Error("No spreadsheet selected");
      }
      const { transactionId, ...updates } = data;
      return await TransactionsApiHelper.updateTransaction(
        selectedSpreadsheetId,
        transactionId,
        updates,
      );
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (updatedTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.transactions.all,
      });

      // Snapshot previous values
      const previousTransactions = queryClient.getQueryData(
        QUERY_KEYS.transactions.filtered(),
      );

      // Optimistically update the cache
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        (old: any[] = []) =>
          old.map((transaction) =>
            transaction.transactionId === updatedTransaction.transactionId
              ? { ...transaction, ...updatedTransaction, isPending: true }
              : transaction,
          ),
      );

      // Also update single transaction cache if it exists
      queryClient.setQueryData(
        QUERY_KEYS.transactions.byId(updatedTransaction.transactionId),
        (old: any) =>
          old ? { ...old, ...updatedTransaction, isPending: true } : old,
      );

      return { previousTransactions };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, updatedTransaction, context) => {
      console.error("❌ Failed to update transaction:", error);

      if (context?.previousTransactions) {
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          context.previousTransactions,
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log("✅ Transaction updated successfully");

      // Invalidate all transaction queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });

      // Account balances may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Aggregations may need recalculation
      // Invalidate all since we don't know which months were affected
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all });
    },

    retry: 1,
    retryDelay: 1000,
  });
}

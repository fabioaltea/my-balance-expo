/**
 * React Query mutation hook for deleting transactions
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

export interface DeleteTransactionData {
  transactionId: string;
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: DeleteTransactionData) => {
      if (!selectedSpreadsheetId) {
        throw new Error("No spreadsheet selected");
      }
      return await TransactionsApiHelper.deleteTransaction(
        selectedSpreadsheetId,
        data.transactionId,
      );
    },

    // 1. OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (deletedTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.transactions.all,
      });

      // Snapshot previous values
      const previousTransactions = queryClient.getQueryData(
        QUERY_KEYS.transactions.filtered(),
      );

      // Optimistically remove from cache
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        (old: any[] = []) =>
          old.filter(
            (transaction) =>
              transaction.transactionId !== deletedTransaction.transactionId,
          ),
      );

      // Remove from single transaction cache
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.transactions.byId(
          deletedTransaction.transactionId,
        ),
      });

      return { previousTransactions };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, deletedTransaction, context) => {
      console.error("❌ Failed to delete transaction:", error);

      if (context?.previousTransactions) {
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          context.previousTransactions,
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log("✅ Transaction deleted successfully");

      // Invalidate all transaction queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });

      // Account balances will change
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Aggregations need recalculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all });
    },

    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * React Query mutation hook for deleting movements (with all their transactions)
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

export interface DeleteMovementData {
  movementId: string;
}

export function useDeleteMovement() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: DeleteMovementData) => {
      if (!selectedSpreadsheetId) {
        throw new Error("No spreadsheet selected");
      }
      return await TransactionsApiHelper.deleteMovement(
        selectedSpreadsheetId,
        data.movementId,
      );
    },

    // 1. OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (deletedMovement) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.transactions.all,
      });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Snapshot previous values
      const previousTransactions = queryClient.getQueryData(
        QUERY_KEYS.transactions.filtered(),
      );
      const previousAccounts = queryClient.getQueryData(
        QUERY_KEYS.accounts.all,
      );

      // Find all transactions for this movement
      const transactionsToDelete = (
        (previousTransactions as any[]) || []
      ).filter((t: any) => t.movementId === deletedMovement.movementId);

      // Optimistically remove all transactions for this movement from cache
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        (old: any[] = []) =>
          old.filter((t) => t.movementId !== deletedMovement.movementId),
      );

      // Optimistically update account balances by reversing the movement's effect
      if (transactionsToDelete.length > 0) {
        queryClient.setQueryData(QUERY_KEYS.accounts.all, (old: any[] = []) =>
          old.map((account) => {
            // Find transactions affecting this account
            const affectingTransactions = transactionsToDelete.filter(
              (t: any) => t.account === account.name,
            );

            if (affectingTransactions.length === 0) return account;

            // Calculate balance delta (reverse the movement's effect)
            const balanceDelta = affectingTransactions.reduce(
              (sum: number, t: any) => {
                const amount = t.amount;
                // Reverse: income becomes negative, expense becomes positive
                return sum + (t.type === "income" ? -amount : amount);
              },
              0,
            );

            return {
              ...account,
              balance: account.balance + balanceDelta,
              isPending: true,
            };
          }),
        );
      }

      return { previousTransactions, previousAccounts };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, deletedMovement, context) => {
      console.error("❌ Failed to delete movement:", error);

      if (context?.previousTransactions) {
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          context.previousTransactions,
        );
      }

      if (context?.previousAccounts) {
        queryClient.setQueryData(
          QUERY_KEYS.accounts.all,
          context.previousAccounts,
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log("✅ Movement deleted successfully");

      // Invalidate all transaction/movement queries
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

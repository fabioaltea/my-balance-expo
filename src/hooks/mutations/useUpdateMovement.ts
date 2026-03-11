/**
 * React Query mutation hook for updating movements (with multiple transactions)
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

export interface UpdateMovementData {
  movementId: string;
  description?: string;
  category?: string;
  date?: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
  transactions?: Array<{
    amount: string;
    account: string;
    type: "in" | "out";
  }>;
}

export function useUpdateMovement() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: UpdateMovementData) => {
      if (!selectedSpreadsheetId) {
        throw new Error("No spreadsheet selected");
      }
      const { movementId, ...updates } = data;
      return await TransactionsApiHelper.updateMovement(
        selectedSpreadsheetId,
        movementId,
        updates,
      );
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (updatedMovement) => {
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

      // Find old transactions for this movement
      const oldTransactions = ((previousTransactions as any[]) || []).filter(
        (t: any) => t.movementId === updatedMovement.movementId,
      );

      if (updatedMovement.transactions) {
        // Full update with new transactions - remove old and add new
        // Remove old transactions
        let updatedCache = ((previousTransactions as any[]) || []).filter(
          (t: any) => t.movementId !== updatedMovement.movementId,
        );

        // Create new transaction objects
        const newTransactions = updatedMovement.transactions.map((t, index) => {
          const amount = parseFloat(t.amount.replace(",", "."));
          return {
            movementId: updatedMovement.movementId,
            transactionId: `update-trans-${Date.now()}-${index}`,
            date: updatedMovement.date || oldTransactions[0]?.date || "",
            description:
              updatedMovement.description ||
              oldTransactions[0]?.description ||
              "",
            amount: Math.abs(amount),
            type: t.type === "in" ? ("income" as const) : ("expense" as const),
            account: t.account,
            category:
              updatedMovement.category || oldTransactions[0]?.category || "",
            location:
              updatedMovement.location !== undefined
                ? updatedMovement.location
                : oldTransactions[0]?.location || "",
            recurrenceId:
              updatedMovement.recurrenceId !== undefined
                ? updatedMovement.recurrenceId
                : oldTransactions[0]?.recurrenceId,
            recurrencePattern:
              updatedMovement.recurrencePattern !== undefined
                ? updatedMovement.recurrencePattern
                : oldTransactions[0]?.recurrencePattern,
            status:
              updatedMovement.status !== undefined
                ? updatedMovement.status
                : oldTransactions[0]?.status || "Confirmed",
          };
        });

        // Add new transactions
        updatedCache = [...updatedCache, ...newTransactions];

        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          updatedCache,
        );
      } else {
        // Partial update (only metadata like description, category, date)
        queryClient.setQueryData(
          QUERY_KEYS.transactions.filtered(),
          (old: any[] = []) =>
            old.map((transaction) => {
              if (transaction.movementId === updatedMovement.movementId) {
                return {
                  ...transaction,
                  ...(updatedMovement.description !== undefined && {
                    description: updatedMovement.description,
                  }),
                  ...(updatedMovement.category !== undefined && {
                    category: updatedMovement.category,
                  }),
                  ...(updatedMovement.date !== undefined && {
                    date: updatedMovement.date,
                  }),
                  ...(updatedMovement.location !== undefined && {
                    location: updatedMovement.location,
                  }),
                  ...(updatedMovement.status !== undefined && {
                    status: updatedMovement.status,
                  }),
                  ...(updatedMovement.recurrenceId !== undefined && {
                    recurrenceId: updatedMovement.recurrenceId,
                  }),
                  ...(updatedMovement.recurrencePattern !== undefined && {
                    recurrencePattern: updatedMovement.recurrencePattern,
                  }),
                };
              }
              return transaction;
            }),
        );
      }

      // Optimistically update account balances if transactions changed
      if (updatedMovement.transactions) {
        queryClient.setQueryData(QUERY_KEYS.accounts.all, (old: any[] = []) =>
          old.map((account) => {
            let balanceDelta = 0;

            // Reverse the effect of old transactions for this account
            const oldAffectingTransactions = oldTransactions.filter(
              (t: any) => t.account === account.name,
            );
            balanceDelta -= oldAffectingTransactions.reduce(
              (sum: number, t: any) => {
                const amount = t.amount;
                return sum + (t.type === "income" ? amount : -amount);
              },
              0,
            );

            // Apply the effect of new transactions for this account
            const newAffectingTransactions =
              updatedMovement.transactions!.filter(
                (t) => t.account === account.name,
              );
            balanceDelta += newAffectingTransactions.reduce((sum, t) => {
              const amount = parseFloat(t.amount.replace(",", "."));
              return sum + amount;
            }, 0);

            if (balanceDelta === 0) return account;

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
    onError: (error, updatedMovement, context) => {
      console.error("❌ Failed to update movement:", error);

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
      console.log("✅ Movement updated successfully");

      // Invalidate all transaction/movement queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });

      // Account balances may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Aggregations may need recalculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all });
    },

    retry: 1,
    retryDelay: 1000,
  });
}

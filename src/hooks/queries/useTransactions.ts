/**
 * React Query hook for transactions
 *
 * Features:
 * - Intelligent caching with 5 minute stale time
 * - Offline capability through cache persistence
 * - Automatic refetch on reconnect
 * - Type-safe query keys
 * - Data transformation from backend format to frontend format
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QUERY_KEYS, TransactionFilters } from "./queryKeys";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import { useAuthContext } from "@/src/state/AuthProvider";

export interface TransactionData {
  movementId: string;
  transactionId: string;
  date: string; // dd-MM-yyyy format
  description: string;
  amount: number; // Always positive, use type for direction
  type: "income" | "expense";
  account: string;
  category: string;
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

/**
 * Hook to fetch all transactions
 * Uses React Query for caching and automatic refetching
 * Transforms backend data to frontend format
 */
export function useTransactions(
  filters?: TransactionFilters,
): UseQueryResult<TransactionData[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.transactions.filtered(filters),
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error("No spreadsheet selected");
      }

      const rawTransactions = await TransactionsApiHelper.getTransactions(
        selectedSpreadsheetId,
      );

      // Transform backend data to frontend format
      const transformedTransactions: TransactionData[] = (
        rawTransactions || []
      ).map((t: any) => {
        const amountStr =
          t.amount
            ?.replace?.(/[€\s]/g, "")
            ?.replace(".", "")
            .replace?.(",", ".") || "0";
        const amount = parseFloat(amountStr);

        return {
          movementId: t.movementId,
          transactionId: t.transactionId || t.id || Math.random().toString(),
          date: t.date,
          description: t.description || "",
          amount: Math.abs(amount), // Always positive
          type: amount >= 0 ? ("income" as const) : ("expense" as const),
          account: t.account || "",
          category: t.category || "",
          location: t.location || "",
          recurrenceId: t.recurrenceId || undefined,
          recurrencePattern: t.recurrencePattern || undefined,
          status: t.status || "Confirmed",
          transactions: t.transactions,
        };
      });

      return transformedTransactions;
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
  transactionId?: string,
): UseQueryResult<TransactionData, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.transactions.byId(transactionId || ""),
    queryFn: async () => {
      if (!selectedSpreadsheetId || !transactionId) {
        throw new Error("No spreadsheet or transaction selected");
      }
      // Note: This assumes there's a getTransaction method in the API helper
      // If not available, we can filter from the full list
      const transactions = await TransactionsApiHelper.getTransactions(
        selectedSpreadsheetId,
      );
      const transaction = transactions.find(
        (t: any) => t.transactionId === transactionId,
      );
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      return transaction;
    },
    enabled: !!selectedSpreadsheetId && !!transactionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

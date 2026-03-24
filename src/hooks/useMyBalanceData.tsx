/**
 * Unified hook for MyBalance data management
 *
 * This hook orchestrates data fetching via React Query and delegates
 * all business logic to MovementDataHelper.
 *
 * Architecture:
 * - Backend: Stores individual transactions
 * - Frontend: Groups transactions into movements for display
 * - React Query: Manages caching, optimistic updates, and data synchronization
 * - MovementDataHelper: All pure computation (grouping, filtering, forecasts)
 */

import { useCallback, useMemo } from "react";
import { useSpreadsheetQuery } from "./useSpreadsheetQuery";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/constants/queryKeys";
import { TransactionsApiHelper } from "../helpers/TransactionsApiHelper";
import { AccountsApiHelper } from "../helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "../helpers/CategoriesApiHelper";
import type { Transaction, Account, Category } from "../types/models";
import { MovementDataHelper } from "../helpers/MovementDataHelper";
import { getCurrentMonthPeriod } from "../utils/dateUtils";

// Re-export types from centralized location for backward compatibility
export type {
  Transaction,
  Movement,
  Account,
  Category,
  PendingRecurrence,
  MonthlyForecast,
  AccountForecast,
} from "../types/models";

export const useMyBalanceData = (
  spreadsheetId: string | null,
  onAuthError?: () => Promise<void>,
) => {
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useSpreadsheetQuery<Transaction[]>({
    queryKey: QUERY_KEYS.transactions.filtered(),
    fetchFn: async (id) => {
      const raw = await TransactionsApiHelper.getTransactions(id);
      return (raw || []).map(TransactionsApiHelper.rawToTransactionData);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useSpreadsheetQuery<Account[]>({
    queryKey: QUERY_KEYS.accounts.all,
    fetchFn: async (id) => {
      const raw = await AccountsApiHelper.getAccounts(id);
      return (raw || []).map(AccountsApiHelper.rawToAccountData);
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useSpreadsheetQuery<Category[]>({
    queryKey: QUERY_KEYS.categories.all,
    fetchFn: (id) => CategoriesApiHelper.getCategories(id),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const isLoading =
    isLoadingTransactions || isLoadingAccounts || isLoadingCategories;

  const error =
    transactionsError?.message ||
    accountsError?.message ||
    categoriesError?.message ||
    null;

  const reloadData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories.all }),
    ]);
  };

  // Derive movements from transactions using helper
  const allMovements = useMemo(
    () => MovementDataHelper.groupTransactionsIntoMovements(transactions),
    [transactions],
  );

  const movements = useMemo(
    () => MovementDataHelper.filterActualMovements(allMovements),
    [allMovements],
  );

  const unconfirmedMovements = useMemo(
    () => MovementDataHelper.filterUnconfirmedMovements(allMovements),
    [allMovements],
  );

  const recurringMovements = useMemo(
    () => MovementDataHelper.filterRecurringMovements(allMovements),
    [allMovements],
  );

  const pendingRecurrences = useMemo(
    () =>
      MovementDataHelper.calculatePendingRecurrences(
        recurringMovements,
        allMovements,
      ),
    [recurringMovements, allMovements],
  );

  const calculateForecast = useCallback(
    (periodStartDate: string, periodEndDate: string) => {
      return MovementDataHelper.calculateForecast(
        accounts,
        movements,
        pendingRecurrences,
        periodStartDate,
        periodEndDate,
      );
    },
    [accounts, movements, pendingRecurrences],
  );

  const monthlyForecast = useMemo(() => {
    const currentMonth = getCurrentMonthPeriod();
    return calculateForecast(currentMonth.startDate, currentMonth.endDate);
  }, [calculateForecast]);

  const accountForecasts = useMemo(
    () =>
      MovementDataHelper.calculateAccountForecasts(
        accounts,
        transactions,
        pendingRecurrences,
      ),
    [accounts, transactions, pendingRecurrences],
  );

  return {
    // Raw data from backend
    transactions,
    accounts,
    categories,

    // Derived data
    movements,
    recurringMovements,
    unconfirmedMovements,
    pendingRecurrences,
    monthlyForecast,
    accountForecasts,

    // State
    isLoading,
    error,

    // Actions
    reloadData,

    // Helpers (kept for backward compatibility via context)
    getTotalIncome: MovementDataHelper.getTotalIncome,
    getTotalExpense: MovementDataHelper.getTotalExpense,
    getBalance: MovementDataHelper.getBalance,
    calculateForecast,
  };
};

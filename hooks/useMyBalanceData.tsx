import { useState, useCallback, useEffect } from "react";
import { useAuthContext } from "../state/AuthProvider";
import { TransactionsApiHelper } from "../helpers/TransactionsApiHelper";
import { AccountsApiHelper } from "../helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "../helpers/CategoriesApiHelper";
import { AuthStorageHelper } from "../helpers/AuthStorageHelper";

export interface Movement {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: Date;
  accountName: string;
  category: string;
  confirmed?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color?: string;
  textColor?: string;
  transactions?: number;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
}

export interface DataState {
  movements: Movement[];
  accounts: Account[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  lastSyncDate: Date | null;
}

export const useMyBalanceData = () => {
  const { user, isAuthenticated } = useAuthContext();
  const [dataState, setDataState] = useState<DataState>({
    movements: [],
    accounts: [],
    categories: [],
    isLoading: false,
    error: null,
    lastSyncDate: null,
  });

  // Load all data from backend
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated || !user?.spreadsheetId) {
      return;
    }

    try {
      setDataState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Get access token from storage
      const tokens = await AuthStorageHelper.getTokens();
      if (!tokens?.accessToken) {
        throw new Error("No access token available");
      }

      const [movementsData, accountsData, categoriesData] = await Promise.all([
        TransactionsApiHelper.getTransactions(
          tokens.accessToken,
          user.spreadsheetId
        ),
        AccountsApiHelper.getAccounts(tokens.accessToken, user.spreadsheetId),
        CategoriesApiHelper.getCategories(
          tokens.accessToken,
          user.spreadsheetId
        ),
      ]);

      setDataState((prev) => ({
        ...prev,
        movements: movementsData || [],
        accounts: accountsData || [],
        categories: categoriesData || [],
        isLoading: false,
        lastSyncDate: new Date(),
      }));
    } catch (error) {
      console.error("Error loading data:", error);
      setDataState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load data",
      }));
    }
  }, [isAuthenticated, user?.spreadsheetId]);

  // Add movement
  const addMovement = useCallback(
    async (movement: Omit<Movement, "id">) => {
      if (!user?.spreadsheetId) {
        throw new Error("No spreadsheet configured");
      }

      try {
        const tokens = await AuthStorageHelper.getTokens();
        if (!tokens?.accessToken) {
          throw new Error("No access token available");
        }

        const newMovement = await TransactionsApiHelper.createTransaction(
          tokens.accessToken,
          user.spreadsheetId,
          movement
        );

        setDataState((prev) => ({
          ...prev,
          movements: [...prev.movements, newMovement],
        }));

        return newMovement;
      } catch (error) {
        console.error("Error adding movement:", error);
        throw error;
      }
    },
    [user?.spreadsheetId]
  );

  // Update movement
  const updateMovement = useCallback(
    async (movementId: string, updates: Partial<Movement>) => {
      if (!user?.spreadsheetId) {
        throw new Error("No spreadsheet configured");
      }

      try {
        const tokens = await AuthStorageHelper.getTokens();
        if (!tokens?.accessToken) {
          throw new Error("No access token available");
        }

        const updatedMovement = await TransactionsApiHelper.updateTransaction(
          tokens.accessToken,
          user.spreadsheetId,
          movementId,
          updates
        );

        setDataState((prev) => ({
          ...prev,
          movements: prev.movements.map((m) =>
            m.id === movementId ? { ...m, ...updatedMovement } : m
          ),
        }));

        return updatedMovement;
      } catch (error) {
        console.error("Error updating movement:", error);
        throw error;
      }
    },
    [user?.spreadsheetId]
  );

  // Delete movement
  const deleteMovement = useCallback(
    async (movementId: string) => {
      if (!user?.spreadsheetId) {
        throw new Error("No spreadsheet configured");
      }

      try {
        const tokens = await AuthStorageHelper.getTokens();
        if (!tokens?.accessToken) {
          throw new Error("No access token available");
        }

        await TransactionsApiHelper.deleteTransaction(
          tokens.accessToken,
          user.spreadsheetId,
          movementId
        );

        setDataState((prev) => ({
          ...prev,
          movements: prev.movements.filter((m) => m.id !== movementId),
        }));
      } catch (error) {
        console.error("Error deleting movement:", error);
        throw error;
      }
    },
    [user?.spreadsheetId]
  );

  // Calculate total balance
  const getTotalBalance = useCallback((): number => {
    return dataState.movements.reduce((total, movement) => {
      return (
        total +
        (movement.type === "income" ? movement.amount : -movement.amount)
      );
    }, 0);
  }, [dataState.movements]);

  // Get movements by account
  const getMovementsByAccount = useCallback(
    (accountName: string): Movement[] => {
      if (accountName === "All") {
        return dataState.movements;
      }
      return dataState.movements.filter((m) => m.accountName === accountName);
    },
    [dataState.movements]
  );

  // Get movements by date range
  const getMovementsByDateRange = useCallback(
    (startDate: Date, endDate: Date): Movement[] => {
      return dataState.movements.filter((m) => {
        const movementDate = new Date(m.date);
        return movementDate >= startDate && movementDate <= endDate;
      });
    },
    [dataState.movements]
  );

  // Auto-load data when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.spreadsheetId) {
      loadAllData();
    }
  }, [isAuthenticated, user?.spreadsheetId, loadAllData]);

  return {
    ...dataState,
    loadAllData,
    addMovement,
    updateMovement,
    deleteMovement,
    getTotalBalance,
    getMovementsByAccount,
    getMovementsByDateRange,
    refreshData: loadAllData, // Alias for consistency
  };
};

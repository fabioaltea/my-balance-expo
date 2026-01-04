import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  IAppState,
  IDateRange,
  IMovement,
  DATE_RANGES,
} from "./AppState.types";
import { useAuthContext } from "./AuthProvider";

const AppStateContext = createContext<IAppState | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  // Pull raw backend data and helpers from auth context
  const {
    allTransactions,
    accountsList,
    personalCategories,
    reloadAllData,
    dashboardReady,
  } = useAuthContext();

  // Account state - use first real account or fallback to "All"
  const [selectedAccount, setSelectedAccount] = useState<string>("All");

  // Date range state
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH
  );

  // Map transactions to IMovement shape
  const movements: IMovement[] = (allTransactions || []).map((t: any) => ({
    id: t.transactionId || t.id || Math.random().toString(),
    description: t.description || "",
    amount: parseFloat(
      t.amount?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
    ),
    type:
      parseFloat(
        t.amount?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
      ) >= 0
        ? "income"
        : "expense",
    date: new Date(t.date || Date.now()),
    accountName: t.account || "",
    category: t.category || "",
  }));

  // Map accounts from backend
  const accounts = (accountsList || []).map((a: any) => ({
    id: a.accountId || a.id || Math.random().toString(),
    name: a.name || "",
    type: "bank",
    balance: parseFloat(
      a.balance?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
    ),
    color: a.color || "#2F4F3F",
    textColor: a.textColor || "#FFFFFF",
    transactions: movements.filter((m) => m.accountName === a.name).length,
  }));

  // Map categories from backend
  const categories = (personalCategories || []).map((c: any) => ({
    id: c.id || Math.random().toString(),
    name: c.name || "",
    type: (c.type as "income" | "expense") || "expense",
    color: c.color || "#2F4F3F",
  }));

  // Privacy state
  const [blurSensitiveInfo, setBlurSensitiveInfo] = useState<boolean>(false);

  // Computed filtered movements based on account and date range
  const filteredMovements = movements.filter((movement: IMovement) => {
    const isInDateRange =
      movement.date >= dateRange.startDate &&
      movement.date <= dateRange.endDate;
    const matchesAccount =
      selectedAccount === "All" || movement.accountName === selectedAccount;

    return isInDateRange && matchesAccount;
  });

  // Debug logging
  useEffect(() => {
    console.log("App State Changed:", {
      selectedAccount,
      dateRange: dateRange.label,
      totalMovements: movements.length,
      filteredMovements: filteredMovements.length,
      blurSensitiveInfo,
    });
  }, [
    selectedAccount,
    dateRange,
    movements.length,
    filteredMovements.length,
    blurSensitiveInfo,
  ]);

  const value: IAppState = {
    selectedAccount,
    setSelectedAccount,
    dateRange,
    setDateRange,
    movements,
    setMovements: () => {}, // Not needed since we use real data from API
    filteredMovements,
    accounts, // Include real accounts from API
    categories, // Include real categories from API
    blurSensitiveInfo,
    setBlurSensitiveInfo,
    isLoading: !dashboardReady,
    refreshData: async () => {
      if (reloadAllData) {
        await reloadAllData();
      }
    },
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): IAppState => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};

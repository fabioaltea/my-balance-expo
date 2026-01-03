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
import { useMyBalanceData } from "../hooks/useMyBalanceData";

const AppStateContext = createContext<IAppState | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  // Use real data from backend
  const {
    movements: realMovements,
    accounts: realAccounts,
    isLoading,
  } = useMyBalanceData();

  // Account state - use first real account or fallback to "All"
  const [selectedAccount, setSelectedAccount] = useState<string>("All");

  // Date range state
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH
  );

  // Always use real movements from backend
  const movements = realMovements.map((m) => ({
    ...m,
    date: new Date(m.date), // Ensure date is a Date object
  }));

  // Use real accounts from backend
  const accounts = realAccounts;

  // Privacy state
  const [blurSensitiveInfo, setBlurSensitiveInfo] = useState<boolean>(false);

  // Computed filtered movements based on account and date range
  const filteredMovements = movements.filter((movement) => {
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
    blurSensitiveInfo,
    setBlurSensitiveInfo,
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

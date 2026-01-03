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
import { MOCK_ACCOUNTS } from "@/models/Account";
import { useMyBalanceData } from "../hooks/useMyBalanceData";

const AppStateContext = createContext<IAppState | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

// Mock movements data
const MOCK_MOVEMENTS: IMovement[] = [
  {
    id: "1",
    description: "Tredicesima",
    amount: 1391.44,
    type: "income",
    date: new Date(2025, 11, 15),
    accountName: "Intesa San Paolo",
    category: "Salary",
  },
  {
    id: "2",
    description: "Pellet",
    amount: 22.96,
    type: "expense",
    date: new Date(2025, 11, 13),
    accountName: "Cash",
    category: "Home",
  },
  {
    id: "3",
    description: "Spesa Conad",
    amount: 40.62,
    type: "expense",
    date: new Date(2025, 11, 13),
    accountName: "Cash",
    category: "Groceries",
  },
  {
    id: "4",
    description: "Pellet",
    amount: 22.96,
    type: "expense",
    date: new Date(2025, 11, 13),
    accountName: "Cash",
    category: "Home",
  },
  {
    id: "5",
    description: "Spesa Conad",
    amount: 40.62,
    type: "expense",
    date: new Date(2025, 11, 13),
    accountName: "Cash",
    category: "Groceries",
  },
];

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  // Use real data from backend
  const {
    movements: realMovements,
    accounts: realAccounts,
    isLoading,
  } = useMyBalanceData();

  // Account state - use first real account or fallback to mock
  const [selectedAccount, setSelectedAccount] = useState<string>("All");

  // Date range state
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH
  );

  // Use real movements from backend, fallback to mock for development
  const movements =
    realMovements.length > 0
      ? realMovements.map((m) => ({
          ...m,
          date: new Date(m.date), // Ensure date is a Date object
        }))
      : MOCK_MOVEMENTS;

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

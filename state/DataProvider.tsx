import React, { createContext, useContext, ReactNode } from "react";
import { useMyBalanceData, Transaction, Movement, Account, Category } from "../hooks/useMyBalanceData";
import { useAuthContext } from "./AuthProvider";

interface DataContextType {
  // Raw data
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];

  // Derived data
  movements: Movement[];
  recurringMovements: Movement[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  reloadData: () => Promise<void>;

  // Helpers
  getTotalIncome: (filteredMovements: Movement[]) => number;
  getTotalExpense: (filteredMovements: Movement[]) => number;
  getBalance: (filteredMovements: Movement[]) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { selectedSpreadsheetId } = useAuthContext();
  const data = useMyBalanceData(selectedSpreadsheetId);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};

import React, { createContext, useContext, ReactNode } from 'react';
import { useMyBalanceData } from '../hooks/useMyBalanceData';
import type {
  Transaction,
  Movement,
  Account,
  Category,
  PendingRecurrence,
  MonthlyForecast,
  AccountForecast,
} from '../types/models';
import { useAuthContext } from './AuthProvider';

interface DataContextType {
  // Raw data
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];

  // Derived data
  movements: Movement[];
  recurringMovements: Movement[];
  unconfirmedMovements: Movement[];
  pendingRecurrences: PendingRecurrence[];
  monthlyForecast: MonthlyForecast;
  accountForecasts: AccountForecast[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  reloadData: () => Promise<void>;

  // Helpers
  getTotalIncome: (filteredMovements: Movement[], accountFilter?: string) => number;
  getTotalExpense: (filteredMovements: Movement[], accountFilter?: string) => number;
  getBalance: (filteredMovements: Movement[]) => number;
  calculateForecast: (startDate: string, endDate: string) => MonthlyForecast;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { selectedSpreadsheetId, logout } = useAuthContext();
  const data = useMyBalanceData(selectedSpreadsheetId, logout);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

// Core data types used across the app state
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

export interface IDateRange {
  startDate: string; // Format: dd-MM-yyyy
  endDate: string; // Format: dd-MM-yyyy
  label: string;
  isTransitioning?: boolean; // Flag to indicate data is reloading
}

export interface IMovement {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string; // Format: dd-MM-yyyy
  accountName: string;
  category: string;
}

export interface IAppState {
  // Account management
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;

  // Date range management
  dateRange: IDateRange;
  setDateRange: (range: IDateRange) => void;

  // Movements data
  movements: IMovement[];
  setMovements: (movements: IMovement[]) => void;
  filteredMovements: IMovement[];

  // Accounts data
  accounts: Account[];

  // Categories data
  categories: Category[];

  // Loading and refresh controls
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Privacy settings
  blurSensitiveInfo: boolean;
  setBlurSensitiveInfo: (blur: boolean) => void;
}

import {
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getCurrentDate,
} from "../utils/dateUtils";

// Preset date ranges (computed at runtime)
export const DATE_RANGES = {
  THIS_MONTH: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth());
    },
    get endDate() {
      const now = new Date();
      return getMonthEnd(now.getFullYear(), now.getMonth());
    },
    label: "This Month",
  },
  LAST_MONTH: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth() - 1);
    },
    get endDate() {
      const now = new Date();
      return getMonthEnd(now.getFullYear(), now.getMonth() - 1);
    },
    label: "Last Month",
  },
  LAST_3_MONTHS: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth() - 2);
    },
    get endDate() {
      return getCurrentDate();
    },
    label: "Last 3 Months",
  },
  THIS_YEAR: {
    get startDate() {
      const now = new Date();
      return getYearStart(now.getFullYear());
    },
    get endDate() {
      return getCurrentDate();
    },
    label: "This Year",
  },
};

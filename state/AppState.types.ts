import { Account } from "../hooks/useMyBalanceData";

export interface IDateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface IMovement {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: Date;
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

  // Privacy settings
  blurSensitiveInfo: boolean;
  setBlurSensitiveInfo: (blur: boolean) => void;
}

// Preset date ranges
export const DATE_RANGES = {
  THIS_MONTH: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    label: "This Month",
  },
  LAST_MONTH: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    label: "Last Month",
  },
  LAST_3_MONTHS: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
    endDate: new Date(),
    label: "Last 3 Months",
  },
  THIS_YEAR: {
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
    label: "This Year",
  },
};

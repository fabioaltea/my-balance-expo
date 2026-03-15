export interface MonthlyAccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
  color: string;
}

export interface MonthlyData {
  month: string; // "MM/YYYY" format for display
  year: number;
  monthIndex: number; // 0-11
  date: Date; // Last day of the month
  accounts: MonthlyAccountBalance[];
  totalBalance: number;
}

export interface IncomeExpenseData {
  month: string; // "MM/YYYY" format for display
  year: number;
  monthIndex: number; // 0-11
  date: Date;
  income: number;
  expenses: number;
}

export interface BreakdownItem {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface PeriodBreakdownData {
  month: string;
  year: number;
  monthIndex: number;
  date: Date;
  items: BreakdownItem[];
  total: number;
}

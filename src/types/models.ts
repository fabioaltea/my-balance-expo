export interface Transaction {
  movementId: string;
  transactionId: string;
  date: string; // dd-MM-yyyy format
  description: string;
  amount: number; // Always positive, use type for direction
  type: "income" | "expense";
  account: string;
  category: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string; // ISO 8601 duration format (e.g., P1W, P1M)
  status?: string; // "Confirmed", "recurrent", "DELETED"
}

export interface Movement {
  id: string; // movementId
  date: string; // dd-MM-yyyy format
  description: string;
  category: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string; // ISO 8601 duration format (e.g., P1W, P1M)
  status?: string; // "Confirmed", "recurrent", "DELETED"
  transactions: Transaction[]; // Can contain multiple transactions across different accounts
  totalAmount: number; // Signed: sum of all transactions (positive for net income, negative for net expense)
  type: "income" | "expense"; // Derived from totalAmount sign
}

export interface Account {
  accountId: string;
  name: string;
  balance: number;
  color?: string;
  textColor?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}

/**
 * Represents a pending/missing recurring movement occurrence
 * When a recurring template expects N occurrences in a period but fewer exist
 */
export interface PendingRecurrence {
  /** The recurring movement template */
  template: Movement;
  /** Period label (e.g., "Gennaio 2026") */
  periodLabel: string;
  /** Start of the period (dd-MM-yyyy) */
  periodStart: string;
  /** End of the period (dd-MM-yyyy) */
  periodEnd: string;
  /** Expected number of occurrences in this period */
  expectedCount: number;
  /** Actual number of occurrences tracked */
  actualCount: number;
  /** Number of missing occurrences (expected - actual) */
  missingCount: number;
  /** Whether this period is before the current month */
  isOverdue: boolean;
}

/**
 * Forecast data for end-of-period balance prediction
 * Supports both monthly and yearly forecasts
 */
export interface MonthlyForecast {
  /** Type of forecast period */
  periodType: "month" | "year";
  /** Current total balance (sum of all accounts) */
  currentBalance: number;
  /** Income already recorded in this period */
  currentMonthIncome: number;
  /** Expenses already recorded in this period */
  currentMonthExpense: number;
  /** Pending recurring income for this period */
  pendingRecurringIncome: number;
  /** Pending recurring expenses for this period */
  pendingRecurringExpense: number;
  /** Average income for this type of period (historical) */
  avgMonthlyIncome: number;
  /** Average expense for this type of period (historical) */
  avgMonthlyExpense: number;
  /** Predicted end-of-period balance */
  forecastBalance: number;
  /** Expected change from current balance */
  forecastDelta: number;
  /** Progress through the period (0-1) - how much of the period has passed */
  periodProgress: number;
  /** Historical average progress at this point in period (0-1) - how much was typically spent by now */
  historicalProgressAtThisPoint: number;
  /** Whether there is enough historical data to show the forecast (at least 2 months) */
  hasEnoughData: boolean;
}

/**
 * Forecast data for a specific account
 */
export interface AccountForecast {
  accountId: string;
  accountName: string;
  currentBalance: number;
  forecastBalance: number;
  forecastDelta: number;
}

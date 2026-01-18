// Centralized exports for state management

// Authentication
export { AuthProvider, useAuthContext } from "./AuthProvider";

// Data management - Centralized context
export { DataProvider, useDataContext } from "./DataProvider";
export type {
  Transaction,
  Movement,
  Account,
  Category,
  PendingRecurrence,
} from "../hooks/useMyBalanceData";

// Date utilities
export { DATE_RANGES } from "./AppState.types";
export type { IDateRange } from "./AppState.types";

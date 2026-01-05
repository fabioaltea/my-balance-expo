// Centralized exports for state management

// Authentication
export { AuthProvider, useAuthContext } from "./AuthProvider";

// Data management (NEW - simplified architecture)
export { useMyBalanceData } from "../hooks/useMyBalanceData";
export type { Transaction, Movement, Account, Category } from "../hooks/useMyBalanceData";

// Date utilities
export { DATE_RANGES } from "./AppState.types";
export type { IDateRange } from "./AppState.types";

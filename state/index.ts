// Main exports for centralized state management
export { AppStateProvider, useAppState } from "./AppStateProvider";
export {
  useAccountSelection,
  useDateRange,
  useMovements,
  usePrivacy,
} from "../hooks/useAppState";
export type { IAppState, IDateRange, IMovement } from "./AppState.types";
export { DATE_RANGES } from "./AppState.types";
export { AuthProvider, useAuthContext } from "./AuthProvider";

// Main exports for centralized state management
export { AppStateProvider, useAppState } from "./state/AppStateProvider";
export {
  useAccountSelection,
  useDateRange,
  useMovements,
  usePrivacy,
} from "./hooks/useAppState";
export type { IAppState, IDateRange, IMovement } from "./state/AppState.types";
export { DATE_RANGES } from "./state/AppState.types";

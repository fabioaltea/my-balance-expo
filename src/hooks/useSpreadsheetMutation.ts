import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/src/state/AuthProvider";

export interface SpreadsheetMutationOptions<TData, TContext> {
  mutationFn: (spreadsheetId: string, data: TData) => Promise<unknown>;
  onMutate: (queryClient: QueryClient, data: TData) => Promise<TContext>;
  onError: (queryClient: QueryClient, context: TContext | undefined) => void;
  onSuccess: (queryClient: QueryClient, variables: TData) => void;
}

/**
 * Generic hook for all spreadsheet-backed mutations.
 * Handles auth context, spreadsheet check, retry config, and React Query wiring.
 */
export function useSpreadsheetMutation<TData, TContext>({
  mutationFn,
  onMutate,
  onError,
  onSuccess,
}: SpreadsheetMutationOptions<TData, TContext>) {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: TData) => {
      if (!selectedSpreadsheetId) throw new Error("No spreadsheet selected");
      return mutationFn(selectedSpreadsheetId, data);
    },
    onMutate: (data) => onMutate(queryClient, data),
    onError: (_err, _data, ctx) => onError(queryClient, ctx),
    onSuccess: (_data, variables) => onSuccess(queryClient, variables),
    retry: 1,
    retryDelay: 1000,
  });
}

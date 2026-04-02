import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthContext } from '@/src/state/AuthProvider';

interface SpreadsheetQueryOptions<T> {
  queryKey: readonly unknown[];
  fetchFn: (spreadsheetId: string) => Promise<T>;
  staleTime: number;
  gcTime: number;
  enabled?: boolean;
}

/**
 * Generic hook for all spreadsheet-backed queries.
 * Handles auth context, spreadsheet check, and React Query config.
 */
export function useSpreadsheetQuery<T>({
  queryKey,
  fetchFn,
  staleTime,
  gcTime,
  enabled = true,
}: SpreadsheetQueryOptions<T>): UseQueryResult<T, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await fetchFn(selectedSpreadsheetId);
    },
    enabled: !!selectedSpreadsheetId && enabled,
    staleTime,
    gcTime,
  });
}

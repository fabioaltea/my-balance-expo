/**
 * React Query hook for accounts
 * 
 * Features:
 * - Caching with 1 hour stale time (accounts change less frequently)
 * - Offline capability through cache persistence
 * - Automatic refetch on reconnect
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { AccountsApiHelper } from '@/helpers/AccountsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

export interface AccountData {
  accountId: string;
  name: string;
  balance: number;
  color?: string;
  textColor?: string;
}

/**
 * Hook to fetch all accounts
 * Accounts are cached longer as they change less frequently than transactions
 */
export function useAccounts(): UseQueryResult<AccountData[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.accounts.all,
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await AccountsApiHelper.getAccounts(selectedSpreadsheetId);
    },
    enabled: !!selectedSpreadsheetId,
    staleTime: 1000 * 60 * 60, // 1 hour - accounts don't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(
  accountId?: string
): UseQueryResult<AccountData, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.accounts.byId(accountId || ''),
    queryFn: async () => {
      if (!selectedSpreadsheetId || !accountId) {
        throw new Error('No spreadsheet or account selected');
      }
      const accounts = await AccountsApiHelper.getAccounts(selectedSpreadsheetId);
      const account = accounts.find((a: any) => a.accountId === accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      return account;
    },
    enabled: !!selectedSpreadsheetId && !!accountId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

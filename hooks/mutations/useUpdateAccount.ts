/**
 * React Query mutation hook for updating accounts
 *
 * Features:
 * - Optimistic updates: UI updates immediately before server confirms
 * - Automatic rollback on error
 * - Intelligent cache invalidation for dependent queries
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queries/queryKeys';
import { AccountsApiHelper } from '@/helpers/AccountsApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

export interface UpdateAccountData {
  accountId: string;
  name?: string;
  color?: string;
  textColor?: string;
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();

  return useMutation({
    mutationFn: async (data: UpdateAccountData) => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      const { accountId, ...updates } = data;
      return await AccountsApiHelper.updateAccount(
        selectedSpreadsheetId,
        accountId,
        updates
      );
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (updatedAccount) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts.all });

      // Snapshot previous values
      const previousAccounts = queryClient.getQueryData(QUERY_KEYS.accounts.all);

      // Optimistically update the cache
      queryClient.setQueryData(
        QUERY_KEYS.accounts.all,
        (old: any[] = []) =>
          old.map((account) =>
            account.accountId === updatedAccount.accountId
              ? { ...account, ...updatedAccount, isPending: true }
              : account
          )
      );

      // Also update single account cache if it exists
      queryClient.setQueryData(
        QUERY_KEYS.accounts.byId(updatedAccount.accountId),
        (old: any) => (old ? { ...old, ...updatedAccount, isPending: true } : old)
      );

      return { previousAccounts };
    },

    // 2. ROLLBACK: Restore previous state on error
    onError: (error, updatedAccount, context) => {
      console.error('❌ Failed to update account:', error);

      if (context?.previousAccounts) {
        queryClient.setQueryData(
          QUERY_KEYS.accounts.all,
          context.previousAccounts
        );
      }
    },

    // 3. SYNC: Confirm success and invalidate dependent caches
    onSuccess: (data, variables) => {
      console.log('✅ Account updated successfully');

      // Invalidate all account queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances });

      // If account name changed, transactions need to be refreshed
      // (because they reference account by name)
      if (variables.name) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });
      }
    },

    retry: 1,
    retryDelay: 1000,
  });
}

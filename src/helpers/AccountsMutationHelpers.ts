import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/constants/queryKeys";
import type { Account } from "@/src/types/models";

export interface UpdateAccountData {
  accountId: string;
  name?: string;
  color?: string;
  textColor?: string;
}

export interface AccountSnapshot {
  previousAccounts: Account[] | undefined;
}

export class AccountsMutationHelpers {
  static async optimisticUpdateAccount(
    queryClient: QueryClient,
    updatedAccount: UpdateAccountData,
  ): Promise<AccountSnapshot> {
    await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts.all });

    const previousAccounts = queryClient.getQueryData<Account[]>(
      QUERY_KEYS.accounts.all,
    );

    queryClient.setQueryData<Account[]>(QUERY_KEYS.accounts.all, (old = []) =>
      old.map((account) =>
        account.accountId === updatedAccount.accountId
          ? ({ ...account, ...updatedAccount, isPending: true } as Account)
          : account,
      ),
    );

    return { previousAccounts };
  }

  static rollbackAccounts(
    queryClient: QueryClient,
    context: AccountSnapshot | undefined,
  ): void {
    if (context?.previousAccounts) {
      queryClient.setQueryData(
        QUERY_KEYS.accounts.all,
        context.previousAccounts,
      );
    }
  }

  static invalidateAccountCaches(
    queryClient: QueryClient,
    nameChanged: boolean,
  ): void {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });
    if (nameChanged) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });
    }
  }
}

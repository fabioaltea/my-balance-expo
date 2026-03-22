import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/constants/queryKeys";
import type { Transaction, Account } from "@/src/types/models";
import FunctionHelper from "@/src/utils/FunctionHelper";

// ── Types ──

export interface OptimisticSnapshot {
  previousTransactions: Transaction[] | undefined;
  previousAccounts: Account[] | undefined;
}

interface InputTransaction {
  transactionId?: string; // Se presente, aggiorna la transaction esistente
  amount: string;
  account: string;
  type: "in" | "out";
}

export interface CreateMovementData {
  movementId?: string;
  description: string;
  category: string;
  date: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
  transactions: InputTransaction[];
}

export interface DeleteMovementData {
  movementId: string;
}

export interface UpdateMovementData {
  movementId: string;
  description?: string;
  category?: string;
  date?: string;
  location?: string;
  recurrenceId?: string;
  recurrencePattern?: string;
  status?: string;
  transactions?: InputTransaction[];
}

// ── Private helpers ──

function buildTransactions(
  movementId: string,
  inputs: InputTransaction[],
  metadata: {
    date: string;
    description: string;
    category: string;
    location?: string;
    recurrenceId?: string;
    recurrencePattern?: string;
    status?: string;
  },
): Transaction[] {
  return inputs.map((t, index) => ({
    movementId,
    transactionId: t.transactionId ?? `${movementId}-${Date.now()}-${index}`,
    date: metadata.date,
    description: metadata.description,
    amount: Math.abs(FunctionHelper.ConvertCurrencyToNumber(t.amount)),
    type: t.type === "in" ? ("income" as const) : ("expense" as const),
    account: t.account,
    category: metadata.category,
    location: metadata.location || "",
    recurrenceId: metadata.recurrenceId,
    recurrencePattern: metadata.recurrencePattern,
    status: metadata.status || "Confirmed",
  }));
}

function calcDeltasFromInputs(
  inputs: InputTransaction[],
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const t of inputs) {
    delta[t.account] =
      (delta[t.account] || 0) +
      FunctionHelper.ConvertCurrencyToNumber(t.amount);
  }
  return delta;
}

function calcReversedDeltas(
  transactions: Transaction[],
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const t of transactions) {
    const reversal = t.type === "income" ? -t.amount : t.amount;
    delta[t.account] = (delta[t.account] || 0) + reversal;
  }
  return delta;
}

function mergeDeltas(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = (merged[key] || 0) + value;
  }
  return merged;
}

function updateAccountBalances(
  queryClient: QueryClient,
  deltaByAccount: Record<string, number>,
): void {
  queryClient.setQueryData<Account[]>(QUERY_KEYS.accounts.all, (old = []) =>
    old.map((account) => {
      const delta = deltaByAccount[account.name];
      if (!delta) return account;
      return {
        ...account,
        balance: account.balance + delta,
        isPending: true,
      } as Account;
    }),
  );
}

// ── Public class ──

export class TransactionsMutationHelpers {
  static async snapshotAndCancel(
    queryClient: QueryClient,
  ): Promise<OptimisticSnapshot> {
    await queryClient.cancelQueries({
      queryKey: QUERY_KEYS.transactions.all,
    });
    await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts.all });

    return {
      previousTransactions: queryClient.getQueryData<Transaction[]>(
        QUERY_KEYS.transactions.filtered(),
      ),
      previousAccounts: queryClient.getQueryData<Account[]>(
        QUERY_KEYS.accounts.all,
      ),
    };
  }

  static rollback(
    queryClient: QueryClient,
    context: OptimisticSnapshot | undefined,
  ): void {
    if (context?.previousTransactions) {
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered(),
        context.previousTransactions,
      );
    }
    if (context?.previousAccounts) {
      queryClient.setQueryData(
        QUERY_KEYS.accounts.all,
        context.previousAccounts,
      );
    }
  }

  static invalidateMovementCaches(queryClient: QueryClient): void {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all });
  }

  static async optimisticAddMovement(
    queryClient: QueryClient,
    newMovement: CreateMovementData,
  ): Promise<OptimisticSnapshot> {
    const snapshot = await this.snapshotAndCancel(queryClient);

    const tempId = `temp-${Date.now()}`;
    const transactions = buildTransactions(tempId, newMovement.transactions, {
      date: newMovement.date,
      description: newMovement.description,
      category: newMovement.category,
      location: newMovement.location,
      recurrenceId: newMovement.recurrenceId,
      recurrencePattern: newMovement.recurrencePattern,
      status: newMovement.status,
    });

    queryClient.setQueryData<Transaction[]>(
      QUERY_KEYS.transactions.filtered(),
      (old = []) => [...old, ...transactions],
    );

    updateAccountBalances(
      queryClient,
      calcDeltasFromInputs(newMovement.transactions),
    );

    return snapshot;
  }

  static async optimisticDeleteMovement(
    queryClient: QueryClient,
    deletedMovement: DeleteMovementData,
  ): Promise<OptimisticSnapshot> {
    const snapshot = await this.snapshotAndCancel(queryClient);

    const toDelete = (snapshot.previousTransactions || []).filter(
      (t) => t.movementId === deletedMovement.movementId,
    );

    queryClient.setQueryData<Transaction[]>(
      QUERY_KEYS.transactions.filtered(),
      (old = []) =>
        old.filter((t) => t.movementId !== deletedMovement.movementId),
    );

    updateAccountBalances(queryClient, calcReversedDeltas(toDelete));

    return snapshot;
  }

  static async optimisticUpdateMovement(
    queryClient: QueryClient,
    updatedMovement: UpdateMovementData,
  ): Promise<OptimisticSnapshot> {
    const snapshot = await this.snapshotAndCancel(queryClient);

    const oldTransactions = (snapshot.previousTransactions || []).filter(
      (t) => t.movementId === updatedMovement.movementId,
    );

    if (updatedMovement.transactions) {
      const remaining = (snapshot.previousTransactions || []).filter(
        (t) => t.movementId !== updatedMovement.movementId,
      );

      const firstOld = oldTransactions[0];
      const newTransactions = buildTransactions(
        updatedMovement.movementId,
        updatedMovement.transactions,
        {
          date: updatedMovement.date || firstOld?.date || "",
          description:
            updatedMovement.description || firstOld?.description || "",
          category: updatedMovement.category || firstOld?.category || "",
          location:
            updatedMovement.location !== undefined
              ? updatedMovement.location
              : firstOld?.location || "",
          recurrenceId:
            updatedMovement.recurrenceId !== undefined
              ? updatedMovement.recurrenceId
              : firstOld?.recurrenceId,
          recurrencePattern:
            updatedMovement.recurrencePattern !== undefined
              ? updatedMovement.recurrencePattern
              : firstOld?.recurrencePattern,
          status:
            updatedMovement.status !== undefined
              ? updatedMovement.status
              : firstOld?.status || "Confirmed",
        },
      );

      queryClient.setQueryData<Transaction[]>(
        QUERY_KEYS.transactions.filtered(),
        [...remaining, ...newTransactions],
      );

      const delta = mergeDeltas(
        calcReversedDeltas(oldTransactions),
        calcDeltasFromInputs(updatedMovement.transactions),
      );
      updateAccountBalances(queryClient, delta);
    } else {
      queryClient.setQueryData<Transaction[]>(
        QUERY_KEYS.transactions.filtered(),
        (old = []) =>
          old.map((t) => {
            if (t.movementId !== updatedMovement.movementId) return t;
            return {
              ...t,
              ...(updatedMovement.description !== undefined && {
                description: updatedMovement.description,
              }),
              ...(updatedMovement.category !== undefined && {
                category: updatedMovement.category,
              }),
              ...(updatedMovement.date !== undefined && {
                date: updatedMovement.date,
              }),
              ...(updatedMovement.location !== undefined && {
                location: updatedMovement.location,
              }),
              ...(updatedMovement.status !== undefined && {
                status: updatedMovement.status,
              }),
              ...(updatedMovement.recurrenceId !== undefined && {
                recurrenceId: updatedMovement.recurrenceId,
              }),
              ...(updatedMovement.recurrencePattern !== undefined && {
                recurrencePattern: updatedMovement.recurrencePattern,
              }),
            };
          }),
      );
    }

    return snapshot;
  }
}

import FunctionHelper from './FunctionHelper';
import type { Transaction, Movement } from '@/src/state';

// Legacy interface for backward compatibility with old API data format
export interface ITransaction {
  movementID?: string;
  movementId?: string;
  description: string;
  category: string;
  date: string;
  type: string;
  location?: string;
  notes?: string;
  recurrenceId?: string | null;
  status?: string;
  amount: string | number;
}

// Legacy interface for backward compatibility
export interface IMovement {
  movementId: string;
  description: string;
  category: string;
  date: string;
  type: string;
  location?: string;
  notes?: string;
  recurrenceId?: string | null;
  status?: string;
  transactions: ITransaction[];
  transactionsSum: number;
}

export class DataFilterHelper {
  public static groupTransactionsByMovementId(transactions: ITransaction[]): IMovement[] {
    const movementMap = new Map<string, ITransaction[]>();

    (transactions || []).forEach((transaction) => {
      const key = transaction.movementID || transaction.movementId;
      if (!key) return;
      if (!movementMap.has(key)) movementMap.set(key, []);
      movementMap.get(key)!.push(transaction);
    });

    const movements = Array.from(movementMap.entries()).map(([movementId, txns]) => {
      const firstTx = txns[0];
      const transactionsSum = txns.reduce((sum, t) => {
        return sum + FunctionHelper.ConvertCurrencyToNumber(t.amount);
      }, 0);

      return {
        movementId,
        description: firstTx.description,
        category: firstTx.category,
        date: firstTx.date,
        type: firstTx.type,
        location: firstTx.location,
        notes: firstTx.notes,
        recurrenceId: firstTx.recurrenceId,
        status: firstTx.status,
        transactions: txns,
        transactionsSum,
      } as IMovement;
    });

    return movements.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB > dateA ? 1 : -1;
    });
  }
}

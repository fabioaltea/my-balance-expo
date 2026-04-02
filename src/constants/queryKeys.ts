/**
 * Centralized Query Keys for React Query
 *
 * Benefits:
 * - Type-safe query keys
 * - Prevents typos
 * - Centralized invalidation patterns
 * - Easy to maintain
 */

export interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
}

export const QUERY_KEYS = {
  // Transactions
  transactions: {
    all: ['transactions'] as const,
    filtered: (filters?: TransactionFilters) =>
      ['transactions', 'filtered', filters ?? {}] as const,
    byId: (id: string) => ['transactions', id] as const,
    summary: (period: string) => ['transactions', 'summary', period] as const,
  },

  // Accounts
  accounts: {
    all: ['accounts'] as const,
    byId: (id: string) => ['accounts', id] as const,
    balances: ['accounts', 'balances'] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    byId: (id: string) => ['categories', id] as const,
    byType: (type: 'income' | 'expense') => ['categories', 'type', type] as const,
  },

  // Aggregations (pre-calculated data from backend)
  aggregations: {
    all: ['aggregations'] as const,
    monthly: (fromDate: string, toDate: string) =>
      ['aggregations', 'monthly', fromDate, toDate] as const,
    yearly: (year: string) => ['aggregations', 'yearly', year] as const,
  },
} as const;

// Helper types for TypeScript inference
export type QueryKey = typeof QUERY_KEYS;

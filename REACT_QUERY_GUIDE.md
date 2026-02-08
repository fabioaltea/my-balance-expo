# React Query Integration - Developer Guide

This document explains the React Query implementation for MyBalance Expo app.

## Overview

React Query has been integrated to provide:
- ✅ **Intelligent caching** with automatic invalidation
- ✅ **Offline capability** through AsyncStorage persistence
- ✅ **Optimistic updates** for instant UI feedback
- ✅ **Reduced network requests** through smart caching
- ✅ **Better performance** with background refetching

## Architecture

### 1. QueryProvider (`/providers/QueryProvider.tsx`)

The QueryProvider wraps the entire app and provides:
- QueryClient configuration with optimized defaults
- AsyncStorage persistence for offline capability
- Cache settings (24h cache time, 5min stale time)

### 2. Query Keys (`/hooks/queries/queryKeys.ts`)

Centralized, type-safe query keys prevent typos and make invalidation easier:

```typescript
// Example usage
const queryKey = QUERY_KEYS.transactions.filtered({ fromDate, toDate });
```

### 3. Query Hooks (`/hooks/queries/`)

Pre-configured hooks for fetching data:

- `useTransactions()` - Fetch transactions with filters
- `useAccounts()` - Fetch accounts list
- `useCategories()` - Fetch categories
- `useMonthlyAggregations()` - Fetch pre-calculated monthly data from backend

**Example:**

```typescript
import { useTransactions } from '@/hooks/queries';

function MyComponent() {
  const { data, isLoading, error } = useTransactions();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <TransactionList transactions={data} />;
}
```

### 4. Mutation Hooks (`/hooks/mutations/`)

Hooks for modifying data with optimistic updates:

- `useAddTransaction()` - Add new transaction
- `useUpdateTransaction()` - Update existing transaction
- `useDeleteTransaction()` - Delete transaction

**Example:**

```typescript
import { useAddTransaction } from '@/hooks/mutations';

function AddTransactionButton() {
  const { mutate, isPending } = useAddTransaction();
  
  const handleAdd = () => {
    mutate({
      date: '01-01-2024',
      amount: 100,
      type: 'expense',
      category: 'Food',
      account: 'Checking',
      description: 'Groceries'
    }, {
      onSuccess: () => {
        console.log('Transaction added!');
      },
      onError: (error) => {
        console.error('Failed to add transaction:', error);
      }
    });
  };
  
  return <Button onPress={handleAdd} disabled={isPending} />;
}
```

## Optimistic Updates

All mutation hooks implement optimistic updates:

1. **UI updates immediately** before server responds
2. **Automatic rollback** if server returns an error
3. **Cache invalidation** to refresh dependent data

This provides instant feedback to users while maintaining data consistency.

## Cache Invalidation Strategy

When data changes, the following queries are invalidated:

| Mutation | Invalidated Queries | Reason |
|----------|-------------------|---------|
| Add Transaction | `transactions.*`, `accounts.*`, `aggregations.*` | New transaction affects all related data |
| Update Transaction | `transactions.*`, `accounts.*`, `aggregations.*` | Modified transaction may affect balances and aggregations |
| Delete Transaction | `transactions.*`, `accounts.*`, `aggregations.*` | Removed transaction affects balances and aggregations |

## Backend Aggregations

The `useMonthlyAggregations` hook fetches pre-calculated data from the backend:

```typescript
// Backend should provide endpoint: GET /aggregations/monthly?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
// Response format:
{
  "data": [
    {
      "month": "2024-01",
      "income": 5000,
      "expense": 3000,
      "net": 2000,
      "transactionCount": 45
    }
  ]
}
```

This reduces client-side computation and improves chart rendering performance.

## Migration Path

The implementation maintains backward compatibility:

### Current State
- New React Query hooks are available alongside existing code
- `useIncomeExpenses` can optionally use backend aggregations with `useAggregations={true}`
- Existing code continues to work without modifications

### Future Improvements
1. Migrate `useMyBalanceData` to use React Query internally
2. Update all components to use new query hooks directly
3. Enable backend aggregations in all charts
4. Remove legacy data fetching code

## Testing

To test the implementation:

### 1. Test Cache Persistence (Offline Mode)
```bash
# Load app with network
# Navigate through app to load data
# Disable network in device settings
# Close and reopen app
# Verify data is still available from cache
```

### 2. Test Optimistic Updates
```bash
# Add a transaction
# Verify UI updates immediately (before server response)
# Check that transaction appears in list instantly
```

### 3. Test Cache Invalidation
```bash
# Load transactions list
# Add/update/delete a transaction
# Verify related data refreshes automatically
```

## Performance Benefits

Expected improvements:

| Metric | Before | After |
|--------|--------|-------|
| Cold start load | 3-5s | 1-2s |
| Warm cache load | 3-5s | 0.2s |
| UI update after mutation | 3-5s | Instant |
| Chart render | 200-300ms | 50-100ms (with aggregations) |

## Troubleshooting

### Cache not persisting
- Check AsyncStorage permissions
- Verify QueryProvider is wrapping the app correctly
- Check browser console for persistence errors

### Stale data after mutations
- Verify cache invalidation in mutation hooks
- Check that query keys match exactly
- Use React Query DevTools to inspect cache

### Memory issues
- Adjust `gcTime` (formerly `cacheTime`) to reduce cache duration
- Implement pagination for large datasets
- Use `keepPreviousData` option for smooth transitions

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Implementation Plan](../IMPLEMENTATION_PLAN.md)

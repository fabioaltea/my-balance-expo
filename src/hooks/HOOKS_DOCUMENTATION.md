# Hooks - Documentazione Dettagliata

## Panoramica Architetturale

L'app usa **React Query (TanStack Query)** per gestire dati dal backend tramite due hook generici:

| Hook | Scopo | Direzione dati | File |
|------|-------|----------------|------|
| `useSpreadsheetQuery<T>` | **Leggere** dati | Backend → Frontend | `hooks/useSpreadsheetQuery.ts` |
| `useSpreadsheetMutation<TData, TContext>` | **Scrivere/modificare** dati | Frontend → Backend | `hooks/useSpreadsheetMutation.ts` |

### Struttura file

```
src/
├── hooks/
│   ├── useSpreadsheetQuery.ts      # Hook generico per tutte le query
│   ├── useSpreadsheetMutation.ts   # Hook generico per tutte le mutations
│   ├── useMyBalanceData.tsx         # Consumer: chiama useSpreadsheetQuery per transactions, accounts, categories
│   ├── useIncomeExpenses.tsx        # Consumer: chiama useSpreadsheetQuery per aggregations
│   └── HOOKS_DOCUMENTATION.md
├── constants/
│   └── queryKeys.ts                # Chiavi di cache centralizzate
├── helpers/
│   ├── TransactionsMutationHelpers.ts  # Logica optimistic update per movimenti
│   └── AccountsMutationHelpers.ts      # Logica optimistic update per conti
```

---

## useSpreadsheetQuery<T> (`hooks/useSpreadsheetQuery.ts`)

Hook generico parametrizzato per tutte le query. Gestisce:

- Recupero `selectedSpreadsheetId` dall'auth context
- Verifica che lo spreadsheet sia selezionato
- Configurazione `useQuery` con queryKey, fetchFn, staleTime, gcTime
- Caching, refetch automatico, stati di caricamento

### Parametri

```typescript
interface SpreadsheetQueryOptions<T> {
  queryKey: readonly unknown[];
  fetchFn: (spreadsheetId: string) => Promise<T>;
  staleTime: number;
  gcTime: number;
  enabled?: boolean;
}
```

### Utilizzo nei consumer

I consumer chiamano `useSpreadsheetQuery` direttamente con la configurazione inline:

```typescript
const { data: transactions } = useSpreadsheetQuery<Transaction[]>({
  queryKey: QUERY_KEYS.transactions.filtered(),
  fetchFn: (id) => TransactionsApiHelper.getTransactions(id),
  staleTime: 5 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
});
```

### Strategia di Caching

| Dato | staleTime | gcTime | Motivazione |
|------|-----------|--------|-------------|
| Transactions | 5 min | 1 ora | Cambiano frequentemente |
| Accounts | 1 ora | 24 ore | Cambiano raramente |
| Categories | 1 ora | 24 ore | Quasi mai modificate |
| Aggregations | 5 min | 30 min | Dipendono dalle transazioni |

---

## useSpreadsheetMutation<TData, TContext> (`hooks/useSpreadsheetMutation.ts`)

Hook generico parametrizzato per tutte le mutations. Gestisce:

- Recupero `selectedSpreadsheetId` e `queryClient`
- Verifica spreadsheet selezionato
- Wiring di `onMutate`, `onError`, `onSuccess` con `QueryClient`
- Retry: 1 tentativo con delay di 1 secondo

### Parametri

```typescript
interface SpreadsheetMutationOptions<TData, TContext> {
  mutationFn: (spreadsheetId: string, data: TData) => Promise<unknown>;
  onMutate: (queryClient: QueryClient, data: TData) => Promise<TContext>;
  onError: (queryClient: QueryClient, context: TContext | undefined) => void;
  onSuccess: (queryClient: QueryClient, variables: TData) => void;
}
```

### Pattern Optimistic Update

```
1. onMutate   → Aggiorna la UI PRIMA della risposta del server (istantaneo)
2. onError    → Se il server fallisce, ROLLBACK allo stato precedente
3. onSuccess  → Invalida le cache per sincronizzare con il server
```

### Utilizzo nei consumer

I consumer chiamano `useSpreadsheetMutation` direttamente, delegando la logica agli helper:

```typescript
const addMovement = useSpreadsheetMutation<CreateMovementData, OptimisticSnapshot>({
  mutationFn: (spreadsheetId, data) =>
    TransactionsApiHelper.createTransaction(spreadsheetId, data),
  onMutate: (qc, data) =>
    TransactionsMutationHelpers.optimisticAddMovement(qc, data),
  onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
  onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
});
```

---

## Query Keys (`constants/queryKeys.ts`)

Registro centralizzato delle chiavi di cache. Permette:
- **Type safety**: impossibile fare typo nelle chiavi
- **Invalidazione gerarchica**: invalidare `transactions.all` invalida TUTTE le query con prefix `['transactions']`
- **Filtraggio**: chiavi parametriche per query filtrate

---

## Mutation Helpers (`helpers/`)

### TransactionsMutationHelpers (`helpers/TransactionsMutationHelpers.ts`)

Classe statica con tutta la logica di optimistic update per movimenti:

**Metodi pubblici:**
- `snapshotAndCancel(qc)` — Cancella refetch in corso e salva snapshot della cache
- `rollback(qc, snapshot)` — Ripristina la cache allo stato precedente
- `invalidateMovementCaches(qc)` — Invalida transactions, accounts e aggregations
- `optimisticAddMovement(qc, data)` — Aggiunge transazioni temporanee e aggiorna saldi
- `optimisticDeleteMovement(qc, data)` — Rimuove transazioni e inverte effetto sui saldi
- `optimisticUpdateMovement(qc, data)` — Full update (ricalcola saldi) o partial update (solo metadati)

**Tipi esportati:** `CreateMovementData`, `UpdateMovementData`, `DeleteMovementData`, `OptimisticSnapshot`

### AccountsMutationHelpers (`helpers/AccountsMutationHelpers.ts`)

Classe statica per optimistic update sui conti:

**Metodi pubblici:**
- `optimisticUpdateAccount(qc, data)` — Aggiorna il conto nella cache con flag `isPending`
- `rollbackAccounts(qc, ctx)` — Ripristina la lista conti
- `invalidateAccountCaches(qc, nameChanged)` — Invalida accounts (+ transactions se cambia il nome)

**Tipi esportati:** `UpdateAccountData`, `AccountSnapshot`

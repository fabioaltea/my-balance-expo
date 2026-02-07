# Piano Implementazione Frontend - Ottimizzazione MyBalance

## Contesto

Questo piano fa parte dell'ottimizzazione complessiva del caricamento iniziale di MyBalance. Il frontend implementerà caching intelligente con React Query, optimistic updates e utilizzerà i nuovi endpoint backend ottimizzati.

**Piano completo**: `/Users/fabioaltea/.claude/plans/concurrent-purring-deer.md`

## Obiettivi Frontend

1. **Caching intelligente**: React Query con persistenza locale
2. **Load istantaneo**: Da cache (0.2s vs 3s)
3. **Optimistic updates**: UI responsive con aggiornamenti immediati
4. **Offline capability**: Dati disponibili senza connessione
5. **Grafici ottimizzati**: Usare aggregazioni pre-calcolate dal backend

## Prerequisiti

- Backend con nuovi endpoint completato (Fase 1)
- Endpoint disponibili: `/transactions` (con filtri), `/aggregations/monthly`, `/transactions/delta`

## Fase 2: React Query Setup

### 2.1 Installazione Dipendenze

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client
```

**Motivazione**:
- Gestione cache automatica con TTL
- Supporto optimistic updates built-in
- DevTools eccellenti per debugging
- Persistenza locale (offline-first)

**Bundle size**: +45KB gzipped (accettabile)

### 2.2 Configurazione QueryProvider

**File nuovo**: `/expo/providers/QueryProvider.tsx`

Setup QueryClient con:
- **TTL differenziati**:
  - Transazioni recenti (< 3 mesi): staleTime 30s, cacheTime 5min
  - Transazioni vecchie (> 3 mesi): staleTime 1h, cacheTime 24h
  - Categories: staleTime 1h, cacheTime 24h
- **Persistenza**: AsyncStorage (React Native) per cache offline

**Implementazione**:
```typescript
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
})
```

**Stime**: ~100 linee di codice

### 2.3 Query Keys Structure

**File nuovo**: `/expo/hooks/queries/queryKeys.ts`

```typescript
export const QUERY_KEYS = {
  transactions: {
    all: ['transactions'] as const,
    filtered: (filters: TransactionFilters) => ['transactions', 'filtered', filters] as const,
    summary: (period: string) => ['transactions', 'summary', period] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    balances: ['accounts', 'balances'] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  aggregations: {
    monthly: (fromDate: string, toDate: string) =>
      ['aggregations', 'monthly', fromDate, toDate] as const,
  },
}
```

**Benefici**: Type-safe keys, evita typo, centralizzato

**Stime**: ~80 linee di codice

### 2.4 Query Hooks

**Files nuovi**:
1. `/expo/hooks/queries/useTransactions.ts`
2. `/expo/hooks/queries/useAccounts.ts`
3. `/expo/hooks/queries/useCategories.ts`
4. `/expo/hooks/queries/useAggregations.ts`

#### Esempio: useTransactions.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from './queryKeys'
import ApiHelper from '@/helpers/mybalance/ApiHelper'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.transactions.filtered(filters ?? {}),
    queryFn: () => ApiHelper.listTransactions(filters),
    staleTime: 1000 * 60 * 5, // 5 min
    cacheTime: 1000 * 60 * 60, // 1 hour
  })
}
```

**Stime totali**: ~410 linee (150 + 80 + 60 + 120)

### 2.5 Migrazione Graduale useMyBalanceData

**File da modificare**: `/expo/hooks/useMyBalanceData.tsx`

**Strategia transitoria**:
- Mantenere hook esistente
- Internamente usare nuove queries React Query
- Permette migrazione graduale componenti senza breaking changes
- Dopo migrazione completa: deprecare hook vecchio

```typescript
// Esempio migrazione interna
export function useMyBalanceData() {
  const { data: transactions } = useTransactions()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  // Mantenere interfaccia originale per backward compatibility
  return {
    transactions,
    accounts,
    categories,
    loadAllData: () => {}, // Deprecato, React Query gestisce automaticamente
    // ... altri metodi
  }
}
```

**Benefici**:
- Load istantaneo da cache (0.2s vs 3s)
- Offline capability
- Riduzione re-renders inutili

**Stime**: Refactor, -200 linee eventualmente

### 2.6 Integrazione in App

**File da modificare**: `/expo/App.tsx`

Wrappare con QueryClientProvider:

```typescript
import { QueryProvider } from './providers/QueryProvider'

export default function App() {
  return (
    <QueryProvider>
      {/* ... resto app */}
    </QueryProvider>
  )
}
```

**Stime**: +10 linee

## Fase 3: Optimistic Updates

### 3.1 Mutation Hooks

**Files nuovi**:
1. `/expo/hooks/mutations/useAddTransaction.ts`
2. `/expo/hooks/mutations/useUpdateTransaction.ts`
3. `/expo/hooks/mutations/useDeleteTransaction.ts`

#### Pattern Optimistic Update

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../queries/queryKeys'

export function useAddTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => ApiHelper.createTransaction(data),

    // 1. OPTIMISTIC: Aggiorna UI immediatamente
    onMutate: async (newTx) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transactions.all })
      const previous = queryClient.getQueryData(QUERY_KEYS.transactions.filtered({}))

      // Aggiungi ottimisticamente con ID temporaneo
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered({}),
        (old) => [...(old ?? []), { ...newTx, id: `temp-${Date.now()}`, isPending: true }]
      )

      return { previous } // Per rollback
    },

    // 2. ROLLBACK: Se errore, ripristina stato
    onError: (err, newTx, context) => {
      queryClient.setQueryData(
        QUERY_KEYS.transactions.filtered({}),
        context.previous
      )
    },

    // 3. SYNC: Conferma successo e refetch
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.balances })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.monthly })
    },
  })
}
```

**Stime totali**: ~530 linee (180 + 200 + 150)

### 3.2 Invalidazione Selettiva

**Regole per tipo operazione**:

| Operazione | Invalidate | Refetch |
|------------|-----------|---------|
| ADD transaction recente | transactions.filtered (current), accounts.balances, aggregations (current month) | immediate |
| UPDATE transaction vecchia | transactions.all, accounts.balances, aggregations (impacted months) | lazy (solo se già in cache) |
| DELETE transaction | transactions.all, accounts.balances, aggregations | immediate |

**Dependency Graph**:
```
Transaction modificata
  ├─→ Query transactions (per quel periodo)
  ├─→ Query accounts.balances
  ├─→ Query aggregations.monthly (per quel mese)
  └─→ Grafici si ricomputano automaticamente (useMemo con dependencies)
```

## Fase 4: Grafici Ottimizzati

### 4.1 Migrazione a Aggregazioni Pre-calcolate

**Files da modificare**:
- `/expo/hooks/useIncomeExpenses.tsx`
- `/expo/hooks/useMonthlyBalances.tsx`

#### Prima (calcoli pesanti):
```typescript
// Itera su TUTTE le transactions per calcolare income/expense mensili
useMemo(() => {
  return movements.reduce(...) // Heavy computation
}, [movements])
```

#### Dopo (aggregazioni backend):
```typescript
// Usa aggregazioni pre-calcolate dal backend
const { data } = useQuery({
  queryKey: QUERY_KEYS.aggregations.monthly(fromDate, toDate),
  queryFn: () => AggregationsApiHelper.getMonthlyAggregations(fromDate, toDate),
  staleTime: 300000, // 5 min
})
```

**Benefici**:
- Zero calcoli pesanti sul client
- Memoization automatica via React Query
- Cache riutilizzata tra componenti
- Risparmio batteria device

**Stime totali**: -120 linee (-50 + -70)

### 4.2 Helper API per Aggregazioni

**File da creare/modificare**: `/expo/helpers/mybalance/ApiHelper.ts`

Aggiungere metodo:
```typescript
async getMonthlyAggregations(fromDate: string, toDate: string) {
  const response = await axios.get('/aggregations/monthly', {
    params: { from_date: fromDate, to_date: toDate }
  })
  return response.data
}
```

**Stime**: +20 linee

## Fase 5: Testing & Refinement

### 5.1 Test Critici

1. **Load performance**:
   - Cold start: misurare TTFB + parsing
   - Warm cache: verificare < 0.5s

2. **Offline mode**:
   - Disabilitare network
   - Verificare dati disponibili da cache
   - Verificare sync quando rete ritorna

3. **Optimistic updates**:
   - Test UI aggiorna prima del server
   - Test rollback su errore server
   - Test invalidazione corretta

4. **Dataset grande**:
   - Simulare 5000 transactions
   - Verificare no lag/freeze grafici
   - Profiler React: misurare re-renders

5. **Invalidazione selettiva**:
   - Modificare transaction vecchia (6 mesi fa)
   - Verificare grafici si aggiornano correttamente
   - Verificare solo query rilevanti refetchano

### 5.2 React Query DevTools

Durante sviluppo, abilitare DevTools per debug cache:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

### 5.3 Cleanup

- Rimuovere codice deprecato (dopo migration completa)
- Verificare bundle size accettabile
- Documentare architettura nuova

## File da Modificare/Creare

### File da Creare (nuovi)
1. `/expo/providers/QueryProvider.tsx` - Setup React Query (~100 linee)
2. `/expo/hooks/queries/queryKeys.ts` - Query keys (~80 linee)
3. `/expo/hooks/queries/useTransactions.ts` - Query transactions (~150 linee)
4. `/expo/hooks/queries/useAccounts.ts` - Query accounts (~80 linee)
5. `/expo/hooks/queries/useCategories.ts` - Query categories (~60 linee)
6. `/expo/hooks/queries/useAggregations.ts` - Query aggregations (~120 linee)
7. `/expo/hooks/mutations/useAddTransaction.ts` - Optimistic add (~180 linee)
8. `/expo/hooks/mutations/useUpdateTransaction.ts` - Optimistic update (~200 linee)
9. `/expo/hooks/mutations/useDeleteTransaction.ts` - Optimistic delete (~150 linee)

### File da Modificare
10. `/expo/hooks/useMyBalanceData.tsx` - Refactor con React Query (transitorio, -200 linee)
11. `/expo/hooks/useIncomeExpenses.tsx` - Usa aggregazioni backend (-50 linee)
12. `/expo/hooks/useMonthlyBalances.tsx` - Usa aggregazioni backend (-70 linee)
13. `/expo/App.tsx` - Wrap con QueryProvider (+10 linee)
14. `/expo/helpers/mybalance/ApiHelper.ts` - Metodi aggregazioni (+20 linee)

## Metriche di Successo

| Metrica | Baseline | Target |
|---------|----------|--------|
| Load iniziale (cold) | 3-5s | 1-2s |
| Load iniziale (warm) | 3-5s | 0.2s |
| Reload dopo modifica | 3-5s | 0.5s |
| Render grafici | 200-300ms | 50-100ms |
| Re-renders per modifica | 5-10 | 1-2 |

**UX Improvements**:
- ✅ UI risponde immediatamente (optimistic updates)
- ✅ Dati disponibili offline (cache persistence)
- ✅ Riduzione -80% data transfer per uso tipico
- ✅ Grafici fluidi anche con 5000 transactions

## Testing Strategy

1. **Unit tests**: Hook mutations (mock API con MSW)
2. **Integration tests**: Query hooks con mock server
3. **E2E tests**: Flussi completi con Detox
4. **Performance tests**: React Profiler con dataset grande

## Rischi

### Rischio 1: Cache Invalidation Bugs
**Problema**: Invalidazione incompleta causa UI inconsistente
**Mitigazione**:
- Unit test per ogni mutation
- E2E test per flussi critici
- DevTools per ispezionare cache
- Conservative invalidation (in dubbio, invalida più queries)

### Rischio 2: Bundle Size
**Problema**: React Query +45KB gzipped
**Mitigazione**: Accettabile (app già >500KB, +10% per UX significativo)

### Rischio 3: Backward Compatibility Ionic
**Problema**: Versione Ionic separata potrebbe rompersi
**Mitigazione**:
- Testing su entrambe versioni
- Release flag per rollback
- Migrazione graduale

## Stima Totale

- **Giorni**: 12 giorni (Fase 2: 5 giorni + Fase 3: 4 giorni + Fase 4: 3 giorni)
- **Rischio**: Medio
- **LOC**: ~1200 linee nuove, -320 linee rimosse

## Verifiche End-to-End

Dopo implementazione, testare:

1. **Load iniziale**:
   - Aprire app → verificare dati caricano < 2s
   - Chiudere e riaprire → verificare cache disponibile < 0.5s

2. **Aggiungi transazione**:
   - Add transaction → UI aggiorna immediatamente (optimistic)
   - Verificare saldi account aggiornati
   - Verificare grafici aggiornati

3. **Modifica transazione vecchia**:
   - Edit transaction 6 mesi fa
   - Verificare grafici storici si aggiornano
   - Verificare saldo account ricalcolato correttamente

4. **Offline mode**:
   - Disabilitare network
   - Verificare dashboard visibile con dati cache
   - Abilitare network → verificare sync automatico

5. **Performance con 5000 transactions**:
   - Simulare dataset grande
   - Verificare grafici fluidi (no freeze)
   - Profiler: verificare < 100ms render time

## Prossimi Step

Dopo completamento frontend:
1. Testing integrato con backend
2. Performance profiling end-to-end
3. User acceptance testing
4. Deploy production

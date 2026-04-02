/**
 * React Query Provider with cache persistence
 *
 * This provider sets up React Query with:
 * - Differentiated TTL for different data types
 * - AsyncStorage persistence for offline capability
 * - Optimized cache settings for performance
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create QueryClient with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default: 24 hours cache, 5 minutes stale time
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create persister for offline capability
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'MYBALANCE_REACT_QUERY_CACHE',
  throttleTime: 1000, // Throttle saves to once per second
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
};

// Export queryClient for use in other files if needed
export { queryClient };

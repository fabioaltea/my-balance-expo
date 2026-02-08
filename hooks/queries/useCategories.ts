/**
 * React Query hook for categories
 * 
 * Features:
 * - Caching with 1 hour stale time (categories change less frequently)
 * - Offline capability through cache persistence
 * - Filter by type support
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { CategoriesApiHelper } from '@/helpers/CategoriesApiHelper';
import { useAuthContext } from '@/state/AuthProvider';

export interface CategoryData {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

/**
 * Hook to fetch all categories
 * Categories are cached longer as they change less frequently than transactions
 */
export function useCategories(): UseQueryResult<CategoryData[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.categories.all,
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      return await CategoriesApiHelper.getCategories(selectedSpreadsheetId);
    },
    enabled: !!selectedSpreadsheetId,
    staleTime: 1000 * 60 * 60, // 1 hour - categories don't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook to fetch categories filtered by type
 */
export function useCategoriesByType(
  type: 'income' | 'expense'
): UseQueryResult<CategoryData[], Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.categories.byType(type),
    queryFn: async () => {
      if (!selectedSpreadsheetId) {
        throw new Error('No spreadsheet selected');
      }
      const categories = await CategoriesApiHelper.getCategories(selectedSpreadsheetId);
      return categories.filter((c: any) => c.type === type);
    },
    enabled: !!selectedSpreadsheetId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook to fetch a single category by ID
 */
export function useCategory(
  categoryId?: string
): UseQueryResult<CategoryData, Error> {
  const { selectedSpreadsheetId } = useAuthContext();

  return useQuery({
    queryKey: QUERY_KEYS.categories.byId(categoryId || ''),
    queryFn: async () => {
      if (!selectedSpreadsheetId || !categoryId) {
        throw new Error('No spreadsheet or category selected');
      }
      const categories = await CategoriesApiHelper.getCategories(selectedSpreadsheetId);
      const category = categories.find((c: any) => c.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    },
    enabled: !!selectedSpreadsheetId && !!categoryId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/constants/queryKeys";
import type { Category } from "@/src/types/models";

export interface UpdateCategoryData {
  /** Current name of the category (used as identifier) */
  categoryName: string;
  name?: string;
  color?: string;
  icon?: string;
}

export interface CategorySnapshot {
  previousCategories: Category[] | undefined;
}

export class CategoriesMutationHelpers {
  static async optimisticUpdateCategory(
    queryClient: QueryClient,
    data: UpdateCategoryData,
  ): Promise<CategorySnapshot> {
    await queryClient.cancelQueries({ queryKey: QUERY_KEYS.categories.all });

    const previousCategories = queryClient.getQueryData<Category[]>(
      QUERY_KEYS.categories.all,
    );

    queryClient.setQueryData<Category[]>(
      QUERY_KEYS.categories.all,
      (old = []) =>
        old.map((cat) =>
          cat.name === data.categoryName
            ? {
                ...cat,
                name: data.name || cat.name,
                color: data.color || cat.color,
                icon: data.icon || cat.icon,
              }
            : cat,
        ),
    );

    return { previousCategories };
  }

  static rollbackCategories(
    queryClient: QueryClient,
    context: CategorySnapshot | undefined,
  ): void {
    if (context?.previousCategories) {
      queryClient.setQueryData(
        QUERY_KEYS.categories.all,
        context.previousCategories,
      );
    }
  }

  static invalidateCategoryCaches(
    queryClient: QueryClient,
    nameChanged: boolean,
  ): void {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories.all });
    if (nameChanged) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.transactions.all,
      });
    }
  }
}

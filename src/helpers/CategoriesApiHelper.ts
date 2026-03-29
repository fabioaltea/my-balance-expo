import { HttpHelper, AuthenticationError } from './HttpHelper';

export class CategoriesApiHelper {
  /**
   * Get all categories for a specific spreadsheet
   */
  static async getCategories(spreadsheetId: string): Promise<any[]> {
    try {
      console.log('🔄 Loading categories from API...');

      const response = await HttpHelper.get(`/categories?spreadsheet_id=${spreadsheetId}`);

      if (response.success) {
        console.log('✅ Categories loaded successfully:', response.data?.length || 0);
        return response.data || [];
      } else {
        console.error('❌ Failed to load categories:', response.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Re-throw authentication errors to trigger logout
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(spreadsheetId: string, categoryData: any) {
    try {
      console.log('➕ Creating new category...');

      const response = await HttpHelper.post(`/categories?spreadsheet_id=${spreadsheetId}`, {
        ...categoryData,
      });

      if (response.success) {
        console.log('✅ Category created successfully');
        return response.data;
      } else {
        console.error('❌ Failed to create category:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating category:', error);
      return null;
    }
  }

  /**
   * Update an existing category (identified by its current name)
   */
  static async updateCategory(spreadsheetId: string, categoryName: string, categoryData: any) {
    try {
      console.log(`✏️ Updating category "${categoryName}"...`);

      const response = await HttpHelper.put(
        `/categories/${encodeURIComponent(categoryName)}?spreadsheet_id=${spreadsheetId}`,
        { ...categoryData },
      );

      if (response.success) {
        console.log('✅ Category updated successfully');
        return response.data;
      } else {
        console.error('❌ Failed to update category:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error updating category:', error);
      return null;
    }
  }

  /**
   * Delete a category (soft delete)
   */
  static async deleteCategory(spreadsheetId: string, categoryName: string) {
    try {
      console.log(`🗑️ Deleting category "${categoryName}"...`);

      const response = await HttpHelper.delete(
        `/categories/${encodeURIComponent(categoryName)}?spreadsheet_id=${spreadsheetId}`,
      );

      if (response.success) {
        console.log('✅ Category deleted successfully');
        return response.data;
      } else {
        console.error('❌ Failed to delete category:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      return null;
    }
  }
}

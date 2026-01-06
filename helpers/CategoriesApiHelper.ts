import { HttpHelper } from "./HttpHelper";

export class CategoriesApiHelper {
  /**
   * Get all categories for a specific spreadsheet
   */
  static async getCategories(spreadsheetId: string): Promise<any[]> {
    try {
      console.log("🔄 Loading categories from API...");

      const response = await HttpHelper.get(
        `/categories?spreadsheet_id=${spreadsheetId}`
      );

      if (response.success) {
        console.log(
          "✅ Categories loaded successfully:",
          response.data?.length || 0
        );
        return response.data || [];
      } else {
        console.error("❌ Failed to load categories:", response.error);
        return [];
      }
    } catch (error) {
      console.error("❌ Error loading categories:", error);
      return [];
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(spreadsheetId: string, categoryData: any) {
    try {
      console.log("➕ Creating new category...");

      const response = await HttpHelper.post(
        `/categories?spreadsheet_id=${spreadsheetId}`,
        { ...categoryData }
      );

      if (response.success) {
        console.log("✅ Category created successfully");
        return response.data;
      } else {
        console.error("❌ Failed to create category:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error creating category:", error);
      return null;
    }
  }
}

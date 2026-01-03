import { ApiHelper } from "./ApiHelper";

export class CategoriesApiHelper {
  /**
   * Get all categories for a specific spreadsheet
   */
  static async getCategories(accessToken: string, spreadsheetId: string) {
    try {
      console.log("🔄 Loading categories from API...");

      const response = await ApiHelper.get(`/categories?spreadsheet_id=${spreadsheetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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
  static async createCategory(
    accessToken: string,
    spreadsheetId: string,
    categoryData: any
  ) {
    try {
      console.log("➕ Creating new category...");

      const response = await ApiHelper.post(
        `/categories?spreadsheet_id=${spreadsheetId}`,
        { ...categoryData },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
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

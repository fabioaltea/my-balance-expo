import { ApiHelper } from "../ApiHelper";

export class CategoriesApiHelper {
  // Get all categories
  static async getCategories(accessToken: string, spreadsheetId: string) {
    const url = `/categories?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to fetch categories");
    }
  }

  // Create new category
  static async createCategory(
    accessToken: string,
    spreadsheetId: string,
    categoryData: any
  ) {
    const url = `/categories?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.post(url, categoryData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to create category");
    }
  }
}

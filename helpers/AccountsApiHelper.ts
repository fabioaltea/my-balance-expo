import { HttpHelper } from "./HttpHelper";
import { ApiHelper } from "./ApiHelper";

export class AccountsApiHelper {
  /**
   * Get all accounts for a specific spreadsheet
   */
  static async getAccounts(accessToken: string, spreadsheetId: string) {
    try {
      console.log("🔄 Loading accounts from API...");

      const response = await HttpHelper.get(
        `/accounts?spreadsheet_id=${spreadsheetId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        console.log(
          "✅ Accounts loaded successfully:",
          response.data?.length || 0
        );
        return response.data || [];
      } else {
        console.error("❌ Failed to load accounts:", response.error);
        return [];
      }
    } catch (error) {
      console.error("❌ Error loading accounts:", error);
      return [];
    }
  }

  /**
   * Create a new account
   */
  static async createAccount(
    accessToken: string,
    spreadsheetId: string,
    accountData: any
  ) {
    try {
      console.log("➕ Creating new account...");

      const response = await HttpHelper.post(
        `/accounts?spreadsheet_id=${spreadsheetId}`,
        { ...accountData },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        console.log("✅ Account created successfully");
        return response.data;
      } else {
        console.error("❌ Failed to create account:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error creating account:", error);
      return null;
    }
  }
}

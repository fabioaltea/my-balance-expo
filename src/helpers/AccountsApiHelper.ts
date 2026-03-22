import { HttpHelper, AuthenticationError } from "./HttpHelper";
import type { Account } from "../types/models";

export class AccountsApiHelper {
  /**
   * Transform raw backend account data to typed AccountData.
   */
  static rawToAccountData(raw: any): Account {
    return {
      accountId: raw.accountId || raw.id || Math.random().toString(),
      name: raw.name || "",
      balance:
        typeof raw.balance === "number"
          ? raw.balance
          : parseFloat(
              raw.balance?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0",
            ),
      color: raw.color || "#2F4F3F",
      textColor: raw.textColor || "#FFFFFF",
    };
  }
  /**
   * Get all accounts for a specific spreadsheet
   */
  static async getAccounts(spreadsheetId: string): Promise<any[]> {
    try {
      console.log("🔄 Loading accounts from API...");

      const response = await HttpHelper.get(
        `/accounts?spreadsheet_id=${spreadsheetId}`,
      );

      if (response.success) {
        console.log(
          "✅ Accounts loaded successfully:",
          response.data?.length || 0,
        );
        return response.data || [];
      } else {
        console.error("❌ Failed to load accounts:", response.error);
        return [];
      }
    } catch (error) {
      console.error("❌ Error loading accounts:", error);
      // Re-throw authentication errors to trigger logout
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Create a new account
   */
  static async createAccount(spreadsheetId: string, accountData: any) {
    try {
      console.log("➕ Creating new account...");

      const response = await HttpHelper.post(
        `/accounts?spreadsheet_id=${spreadsheetId}`,
        { ...accountData },
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

  static async updateAccount(
    spreadsheetId: string,
    accountId: string,
    accountData: any,
  ) {
    try {
      console.log(`✏️ Updating account ${accountId}...`);

      const response = await HttpHelper.put(
        `/accounts/${accountId}?spreadsheet_id=${spreadsheetId}`,
        { ...accountData },
      );

      if (response.success) {
        console.log("✅ Account updated successfully");
        return response.data;
      } else {
        console.error("❌ Failed to update account:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error updating account:", error);
      return null;
    }
  }
}

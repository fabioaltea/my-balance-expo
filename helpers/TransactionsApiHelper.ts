import { ApiHelper } from "./ApiHelper";

export class TransactionsApiHelper {
  /**
   * Get all transactions for a specific spreadsheet
   */
  static async getTransactions(accessToken: string, spreadsheetId: string) {
    try {
      console.log("🔄 Loading transactions from API...");

      const response = await ApiHelper.get(`/transactions?spreadsheet_id=${spreadsheetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      

      if (response.success) {
        
        console.log(
          "✅ Transactions loaded successfully:",
          response.data?.length || 0
        );
        return response.data || [];
      } else {
        console.error("❌ Failed to load transactions:", response.error);
        return [];
      }
    } catch (error) {
      console.error("❌ Error loading transactions:", error);
      return [];
    }
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(
    accessToken: string,
    spreadsheetId: string,
    transactionData: any
  ) {
    try {
      console.log("➕ Creating new transaction...");

      const response = await ApiHelper.post(
        `/transactions?spreadsheet_id=${spreadsheetId}`,
        { ...transactionData },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        console.log("✅ Transaction created successfully");
        return response.data;
      } else {
        console.error("❌ Failed to create transaction:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error creating transaction:", error);
      return null;
    }
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(
    accessToken: string,
    spreadsheetId: string,
    transactionId: string,
    updates: any
  ) {
    try {
      console.log("✏️ Updating transaction...");

      const response = await ApiHelper.put(
        `/transactions/${transactionId}?spreadsheet_id=${spreadsheetId}`,
        { ...updates },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        console.log("✅ Transaction updated successfully");
        return response.data;
      } else {
        console.error("❌ Failed to update transaction:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error updating transaction:", error);
      return null;
    }
  }

  /**
   * Delete a transaction
   */
  static async deleteTransaction(
    accessToken: string,
    spreadsheetId: string,
    transactionId: string
  ) {
    try {
      console.log("🗑️ Deleting transaction...");

      const response = await ApiHelper.delete(
        `/transactions/${transactionId}?spreadsheet_id=${spreadsheetId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success) {
        console.log("✅ Transaction deleted successfully");
        return true;
      } else {
        console.error("❌ Failed to delete transaction:", response.error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error deleting transaction:", error);
      return false;
    }
  }
}

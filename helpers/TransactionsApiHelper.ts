import { HttpHelper } from "./HttpHelper";

export class TransactionsApiHelper {
  /**
   * Get all transactions for a specific spreadsheet
   */
  static async getTransactions(spreadsheetId: string): Promise<any[]> {
    try {
      console.log("🔄 Loading transactions from API...");

      const response = await HttpHelper.get(
        `/transactions?spreadsheet_id=${spreadsheetId}`
      );

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
    spreadsheetId: string,
    transactionData: any
  ) {
    try {
      console.log("➕ Creating new transaction...");

      const response = await HttpHelper.post(
        `/transactions?spreadsheet_id=${spreadsheetId}`,
        { ...transactionData }
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
    spreadsheetId: string,
    transactionId: string,
    updates: any
  ) {
    try {
      console.log("✏️ Updating transaction...");

      const response = await HttpHelper.put(
        `/transactions/${transactionId}?spreadsheet_id=${spreadsheetId}`,
        { ...updates }
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
    spreadsheetId: string,
    transactionId: string
  ) {
    try {
      console.log("🗑️ Deleting transaction...");

      const response = await HttpHelper.delete(
        `/transactions/${transactionId}?spreadsheet_id=${spreadsheetId}`
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

  /**
   * Update an existing movement (new RESTful API)
   */
  static async updateMovement(
    spreadsheetId: string,
    movementId: string,
    movementData: any
  ) {
    try {
      console.log("✏️ Updating movement...", movementId);

      const response = await HttpHelper.put(
        `/movements/${movementId}?spreadsheet_id=${spreadsheetId}`,
        { ...movementData }
      );

      if (response.success) {
        console.log("✅ Movement updated successfully");
        return response.data;
      } else {
        console.error("❌ Failed to update movement:", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error updating movement:", error);
      return null;
    }
  }

  /**
   * Update an existing movement (legacy endpoint - same as Ionic)
   * Uses POST /update which does raw Google Sheets update
   */
  static async updateMovementLegacy(
    spreadsheetId: string,
    movementData: any
  ) {
    try {
      console.log("✏️ Updating movement (legacy)...", movementData);

      const response = await HttpHelper.post(
        `/update?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
        movementData
      );

      if (response.success) {
        console.log("✅ Movement updated successfully (legacy)");
        return response.data;
      } else {
        console.error("❌ Failed to update movement (legacy):", response.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error updating movement (legacy):", error);
      return null;
    }
  }
}

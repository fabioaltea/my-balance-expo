import { ApiHelper } from "../ApiHelper";

export class TransactionsApiHelper {
  // Get all transactions (individual transactions from all movements)
  static async getTransactions(accessToken: string, spreadsheetId: string) {
    const url = `/transactions?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to fetch transactions");
    }
  }

  // Get accounts with transactions (load generica)
  static async getAccountsWithTransactions(
    accessToken: string,
    spreadsheetId: string
  ) {
    const url = `/accounts-with-transactions?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to fetch accounts with transactions");
    }
  }

  // Get all movements
  static async getMovements(accessToken: string, spreadsheetId: string) {
    const url = `/movements?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to fetch movements");
    }
  }
}

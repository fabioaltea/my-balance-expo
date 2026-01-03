import { ApiHelper } from "../ApiHelper";

export class AccountsApiHelper {
  // Get all accounts
  static async getAccounts(accessToken: string, spreadsheetId: string) {
    const url = `/accounts?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) return response.data;
    else throw new Error("Failed to fetch accounts");
  }

  // Create new account
  static async createAccount(
    accessToken: string,
    spreadsheetId: string,
    accountData: any
  ) {
    const url = `/accounts?spreadsheet_id=${spreadsheetId}`;
    const response = await ApiHelper.post(url, accountData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        spreadsheet_id: spreadsheetId,
      },
    });

    if (response.success) {
      return response.data;
    } else {
      throw new Error("Failed to create account");
    }
  }
}

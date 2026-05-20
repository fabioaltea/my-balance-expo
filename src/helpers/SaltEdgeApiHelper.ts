import { HttpHelper } from './HttpHelper';

export interface SaltEdgeConnection {
  connectionId: string;
  saltedgeAccountId: string;
  status: 'active' | 'inactive' | 'error';
  lastSyncedAt?: string;
}

export interface SaltEdgeSyncResult {
  imported: number;
  skipped: number;
}

export class SaltEdgeApiHelper {
  static async connect(
    spreadsheetId: string,
    accountId: string,
    returnTo?: string,
  ): Promise<string | null> {
    const response = await HttpHelper.post(`/saltedge/connect?spreadsheet_id=${spreadsheetId}`, {
      accountId,
      ...(returnTo ? { returnTo } : {}),
    });
    return response.success ? (response.data?.connectUrl ?? null) : null;
  }

  static async link(
    spreadsheetId: string,
    accountId: string,
    connectionId: string,
    saltedgeAccountId: string,
  ): Promise<boolean> {
    const response = await HttpHelper.post(`/saltedge/link?spreadsheet_id=${spreadsheetId}`, {
      accountId,
      connectionId,
      saltedgeAccountId,
    });
    return response.success;
  }

  static async reconnect(spreadsheetId: string, accountId: string): Promise<string | null> {
    const response = await HttpHelper.post(
      `/saltedge/reconnect/${accountId}?spreadsheet_id=${spreadsheetId}`,
      {},
    );
    return response.success ? (response.data?.connectUrl ?? null) : null;
  }

  static async disconnect(spreadsheetId: string, accountId: string): Promise<boolean> {
    const response = await HttpHelper.delete(
      `/saltedge/disconnect/${accountId}?spreadsheet_id=${spreadsheetId}`,
    );
    return response.success;
  }

  static async sync(spreadsheetId: string, accountId: string): Promise<SaltEdgeSyncResult | null> {
    const response = await HttpHelper.post(
      `/saltedge/sync/${accountId}?spreadsheet_id=${spreadsheetId}`,
      {},
    );
    return response.success ? (response.data ?? null) : null;
  }

  static async getConnection(
    spreadsheetId: string,
    accountId: string,
  ): Promise<SaltEdgeConnection | null> {
    const response = await HttpHelper.get(
      `/saltedge/connections/${accountId}?spreadsheet_id=${spreadsheetId}`,
    );
    return response.success ? (response.data ?? null) : null;
  }
}

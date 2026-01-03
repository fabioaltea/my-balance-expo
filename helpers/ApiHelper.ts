import { AuthStorageHelper, AuthTokens, User } from "./AuthStorageHelper";

// Get API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export class ApiHelper {
  private static endpointUri = API_URL;

  // Authentication methods
  static async authenticateWithGoogle(data: {
    authorizationCode: string;
    codeVerifier?: string;
    deviceId: string;
    deviceType: "ios" | "android" ;}): Promise<ApiResponse> {
    try {
      console.log("Calling /auth/google/callback with data:", data);
      const response = await fetch(`${this.endpointUri}/auth/google/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          clientType: "ios",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Authentication failed: ${response.statusText}`
        );
      }

      return result;
    } catch (error) {
      console.log("Authentication error:", error);
      throw error;
    }
  }

  static async refreshToken(data: {
    refreshToken: string;
    deviceId: string;
  }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.endpointUri}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Token refresh failed: ${response.statusText}`
        );
      }

      return result;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  static async logout(deviceId: string, refreshToken: string): Promise<void> {
    try {
      await fetch(`${this.endpointUri}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({ deviceId }),
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Don't throw - logout should always clear local state
    }
  }

  static async getUserProfile(accessToken: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${this.endpointUri}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to get user profile: ${response.statusText}`
        );
      }

      return result;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  }

  // Protected API requests with automatic token refresh
  static async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const tokens = await AuthStorageHelper.getTokens();

    if (!tokens) {
      throw new Error("No authentication tokens available");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(`${this.endpointUri}${endpoint}`, {
        ...options,
        headers,
      });

      // If token is expired, try to refresh
      if (response.status === 401) {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry with new token
          const newTokens = await AuthStorageHelper.getTokens();
          const retryResponse = await fetch(`${this.endpointUri}${endpoint}`, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newTokens?.accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!retryResponse.ok) {
            throw new Error(`Request failed: ${retryResponse.statusText}`);
          }

          return await retryResponse.json();
        } else {
          throw new Error("Authentication expired");
        }
      }
      console.log("API response:", response);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Authenticated request error:", error);
      throw error;
    }
  }

  private static async attemptTokenRefresh(): Promise<boolean> {
    try {
      const tokens = await AuthStorageHelper.getTokens();
      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();

      if (!tokens?.refreshToken) {
        return false;
      }

      const result = await this.refreshToken({
        refreshToken: tokens.refreshToken,
        deviceId,
      });

      if (result.success && result.accessToken && result.refreshToken) {
        await AuthStorageHelper.storeTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Token refresh attempt failed:", error);
      return false;
    }
  }
 
  // Data API methods
  static async getMovements(spreadsheetId: string): Promise<any[]> {
    return this.makeAuthenticatedRequest(
      `/movements?spreadsheet_id=${spreadsheetId}`
    );
  }

  static async getTransactions(spreadsheetId: string): Promise<any[]> {
    return this.makeAuthenticatedRequest(
      `/transactions?spreadsheet_id=${spreadsheetId}`
    );
  }

  static async getAccounts(spreadsheetId: string): Promise<any[]> {
    return this.makeAuthenticatedRequest(
      `/accounts?spreadsheet_id=${spreadsheetId}`
    );
  }

  static async getCategories(spreadsheetId: string): Promise<any[]> {
    return this.makeAuthenticatedRequest(
      `/categories?spreadsheet_id=${spreadsheetId}`
    );
  }

  static async addMovement(movement: any, spreadsheetId: string): Promise<any> {
    return this.makeAuthenticatedRequest(
      `/movements?spreadsheet_id=${spreadsheetId}`,
      {
        method: "POST",
        body: JSON.stringify(movement),
      }
    );
  }

  static async updateMovement(
    movementId: string,
    movement: any,
    spreadsheetId: string
  ): Promise<any> {
    return this.makeAuthenticatedRequest(
      `/movements/${movementId}?spreadsheet_id=${spreadsheetId}`,
      {
        method: "PUT",
        body: JSON.stringify(movement),
      }
    );
  }

  static async deleteMovement(
    movementId: string,
    spreadsheetId: string
  ): Promise<any> {
    return this.makeAuthenticatedRequest(
      `/movements/${movementId}?spreadsheet_id=${spreadsheetId}`,
      {
        method: "DELETE",
      }
    );
  }
}

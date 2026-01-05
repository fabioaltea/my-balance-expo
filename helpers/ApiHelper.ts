import { HttpHelper, HttpResponse } from "./HttpHelper";
import { AuthStorageHelper, AuthTokens, User } from "./AuthStorageHelper";

export class ApiHelper {
  // Authentication methods
  static async authenticateWithGoogle(data: {
    authorizationCode: string;
    codeVerifier?: string;
    deviceId: string;
    deviceType: "ios" | "android";
  }): Promise<HttpResponse> {
    try {
      const requestBody = {
        ...data,
        deviceType: "ios",
      };

      console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `${HttpHelper.endpointUri}/auth/google/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("📥 Response status:", response.status, response.statusText);
      console.log("📥 Response headers:", [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Auth error response:", errorText);
        throw new Error(
          `Authentication failed: ${response.status} ${
            response.statusText
          } - ${errorText.substring(0, 200)}`
        );
      }

      const responseText = await response.text();
      console.log("📥 Auth response text:", responseText.substring(0, 300));

      try {
        const result = JSON.parse(responseText);
        console.log("✅ Auth result parsed successfully");
        return result;
      } catch (jsonError) {
        console.error("❌ Auth JSON parse error. Response was:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`
        );
      }
    } catch (error) {
      console.log("❌ Authentication error:", error);
      throw error;
    }
  }

  static async refreshToken(data: {
    refreshToken: string;
    deviceId: string;
  }): Promise<HttpResponse> {
    try {
      const response = await fetch(`${HttpHelper.endpointUri}/auth/refresh`, {
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
      await fetch(`${HttpHelper.endpointUri}/auth/logout`, {
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

  static async getUserProfile(
    accessToken: string
  ): Promise<HttpResponse<User> | null> {
    try {
      const response = await fetch(`${HttpHelper.endpointUri}/auth/profile`, {
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
      return null;
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
      const response = await fetch(`${HttpHelper.endpointUri}${endpoint}`, {
        ...options,
        headers,
      });

      // If token is expired, try to refresh
      if (response.status === 401) {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry with new token
          const newTokens = await AuthStorageHelper.getTokens();
          const retryResponse = await fetch(
            `${HttpHelper.endpointUri}${endpoint}`,
            {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newTokens?.accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!retryResponse.ok) {
            const retryText = await retryResponse.text();
            console.error("Retry response failed:", retryText);
            throw new Error(
              `Retry request failed: ${retryResponse.status} ${retryResponse.statusText}`
            );
          }

          // Parse JSON safely for retry
          const retryText = await retryResponse.text();
          try {
            return JSON.parse(retryText);
          } catch (jsonError) {
            console.error("Retry JSON parse error:", retryText);
            throw new Error(
              `Invalid JSON in retry response: ${retryText.substring(0, 100)}`
            );
          }
        } else {
          throw new Error("Authentication expired");
        }
      }
      console.log("API response status:", response.status, response.statusText);
      console.log("API response headers:", response.headers);

      if (!response.ok) {
        // Try to get response text to see what we actually received
        const responseText = await response.text();
        console.error("Non-OK response body:", responseText);
        throw new Error(
          `Request failed: ${response.status} ${
            response.statusText
          } - ${responseText.substring(0, 200)}`
        );
      }

      // Check if response is actually JSON
      const responseText = await response.text();
      console.log("Response text:", responseText.substring(0, 200));

      try {
        return JSON.parse(responseText);
      } catch (jsonError) {
        console.error("JSON parse error. Response was:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`
        );
      }
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

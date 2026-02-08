import { User, AuthStorageHelper } from "./AuthStorageHelper";

// Get API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
// Auth service URL - separate service for authentication
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || "http://localhost:8082";

console.log("🌐 API_URL configured as:", API_URL);
console.log("🔐 AUTH_URL configured as:", AUTH_URL);

/**
 * Custom error for authentication failures that require re-login
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export interface HttpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export class HttpHelper {
  public static endpointUri = API_URL;
  public static authUri = AUTH_URL;

  /**
   * Private method to refresh tokens via API
   */
  private static async refreshTokensViaApi(
    refreshToken: string,
    deviceId: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      console.log("🔄 Calling refresh token API...");
      console.log("🔄 Endpoint:", `${this.authUri}/auth/refresh`);
      console.log("🔄 Device ID:", deviceId);

      const response = await fetch(`${this.authUri}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken, deviceId }),
      });

      console.log("🔄 Response status:", response.status, response.statusText);

      const result = await response.json();
      console.log("🔄 Response body:", JSON.stringify(result, null, 2));

      if (!response.ok || !result.success) {
        console.error("❌ Token refresh API failed:");
        console.error("   Status:", response.status);
        console.error("   Error:", result.error);
        console.error("   Code:", result.code);
        return null;
      }

      if (result.accessToken && result.refreshToken) {
        console.log("✅ Tokens refreshed successfully via API");
        return {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      }

      console.error("❌ Response missing tokens");
      return null;
    } catch (error) {
      console.error("❌ Token refresh API error:", error);
      return null;
    }
  }

  /**
   * Get a valid access token, automatically refreshing if needed
   */
  static async getValidAccessToken(): Promise<string | null> {
    try {
      let tokens = await AuthStorageHelper.getTokens();

      if (!tokens) {
        console.log("❌ No tokens available");
        throw new AuthenticationError("No authentication tokens available");
      }

      // Check if access token is expired
      if (AuthStorageHelper.isTokenExpired(tokens.accessToken)) {
        console.log("⚠️ Access token expired, attempting refresh...");

        // Check if refresh token is valid
        if (AuthStorageHelper.isTokenExpired(tokens.refreshToken)) {
          console.log("❌ Refresh token also expired");
          throw new AuthenticationError("Refresh token expired");
        }

        // Get device ID
        const deviceId = await AuthStorageHelper.getOrCreateDeviceId();

        // Refresh the token
        const newTokens = await this.refreshTokensViaApi(
          tokens.refreshToken,
          deviceId,
        );

        if (!newTokens) {
          console.log("❌ Token refresh failed");
          throw new AuthenticationError("Token refresh failed");
        }

        // Store new tokens
        await AuthStorageHelper.storeTokens(newTokens);

        return newTokens.accessToken;
      }

      return tokens.accessToken;
    } catch (error) {
      console.error("❌ Error getting valid access token:", error);
      return null;
    }
  }

  // Generic GET method with automatic token management
  static async get(endpoint: string, options: any = {}): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error("No valid authentication token available");
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Authorization": `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // If 401 Unauthorized, throw AuthenticationError to trigger logout
        if (response.status === 401) {
          throw new AuthenticationError(
            result.error || "Authentication failed",
          );
        }
        throw new Error(
          result.error || `GET request failed: ${response.statusText}`,
        );
      }

      return { success: true, ...result };
    } catch (error) {
      console.error("GET request error:", error);
      throw error;
    }
  }

  // Generic POST method with automatic token management
  static async post(
    endpoint: string,
    data: any,
    options: any = {},
  ): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error("No valid authentication token available");
      }

      const url = `${this.endpointUri}${endpoint}`;
      console.log("POST request to:", url, "with data:", data);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Authorization": `Bearer ${accessToken}`,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      console.log(
        "POST response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("POST error response:", errorText);
        throw new Error(
          `POST request failed: ${response.status} ${
            response.statusText
          } - ${errorText.substring(0, 200)}`,
        );
      }

      const responseText = await response.text();
      try {
        const result = JSON.parse(responseText);
        return { success: true, ...result };
      } catch (jsonError) {
        console.error("POST JSON parse error:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`,
        );
      }
    } catch (error) {
      console.error("POST request error:", error);
      throw error;
    }
  }

  // Generic PUT method with automatic token management
  static async put(
    endpoint: string,
    data: any,
    options: any = {},
  ): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error("No valid authentication token available");
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Authorization": `Bearer ${accessToken}`,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `PUT request failed: ${response.statusText}`,
        );
      }

      return { success: true, ...result };
    } catch (error) {
      console.error("PUT request error:", error);
      throw error;
    }
  }

  // Generic DELETE method with automatic token management
  static async delete(
    endpoint: string,
    options: any = {},
  ): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error("No valid authentication token available");
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Authorization": `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `DELETE request failed: ${response.statusText}`,
        );
      }

      return { success: true, ...result };
    } catch (error) {
      console.error("DELETE request error:", error);
      throw error;
    }
  }
}

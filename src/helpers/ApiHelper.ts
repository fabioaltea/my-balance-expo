import { HttpHelper, HttpResponse } from "./HttpHelper";
import { AuthStorageHelper, User } from "./AuthStorageHelper";

export class ApiHelper {
  // Authentication methods
  static async authenticateWithGoogle(data: {
    authorizationCode: string;
    codeVerifier?: string;
    deviceId: string;
    deviceType: "ios" | "android" | "web";
    redirectUri?: string;
  }): Promise<HttpResponse> {
    try {
      const requestBody = {
        authorizationCode: data.authorizationCode,
        codeVerifier: data.codeVerifier,
        deviceId: data.deviceId,
        deviceType: data.deviceType,
        redirectUri: data.redirectUri,
      };

      const response = await fetch(
        `${HttpHelper.authUri}/auth/google/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Auth error response:", errorText);
        throw new Error(
          `Authentication failed: ${response.status} ${
            response.statusText
          } - ${errorText.substring(0, 200)}`,
        );
      }

      const responseText = await response.text();

      try {
        const result = JSON.parse(responseText);
        return result;
      } catch (jsonError) {
        console.error("❌ Auth JSON parse error. Response was:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`,
        );
      }
    } catch (error) {
      console.log("❌ Authentication error:", error);
      throw error;
    }
  }

  static async logout(deviceId: string, refreshToken: string): Promise<void> {
    try {
      await fetch(`${HttpHelper.authUri}/auth/logout`, {
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

  static async getUserProfile(): Promise<HttpResponse<User> | null> {
    try {
      // Get valid access token (with automatic refresh if expired)
      const accessToken = await HttpHelper.getValidAccessToken();
      if (!accessToken) {
        console.error("No valid access token available for profile request");
        return null;
      }

      const response = await fetch(
        `${HttpHelper.authUri}/auth/profile?product=MyBalance`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        console.error("Get profile failed:", response.status);
        return null;
      }

      const result = await response.json();
      if (result.success) {
        return result;
      }

      return null;
    } catch (error) {
      console.error("Get profile error:", error);
      return null;
    }
  }

  // Push notifications methods
  static async savePushToken(pushToken: string): Promise<boolean> {
    try {
      const tokens = await AuthStorageHelper.getTokens();
      if (!tokens?.accessToken) {
        console.error("No access token available for push token request");
        return false;
      }

      const response = await fetch(`${HttpHelper.authUri}/auth/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ pushToken }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Save push token error:", error);
      return false;
    }
  }

  static async removePushToken(): Promise<boolean> {
    try {
      const tokens = await AuthStorageHelper.getTokens();
      if (!tokens?.accessToken) {
        console.error("No access token available for push token removal");
        return false;
      }

      const response = await fetch(`${HttpHelper.authUri}/auth/push-token`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Remove push token error:", error);
      return false;
    }
  }
}

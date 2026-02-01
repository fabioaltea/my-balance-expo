import { HttpHelper, HttpResponse } from "./HttpHelper";
import { AuthStorageHelper, AuthTokens, User } from "./AuthStorageHelper";

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
        `${HttpHelper.endpointUri}/auth/google/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

    
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

      try {
        const result = JSON.parse(responseText);
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

  static async getUserProfile(): Promise<HttpResponse<User> | null> {
    try {
      const response = await HttpHelper.get("/auth/profile");

      if (response.success) {
        return response;
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
      const response = await HttpHelper.post("/auth/push-token", { pushToken });
      return response.success;
    } catch (error) {
      console.error("Save push token error:", error);
      return false;
    }
  }

  static async removePushToken(): Promise<boolean> {
    try {
      const response = await HttpHelper.delete("/auth/push-token");
      return response.success;
    } catch (error) {
      console.error("Remove push token error:", error);
      return false;
    }
  }
}

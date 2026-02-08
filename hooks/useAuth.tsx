import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import {
  AuthStorageHelper,
  User,
} from "../helpers/AuthStorageHelper";
import { ApiHelper } from "../helpers/ApiHelper";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";

// Required for web OAuth - completes the auth session when the popup redirects back
WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  mode: string; // "dashboard", "load", "quickstart", ""
  dashboardReady: boolean;
  selectedSpreadsheetId: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
    mode: "",
    dashboardReady: false,
    selectedSpreadsheetId: null,
  });

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  // Helper to handle session expired
  const handleSessionExpired = useCallback(async () => {
    console.log("🚪 Session expired, clearing auth...");
    await AuthStorageHelper.clearAll();
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: "Your session has expired. Please login again.",
      mode: "",
      dashboardReady: false,
      selectedSpreadsheetId: null,
    });
  }, []);

  // Load user profile - single entry point after authentication
  // App data (transactions, accounts, categories) is loaded by DataProvider via React Query
  const loadUserProfile = useCallback(async () => {
    console.log("🚀 LOAD USER PROFILE");
    try {
      console.log("📡 Getting user profile...");

      // Get user profile - token management is automatic via HttpHelper
      const profile = await ApiHelper.getUserProfile();

      console.log("📊 Profile result:", {
        success: !!profile,
        hasUser: !!profile?.user,
        spreadsheetId: profile?.user?.spreadsheetId,
      });

      if (!profile || !profile.user) {
        console.log("❌ No profile data received");
        await handleSessionExpired();
        return;
      }

      await AuthStorageHelper.storeUser(profile.user);

      if (profile.user.spreadsheetId) {
        console.log(
          "✅ User has spreadsheet configured:",
          profile.user.spreadsheetId
        );

        setAuthState({
          isAuthenticated: true,
          user: profile.user,
          isLoading: false,
          error: null,
          mode: "dashboard",
          dashboardReady: true,
          selectedSpreadsheetId: profile.user.spreadsheetId,
        });
      } else {
        console.log("🆕 Quickstart mode - no spreadsheet configured");

        setAuthState({
          isAuthenticated: true,
          user: profile.user,
          isLoading: false,
          error: null,
          mode: "quickstart",
          dashboardReady: true,
          selectedSpreadsheetId: null,
        });
      }
    } catch (error) {
      console.error("❌ Error loading user profile:", error);

      const is401Error =
        (error as any)?.message?.includes("401") ||
        (error as any)?.message?.includes("expired") ||
        (error as any)?.message?.includes("Unauthorized") ||
        (error as any)?.message?.includes("No valid authentication token");

      if (is401Error) {
        console.log("🔄 Session expired, logging out...");
        await handleSessionExpired();
      } else {
        console.log("🚪 General error during profile load");
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            "Connection error. Please check your internet connection and try again.",
        }));
      }
    }
  }, [handleSessionExpired]);

  // Initialize authentication state - check for stored tokens
  const initializeAuth = useCallback(async () => {
    console.log("🚀 INITIALIZE AUTH - Checking for stored credentials");
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const tokens = await AuthStorageHelper.getTokens();
      const user = await AuthStorageHelper.getUser();

      console.log("🔑 Stored tokens found:", !!tokens);
      console.log("👤 Stored user found:", !!user);

      if (tokens && user) {
        console.log("✅ Stored credentials found, loading data...");
        // We have stored credentials, load user data
        await loadUserProfile();
        // await NotificationsHelpers.registerForPushNotificationsAsync();
      } else {
        console.log("❌ No stored credentials, showing login");
        // No stored credentials, show login
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          mode: "",
          dashboardReady: false,
          selectedSpreadsheetId: null,
        });
      }
    } catch (error) {
      console.error("❌ Auth initialization error:", error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Authentication initialization failed",
        mode: "",
        dashboardReady: false,
        selectedSpreadsheetId: null,
      });
    }
  }, [loadUserProfile]);

  // PKCE utility functions for OAuth2 security - Following Google specifications
  const generateCodeVerifier = () => {
    // Generate ASCII string directly - RFC 7636 compliant characters only
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";

    // Generate 64 characters using Math.random for simplicity
    for (let i = 0; i < 64; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
  };

  const generateCodeChallenge = async (verifier: string) => {
    try {
      // SHA256 the code verifier and encode as base64url
      const hashBase64 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Convert BASE64 to BASE64URL (replace +/= with -_)
      const challenge = hashBase64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      return challenge;
    } catch (error) {
      console.error("❌ Error generating code challenge:", error);
      throw error;
    }
  };

  // Google OAuth login - with PKCE implementation
  const loginWithGoogle = useCallback(async () => {
    try {
      // setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();
      const isWeb = Platform.OS === "web";

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Use different client ID and redirect URI based on platform
      const clientId = isWeb
        ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!
        : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;

      // For web, use makeRedirectUri which handles the current origin; for native, use custom scheme
      const redirectUri = isWeb
        ? makeRedirectUri()
        : `${process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME}:/oauthredirect`;

      console.log("🔑 OAuth config:", { isWeb, clientId: clientId?.substring(0, 20) + "...", redirectUri });

      // Create OAuth request with PKCE
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: [
          "openid",
          "profile",
          "email",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        extraParams: {
          access_type: "offline",
          prompt: "consent", // Force Google to always return refresh token
        },
        usePKCE: true,
      });

      //Manually set code challenge since Expo AuthSession doesn't support PKCE natively
      request.codeChallenge = codeChallenge;
      request.codeVerifier = codeVerifier;

      console.log("🚀 Initiating Google OAuth request");

      // Define discovery endpoint
      const discovery = {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      };

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && (result as any).params?.code) {
        // Use the stored code verifier from state, NOT the local variable
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        const authResponse = await ApiHelper.authenticateWithGoogle({
          authorizationCode: (result as any).params.code,
          codeVerifier: codeVerifier,
          deviceId,
          deviceType: Platform.OS === "web" ? "web" : Platform.OS === "ios" ? "ios" : "android",
          redirectUri, // Pass redirectUri for web token exchange
        });

        if (authResponse.success) {
          console.log("✅ Backend authentication successful, storing tokens");
          await AuthStorageHelper.storeTokens({
            accessToken: authResponse.accessToken!,
            refreshToken: authResponse.refreshToken!,
          });

          if (authResponse.user) {
            await AuthStorageHelper.storeUser(authResponse.user);
          }

          // Load user profile and data after successful login
          console.log("🚀 Loading user data after successful login");
          await loadUserProfile();
          // await NotificationsHelpers.registerForPushNotificationsAsync();

        } else {
          throw new Error(
            authResponse.error || "Backend authentication failed"
          );
        }
      } else if (result.type === "error") {
        throw new Error(
          (result as any).params?.error_description ||
            (result as any).params?.error ||
            "OAuth failed"
        );
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Login failed",
      }));
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const tokens = await AuthStorageHelper.getTokens();
      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();

      if (tokens?.refreshToken) {
        await ApiHelper.logout(deviceId, tokens.refreshToken);
      }

      await AuthStorageHelper.clearAll();

      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        mode: "",
        dashboardReady: false,
        selectedSpreadsheetId: null,
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear local state
      await AuthStorageHelper.clearAll();
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        mode: "",
        dashboardReady: false,
        selectedSpreadsheetId: null,
      });
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    console.log("🔧 useAuth useEffect mounting, calling initializeAuth");
    initializeAuth();
  }, [initializeAuth]);

  return {
    ...authState,
    // Auth functions
    loginWithGoogle,
    logout,
    initializeAuth,
    clearError,
    reloadData: loadUserProfile,
  };
};

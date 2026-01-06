import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import {
  AuthStorageHelper,
  AuthTokens,
  User,
} from "../helpers/AuthStorageHelper";
import { ApiHelper } from "../helpers/ApiHelper";
import { TransactionsApiHelper } from "../helpers/TransactionsApiHelper";
import { AccountsApiHelper } from "../helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "../helpers/CategoriesApiHelper";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";

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

  // App data states
  const [allTransactions, setAllTransactions] = useState<any>(null);
  const [accountsList, setAccountsList] = useState<any>(null);
  const [personalCategories, setPersonalCategories] = useState<any>(null);
  const [totalBalance, setTotalBalance] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

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


  // Load user profile and app data - single entry point after authentication
  const loadUserDataAndProfile = useCallback(async () => {
    console.log("🚀 LOAD USER DATA AND PROFILE");
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

      // Store user profile in state
      setUserProfile(profile.user);
      await AuthStorageHelper.storeUser(profile.user);

      // Check if user has a configured spreadsheet
      if (profile.user.spreadsheetId) {
        console.log(
          "✅ User has spreadsheet configured:",
          profile.user.spreadsheetId
        );

        // Load app data
        console.log("📦 Loading app data...");
        const [transactions, accounts, categories] = await Promise.all([
          TransactionsApiHelper.getTransactions(profile.user.spreadsheetId),
          AccountsApiHelper.getAccounts(profile.user.spreadsheetId),
          CategoriesApiHelper.getCategories(profile.user.spreadsheetId),
        ]);

        // Store the loaded data
        setAllTransactions(transactions);
        setAccountsList(accounts);
        setPersonalCategories(categories);

        console.log("✅ Data loaded successfully:", {
          transactionsCount: transactions?.length || 0,
          accountsCount: accounts?.length || 0,
          categoriesCount: categories?.length || 0,
        });

        // Set authenticated state with data ready
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

        // Set authenticated state in quickstart mode
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
      console.error("❌ Error loading user data and profile:", error);

      const is401Error =
        (error as any)?.message?.includes("401") ||
        (error as any)?.message?.includes("expired") ||
        (error as any)?.message?.includes("Unauthorized") ||
        (error as any)?.message?.includes("No valid authentication token");

      if (is401Error) {
        console.log("🔄 Session expired, logging out...");
        await handleSessionExpired();
      } else {
        console.log("🚪 General error during data load");
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
        await loadUserDataAndProfile();
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
  }, [loadUserDataAndProfile]);


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

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Use custom scheme for iOS - using app scheme from Expo config
      const redirectUri =
        "com.googleusercontent.apps.1034336371411-871dda5aa8crght33ognn5hbeivrp09k:/oauthredirect";

      // Create OAuth request with PKCE
      const request = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
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
          deviceType: Platform.OS === "ios" ? "ios" : "android",
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
          await loadUserDataAndProfile();
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
    // Data states
    allTransactions,
    accountsList,
    personalCategories,
    totalBalance,
    userProfile,
    // Auth functions
    loginWithGoogle,
    logout,
    initializeAuth,
    clearError,
    // Data functions
    reloadData: loadUserDataAndProfile,
  };
};

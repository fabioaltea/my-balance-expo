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

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    console.log("🚀 INITIALIZE AUTH CALLED");
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      console.log("📱 Loading stored tokens and user...");

      const tokens = await AuthStorageHelper.getTokens();
      const user = await AuthStorageHelper.getUser();

      console.log("🔑 Stored tokens found:", !!tokens);
      console.log("👤 Stored user found:", !!user);

      if (tokens && user) {
        console.log("✅ Both tokens and user found, verifying with API...");
        // Verify tokens are still valid by getting user profile
        try {
          const profileResponse = await ApiHelper.getUserProfile(
            tokens.accessToken
          );

          

          if (profileResponse && profileResponse.success && profileResponse.user) {
            console.log("📡 Profile response:", {
              success: profileResponse.success,
              hasUser: !!profileResponse.user,
            });
            console.log(
              "✅ Profile verification successful, setting auth state..."
            );
            setAuthState({
              isAuthenticated: true,
              user: profileResponse.user,
              isLoading: false,
              error: null,
              mode: "", // Will be set by startUp
              dashboardReady: false,
              selectedSpreadsheetId: null, // Will be set by startUp
            });

            console.log(
              "🚀 Calling startUp with user email:",
              profileResponse.user.email
            );
            // Start the app data loading flow
            await startUp(profileResponse.user.email, tokens.accessToken);

            // Update stored user with latest info
            await AuthStorageHelper.storeUser(profileResponse.user);
            return;
          }
        } catch (error) {
          console.log(
            "❌ Stored tokens are invalid, will need to re-authenticate:",
            error
          );
          await AuthStorageHelper.clearAll();

          // Set specific error message for expired tokens
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: "Your session has expired. Please login again.",
            mode: "",
            dashboardReady: false,
            selectedSpreadsheetId: null,
          });
          return;
        }
      }

      console.log(
        "❌ No valid authentication found, setting unauthenticated state"
      );
      // No valid authentication found
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
  }, []);

  // Startup flow - similar to Ionic useMyBalance
  const startUp = async (userEmail: string, accessToken: string) => {
    console.log("🚀 STARTUP CALLED for user:", userEmail);
    try {
      console.log(
        "📡 Getting user profile to verify auth and get spreadsheet info..."
      );

      // Get user profile to verify authentication and get spreadsheet info
      const profile = await ApiHelper.getUserProfile(accessToken);

      console.log("📊 Profile result:", {
        success: !!profile,
        hasUser: !!profile?.user,
        spreadsheetId: profile?.user?.spreadsheetId,
      });

      if (profile && profile.user) {
        // Store user profile in state
        setUserProfile(profile.user);

        // Check if user has a configured spreadsheet
        if (profile.user.spreadsheetId) {
          console.log(
            "✅ User has spreadsheet configured:",
            profile.user.spreadsheetId
          );

          setAuthState((prev) => ({
            ...prev,
            selectedSpreadsheetId: profile.user?.spreadsheetId || null,
            mode: "load", // This will trigger data loading
          }));
        } else {
          console.log(
            "🆕 Quickstart mode activated - no spreadsheet configured"
          );

          setAuthState((prev) => ({
            ...prev,
            selectedSpreadsheetId: null,
            mode: "quickstart",
            dashboardReady: true, // Quickstart is immediately ready
          }));
        }
      } else {
        console.log("❌ No profile data received");
      }
    } catch (error) {
      console.error("❌ Error in startup:", error);

      if (
        (error as any)?.message?.includes("401") ||
        (error as any)?.message?.includes("expired") ||
        (error as any)?.message?.includes("Unauthorized")
      ) {
        console.log("🔄 Token expired, clearing auth and showing error...");
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
      } else {
        console.log("🚪 General error, logging out...");
        // Set general error message
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error:
            "Connection error. Please check your internet connection and try again.",
          mode: "",
          dashboardReady: false,
          selectedSpreadsheetId: null,
        });
      }
    }
  };

  // Load all app data - similar to Ionic reloadAllData
  const reloadAllData = async () => {
    console.log("🔄 RELOAD ALL DATA CALLED");

    try {
      const tokens = await AuthStorageHelper.getTokens();

      if (!authState.selectedSpreadsheetId || !tokens?.accessToken) {
        console.warn("Missing spreadsheetId or accessToken for reloadAllData");
        return;
      }

      console.log("Loading transactions...");
      const transactions = await TransactionsApiHelper.getTransactions(
        tokens.accessToken,
        authState.selectedSpreadsheetId
      );
      console.log("📦 Raw transactions from API:", {
        count: transactions?.length || 0,
        sample: transactions?.slice(0, 2),
      });

      console.log("Loading accounts...");
      const accounts = await AccountsApiHelper.getAccounts(
        tokens.accessToken,
        authState.selectedSpreadsheetId
      );
      console.log("📦 Raw accounts from API:", {
        count: accounts?.length || 0,
        sample: accounts?.slice(0, 2),
      });

      console.log("Loading categories...");
      const categories = await CategoriesApiHelper.getCategories(
        tokens.accessToken,
        authState.selectedSpreadsheetId
      );
      console.log("📦 Raw categories from API:", {
        count: categories?.length || 0,
      });

      // Store the loaded data
      setAllTransactions(transactions);
      setAccountsList(accounts);
      setPersonalCategories(categories);

      // Mark dashboard as ready
      setAuthState((prev) => ({
        ...prev,
        mode: "dashboard",
        dashboardReady: true,
      }));

      console.log("✅ Data loaded successfully:", {
        transactionsCount: transactions?.length || 0,
        accountsCount: accounts?.length || 0,
        categoriesCount: categories?.length || 0,
      });
    } catch (error) {
      console.error("Error in reloadAllData:", error);

      // Check if it's a token expiration error
      if (
        (error as any)?.message?.includes("401") ||
        (error as any)?.message?.includes("expired") ||
        (error as any)?.message?.includes("Unauthorized")
      ) {
        console.log("🔄 Token expired during data reload, clearing auth...");
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
      } else {
        // Set dashboard ready even on other errors to avoid infinite loading
        setAuthState((prev) => ({
          ...prev,
          dashboardReady: true,
          error:
            "Failed to load app data. Please check your connection and try again.",
        }));
      }
    }
  };

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
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // console.log("🔐 PKCE generated:", {
      //   codeVerifierLength: codeVerifier.length,
      //   codeChallengeLength: codeChallenge.length,
      //   codeChallengeValue: codeChallenge,
      //   codeVerifierValue: codeVerifier,
      // });

      // Use custom scheme for iOS - using app scheme from Expo config
      const redirectUri =
        "com.googleusercontent.apps.1034336371411-871dda5aa8crght33ognn5hbeivrp09k:/oauthredirect";
      //AuthSession.makeRedirectUri({scheme: "com.googleusercontent.apps.1034336371411-871dda5aa8crght33ognn5hbeivrp09k", });

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

      console.log("🚀 Initiating Google OAuth with request:", {
        clientId: request.clientId,
        scopes: request.scopes,
        redirectUri: request.redirectUri,
        responseType: request.responseType,
        codeChallengeMethod: request.codeChallengeMethod,
        extraParams: request.extraParams,
        usePKCE: request.usePKCE,
        codeChallenge: request.codeChallenge,
        codeVerifier: request.codeVerifier,
      });

      // Define discovery endpoint
      const discovery = {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      };

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && (result as any).params?.code) {
        // Use the stored code verifier from state, NOT the local variable

        const authResponse = await ApiHelper.authenticateWithGoogle({
          authorizationCode: (result as any).params.code,
          codeVerifier: codeVerifier,
          deviceId,
          deviceType: Platform.OS === "ios" ? "ios" : "android",
        });

        if (authResponse.success) {
          console.log("✅ Backend authentication successful:", authResponse);
          await AuthStorageHelper.storeTokens({
            accessToken: authResponse.accessToken!,
            refreshToken: authResponse.refreshToken!,
          });

          if (authResponse.user) {
            await AuthStorageHelper.storeUser(authResponse.user);
          }

          setAuthState({
            isAuthenticated: true,
            user: authResponse.user || null,
            isLoading: false,
            error: null,
            mode: "", // Will be set by startup flow
            dashboardReady: false,
            selectedSpreadsheetId: null,
          });

          // Trigger startup flow to load user data and dashboard
          console.log("🚀 Calling startUp after successful login");
          if (authResponse.user?.email && authResponse.accessToken) {
            await startUp(authResponse.user.email, authResponse.accessToken);
          }
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

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await AuthStorageHelper.getTokens();
      const deviceId = await AuthStorageHelper.getOrCreateDeviceId();

      if (!tokens?.refreshToken) {
        return false;
      }

      const result = await ApiHelper.refreshToken({
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
      console.error("Token refresh error:", error);
      return false;
    }
  }, []);

  // Effect to handle mode changes and trigger data loading
  useEffect(() => {
    console.log("📊 MODE CHANGED:", authState.mode);

    if (authState.mode === "load" && authState.selectedSpreadsheetId) {
      console.log("🔄 Mode is 'load', triggering reloadAllData");
      reloadAllData();
    }
  }, [authState.mode, authState.selectedSpreadsheetId]);

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
    refreshTokens,
    initializeAuth,
    clearError,
    // Data functions
    reloadAllData,
  };
};

import { useState, useEffect, useCallback } from "react";
import {
  AuthStorageHelper,
  AuthTokens,
  User,
} from "../helpers/AuthStorageHelper";
import { ApiHelper } from "../helpers/ApiHelper";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });


  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const tokens = await AuthStorageHelper.getTokens();
      const user = await AuthStorageHelper.getUser();

      if (tokens && user) {
        // Verify tokens are still valid by getting user profile
        try {
          const profileResponse = await ApiHelper.getUserProfile(
            tokens.accessToken
          );

          if (profileResponse.success && profileResponse.user) {
            setAuthState({
              isAuthenticated: true,
              user: profileResponse.user,
              isLoading: false,
              error: null,
            });

            // Update stored user with latest info
            await AuthStorageHelper.storeUser(profileResponse.user);
            return;
          }
        } catch (error) {
          console.log(
            "Stored tokens are invalid, will need to re-authenticate"
          );
          await AuthStorageHelper.clearAll();
        }
      }

      // No valid authentication found
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Authentication initialization failed",
      });
    }
  }, []);

  // PKCE utility functions for OAuth2 security - Following Google specifications
  const generateCodeVerifier = () => {
    // Generate ASCII string directly - RFC 7636 compliant characters only
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    
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
          deviceType: "ios",
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
          });
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

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    ...authState,
    loginWithGoogle,
    logout,
    refreshTokens,
    initializeAuth,
  };
};

import Constants from 'expo-constants';
import { User, AuthStorageHelper } from './AuthStorageHelper';

// Get API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
// Auth service URL - separate service for authentication
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || 'http://localhost:8082';

console.log('🌐 API_URL configured as:', API_URL);
console.log('🔐 AUTH_URL configured as:', AUTH_URL);

/**
 * Custom error for authentication failures that require re-login
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
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
  private static unauthorizedHandler: (() => Promise<void> | void) | null = null;
  private static isHandlingUnauthorized = false;

  static setUnauthorizedHandler(handler: (() => Promise<void> | void) | null): void {
    this.unauthorizedHandler = handler;
  }

  static async handleUnauthorized(
    message = 'Your session has expired. Please login again.',
  ): Promise<void> {
    if (this.isHandlingUnauthorized) {
      return;
    }

    this.isHandlingUnauthorized = true;

    try {
      if (this.unauthorizedHandler) {
        await this.unauthorizedHandler();
      }
    } catch (error) {
      console.error('❌ Unauthorized handler failed:', error);
    } finally {
      console.log('🚪 Unauthorized session detected:', message);
      this.isHandlingUnauthorized = false;
    }
  }

  /**
   * Private method to refresh tokens via API
   */
  private static refreshInFlight = new Map<
    string,
    Promise<{ accessToken: string; refreshToken: string }>
  >();

  private static async refreshTokensViaApi(refreshToken: string, deviceId: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${this.authUri}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken,
          deviceId,
          appVariant: Constants.expoConfig?.extra?.appVariant || 'production',
        }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403)
        throw new AuthenticationError(result.error || 'Session revoked');
      if (!response.ok || !result.success || !result.accessToken || !result.refreshToken)
        throw new Error('Token refresh unavailable');
      return {
        accessToken: result.accessToken as string,
        refreshToken: result.refreshToken as string,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  static async getValidAccessToken(
    forceRefresh = false,
    requireSessionId = false,
  ): Promise<string | null> {
    const tokens = await AuthStorageHelper.getTokens();
    try {
      if (!tokens) throw new AuthenticationError('No authentication tokens available');
      let hasSession = false;
      try {
        hasSession = !!JSON.parse(
          atob(tokens.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        ).sessionId;
      } catch {}
      if (
        forceRefresh ||
        AuthStorageHelper.isTokenExpired(tokens.accessToken) ||
        (requireSessionId && !hasSession)
      ) {
        if (AuthStorageHelper.isTokenExpired(tokens.refreshToken))
          throw new AuthenticationError('Refresh token expired');
        if (!this.refreshInFlight.has(tokens.refreshToken)) {
          const pending = (async () => {
            const deviceId = await AuthStorageHelper.getOrCreateDeviceId();
            const refreshed = await this.refreshTokensViaApi(tokens.refreshToken, deviceId);
            const current = await AuthStorageHelper.getTokens();
            if (current?.refreshToken !== tokens.refreshToken)
              throw new Error('Session changed during refresh');
            await AuthStorageHelper.storeTokens(refreshed);
            return refreshed;
          })();
          this.refreshInFlight.set(tokens.refreshToken, pending);
          void pending
            .finally(() => {
              if (this.refreshInFlight.get(tokens.refreshToken) === pending)
                this.refreshInFlight.delete(tokens.refreshToken);
            })
            .catch(() => undefined);
        }
        const refreshed = await this.refreshInFlight.get(tokens.refreshToken)!;
        const current = await AuthStorageHelper.getTokens();
        if (current?.refreshToken !== refreshed.refreshToken)
          throw new Error('Session changed during refresh');
        return refreshed.accessToken;
      }
      return tokens.accessToken;
    } catch (error) {
      const current = await AuthStorageHelper.getTokens();
      if (error instanceof AuthenticationError && current?.refreshToken === tokens?.refreshToken)
        await this.handleUnauthorized(error.message);
      throw error;
    }
  }

  // Generic GET method with automatic token management
  static async get(endpoint: string, options: any = {}): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error('No valid authentication token available');
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // If 401 Unauthorized, throw AuthenticationError to trigger logout
        if (response.status === 401) {
          await this.handleUnauthorized(result.error || 'Authentication failed');
          throw new AuthenticationError(result.error || 'Authentication failed');
        }
        throw new Error(result.error || `GET request failed: ${response.statusText}`);
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('GET request error:', error);
      throw error;
    }
  }

  // Generic POST method with automatic token management
  static async post(endpoint: string, data: any, options: any = {}): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error('No valid authentication token available');
      }

      const url = `${this.endpointUri}${endpoint}`;
      console.log('POST request to:', url, 'with data:', data);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      console.log('POST response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('POST error response:', errorText);
        if (response.status === 401) {
          await this.handleUnauthorized(errorText || 'Authentication failed');
          throw new AuthenticationError(errorText || 'Authentication failed');
        }
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
      } catch {
        console.error('POST JSON parse error:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('POST request error:', error);
      throw error;
    }
  }

  // Generic PUT method with automatic token management
  static async put(endpoint: string, data: any, options: any = {}): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error('No valid authentication token available');
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.handleUnauthorized(result.error || 'Authentication failed');
          throw new AuthenticationError(result.error || 'Authentication failed');
        }

        throw new Error(result.error || `PUT request failed: ${response.statusText}`);
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('PUT request error:', error);
      throw error;
    }
  }

  // Generic DELETE method with automatic token management
  static async delete(endpoint: string, options: any = {}): Promise<HttpResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      if (!accessToken) {
        throw new Error('No valid authentication token available');
      }

      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.handleUnauthorized(result.error || 'Authentication failed');
          throw new AuthenticationError(result.error || 'Authentication failed');
        }

        throw new Error(result.error || `DELETE request failed: ${response.statusText}`);
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('DELETE request error:', error);
      throw error;
    }
  }
}

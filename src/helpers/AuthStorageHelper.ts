import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
  spreadsheetId?: string;
  schemaVersion?: number;
  setupComplete?: boolean;
  lastAccess?: string;
  pushNotificationsEnabled?: boolean;
}

export class AuthStorageHelper {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';
  private static readonly DEVICE_ID_KEY = 'deviceId';

  // Token management
  static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [this.ACCESS_TOKEN_KEY, tokens.accessToken],
        [this.REFRESH_TOKEN_KEY, tokens.refreshToken],
      ]);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  static async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokens = await AsyncStorage.multiGet([this.ACCESS_TOKEN_KEY, this.REFRESH_TOKEN_KEY]);

      const accessToken = tokens[0][1];
      const refreshToken = tokens[1][1];

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch (error) {
      console.error('Error getting tokens:', error);
      return null;
    }
  }

  static async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.ACCESS_TOKEN_KEY, this.REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      // Decode JWT token to get expiration
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        return true;
      }

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) {
        return true;
      }

      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // If we can't decode, consider it expired
    }
  }

  // User management
  static async storeUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
      throw error;
    }
  }

  static async getUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Error clearing user:', error);
      throw error;
    }
  }

  // Device ID management
  static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error managing device ID:', error);
      // Fallback to generating a new ID
      return this.generateDeviceId();
    }
  }

  private static generateDeviceId(): string {
    return 'expo-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Clear all auth data
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([this.clearTokens(), this.clearUser()]);
    } catch (error) {
      console.error('Error clearing all auth data:', error);
      throw error;
    }
  }
}

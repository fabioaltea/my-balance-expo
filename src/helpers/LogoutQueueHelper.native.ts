import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HttpHelper } from './HttpHelper';
import { AuthStorageHelper } from './AuthStorageHelper';

interface Revocation {
  refreshToken: string;
  deviceId: string;
  expiresAt: number;
}
const INDEX = 'push-pending-revocations-v1';
export class LogoutQueueHelper {
  private static work = Promise.resolve();
  private static serial(action: () => Promise<void>) {
    const task = this.work.then(action);
    this.work = task.catch(() => undefined);
    return task;
  }
  private static async keys(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(INDEX);
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) throw new Error('Indice revoche non leggibile');
    return value.filter(
      (k: unknown) => typeof k === 'string' && /^push-revoke-[a-zA-Z0-9-]+$/.test(k),
    );
  }
  static logout(deviceId: string, refreshToken: string) {
    return this.serial(async () => {
      if (AuthStorageHelper.isTokenExpired(refreshToken)) return;
      const payload = JSON.parse(
        atob(refreshToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      const key = `push-revoke-${payload.sessionId || Date.now()}`;
      try {
        await SecureStore.setItemAsync(
          key,
          JSON.stringify({ refreshToken, deviceId, expiresAt: payload.exp * 1000 }),
          { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY },
        );
        await AsyncStorage.setItem(
          INDEX,
          JSON.stringify([...new Set([...(await this.keys()), key])]),
        );
      } catch {
        // A storage error must not prevent an online session revocation.
        await this.request({ refreshToken, deviceId, expiresAt: payload.exp * 1000 });
        throw new Error('Impossibile conservare la revoca offline');
      }
      await this.drain();
    });
  }
  static retry() {
    return this.serial(() => this.drain());
  }
  private static async request(revocation: Revocation): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${HttpHelper.authUri}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${revocation.refreshToken}`,
        },
        body: JSON.stringify({ deviceId: revocation.deviceId }),
        signal: controller.signal,
      });
      return response.ok || response.status === 401;
    } finally {
      clearTimeout(timeout);
    }
  }
  private static async drain() {
    const remaining: string[] = [];
    for (const key of await this.keys()) {
      let revocation: Revocation | null = null;
      try {
        revocation = JSON.parse((await SecureStore.getItemAsync(key)) || 'null');
      } catch {
        remaining.push(key);
        continue;
      }
      let remove = !revocation || revocation.expiresAt <= Date.now();
      if (!remove && revocation) {
        try {
          remove = await this.request(revocation);
        } catch {}
      }
      if (remove) await SecureStore.deleteItemAsync(key);
      else remaining.push(key);
    }
    await AsyncStorage.setItem(INDEX, JSON.stringify(remaining));
  }
}

import { HttpHelper } from './HttpHelper';
export class LogoutQueueHelper {
  static async logout(deviceId: string, refreshToken: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(`${HttpHelper.authUri}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
        body: JSON.stringify({ deviceId }),
        signal: controller.signal,
      });
    } catch {
    } finally {
      clearTimeout(timeout);
    }
  }
  static async retry() {}
}

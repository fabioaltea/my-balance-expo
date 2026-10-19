import { HttpHelper, AuthenticationError } from './HttpHelper';
import { AuthStorageHelper } from './AuthStorageHelper';
import type { PushDeviceState, NotificationPermission } from '../types/notifications';

export class PushApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(
      code === 'PUSH_DISABLED'
        ? 'Le notifiche sono disattivate su questo dispositivo.'
        : 'Il servizio notifiche non è disponibile. Riprova più tardi.',
    );
  }
}
export class PushApiHelper {
  static async request(method: 'GET' | 'PUT' | 'DELETE', body?: object): Promise<PushDeviceState> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await HttpHelper.getValidAccessToken(attempt > 0, true);
      if (!token) throw new AuthenticationError('Sessione non valida');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${HttpHelper.authUri}/auth/push-devices/current`, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: controller.signal,
        });
        const current = await AuthStorageHelper.getTokens();
        if (current?.accessToken !== token) throw new Error('La sessione è cambiata');
        const result = await response.json();
        if (response.status === 401 && attempt === 0) continue;
        if (response.status === 401) {
          await HttpHelper.handleUnauthorized('Sessione non valida');
          throw new AuthenticationError('Sessione non valida');
        }
        if (!response.ok || !result.success || !result.data)
          throw new PushApiError(result.code || 'PUSH_REQUEST_FAILED', response.status);
        return result.data;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new AuthenticationError('Sessione non valida');
  }
  static get() {
    return this.request('GET');
  }
  static disable() {
    return this.request('DELETE');
  }
  static register(
    expoPushToken: string | null,
    permissionStatus: NotificationPermission,
    intent: 'enable' | 'reconcile' | 'restoreLegacy' | 'claim',
  ) {
    return this.request('PUT', { expoPushToken, permissionStatus, intent });
  }
}

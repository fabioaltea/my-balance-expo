import type { NotificationPermission } from '../types/notifications';
export class NotificationsHelpers {
  static supported = false;
  static appVariant = 'production' as const;
  static async permission(_request = false): Promise<NotificationPermission> {
    return 'denied';
  }
  static async token(): Promise<string> {
    throw new Error('Notifiche push non disponibili sul web');
  }
  static async clearLastResponse() {}
  static listen(
    _received: (data: unknown, id: string) => void,
    _tapped: (data: unknown, id: string) => void,
    _rotated: () => void,
    _allowed?: (data: unknown) => Promise<boolean>,
  ) {
    return () => {};
  }
}

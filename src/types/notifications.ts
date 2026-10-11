export type NotificationPermission = 'granted' | 'provisional' | 'denied' | 'undetermined';
export interface PushDeviceState {
  deviceId: string;
  appVariant: 'production' | 'development';
  enabled: boolean;
  registered: boolean;
  updatedAt: string | null;
}
export interface NotificationState {
  enabled: boolean;
  registered: boolean;
  permission: NotificationPermission;
  syncStatus: 'idle' | 'syncing' | 'error';
  error: string | null;
}
export interface NotificationPreference {
  enabled: boolean;
  pending: boolean;
}
export interface MovementNotification {
  version: 1;
  type: 'movement.unconfirmed';
  movementId: string;
  spreadsheetId: string;
  recipientHash: string;
}
export function movementNotification(data: unknown): MovementNotification | null {
  const value = data as Partial<MovementNotification> | null;
  return value?.version === 1 &&
    value.type === 'movement.unconfirmed' &&
    typeof value.movementId === 'string' &&
    value.movementId.length > 0 &&
    value.movementId.length < 256 &&
    typeof value.spreadsheetId === 'string' &&
    value.spreadsheetId.length > 0 &&
    typeof value.recipientHash === 'string' &&
    /^[a-f0-9]{64}$/.test(value.recipientHash)
    ? (value as MovementNotification)
    : null;
}

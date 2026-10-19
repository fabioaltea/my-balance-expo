import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PushApiHelper } from './PushApiHelper';
import type { NotificationPermission } from '../types/notifications';

export class NotificationsHelpers {
  static supported = Platform.OS !== 'web' && Device.isDevice;
  static appVariant: 'production' | 'development' =
    Constants.expoConfig?.extra?.appVariant === 'development' ? 'development' : 'production';
  static async permission(request = false): Promise<NotificationPermission> {
    if (!this.supported) return 'denied';
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync('default', {
        name: 'MyBalance',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    let result = await Notifications.getPermissionsAsync();
    if (request && result.status !== 'granted' && result.canAskAgain)
      result = await Notifications.requestPermissionsAsync();
    if (result.status === 'granted') return 'granted';
    if (result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
      return 'provisional';
    return result.status === 'undetermined' ? 'undetermined' : 'denied';
  }
  static async token(): Promise<string> {
    if (!this.supported)
      throw new Error('Le notifiche richiedono un dispositivo fisico e una build nativa');
    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) throw new Error('Progetto Expo non configurato');
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  static async registerForPushNotificationsAsync(): Promise<string> {
    const permission = await this.permission(true);
    if (!['granted', 'provisional'].includes(permission))
      throw new Error('Permesso notifiche negato');
    const token = await this.token();
    await PushApiHelper.register(token, permission, 'enable');
    return token;
  }
  static async unregisterPushNotificationsAsync(): Promise<boolean> {
    await PushApiHelper.disable();
    return true;
  }
  static async clearLastResponse() {
    await Notifications.clearLastNotificationResponseAsync();
  }
  static listen(
    received: (data: unknown, id: string) => void,
    tapped: (data: unknown, id: string) => void,
    rotated: () => void,
    allowed: (data: unknown) => Promise<boolean> = async () => true,
  ) {
    if (!this.supported) return () => {};
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const show = await allowed(notification.request.content.data);
        return {
          shouldPlaySound: show,
          shouldSetBadge: false,
          shouldShowBanner: show,
          shouldShowList: show,
        };
      },
    });
    const incoming = Notifications.addNotificationReceivedListener((n) =>
      received(n.request.content.data, n.request.identifier),
    );
    const response = Notifications.addNotificationResponseReceivedListener((r) =>
      tapped(r.notification.request.content.data, r.notification.request.identifier),
    );
    const token = Notifications.addPushTokenListener(rotated);
    const last = Notifications.getLastNotificationResponse();
    if (last) tapped(last.notification.request.content.data, last.notification.request.identifier);
    return () => {
      incoming.remove();
      response.remove();
      token.remove();
      Notifications.setNotificationHandler(null);
    };
  }
}

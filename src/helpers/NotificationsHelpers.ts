import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ApiHelper } from './ApiHelper';

export class NotificationsHelpers {
  public static async registerForPushNotificationsAsync(): Promise<string | undefined> {
    console.log('🚀 Registering for push notifications...');

    if (!Device.isDevice) {
      throw new Error('Le notifiche push funzionano solo su device fisico');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Permesso notifiche negato');
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    // Save token to backend
    const saved = await ApiHelper.savePushToken(token);
    if (!saved) {
      console.error('Failed to save push token to backend');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    return token;
  }

  public static async unregisterPushNotificationsAsync(): Promise<boolean> {
    console.log('🔕 Unregistering push notifications...');

    // Remove token from backend
    const removed = await ApiHelper.removePushToken();
    if (!removed) {
      console.error('Failed to remove push token from backend');
      return false;
    }

    return true;
  }
}

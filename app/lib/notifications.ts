/**
 * Push Notifications Setup
 *
 * Handles push notification registration and handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
}

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'New message notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#007AFF',
        sound: 'default',
      });
    }

    return {
      token: tokenData.data,
      type: 'expo',
    };
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Send the push token to the Matrix homeserver
 */
export async function registerPushTokenWithMatrix(
  matrixClient: any,
  pushToken: PushToken
): Promise<void> {
  try {
    // Matrix uses "pushers" for push notifications
    // This registers with the Sygnal push gateway
    await matrixClient.setPusher({
      pushkey: pushToken.token,
      kind: 'http',
      app_id: 'io.clawchat.app',
      app_display_name: 'ClawChat',
      device_display_name: Device.deviceName || 'Mobile Device',
      lang: 'en',
      data: {
        // For Expo, use the Expo push service
        url: 'https://exp.host/--/api/v2/push/send',
        format: 'event_id_only',
      },
    });

    console.log('Push token registered with Matrix');
  } catch (error) {
    console.error('Failed to register push token with Matrix:', error);
  }
}

/**
 * Handle incoming notification (when app is in foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification tap (when user taps the notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}

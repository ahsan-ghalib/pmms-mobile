import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus as NotifeeAuthorizationStatus,
} from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, Platform } from 'react-native';

import {
  DEFAULT_NOTIFICATION_SOUND,
  NOTIFICATION_SOUNDS,
  soundForNotificationType,
  type NotificationSoundKey,
} from '../utils/notificationSounds';
import { isOrderLifecycleNotificationType } from '../utils/orderNotificationTypes';

export const DEFAULT_NOTIFICATION_CHANNEL_ID =
  NOTIFICATION_SOUNDS[DEFAULT_NOTIFICATION_SOUND].channelId;

/** @deprecated Use DEFAULT_NOTIFICATION_CHANNEL_ID / per-sound channels */
export const NOTIFICATION_SOUND = NOTIFICATION_SOUNDS[DEFAULT_NOTIFICATION_SOUND].android;
export const NOTIFICATION_SOUND_IOS = NOTIFICATION_SOUNDS[DEFAULT_NOTIFICATION_SOUND].ios;

let channelsReady = false;

export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelsReady) {
    return;
  }

  await Promise.all(
    (Object.keys(NOTIFICATION_SOUNDS) as NotificationSoundKey[]).map((key) => {
      const def = NOTIFICATION_SOUNDS[key];
      return notifee.createChannel({
        id: def.channelId,
        name: def.channelName,
        description: `SoouqLive — ${def.channelName}`,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: def.android,
        vibration: true,
        lights: true,
      });
    }),
  );

  channelsReady = true;
}

/** Back-compat alias */
export async function ensureNotificationChannel(): Promise<string> {
  await ensureNotificationChannels();
  return DEFAULT_NOTIFICATION_CHANNEL_ID;
}

function resolveSoundKey(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): NotificationSoundKey {
  const data = (remoteMessage.data || {}) as Record<string, unknown>;
  const explicit = String(data.sound || data.ringtone || '').trim();
  if (explicit && explicit in NOTIFICATION_SOUNDS) {
    return explicit as NotificationSoundKey;
  }

  // Server may send android sound basename (underscored).
  const androidName = explicit.replace(/\.mp3$|\.wav$/i, '').replace(/-/g, '_');
  const matched = (Object.keys(NOTIFICATION_SOUNDS) as NotificationSoundKey[]).find(
    (key) => NOTIFICATION_SOUNDS[key].android === androidName,
  );
  if (matched) return matched;

  return soundForNotificationType(
    String(data.type || data.notificationType || ''),
    String(data.status || data.order_status || ''),
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannels();

  const notifeeSettings = await notifee.requestPermission();
  const notifeeEnabled =
    notifeeSettings.authorizationStatus === NotifeeAuthorizationStatus.AUTHORIZED ||
    notifeeSettings.authorizationStatus === NotifeeAuthorizationStatus.PROVISIONAL;

  if (Platform.OS === 'ios') {
    const firebaseStatus = await messaging().requestPermission();
    const firebaseEnabled =
      firebaseStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      firebaseStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return notifeeEnabled && firebaseEnabled;
  }

  return notifeeEnabled;
}

export async function getFcmToken(): Promise<string | undefined> {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    return undefined;
  }

  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }

  return messaging().getToken();
}

export async function displayRemoteNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const data = (remoteMessage.data || {}) as Record<string, unknown>;
  const type = String(data.type || data.notificationType || '');
  // Foreground order status already has an in-app toast from websocket.
  if (isOrderLifecycleNotificationType(type) && AppState.currentState === 'active') {
    return;
  }

  await ensureNotificationChannels();
  const soundKey = resolveSoundKey(remoteMessage);
  const soundDef = NOTIFICATION_SOUNDS[soundKey];

  const title = remoteMessage.notification?.title ?? remoteMessage.data?.title ?? 'SoouqLive';
  const body =
    remoteMessage.notification?.body ?? remoteMessage.data?.body ?? 'You have a new notification';

  await notifee.displayNotification({
    title: String(title),
    body: String(body),
    data: remoteMessage.data,
    android: {
      channelId: soundDef.channelId,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      sound: soundDef.android,
    },
    ios: {
      sound: soundDef.ios,
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
}

// Register once — Dev Menu / Metro reload re-evaluates this module and a second
// setBackgroundMessageHandler call can abort the process.
const globalAny = globalThis as typeof globalThis & {
  __soouqFcmBackgroundHandlerInstalled?: boolean;
};

if (!globalAny.__soouqFcmBackgroundHandlerInstalled) {
  globalAny.__soouqFcmBackgroundHandlerInstalled = true;
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      if (!remoteMessage.notification) {
        await displayRemoteNotification(remoteMessage);
      }
    });
  } catch (error) {
    console.warn('[FCM] Failed to install background handler:', error);
  }
}

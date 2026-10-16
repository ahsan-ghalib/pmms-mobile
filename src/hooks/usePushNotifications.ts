import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import notifee, { EventType, InitialNotification } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { displayRemoteNotification, getFcmToken } from '../notifications/pushNotifications';

type NotificationData = Record<string, unknown> | undefined;

function openNotification(data: NotificationData): void {
  const type = data?.type;
  if (
    type !== 'REQUEST_APPROVED' &&
    type !== 'REQUEST_REJECTED' &&
    type !== 'REPLACEMENT_READY' &&
    type !== 'COMPLAINT_UPDATED' &&
    type !== 'COMPLAINT_CREATED'
  ) {
    return;
  }

  if (type === 'COMPLAINT_UPDATED' || type === 'COMPLAINT_CREATED') {
    const complaintId = data?.complaint_id;
    if (complaintId !== undefined && complaintId !== null) {
      router.push({
        pathname: '/profile/ComplaintDetailsScreen',
        params: { complaintId: String(complaintId) },
      });
    }
    return;
  }

  const id = data?.order_request_id ?? data?.after_sale_request_id;
  if (id !== undefined && id !== null) {
    router.push({
      pathname: '/profile/RequestDetailsScreen',
      params: { requestId: String(id) },
    });
  }
}

function getNotifeeInitialData(initialNotification: InitialNotification | null): NotificationData {
  return initialNotification?.notification.data as NotificationData;
}

export const usePushNotifications = () => {
  const [deviceToken, setDeviceToken] = useState('');
  const [notification, setNotification] = useState<FirebaseMessagingTypes.RemoteMessage | false>(
    false,
  );
  const lastOpenedNotification = useRef('');
  const appState = useRef(AppState.currentState);

  const openOnce = (data: NotificationData) => {
    const key = JSON.stringify(data ?? {});
    if (key === lastOpenedNotification.current) {
      return;
    }
    lastOpenedNotification.current = key;
    openNotification(data);
  };

  const refreshDeviceToken = useCallback(async (): Promise<string | undefined> => {
    try {
      const token = await getFcmToken();
      if (token) {
        setDeviceToken(token);
      }
      return token;
    } catch (error) {
      console.error('[PushNotifications] Unable to refresh FCM token:', error);
      return undefined;
    }
  }, []);

  useEffect(() => {
    refreshDeviceToken();

    const unsubscribeTokenRefresh = messaging().onTokenRefresh(setDeviceToken);

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshDeviceToken();
      }
      appState.current = nextState;
    };
    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    const unsubscribeForegroundMessage = messaging().onMessage(async (remoteMessage) => {
      setNotification(remoteMessage);
      try {
        await displayRemoteNotification(remoteMessage);
      } catch (error) {
        console.error('[PushNotifications] Unable to display foreground notification:', error);
      }
    });

    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      openOnce(remoteMessage.data);
    });

    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        openOnce(detail.notification?.data as NotificationData);
      }
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          openOnce(remoteMessage.data);
        }
      })
      .catch((error) => {
        console.error('[PushNotifications] Unable to read initial FCM notification:', error);
      });

    notifee
      .getInitialNotification()
      .then((initialNotification) => {
        openOnce(getNotifeeInitialData(initialNotification));
      })
      .catch((error) => {
        console.error('[PushNotifications] Unable to read initial local notification:', error);
      });

    return () => {
      appStateSub.remove();
      unsubscribeTokenRefresh();
      unsubscribeForegroundMessage();
      unsubscribeNotificationOpened();
      unsubscribeNotifeeForeground();
    };
  }, [refreshDeviceToken]);

  return { deviceToken, notification, refreshDeviceToken };
};

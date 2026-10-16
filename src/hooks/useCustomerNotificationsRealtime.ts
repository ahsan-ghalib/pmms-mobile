import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';

import echo from '../api/echo';
import { showOrderStatusToast } from '../components/OrderStatusToast';
import { useAuth } from '../contexts/AuthContext';
import { localizedNotificationText } from '../utils/localizedNotificationText';
import { soundForNotificationType } from '../utils/notificationSounds';
import { isOrderLifecycleNotificationType } from '../utils/orderNotificationTypes';
import i18n from '../i18n';

function isOrderRequestNotificationType(type: string) {
  const upper = type.toUpperCase();
  return (
    upper.includes('REFUND') ||
    upper.includes('EXCHANGE') ||
    upper.includes('ORDER_REQUEST') ||
    upper === 'REQUEST_APPROVED' ||
    upper === 'REQUEST_REJECTED' ||
    upper === 'REPLACEMENT_READY'
  );
}

function invalidateOrderRequestQueries(queryClient: ReturnType<typeof useQueryClient>, event: any) {
  const requestId =
    event?.data?.order_request_id ??
    event?.data?.after_sale_request_id ??
    event?.order_request_id ??
    event?.after_sale_request_id;

  void queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
  void queryClient.invalidateQueries({ queryKey: ['vendor_order_requests'] });

  if (requestId != null) {
    void queryClient.invalidateQueries({
      queryKey: ['order_request_details', String(requestId)],
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: ['order_request_details'] });
  }
}

/**
 * App-wide: in-app notifications (complaint / return-exchange) → toast + cache refresh.
 */
export function useCustomerNotificationsRealtime() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const lastToastKeyRef = useRef('');

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !echo) {
      return;
    }

    const channelName = `user.${user.id}.notifications`;
    const channel = echo.private(channelName);

    const onNotification = (event: any) => {
      console.log('[CustomerNotifications] UserNotificationCreated', event);
      const type = String(event?.type || '').toUpperCase();
      const { title, body } = localizedNotificationText(event, i18n.language);
      const toastTitle = title || 'Notification';
      const toastKey = `${event?.id ?? ''}:${type}:${body}`;

      // Order status already toasts from OrderStatusUpdated — inbox only here.
      if (
        toastKey &&
        toastKey !== lastToastKeyRef.current &&
        !isOrderLifecycleNotificationType(type)
      ) {
        lastToastKeyRef.current = toastKey;
        showOrderStatusToast({
          type:
            type.includes('COMPLAINT') || isOrderRequestNotificationType(type) ? 'info' : 'success',
          title: toastTitle,
          message: body,
          sound: soundForNotificationType(type, event?.data?.status),
        });
      }

      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });

      if (type.includes('COMPLAINT')) {
        const complaintId = event?.data?.complaint_id ?? event?.complaint_id;
        void queryClient.invalidateQueries({ queryKey: ['complaints'] });
        if (complaintId != null) {
          void queryClient.invalidateQueries({
            queryKey: ['complaint', String(complaintId)],
          });
        } else {
          void queryClient.invalidateQueries({ queryKey: ['complaint'] });
        }
      }

      if (isOrderRequestNotificationType(type)) {
        invalidateOrderRequestQueries(queryClient, event);
      }
    };

    channel.listen('.UserNotificationCreated', onNotification);

    return () => {
      try {
        channel.stopListening('.UserNotificationCreated', onNotification as any);
      } catch {
        try {
          channel.stopListening('.UserNotificationCreated');
        } catch {
          // ignore
        }
      }
    };
  }, [isAuthenticated, user?.id, queryClient]);

  // Always-on return/exchange status channel (same reliability as orders).
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !echo) return;

    const channelName = `user.${user.id}.order-requests`;
    console.log('[CustomerNotifications] subscribing', channelName);
    const channel = echo.private(channelName);

    const onStatusUpdated = (event: any) => {
      console.log('[CustomerNotifications] OrderRequestStatusUpdated', event);
      const requestId =
        event?.order_request_id ?? event?.after_sale_request_id ?? event?.order_request?.id;
      const status = String(event?.status ?? event?.order_request?.status ?? '');

      if (requestId != null && status) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === 'order_request_details' &&
              String(query.queryKey[1]) === String(requestId),
          },
          (previous: any) => {
            if (!previous?.data) return previous;
            return {
              ...previous,
              data: {
                ...previous.data,
                status,
                updated_at: event?.updated_at || previous.data.updated_at,
                ...(status.toLowerCase() === 'store_approved' && !previous.data.approved_at
                  ? { approved_at: event?.updated_at || new Date().toISOString() }
                  : {}),
              },
            };
          },
        );
      }

      invalidateOrderRequestQueries(queryClient, event);
    };

    channel.listen('.OrderRequestStatusUpdated', onStatusUpdated);

    return () => {
      try {
        channel.stopListening('.OrderRequestStatusUpdated', onStatusUpdated as any);
      } catch {
        // ignore
      }
    };
  }, [isAuthenticated, user?.id, queryClient]);

  // FCM foreground fallback when websocket is not occupied.
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const data = (remoteMessage?.data || {}) as Record<string, any>;
      const type = String(data?.type || '').toUpperCase();
      const isComplaint = type.includes('COMPLAINT');
      const isOrderRequest = isOrderRequestNotificationType(type);
      if (!isComplaint && !isOrderRequest) return;

      showOrderStatusToast({
        type: 'info',
        title: String(
          remoteMessage.notification?.title ||
            data?.title ||
            (isOrderRequest ? 'Request Updated' : 'Complaint Updated'),
        ),
        message: String(
          remoteMessage.notification?.body ||
            data?.body ||
            (isOrderRequest
              ? 'Your return/exchange status was updated.'
              : 'Your complaint status was updated.'),
        ),
        sound: soundForNotificationType(type, data?.status),
      });

      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });

      if (isComplaint) {
        void queryClient.invalidateQueries({ queryKey: ['complaints'] });
        const complaintId = data?.complaint_id;
        if (complaintId != null) {
          void queryClient.invalidateQueries({
            queryKey: ['complaint', String(complaintId)],
          });
        }
      }

      if (isOrderRequest) {
        invalidateOrderRequestQueries(queryClient, { data });
      }
    });

    return unsubscribe;
  }, [isAuthenticated, queryClient]);
}

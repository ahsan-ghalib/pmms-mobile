import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';

import echo from '../api/echo';
import { useAuth } from '../contexts/AuthContext';

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

function resolveRequestId(payload: Record<string, any> | null | undefined) {
  if (!payload) return null;
  return (
    payload.order_request_id ??
    payload.after_sale_request_id ??
    payload?.data?.order_request_id ??
    payload?.data?.after_sale_request_id ??
    payload?.order_request?.id ??
    null
  );
}

function matchesOrderRequestQuery(queryKey: unknown, resolvedId: string) {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === 'order_request_details' &&
    String(queryKey[1]) === resolvedId
  );
}

/**
 * Live return/exchange updates while a detail screen is open.
 * Returns liveStatus for instant UI (Pay Now / badge) before refetch completes.
 */
export function useOrderRequestRealtime(
  requestId: string | number | undefined | null,
  refetch?: () => void | Promise<unknown>,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const resolvedId = requestId != null && String(requestId).length > 0 ? String(requestId) : null;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  useEffect(() => {
    setLiveStatus(null);
  }, [resolvedId]);

  const applyStatusPatch = useCallback(
    (status: string, updatedAt?: string | null) => {
      if (!resolvedId || !status) return;
      const normalized = String(status);

      setLiveStatus(normalized);

      queryClient.setQueriesData(
        {
          predicate: (query) => matchesOrderRequestQuery(query.queryKey, resolvedId),
        },
        (previous: any) => {
          if (!previous?.data) return previous;
          return {
            ...previous,
            data: {
              ...previous.data,
              status: normalized,
              updated_at: updatedAt || previous.data.updated_at,
              ...(normalized.toLowerCase() === 'store_approved' && !previous.data.approved_at
                ? { approved_at: updatedAt || new Date().toISOString() }
                : {}),
              ...(normalized.toLowerCase() === 'return_fee_paid'
                ? {
                    is_return_fee_paid: true,
                    return_fee_paid_at:
                      updatedAt || previous.data.return_fee_paid_at || new Date().toISOString(),
                    items: Array.isArray(previous.data.items)
                      ? previous.data.items.map((item: any) =>
                          ['store_approved', 'waiting_return_fee'].includes(
                            String(item?.status || '').toLowerCase(),
                          )
                            ? { ...item, status: normalized }
                            : item,
                        )
                      : previous.data.items,
                  }
                : {}),
            },
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor_order_requests'] });
    },
    [queryClient, resolvedId],
  );

  const refresh = useCallback(() => {
    if (!resolvedId) return;

    void queryClient.invalidateQueries({
      predicate: (query) => matchesOrderRequestQuery(query.queryKey, resolvedId),
      refetchType: 'active',
    });
    void queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
    void queryClient.invalidateQueries({ queryKey: ['vendor_order_requests'] });
    void refetchRef.current?.();
  }, [queryClient, resolvedId]);

  const handleIncoming = useCallback(
    (event: any, source: string) => {
      const eventRequestId = resolveRequestId(event) ?? resolveRequestId(event?.data);
      if (eventRequestId != null && String(eventRequestId) !== resolvedId) {
        return;
      }

      const nextStatus = String(
        event?.status ?? event?.order_request?.status ?? event?.data?.status ?? '',
      );
      console.log(`[OrderRequestRealtime] ${source}`, {
        eventRequestId,
        nextStatus,
        resolvedId,
      });

      if (nextStatus) {
        applyStatusPatch(nextStatus, event?.updated_at ?? event?.order_request?.updated_at);
      }
      refresh();
    },
    [applyStatusPatch, refresh, resolvedId],
  );

  // Per-request channel
  useEffect(() => {
    if (!resolvedId || !echo) return;

    const channelName = `order-request.${resolvedId}`;
    console.log('[OrderRequestRealtime] subscribing', channelName);
    const channel = echo.private(channelName);

    const onStatusUpdated = (event: any) => handleIncoming(event, 'order-request channel');

    channel.listen('.OrderRequestStatusUpdated', onStatusUpdated);

    return () => {
      try {
        channel.stopListening('.OrderRequestStatusUpdated', onStatusUpdated as any);
      } catch {
        // ignore
      }
    };
  }, [resolvedId, handleIncoming]);

  // Always-on user order-requests channel (mirrors orders pattern)
  useEffect(() => {
    if (!user?.id || !resolvedId || !echo) return;

    const channelName = `user.${user.id}.order-requests`;
    console.log('[OrderRequestRealtime] subscribing', channelName);
    const channel = echo.private(channelName);

    const onStatusUpdated = (event: any) => handleIncoming(event, 'user.order-requests');

    channel.listen('.OrderRequestStatusUpdated', onStatusUpdated);

    return () => {
      try {
        channel.stopListening('.OrderRequestStatusUpdated', onStatusUpdated as any);
      } catch {
        // ignore
      }
    };
  }, [user?.id, resolvedId, handleIncoming]);

  // Notification fallback
  useEffect(() => {
    if (!user?.id || !resolvedId || !echo) return;

    const channelName = `user.${user.id}.notifications`;
    const channel = echo.private(channelName);

    const onNotification = (event: any) => {
      const type = String(event?.type || '');
      if (!isOrderRequestNotificationType(type)) return;
      handleIncoming(event, 'UserNotificationCreated');
    };

    channel.listen('.UserNotificationCreated', onNotification);

    return () => {
      try {
        channel.stopListening('.UserNotificationCreated', onNotification as any);
      } catch {
        // ignore
      }
    };
  }, [user?.id, resolvedId, handleIncoming]);

  // FCM fallback
  useEffect(() => {
    if (!resolvedId) return;

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const data = (remoteMessage?.data || {}) as Record<string, any>;
      const type = String(data?.type || '');
      if (!isOrderRequestNotificationType(type)) return;

      const eventRequestId = resolveRequestId(data);
      if (eventRequestId != null && String(eventRequestId) !== resolvedId) {
        return;
      }

      if (data?.status) {
        applyStatusPatch(String(data.status));
      }
      refresh();
    });

    return unsubscribe;
  }, [resolvedId, applyStatusPatch, refresh]);

  return { liveStatus };
}

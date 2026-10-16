import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import echo from '../api/echo';
import { showOrderStatusToast } from '../components/OrderStatusToast';
import { useAuth } from '../contexts/AuthContext';
import { getOrderStatusToastCopy, normalizeOrderStatus } from '../utils/orderStatusToastCopy';

type OrderStatusEvent = {
  type?: string;
  order?: {
    id?: number | string;
    order_id?: number | string;
    invoice_id?: string;
    status?: string;
    status_raw?: string;
    order_otp?: string;
    request_deligate?: string | number;
    updated_at?: string;
  };
};

function applyOrderStatusToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  order: NonNullable<OrderStatusEvent['order']>,
  nextStatus: string,
) {
  const keys = Array.from(
    new Set(
      [order.order_id, order.id]
        .filter((value) => value != null && String(value).length > 0)
        .map((value) => String(value)),
    ),
  );

  const nowIso = new Date().toISOString();

  for (const key of keys) {
    queryClient.setQueryData(['order', key], (previous: any) => {
      if (!previous?.data) {
        return previous;
      }

      const prevStatus = normalizeOrderStatus(previous.data.status ?? previous.data.order_status);
      const historyKey = previous.data.order_status_histroy
        ? 'order_status_histroy'
        : previous.data.order_status_history
          ? 'order_status_history'
          : 'order_status_histroy';
      const prevHistory = Array.isArray(previous.data[historyKey])
        ? [...previous.data[historyKey]]
        : [];

      if (
        nextStatus &&
        nextStatus !== prevStatus &&
        !prevHistory.some((item: any) => normalizeOrderStatus(item?.order_status) === nextStatus)
      ) {
        prevHistory.push({
          order_status: nextStatus,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return {
        ...previous,
        data: {
          ...previous.data,
          status: nextStatus || previous.data.status,
          order_status: nextStatus || previous.data.order_status,
          order_otp: order.order_otp ?? previous.data.order_otp,
          request_deligate: order.request_deligate ?? previous.data.request_deligate,
          updated_at: order.updated_at ?? nowIso,
          [historyKey]: prevHistory,
        },
      };
    });
  }

  if (keys.length > 0) {
    void queryClient.refetchQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'order' &&
        keys.includes(String(query.queryKey[1])),
    });
  }

  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      (query.queryKey[0] === 'orders' || query.queryKey[0] === 'my-orders'),
  });

  return keys;
}

/**
 * App-wide listener: OrderStatusUpdated → attractive top toast + refresh caches.
 */
export function useCustomerOrderRealtime() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const lastToastKeyRef = useRef<string>('');
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !echo) {
      return;
    }

    const channelName = `user.${user.id}.orders`;
    const channel = echo.private(channelName);

    const onStatusUpdated = (event: OrderStatusEvent) => {
      const order = event?.order;
      if (!order) {
        return;
      }

      const nextStatus = normalizeOrderStatus(order.status ?? order.status_raw);
      const orderLabel = order.invoice_id
        ? String(order.invoice_id)
        : order.order_id || order.id
          ? `#${order.order_id ?? order.id}`
          : '';

      const keys = applyOrderStatusToCache(queryClient, order, nextStatus);

      const toastKey = `${keys.join('|')}:${nextStatus}`;
      if (toastKey === lastToastKeyRef.current) {
        return;
      }
      lastToastKeyRef.current = toastKey;

      const copy = getOrderStatusToastCopy(nextStatus, orderLabel, 'customer', tRef.current);
      if (!copy) {
        return;
      }

      showOrderStatusToast({
        type: copy.type,
        title: copy.title,
        message: copy.message,
        sound: copy.sound,
      });
    };

    channel.listen('.OrderStatusUpdated', onStatusUpdated);

    return () => {
      try {
        channel.stopListening('.OrderStatusUpdated', onStatusUpdated as any);
      } catch {
        try {
          channel.stopListening('.OrderStatusUpdated');
        } catch {
          // ignore
        }
      }
      // Keep channel alive across remounts if possible — leave only on auth change.
      try {
        echo.leave(channelName);
      } catch {
        // ignore
      }
    };
  }, [isAuthenticated, user?.id, queryClient]);
}

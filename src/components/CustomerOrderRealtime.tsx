import { useCustomerOrderRealtime } from '../hooks/useCustomerOrderRealtime';
import { useCustomerNotificationsRealtime } from '../hooks/useCustomerNotificationsRealtime';

/** Mounts global customer websocket → toast bridges (orders + notifications). */
export function CustomerOrderRealtime() {
  useCustomerOrderRealtime();
  useCustomerNotificationsRealtime();
  return null;
}

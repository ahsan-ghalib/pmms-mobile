/** Order status / new-order types. Websocket OrderStatusUpdated already toasts these. */
export function isOrderLifecycleNotificationType(type: string): boolean {
  const normalized = type.toUpperCase();
  if (!normalized) {
    return false;
  }
  if (normalized.includes('COMPLAINT')) {
    return false;
  }
  if (
    normalized.includes('REFUND') ||
    normalized.includes('EXCHANGE') ||
    normalized.includes('ORDER_REQUEST') ||
    normalized === 'REQUEST_APPROVED' ||
    normalized === 'REQUEST_REJECTED' ||
    normalized === 'REPLACEMENT_READY'
  ) {
    return false;
  }

  return (
    normalized === 'NEW' ||
    normalized === 'NEW_ORDER' ||
    normalized === 'FOOD_NEW_ORDER' ||
    normalized.startsWith('ORDER_') ||
    normalized.startsWith('STORE_ORDER_') ||
    normalized.startsWith('FOOD_ORDER_')
  );
}

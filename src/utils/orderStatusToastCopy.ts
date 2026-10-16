/** Shared order-status toast copy helpers (vendor + customer wording). */

export function normalizeOrderStatus(status: unknown) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function getOrderStatusToastCopy(
  status: string,
  orderLabel: string,
  audience: 'customer' | 'vendor',
  t: (key: string, options?: any) => string,
): {
  type: 'success' | 'info' | 'error';
  title: string;
  message: string;
  sound?:
    'order-accept' | 'order-complete' | 'order-reject' | 'order-status-change' | 'new-notification';
} | null {
  const label = orderLabel || t('order', 'Order');

  if (audience === 'vendor') {
    switch (status) {
      case 'pending':
      case 'payment_completed':
        return {
          type: 'info',
          title: t('vendor_toast_new_order_title', { defaultValue: 'New order' }),
          message: t('vendor_toast_new_order_body', {
            order: label,
            defaultValue: `${label} is waiting for your response.`,
          }),
        };
      case 'accepted':
      case 'processing':
        return {
          type: 'success',
          title: t('vendor_toast_accepted_title', { defaultValue: 'Order accepted' }),
          message: t('vendor_toast_accepted_body', {
            order: label,
            defaultValue: `${label} is now being prepared.`,
          }),
        };
      case 'ready_for_delivery':
      case 'ready_for_pickup':
      case 'waiting_for_batch':
        return {
          type: 'info',
          title: t('vendor_toast_ready_title', { defaultValue: 'Order ready' }),
          message: t('vendor_toast_ready_body', {
            order: label,
            defaultValue: `${label} is marked ready.`,
          }),
        };
      case 'dispatched':
      case 'sent_to_logistics':
      case 'picked_from_store':
      case 'in_transit':
      case 'driver_accepted':
      case 'on_the_way':
      case 'out_for_delivery':
        return {
          type: 'info',
          title: t('vendor_toast_on_way_title', { defaultValue: 'On the way' }),
          message: t('vendor_toast_on_way_body', {
            order: label,
            defaultValue: `${label} is out for delivery.`,
          }),
        };
      case 'delivered':
      case 'completed':
      case 'completed_closed':
      case 'picked_up':
        return {
          type: 'success',
          title: t('vendor_toast_done_title', { defaultValue: 'Order completed' }),
          message: t('vendor_toast_done_body', {
            order: label,
            defaultValue: `${label} was completed successfully.`,
          }),
        };
      case 'rejected':
        return {
          type: 'error',
          title: t('vendor_toast_rejected_title', { defaultValue: 'Order rejected' }),
          message: t('vendor_toast_rejected_body', {
            order: label,
            defaultValue: `${label} was rejected.`,
          }),
        };
      case 'cancelled':
      case 'canceled':
        return {
          type: 'error',
          title: t('vendor_toast_cancelled_title', { defaultValue: 'Order cancelled' }),
          message: t('vendor_toast_cancelled_body', {
            order: label,
            defaultValue: `${label} was cancelled.`,
          }),
        };
      default:
        if (!status) return null;
        return {
          type: 'info',
          title: t('vendor_toast_updated_title', { defaultValue: 'Order updated' }),
          message: t('vendor_toast_updated_body', {
            order: label,
            defaultValue: `${label} status changed.`,
          }),
        };
    }
  }

  switch (status) {
    case 'payment_completed':
      return {
        type: 'success',
        title: t('order_placed_toast_title', { defaultValue: 'Order placed' }),
        message: t('order_placed_toast_body', {
          order: label,
          defaultValue: `Order ${label} was placed successfully.`,
        }),
        sound: 'order-accept',
      };
    case 'accepted':
    case 'processing':
      return {
        type: 'success',
        title: t('order_confirmed_toast_title', { defaultValue: 'Order confirmed' }),
        message: t('order_confirmed_toast_body', {
          order: label,
          defaultValue: `Order ${label} is being prepared.`,
        }),
        sound: 'order-accept',
      };
    case 'ready_for_delivery':
    case 'ready_for_pickup':
    case 'waiting_for_batch':
      return {
        type: 'info',
        title: t('order_ready_toast_title', { defaultValue: 'Order ready' }),
        message: t('order_ready_toast_body', {
          order: label,
          defaultValue: `Order ${label} is ready.`,
        }),
        sound: 'order-status-change',
      };
    case 'dispatched':
    case 'sent_to_logistics':
    case 'picked_from_store':
    case 'in_transit':
    case 'driver_accepted':
    case 'on_the_way':
    case 'out_for_delivery':
      return {
        type: 'info',
        title: t('order_on_the_way_toast_title', { defaultValue: 'On the way' }),
        message: t('order_on_the_way_toast_body', {
          order: label,
          defaultValue: `Order ${label} is on the way.`,
        }),
        sound: 'order-status-change',
      };
    case 'delivered':
    case 'completed':
    case 'completed_closed':
    case 'picked_up':
    case 'pickedup':
      return {
        type: 'success',
        title: t('order_delivered_toast_title', { defaultValue: 'Order completed' }),
        message: t('order_delivered_toast_body', {
          order: label,
          defaultValue: `Order ${label} is complete.`,
        }),
        sound: 'order-complete',
      };
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return {
        type: 'error',
        title: t('order_cancelled_toast_title', { defaultValue: 'Order cancelled' }),
        message: t('order_cancelled_toast_body', {
          order: label,
          defaultValue: `Order ${label} was cancelled.`,
        }),
        sound: 'order-reject',
      };
    default:
      if (!status) return null;
      return {
        type: 'info',
        title: t('order_updated_toast_title', { defaultValue: 'Order updated' }),
        message: t('order_updated_toast_body', {
          order: label,
          defaultValue: `Order ${label} status changed.`,
        }),
        sound: 'order-status-change',
      };
  }
}

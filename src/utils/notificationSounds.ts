/**
 * Customer notification ringtone keys + asset / platform sound names.
 *
 * Filenames must be Android-safe (a-z, 0-9, underscore only) because
 * expo-notifications copies them into res/raw with that basename.
 */

export type NotificationSoundKey =
  | 'new-message'
  | 'new-notification'
  | 'order-accept'
  | 'order-complete'
  | 'order-reject'
  | 'order-status-change'
  | 'add-to-cart';

type SoundDef = {
  /** expo-audio require() source */
  asset: number;
  /** Android Notifee / FCM sound name (res/raw) */
  android: string;
  /** iOS notification sound filename */
  ios: string;
  /** Dedicated Android notification channel (sound is locked to channel) */
  channelId: string;
  channelName: string;
};

export const NOTIFICATION_SOUNDS: Record<NotificationSoundKey, SoundDef> = {
  'new-message': {
    asset: require('../../assets/sounds/new_message.mp3'),
    android: 'new_message',
    ios: 'new_message.mp3',
    channelId: 'soouq_new_message',
    channelName: 'Messages',
  },
  'new-notification': {
    asset: require('../../assets/sounds/new_notification.mp3'),
    android: 'new_notification',
    ios: 'new_notification.mp3',
    channelId: 'soouq_new_notification',
    channelName: 'General alerts',
  },
  'order-accept': {
    asset: require('../../assets/sounds/order_accept.mp3'),
    android: 'order_accept',
    ios: 'order_accept.mp3',
    channelId: 'soouq_order_accept',
    channelName: 'Order accepted',
  },
  'order-complete': {
    asset: require('../../assets/sounds/order_complete.mp3'),
    android: 'order_complete',
    ios: 'order_complete.mp3',
    channelId: 'soouq_order_complete',
    channelName: 'Order completed',
  },
  'order-reject': {
    asset: require('../../assets/sounds/order_reject.wav'),
    android: 'order_reject',
    ios: 'order_reject.wav',
    channelId: 'soouq_order_reject',
    channelName: 'Order cancelled',
  },
  'order-status-change': {
    asset: require('../../assets/sounds/order_status_change.mp3'),
    android: 'order_status_change',
    ios: 'order_status_change.mp3',
    channelId: 'soouq_order_status',
    channelName: 'Order updates',
  },
  'add-to-cart': {
    asset: require('../../assets/sounds/add_to_cart.wav'),
    android: 'add_to_cart',
    ios: 'add_to_cart.wav',
    channelId: 'soouq_add_to_cart',
    channelName: 'Cart',
  },
};

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundKey = 'new-notification';

/** Map customer order status → ringtone. */
export function soundForOrderStatus(status: string): NotificationSoundKey {
  switch (status) {
    case 'payment_completed':
    case 'accepted':
    case 'processing':
      return 'order-accept';
    case 'delivered':
    case 'completed':
    case 'completed_closed':
    case 'picked_up':
    case 'pickedup':
      return 'order-complete';
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return 'order-reject';
    default:
      return 'order-status-change';
  }
}

/** Map in-app / FCM notification type (+ optional status) → ringtone. */
export function soundForNotificationType(
  type: string,
  status?: string | null,
): NotificationSoundKey {
  const upper = String(type || '').toUpperCase();
  const normalizedStatus = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (upper.includes('MESSAGE') || upper.includes('CHAT')) {
    return 'new-message';
  }

  if (upper.includes('ORDER') || upper.includes('PAYMENT') || upper.startsWith('STATUS_')) {
    if (normalizedStatus) {
      return soundForOrderStatus(normalizedStatus);
    }
    if (upper.includes('ACCEPT') || upper.includes('CONFIRM') || upper.includes('PLACED')) {
      return 'order-accept';
    }
    if (upper.includes('COMPLETE') || upper.includes('DELIVER')) {
      return 'order-complete';
    }
    if (upper.includes('REJECT') || upper.includes('CANCEL')) {
      return 'order-reject';
    }
    return 'order-status-change';
  }

  if (
    upper.includes('REFUND') ||
    upper.includes('EXCHANGE') ||
    upper.includes('REQUEST') ||
    upper.includes('COMPLAINT')
  ) {
    return 'new-notification';
  }

  return DEFAULT_NOTIFICATION_SOUND;
}

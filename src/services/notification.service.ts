import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';

export type AppNotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  title_ar?: string | null;
  body_ar?: string | null;
  data?: Record<string, any> | null;
  read_at?: string | null;
  created_at?: string;
};

export const NotificationService = {
  list(params?: { per_page?: number; unread_only?: boolean }) {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST, { params });
  },

  unreadCount() {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  },

  markRead(id: string | number) {
    return apiClient.post(ENDPOINTS.NOTIFICATIONS.READ(id));
  },

  markAllRead() {
    return apiClient.post(ENDPOINTS.NOTIFICATIONS.READ_ALL);
  },
};

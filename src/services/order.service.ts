import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';

export const OrderService = {
  list(params?: any) {
    return apiClient.get(ENDPOINTS.ORDERS.LIST, { params });
  },

  getDetails(id: string) {
    return apiClient.get(ENDPOINTS.ORDERS.DETAIL(id));
  },

  cancel(id: string, reason?: string) {
    return apiClient.post(`/orders/${id}/cancel`, { reason });
  },
};

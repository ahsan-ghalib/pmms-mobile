import axiosInstance from '../axios';

export const OrderRequestService = {
  getOrderRequests: async (params?: any) => {
    const response = await axiosInstance.get('/order-management/order-requests', { params });
    return response.data;
  },

  getOrderRequestDetails: async (id: string) => {
    const response = await axiosInstance.get(`/order-management/order-requests/${id}`);
    return response.data;
  },

  submitRefundRequest: async (data: any) => {
    const response = await axiosInstance.post('/order-management/order-requests/refund', data);
    return response.data;
  },

  submitExchangeRequest: async (data: any) => {
    const response = await axiosInstance.post('/order-management/order-requests/exchange', data);
    return response.data;
  },
};

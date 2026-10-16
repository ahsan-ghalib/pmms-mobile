import axiosInstance from './axios';

const apiClient = {
  get: async <T>(url: string, params?: any, config?: any) => {
    console.log(`Making GET request to ${url} with params:`, params); // Debug log
    const response = await axiosInstance.get<T>(url, { params, ...config });
    return response.data;
  },

  post: async <T>(url: string, data?: any, config?: any) => {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  put: async <T>(url: string, data?: any, config?: any) => {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  patch: async <T>(url: string, data?: any, config?: any) => {
    const response = await axiosInstance.patch<T>(url, data, config);
    return response.data;
  },

  delete: async <T>(url: string, config?: any) => {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

export default apiClient;

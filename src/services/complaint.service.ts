import axiosInstance from '../axios';

export const ComplaintService = {
  getComplaints: async () => {
    const response = await axiosInstance.get('/complaints');
    return response.data;
  },

  getComplaintDetails: async (id: string) => {
    const response = await axiosInstance.get(`/complaints/${id}`);
    return response.data;
  },

  createComplaint: async (data: any) => {
    const response = await axiosInstance.post('/complaints', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updatePendingComplaint: async (id: string, data: any) => {
    const response = await axiosInstance.post(`/complaints/${id}/update-pending`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getComplaintMessages: async (id: string, page: number = 1) => {
    const response = await axiosInstance.get(`/complaints/${id}/messages`, {
      params: { page },
    });
    return response.data;
  },

  sendComplaintMessage: async (id: string, data: FormData) => {
    const response = await axiosInstance.post(`/complaints/${id}/messages`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
    return response.data;
  },
};

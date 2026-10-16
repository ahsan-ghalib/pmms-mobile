import axiosInstance from '../axios';

export const ChatService = {
  getConversations: async (page = 1) => {
    const response = await axiosInstance.get(`/chat/conversations?page=${page}`);
    return response.data;
  },

  getMessages: async (conversationId: number, page = 1) => {
    const response = await axiosInstance.get(
      `/chat/conversations/${conversationId}/messages?page=${page}`,
    );
    return response.data;
  },

  storeConversation: async (storeId: number) => {
    const response = await axiosInstance.post(`/chat/conversations`, { store_id: storeId });
    return response.data;
  },

  sendMessage: async (conversationId: number, payload: FormData) => {
    const response = await axiosInstance.post(
      `/chat/conversations/${conversationId}/messages`,
      payload,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      },
    );
    return response.data;
  },
};

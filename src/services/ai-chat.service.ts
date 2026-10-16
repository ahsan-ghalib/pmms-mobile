import axiosInstance from '../axios';

export const AiChatService = {
  open: async () => {
    const response = await axiosInstance.get('/chat/ai');
    return response.data;
  },

  getMessages: async (conversationId: number, page = 1) => {
    const response = await axiosInstance.get(`/chat/ai/${conversationId}/messages`, {
      params: { page },
    });
    return response.data;
  },

  sendMessage: async (conversationId: number, body: string) => {
    const response = await axiosInstance.post(`/chat/ai/${conversationId}/messages`, { body });
    return response.data;
  },
};

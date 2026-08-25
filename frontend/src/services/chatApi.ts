import { apiClient } from './apiClient';

export const chatApi = {
  sendMessage: async (message: string, agent?: string) => {
    const res = await apiClient.post('/ai/chat', { message, agent });
    return res.data.data;
  },
  confirmCheckout: async () => {
    const res = await apiClient.post('/ai/chat/confirm');
    return res.data.data;
  }
};

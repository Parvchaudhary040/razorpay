import { apiClient } from './apiClient';

export const orderApi = {
  createOrder: async () => {
    const res = await apiClient.post('/orders');
    return res.data;
  },
  getOrder: async (id: string) => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data;
  },
  listOrders: async () => {
    const res = await apiClient.get('/orders');
    return res.data;
  }
};
import { apiClient } from './apiClient';

export const cartApi = {
  getCart: async () => {
    const res = await apiClient.get('/carts');
    return res.data;
  },
  addItem: async (productId: string, quantity: number) => {
    const res = await apiClient.post('/carts/items', { productId, quantity });
    return res.data;
  },
  updateItem: async (productId: string, quantity: number) => {
    const res = await apiClient.patch(`/carts/items/${productId}`, { quantity });
    return res.data;
  },
  removeItem: async (productId: string) => {
    const res = await apiClient.delete(`/carts/items/${productId}`);
    return res.data;
  },
  clearCart: async () => {
    const res = await apiClient.delete('/carts');
    return res.data;
  }
};
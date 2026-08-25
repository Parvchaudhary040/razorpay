import { apiClient } from './apiClient';

export const productApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const res = await apiClient.get('/products', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },
  search: async (q: string, filters?: { category?: string; minPrice?: number; maxPrice?: number; limit?: number }) => {
    const res = await apiClient.get('/products/search', { params: { q, ...filters } });
    return res.data;
  },
  compare: async (ids: string[]) => {
    const res = await apiClient.get('/products/compare', { params: { ids: ids.join(',') } });
    return res.data;
  }
};
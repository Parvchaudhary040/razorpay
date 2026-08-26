import { apiClient } from './apiClient';

export const auditApi = {
  getLogs: async () => {
    const res = await apiClient.get('/audit/logs');
    return res.data;
  }
};
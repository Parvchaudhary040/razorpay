import { apiClient } from './apiClient';

export const paymentApi = {
  initiate: async (orderId: string) => {
    const res = await apiClient.post('/payments/create', { orderId });
    return res.data;
  },
  verify: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const res = await apiClient.post('/payments/verify', payload);
    return res.data;
  },
  getPaymentDetails: async (paymentId: string) => {
    const res = await apiClient.get(`/payments/${paymentId}`);
    return res.data;
  }
};
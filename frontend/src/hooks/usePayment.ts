import { useState } from 'react';
import { paymentApi } from '../services/paymentApi';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const processPayment = async (
    orderId: string,
    onSuccess: (paymentResult: any) => void,
    onFailure: (err: any) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const initResponse = await paymentApi.initiate(orderId);
      const { razorpayOrderId, keyId, amount, currency } = initResponse.data;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'CommerceAI Store',
        description: `Payment for Order #${orderId.substring(0, 8)}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          setLoading(true);
          try {
            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };
            const verificationResult = await paymentApi.verify(verificationPayload);
            onSuccess(verificationResult);
          } catch (verifErr: any) {
            const verifMsg = verifErr.response?.data?.error?.message || 'Payment signature verification failed';
            setError(verifMsg);
            onFailure(new Error(verifMsg));
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: 'customer@example.com',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onFailure(new Error('Payment cancelled by user'));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(response.error.description);
        onFailure(new Error(response.error.description));
      });
      rzp.open();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Payment initiation failed';
      setError(errMsg);
      onFailure(new Error(errMsg));
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    processPayment,
  };
};
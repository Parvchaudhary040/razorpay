import React from 'react';
import { usePayment } from '../../hooks/usePayment';

interface RazorpayButtonProps {
  orderId: string;
  onSuccess: (result: any) => void;
  onFailure: (err: any) => void;
}

export const RazorpayButton: React.FC<RazorpayButtonProps> = ({ orderId, onSuccess, onFailure }) => {
  const { processPayment, loading, error } = usePayment();

  const handlePay = async () => {
    await processPayment(orderId, onSuccess, onFailure);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 py-3.5 rounded-xl font-extrabold text-sm shadow-xl shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
            Processing...
          </>
        ) : (
          'Pay with Razorpay 💳'
        )}
      </button>
    </div>
  );
};
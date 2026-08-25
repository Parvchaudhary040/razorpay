import React from 'react';
import { Link } from 'react-router-dom';

interface PaymentStatusProps {
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  message?: string;
  orderId?: string;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({ status, message, orderId }) => {
  const isSuccess = status === 'SUCCESS';

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-8 shadow-xl text-center space-y-6 max-w-md mx-auto animate-fadeIn">
      <div className="flex justify-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg border ${
            isSuccess
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {isSuccess ? '✓' : '✕'}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-100">
          {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
        </h2>
        <p className="text-sm text-slate-400">
          {message || (isSuccess ? 'Your transaction has been processed securely.' : 'We encountered an error processing your transaction.')}
        </p>
      </div>

      {orderId && (
        <div className="bg-[#1e1e2e] border border-slate-800 rounded-lg p-3 inline-block">
          <span className="text-xs text-slate-500">Order ID: </span>
          <span className="text-xs font-mono font-bold text-slate-300">{orderId}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        {orderId ? (
          <Link
            to={`/orders/${orderId}`}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold transition"
          >
            Track Order
          </Link>
        ) : (
          <Link
            to="/"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold transition"
          >
            Go to Assistant
          </Link>
        )}
        <Link
          to="/products"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};
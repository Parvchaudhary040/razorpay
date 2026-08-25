import React from 'react';
import { Order } from '../../types';

interface OrderStatusProps {
  status: Order['status'];
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const steps = [
    { label: 'Order Created', active: true, completed: true },
    { label: 'Payment Pending', active: status === 'PAYMENT_PENDING' || status === 'PAID', completed: status === 'PAID' },
    { label: 'Payment Processed', active: status === 'PAID', completed: status === 'PAID' },
  ];

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-md">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Status Tracker</h3>
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block z-0" />
        
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center md:flex-col gap-4 md:gap-2 z-10 w-full md:w-auto">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border ${
                step.completed
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : step.active
                  ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {step.completed ? '✓' : idx + 1}
            </div>
            <span
              className={`text-sm font-semibold ${
                step.active ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
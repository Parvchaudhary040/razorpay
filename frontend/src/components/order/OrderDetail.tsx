import React from 'react';
import { Order } from '../../types';

interface OrderDetailProps {
  order: Order & { items: any[] };
}

export const OrderDetail: React.FC<OrderDetailProps> = ({ order }) => {
  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Order #{order.id.substring(0, 8)}</h2>
          <p className="text-xs text-slate-500 mt-1">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-sm sm:text-right">
          <span className="text-slate-500">Status: </span>
          <span
            className={`font-semibold px-2.5 py-1 rounded-full text-xs uppercase tracking-wider ${
              order.status === 'PAID'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : order.status === 'PENDING' || order.status === 'PAYMENT_PENDING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {order.status}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items</h3>
        <div className="divide-y divide-slate-800">
          {order.items?.map((item) => (
            <div key={item.id} className="py-3 flex justify-between text-sm">
              <div>
                <h4 className="font-bold text-slate-200">{item.productName}</h4>
                <span className="text-xs text-slate-500 font-mono">Qty: {item.quantity}</span>
              </div>
              <span className="font-bold text-slate-200">
                ₹{Number(item.unit_price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-400">Total Amount</span>
        <span className="text-xl font-extrabold text-indigo-400">
          ₹{Number(order.totalAmount).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
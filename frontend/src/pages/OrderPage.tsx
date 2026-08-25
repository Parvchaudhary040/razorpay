import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../services/orderApi';
import { OrderDetail } from '../components/order/OrderDetail';
import { OrderStatus } from '../components/order/OrderStatus';
import { Order } from '../types';

export const OrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderApi.listOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to retrieve orders list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await orderApi.getOrder(id);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to retrieve order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
      const interval = setInterval(() => {
        if (order && order.status !== 'PAID' && order.status !== 'FAILED') {
          orderApi.getOrder(id).then((res) => {
            if (res.success) setOrder(res.data);
          }).catch(console.error);
        }
      }, 4000);
      return () => clearInterval(interval);
    } else {
      fetchAllOrders();
    }
  }, [id, order?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PENDING':
      case 'PAYMENT_PENDING':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  if (!id) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn font-sans">
        <div>
          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">My Purchase History</h1>
          <p className="text-sm text-slate-400">Verifiable trace of checkout completions and payments status</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-4 rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-indigo-400">
            <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-12 text-center shadow-md space-y-3">
            <span className="text-4xl block">📋</span>
            <h3 className="text-sm font-bold text-slate-300">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You haven't placed any orders yet. Ask our AI Assistant to help you checkout!
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1a26] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#14141f] border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="py-4 px-6">Order ID</th>
                    <th className="py-4 px-6">Date Placed</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Payment Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/10 transition">
                      <td className="py-4 px-6 font-mono text-indigo-400">{o.id}</td>
                      <td className="py-4 px-6">{new Date(o.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}</td>
                      <td className="py-4 px-6 font-bold text-slate-100">
                        ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/orders/${o.id}`}
                          className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 font-bold px-3 py-1.5 rounded transition text-[10px]"
                        >
                          Track Order ➔
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Order Details</h1>
        <p className="text-sm text-slate-400">Track order processing and payment verification lifecycle</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-4 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading && !order ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : !order ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          Order details could not be found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <OrderDetail order={order} />
          </div>
          <div className="md:col-span-1 space-y-6">
            <OrderStatus status={order.status} />
            <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 text-center shadow-md">
              <Link
                to="/"
                className="w-full block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition"
              >
                Back to Assistant 🤖
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
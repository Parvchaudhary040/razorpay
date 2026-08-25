import React, { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { orderApi } from '../services/orderApi';
import { RazorpayButton } from '../components/payment/RazorpayButton';
import { PaymentStatus } from '../components/payment/PaymentStatus';

export const CheckoutPage: React.FC = () => {
  const { cart, fetchCart } = useCart();
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [paymentState, setPaymentState] = useState<'IDLE' | 'SUCCESS' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleCheckoutInitiation = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await orderApi.createOrder();
      if (res.success) {
        setCreatedOrder(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create order. Verify stock availability.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (_result: any) => {
    setPaymentState('SUCCESS');
  };

  const handlePaymentFailure = (err: any) => {
    setPaymentState('FAILED');
    setErrorMsg(err.message || 'Payment failed.');
  };

  if (paymentState === 'SUCCESS') {
    return (
      <div className="py-12">
        <PaymentStatus status="SUCCESS" orderId={createdOrder?.id} />
      </div>
    );
  }

  if (paymentState === 'FAILED') {
    return (
      <div className="py-12 space-y-6">
        <PaymentStatus status="FAILED" message={errorMsg} orderId={createdOrder?.id} />
        <div className="text-center">
          <button
            onClick={() => setPaymentState('IDLE')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-4 py-2 rounded-lg font-semibold transition"
          >
            Retry Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Secure Checkout</h1>
        <p className="text-sm text-slate-400">Complete your payment securely with Razorpay Test Mode</p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-4 rounded-xl text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      {!createdOrder ? (
        <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <h3 className="text-base font-bold text-slate-200">Confirm Order Creation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            By proceeding, you will close your active shopping cart and lock the items inside a pending order.
          </p>

          <div className="flex justify-between border-t border-slate-800 pt-4">
            <span className="text-sm text-slate-400">Cart Total</span>
            <span className="text-base font-bold text-indigo-400">₹{(cart?.total || 0).toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckoutInitiation}
            disabled={loading || !cart || cart.items.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 py-3 rounded-xl font-bold text-sm transition"
          >
            {loading ? 'Creating Order...' : 'Confirm Order Details'}
          </button>
        </div>
      ) : (
        <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Order Locked</h3>
              <span className="text-[10px] text-slate-500">ID: {createdOrder.id.substring(0, 8)}</span>
            </div>
            <span className="text-lg font-black text-indigo-400 font-mono">
              ₹{Number(createdOrder.total_amount || createdOrder.totalAmount).toLocaleString()}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Your order is created in <span className="font-semibold text-slate-200">PENDING</span> state. Proceed to complete payment.
          </p>

          <RazorpayButton
            orderId={createdOrder.id}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
          />
        </div>
      )}
    </div>
  );
};
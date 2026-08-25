import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cart } from '../../types';

interface CartSummaryProps {
  cart: Cart;
}

export const CartSummary: React.FC<CartSummaryProps> = ({ cart }) => {
  const navigate = useNavigate();

  const subtotal = cart.total;
  const shipping = 0;
  const orderTotal = subtotal + shipping;

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
      <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Order Summary</h3>

      <div className="space-y-4 text-sm text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Subtotal ({cart.itemCount} items)</span>
          <span className="font-semibold text-slate-200">₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Shipping</span>
          <span className="font-semibold text-emerald-400">FREE</span>
        </div>
        <div className="flex justify-between border-t border-slate-800 pt-4 text-base">
          <span className="font-bold text-slate-100">Order Total</span>
          <span className="font-extrabold text-indigo-400 text-lg">₹{orderTotal.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/checkout')}
        disabled={cart.itemCount === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition duration-200"
      >
        Proceed to Checkout
      </button>
    </div>
  );
};
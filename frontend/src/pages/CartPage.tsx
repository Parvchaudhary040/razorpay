import React, { useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { CartItem } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { Link } from 'react-router-dom';

export const CartPage: React.FC = () => {
  const { cart, isLoading, fetchCart, clearCart } = useCart();

  useEffect(() => {
    fetchCart();
  }, []);

  const hasItems = cart && cart.items && cart.items.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Shopping Cart</h1>
        <p className="text-sm text-slate-400">Review your chosen items before proceeding to checkout</p>
      </div>

      {isLoading && !cart ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : !hasItems ? (
        <div className="bg-[#2a2a3e] border border-slate-800 rounded-2xl p-12 text-center space-y-6 shadow-md">
          <div className="text-5xl">🛒</div>
          <h2 className="text-lg font-bold text-slate-300">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't added any products to your shopping cart yet. Speak to our AI Assistant to find recommendations!
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition duration-200"
            >
              Start Chatting 🤖
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-[#1a1a26] p-4 rounded-xl border border-slate-800">
              <span className="text-sm font-semibold text-slate-300">
                Cart Items ({cart.itemCount})
              </span>
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                Clear Cart
              </button>
            </div>

            <div className="space-y-4">
              {cart.items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <CartSummary cart={cart} />
          </div>
        </div>
      )}
    </div>
  );
};
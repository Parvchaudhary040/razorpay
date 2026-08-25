import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useCart } from '../../hooks/useCart';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const { clearChat, messages } = useChat();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNewChat = () => {
    clearChat();
    navigate('/');
  };

  const cartCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-[#14141f] border-r border-slate-800 flex flex-col hidden md:flex flex-shrink-0 font-sans">
      <div className="p-4 border-b border-slate-800/60">
        <button
          onClick={handleNewChat}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
        >
          <span>＋</span> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Navigation</h3>
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/') 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span>🤖</span> AI Assistant
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/products') 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span>📦</span> All Products
              </Link>
            </li>
            <li>
              <Link
                to="/cart"
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/cart') 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>🛒</span> Shopping Cart
                </div>
                {cartCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/orders"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/orders') 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span>📋</span> My Orders
              </Link>
            </li>
            <li>
              <Link
                to="/audit"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/audit') 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span>🛡️</span> Security Audits
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Conversations</h3>
          <div className="space-y-1">
            {messages.length > 0 ? (
              <button
                onClick={() => navigate('/')}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/20 border border-slate-800/40 hover:bg-slate-800/40 transition"
              >
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                <span className="truncate">Active Commerce Session</span>
              </button>
            ) : (
              <div className="text-xs text-slate-600 px-3 py-2 italic">
                No active session
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800/60 bg-[#101018]/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
          {role?.charAt(0).toUpperCase() || 'C'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-200 truncate">Customer Session</div>
          <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
            {role || 'Customer'}
          </div>
        </div>
      </div>
    </aside>
  );
};
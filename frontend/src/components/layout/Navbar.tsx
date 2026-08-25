import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout, role } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const badgeCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <nav className="bg-[#1a1a26] border-b border-slate-800 text-slate-100 py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-bold tracking-wider text-indigo-400 hover:text-indigo-300 transition flex items-center gap-2">
          <span className="text-2xl font-black">⚡</span> CommerceAI
        </Link>
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-indigo-400 transition-colors">AI Assistant</Link>
            <Link to="/products" className="hover:text-indigo-400 transition-colors">Products</Link>
            <Link to="/audit" className="hover:text-indigo-400 transition-colors">Audit Trail</Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            {role === 'ADMIN' && (
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold uppercase">
                Admin
              </span>
            )}
            <Link to="/cart" className="relative p-2 text-slate-300 hover:text-indigo-400 transition">
              🛒
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {badgeCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium transition"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LetterGlitch from '../components/LetterGlitch';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localRole, setLocalRole] = useState('CUSTOMER');
  const [localError, setLocalError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('All fields are required');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, localRole);
      }
      navigate('/');
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 bg-[#0f0f1a] overflow-hidden">
      {/* Background LetterGlitch Animation */}
      <div className="absolute inset-0 z-0 opacity-40">
        <LetterGlitch
          glitchColors={['#4f46e5', '#818cf8', '#c084fc']}
          glitchSpeed={40}
          centerVignette={true}
          outerVignette={true}
          smooth={true}
          backgroundColor="#0f0f1a"
        />
      </div>

      {/* Back to landing */}
      <button
        onClick={() => navigate('/welcome')}
        className="relative z-10 mb-6 flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-300 transition group backdrop-blur-md bg-[#1e1e2e]/50 px-4 py-2 rounded-full border border-slate-800/60"
      >
        <svg
          className="w-4 h-4 transition group-hover:-translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      <div className="relative z-10 bg-[#1e1e2e]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-black text-slate-100 tracking-wider cursor-pointer hover:text-indigo-400 transition"
            onClick={() => navigate('/welcome')}
          >
            ⚡ COMMERCEAI
          </h1>
          <p className="text-sm text-slate-400">
            {isLogin ? 'Sign in to access your AI assistant' : 'Create an account to start shopping'}
          </p>
        </div>

        <div className="flex bg-[#1e1e2e] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setLocalError(''); }}
            className={`w-1/2 py-2 rounded-lg font-semibold text-sm transition ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setLocalError(''); }}
            className={`w-1/2 py-2 rounded-lg font-semibold text-sm transition ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {localError && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-4 rounded-xl text-xs font-semibold">
            ⚠️ {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none placeholder-slate-600"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Account Role
              </label>
              <select
                value={localRole}
                onChange={(e) => setLocalRole(e.target.value)}
                className="w-full bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-3 text-sm text-slate-200 outline-none"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 py-3 rounded-xl font-bold text-sm transition duration-200 shadow-lg shadow-indigo-500/20"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};
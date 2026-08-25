import { useState } from 'react';
import { authApi } from '../services/authApi';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { userId, role, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user.id, data.user.role.toUpperCase(), data.accessToken);
      return data.user;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Login failed';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, role = 'CUSTOMER') => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register(email, password, role);
      setAuth(data.user.id, data.user.role.toUpperCase(), data.accessToken);
      return data.user;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const data = await authApi.getCurrentUser();
      if (data.user) {
        const currentToken = useAuthStore.getState().accessToken || '';
        setAuth(data.user.id, data.user.role.toUpperCase(), currentToken);
      }
    } catch (err) {
      clearAuth();
    }
  };

  return {
    userId,
    role,
    accessToken,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    checkSession,
  };
};
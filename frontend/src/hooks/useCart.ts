import { useCartStore } from '../store/cartStore';
import { cartApi } from '../services/cartApi';

export const useCart = () => {
  const { cart, isLoading, setCart, setLoading } = useCartStore();

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await cartApi.getCart();
      setCart(res.data);
    } catch (err) {
      console.error('Fetch cart error', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productId: string, quantity: number) => {
    setLoading(true);
    try {
      const res = await cartApi.addItem(productId, quantity);
      setCart(res.data);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to add item';
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (productId: string, quantity: number) => {
    setLoading(true);
    try {
      if (quantity === 0) {
        const res = await cartApi.removeItem(productId);
        setCart(res.data);
      } else {
        const res = await cartApi.updateItem(productId, quantity);
        setCart(res.data);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to update item';
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    setLoading(true);
    try {
      const res = await cartApi.removeItem(productId);
      setCart(res.data);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to remove item';
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const res = await cartApi.clearCart();
      setCart(res.data);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to clear cart';
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    cart,
    isLoading,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  };
};
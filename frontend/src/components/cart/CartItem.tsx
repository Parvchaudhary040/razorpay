import React from 'react';
import { CartItem as CartItemType } from '../../types';
import { useCart } from '../../hooks/useCart';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateItem, removeItem, isLoading } = useCart();

  const handleQtyChange = async (newQty: number) => {
    if (newQty < 0) return;
    try {
      await updateItem(item.productId, newQty);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async () => {
    try {
      await removeItem(item.productId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#2a2a3e] border border-slate-800 rounded-xl p-4 md:p-6 shadow-md hover:border-slate-700 transition">
      <div className="flex-grow pr-4">
        <h4 className="text-base font-bold text-slate-200">{item.product?.name || (item as any).name || (item as any).productName || 'Unknown Product'}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md line-clamp-2">{item.product?.description || (item as any).productDescription || ''}</p>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-sm font-bold text-indigo-400">
            ₹{Number(item.unitPrice ?? (item as any).price ?? 0).toLocaleString()} each
          </span>
          <span className="text-xs text-slate-500">
            In stock: {item.product?.inventoryCount ?? (item as any).inventoryCount ?? 0}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="flex items-center bg-[#1e1e2e] border border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() => handleQtyChange(item.quantity - 1)}
            disabled={isLoading || item.quantity <= 1}
            className="px-3 py-1.5 text-slate-400 hover:text-slate-200 disabled:text-slate-600 transition"
          >
            -
          </button>
          <span className="px-4 py-1 text-sm font-semibold text-slate-200 font-mono">
            {item.quantity}
          </span>
          <button
            onClick={() => handleQtyChange(item.quantity + 1)}
            disabled={isLoading || item.quantity >= (item.product?.inventoryCount ?? (item as any).inventoryCount ?? 0)}
            className="px-3 py-1.5 text-slate-400 hover:text-slate-200 disabled:text-slate-600 transition"
          >
            +
          </button>
        </div>

        <div className="text-right w-24">
          <div className="text-sm font-extrabold text-slate-100">
            ₹{Number(item.unitPrice * item.quantity).toLocaleString()}
          </div>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="text-xs text-red-400 hover:text-red-300 font-semibold mt-1 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
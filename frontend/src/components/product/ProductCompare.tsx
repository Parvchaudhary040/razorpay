import React from 'react';
import { Product } from '../../types';

interface ProductCompareProps {
  products: Product[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export const ProductCompare: React.FC<ProductCompareProps> = ({ products, onRemove, onClose }) => {
  if (products.length === 0) return null;

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-2xl mb-8 relative">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
          <span>📊</span> Compare Products ({products.length})
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg p-1.5 transition"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {products.map((p, idx) => (
          <div key={p.id} className={`flex flex-col justify-between ${idx > 0 ? 'md:pl-6' : ''}`}>
            <div>
              <div className="flex justify-between items-start gap-4 mb-2">
                <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-semibold">
                  {p.category}
                </span>
                <button
                  onClick={() => onRemove(p.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Remove
                </button>
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{p.name}</h3>
              <p className="text-xs text-slate-400 mb-4 line-clamp-4">{p.description}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/40">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Price</span>
                <span className="font-bold text-slate-200">₹{Number(p.price).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Availability</span>
                <span className={`font-semibold ${p.inventoryCount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.inventoryCount > 0 ? 'In Stock' : 'Out Of Stock'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Stock Count</span>
                <span className="text-slate-200 font-mono">{p.inventoryCount} units</span>
              </div>
            </div>
          </div>
        ))}

        {products.length < 4 &&
          Array.from({ length: 4 - products.length }).map((_, i) => (
            <div key={`empty-${i}`} className="hidden md:flex flex-col items-center justify-center p-6 text-slate-600 border-dashed border-2 border-slate-800 rounded-xl">
              <span className="text-xs font-semibold">Add product to compare</span>
            </div>
          ))}
      </div>
    </div>
  );
};
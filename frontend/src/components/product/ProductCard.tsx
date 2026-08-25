import React from 'react';
import { Product } from '../../types';
import { useCart } from '../../hooks/useCart';

interface ProductCardProps {
  product: Product & { specifications?: any };
  onCompareToggle?: (id: string) => void;
  isCompared?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onCompareToggle, isCompared }) => {
  const { addItem, isLoading } = useCart();

  const handleAddToCart = async () => {
    try {
      await addItem(product.id, 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isOutOfStock = product.inventoryCount === 0;

  const specs = product.specifications || {};
  const ram = specs.ram || specs.RAM || specs.memory || 'N/A';
  const processor = specs.processor || specs.cpu || specs.CPU || 'N/A';
  const rating = specs.rating || 4.5;

  const getGradientForCategory = (cat: string) => {
    const name = cat?.toLowerCase() || '';
    if (name.includes('laptop')) return 'from-blue-600 to-indigo-600';
    if (name.includes('headphone') || name.includes('audio')) return 'from-purple-600 to-pink-600';
    if (name.includes('phone') || name.includes('mobile')) return 'from-teal-600 to-emerald-600';
    return 'from-indigo-600 to-purple-600';
  };

  const getIconForCategory = (cat: string) => {
    const name = cat?.toLowerCase() || '';
    if (name.includes('laptop')) return '💻';
    if (name.includes('headphone') || name.includes('audio')) return '🎧';
    if (name.includes('phone') || name.includes('mobile')) return '📱';
    return '📦';
  };

  return (
    <div className="bg-[#2a2a3e] border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 flex flex-col h-full group">
      <div className={`h-40 bg-gradient-to-br ${getGradientForCategory(product.category)} relative flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition duration-300"></div>
        <span className="text-5xl group-hover:scale-110 transition duration-300 transform select-none">
          {getIconForCategory(product.category)}
        </span>
        <span className="absolute top-3 left-3 text-[10px] font-bold text-white/95 uppercase tracking-widest bg-black/35 px-2.5 py-1 rounded-full backdrop-blur-sm">
          {product.category}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-extrabold text-base text-slate-100 group-hover:text-indigo-400 transition duration-200 line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
            ★ {rating}
          </div>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-grow">
          {product.description}
        </p>

        <div className="grid grid-cols-2 gap-2.5 bg-[#232334] p-3 rounded-xl border border-slate-800/80 mb-4 text-[11px]">
          <div>
            <span className="text-slate-500 block mb-0.5 font-medium uppercase tracking-wider text-[9px]">RAM</span>
            <span className="text-slate-300 font-semibold">{ram}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5 font-medium uppercase tracking-wider text-[9px]">Processor</span>
            <span className="text-slate-300 font-semibold truncate block">{processor}</span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Price</div>
            <div className="text-lg font-black text-slate-100">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Availability</div>
            <div className={`text-xs font-bold ${isOutOfStock ? 'text-red-400' : 'text-emerald-400'}`}>
              {isOutOfStock ? 'Out of Stock' : `${product.inventoryCount} units`}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#232334] border-t border-slate-800/40 flex gap-2">
        {onCompareToggle && (
          <button
            onClick={() => onCompareToggle(product.id)}
            className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
              isCompared
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                : 'border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-indigo-400'
            }`}
          >
            {isCompared ? '✓ Added' : 'Compare'}
          </button>
        )}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isLoading}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition duration-200 ${
            isOutOfStock
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-600/25'
          }`}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart 🛒'}
        </button>
      </div>
    </div>
  );
};
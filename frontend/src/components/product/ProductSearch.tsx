import React, { useState } from 'react';

interface ProductSearchProps {
  onSearch: (filters: any) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query: query || undefined,
      category: category || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#2a2a3e] border border-slate-800 rounded-xl p-6 shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Search Products</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, spec..."
            className="w-full bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none"
          >
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="apparel">Apparel</option>
            <option value="home">Home & Living</option>
            <option value="fitness">Fitness & Sports</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Price Range (Min - Max)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-1/2 bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-1/2 bg-[#1e1e2e] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between h-11">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded bg-[#1e1e2e] border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span>In Stock Only</span>
          </label>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-md transition duration-200"
          >
            Apply
          </button>
        </div>
      </div>
    </form>
  );
};
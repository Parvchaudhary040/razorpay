import React, { useEffect, useState } from 'react';
import { productApi } from '../services/productApi';
import { ProductCard } from '../components/product/ProductCard';
import { ProductSearch } from '../components/product/ProductSearch';
import { ProductCompare } from '../components/product/ProductCompare';
import { Product } from '../types';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [filters, setFilters] = useState<any>({ page: 1, limit: 8 });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { query, ...listFilters } = filters;
      const res = query
        ? await productApi.search(query, listFilters)
        : await productApi.list(listFilters);
      if (res.success) {
        setProducts(res.data);
        setPagination(query ? {} : res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const handleSearch = (newFilters: any) => {
    setFilters({
      page: 1,
      limit: 8,
      ...newFilters,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev: any) => ({ ...prev, page: newPage }));
  };

  const handleCompareToggle = (id: string) => {
    setCompareIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx > -1) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 4) {
          alert('You can compare a maximum of 4 products.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  useEffect(() => {
    if (compareIds.length > 0) {
      productApi.compare(compareIds).then((res) => {
        if (res.data) setCompareProducts(res.data);
      }).catch(console.error);
    } else {
      setCompareProducts([]);
    }
  }, [compareIds]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Product Catalog</h1>
          <p className="text-sm text-slate-400">Discover and compare the best specs in our inventory</p>
        </div>
      </div>

      <ProductSearch onSearch={handleSearch} />

      {compareProducts.length > 0 && (
        <ProductCompare
          products={compareProducts}
          onRemove={(id) => handleCompareToggle(id)}
          onClose={() => setCompareIds([])}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          No products matched your search filters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onCompareToggle={handleCompareToggle}
                isCompared={compareIds.includes(p.id)}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400 px-4">
                Page <span className="text-slate-200 font-bold">{pagination.page}</span> of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

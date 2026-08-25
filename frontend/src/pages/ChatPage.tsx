import React, { useState, useEffect } from 'react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCompare } from '../components/product/ProductCompare';
import { productApi } from '../services/productApi';
import { Product } from '../types';

export const ChatPage: React.FC = () => {
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    productApi.list({ limit: 4 }).then((res) => {
      if (res.data) setRecommendedProducts(res.data);
    }).catch(console.error);
  }, []);

  const handleCompareToggle = (id: string) => {
    setCompareIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx > -1) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 4) {
          alert('You can compare a maximum of 4 products side-by-side.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  useEffect(() => {
    if (compareIds.length > 0) {
      productApi.compare(compareIds).then((res) => {
        if (res.data) {
          setCompareProducts(res.data);
          setIsComparing(true);
        }
      }).catch(console.error);
    } else {
      setCompareProducts([]);
      setIsComparing(false);
    }
  }, [compareIds]);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 p-6">
      <div className="flex-grow lg:w-3/5 h-full">
        <ChatWindow />
      </div>

      <div className="lg:w-2/5 flex flex-col h-full overflow-y-auto space-y-6">
        {isComparing && (
          <ProductCompare
            products={compareProducts}
            onRemove={(id) => handleCompareToggle(id)}
            onClose={() => setCompareIds([])}
          />
        )}

        <div className="bg-[#2a2a3e] border border-slate-800 rounded-2xl p-6 shadow-xl flex-grow">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span>✨</span> Recommended Spotlight
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onCompareToggle={handleCompareToggle}
                isCompared={compareIds.includes(p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
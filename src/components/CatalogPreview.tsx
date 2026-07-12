'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Eye, Sparkles } from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';
import { useCartStore } from '@/store/cartStore';

export default function CatalogPreview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await dbService.getProducts();
        // Show up to 6 items (3x2 grid)
        setProducts(data.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleAddToCart = (e: React.MouseEvent, prod: Product) => {
    e.preventDefault();
    addItem({
      productId: prod.id,
      name: prod.name,
      slug: prod.slug,
      make: prod.make,
      weight: prod.weight,
      price: prod.price,
      currency: prod.currency,
      image: prod.images[0] || '/hero_bg.png',
    });
  };

  return (
    <section className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-navy">
                Our SAMS Solutions
              </span>
            </div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy">
              Automatic Fire Extinguishers
            </h2>
            <p className="text-sm text-gray-500 font-light max-w-md">
              Hover over our premium self-activating products to explore their specifications and secure your spaces.
            </p>
          </div>
          <Link 
            href="/catalog" 
            className="text-xs font-bold uppercase tracking-wider text-fire hover:text-navy border-b-2 border-fire hover:border-navy pb-1 transition-all"
          >
            Browse Full Catalog
          </Link>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-gray-150 aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto justify-center">
            {products.map((prod) => (
              <div 
                key={prod.id} 
                className="group relative aspect-[3/4] bg-gray-150 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-200/50 hover:border-fire/20 transition-all duration-500 flex flex-col justify-end"
              >
                {/* Full Vertical Image */}
                <Image 
                  src={prod.images[0] || '/hero_bg.png'} 
                  alt={prod.name}
                  fill
                  sizes="(max-w-768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Premium Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500 z-0" />

                {/* Featured Badge */}
                {prod.is_featured && (
                  <span className="absolute top-4 left-4 bg-fire text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded flex items-center gap-1 shadow-md z-10">
                    <Sparkles className="w-3 h-3 text-white" />
                    Featured
                  </span>
                )}

                {/* Animating Content Info Block */}
                <div className="relative z-10 p-6 space-y-3 text-white flex flex-col justify-end">
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                    <span>Make: {prod.make}</span>
                    <span className="h-3 w-px bg-white/20" />
                    <span>Life: {prod.life_years} Yrs</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide leading-tight group-hover:text-fire-400 transition-colors line-clamp-1">
                    <Link href={`/catalog/${prod.slug}`}>
                      {prod.name}
                    </Link>
                  </h3>

                  {/* Expandable Description (CSS Grid Transition) */}
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 opacity-0 group-hover:opacity-100">
                    <div className="overflow-hidden">
                      <p className="text-xs text-gray-300 font-light leading-relaxed mb-1 pt-1 line-clamp-3">
                        {prod.short_description}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-405 uppercase tracking-widest block font-medium">OMR Price (30% OFF)</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-white">
                          {Number(prod.price).toFixed(3)} <span className="text-[10px] font-semibold">{prod.currency}</span>
                        </span>
                        <span className="text-xs text-gray-400 line-through font-light">
                          {(Number(prod.price) / 0.70).toFixed(3)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/catalog/${prod.slug}`}
                        className="bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-md border border-white/20 transition-colors text-center"
                      >
                        Details
                      </Link>
                      <button 
                        onClick={(e) => handleAddToCart(e, prod)}
                        className="bg-fire hover:bg-fire/90 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-md flex items-center gap-1 transition-all shadow-md active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

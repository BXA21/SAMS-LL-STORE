'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

export default function CartDrawer() {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    updateQuantity, 
    removeItem, 
    getTotalAmount, 
    getItemCount 
  } = useCartStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when cart drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black z-50 cursor-pointer"
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-white shadow-2xl z-50 flex flex-col h-full text-gray-900"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-fire" />
                <h2 className="font-display text-lg uppercase tracking-wider font-bold">
                  Your Shopping Cart
                </h2>
                <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  {getItemCount()} items
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="bg-gray-50 p-4 rounded-full text-gray-400">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold uppercase tracking-wider">
                      Your cart is empty
                    </p>
                    <p className="text-sm text-gray-500 max-w-[250px]">
                      Add some automatic fire safety products to get started.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded-md transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex gap-4 border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    {/* Image */}
                    <div className="relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                      <Image 
                        src={item.image} 
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-display text-sm font-semibold tracking-wide uppercase hover:text-fire transition-colors line-clamp-1">
                          <Link href={`/catalog/${item.slug}`} onClick={() => setIsOpen(false)}>
                            {item.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-500">
                          Brand: {item.make} | Weight: {item.weight}
                        </p>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-md">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-navy">
                            {(item.price * item.quantity).toFixed(3)} {item.currency}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-fire transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{getTotalAmount().toFixed(3)} OMR</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Estimated Total</span>
                    <span>{getTotalAmount().toFixed(3)} OMR</span>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center pt-1 leading-normal">
                    * Final order validation and secure Paymob invoice calculation takes place during checkout.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Link 
                    href="/checkout"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-fire hover:bg-fire/90 text-white py-3 rounded-md text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all group"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs text-navy hover:text-fire font-semibold uppercase tracking-wider py-2 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

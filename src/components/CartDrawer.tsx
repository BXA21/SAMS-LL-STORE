'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cartItemName, cartItemWeight, useCartStore } from '@/store/cartStore';
import { useHydrated } from '@/lib/useHydrated';
import { useLocale, useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { siteMessages } from '@/i18n/messages/site';
import { formatPrice } from '@/i18n/format';

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

  const mounted = useHydrated();
  const locale = useLocale();
  const href = useLocalePath();
  const t = useMessages(siteMessages).cart;
  // The drawer enters from the reading-end edge: right in English, left in Arabic.
  const offscreen = locale === 'ar' ? '-100%' : '100%';

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
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: 'tween', duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label={t.title}
            className="fixed end-0 top-0 bottom-0 w-full sm:w-[450px] bg-white shadow-2xl z-50 flex flex-col h-full text-gray-900"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-fire" />
                <h2 className="font-display text-lg uppercase tracking-wider font-bold">
                  {t.title}
                </h2>
                <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  {t.items(getItemCount())}
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                aria-label={t.close}
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
                      {t.emptyTitle}
                    </p>
                    <p className="text-sm text-gray-500 max-w-[250px]">
                      {t.emptyBody}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded-md transition-colors"
                  >
                    {t.startShopping}
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex gap-4 border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    {/* Image */}
                    <div className="relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                      <Image 
                        src={item.image} 
                        alt={cartItemName(item, locale)}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-display text-sm font-semibold tracking-wide uppercase hover:text-fire transition-colors line-clamp-1">
                          <Link href={href(`/catalog/${item.slug}`)} onClick={() => setIsOpen(false)}>
                            {cartItemName(item, locale)}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-500">
                          {t.brandWeight(item.make, cartItemWeight(item, locale))}
                        </p>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-md">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                            aria-label={t.decrease}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                            aria-label={t.increase}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-navy">
                            {formatPrice(item.price * item.quantity, locale, item.currency)}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-fire transition-colors"
                            aria-label={t.remove}
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
                    <span>{t.subtotal}</span>
                    <span>{formatPrice(getTotalAmount(), locale)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>{t.estimatedTotal}</span>
                    <span>{formatPrice(getTotalAmount(), locale)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center pt-1 leading-normal">
                    {t.finalNote}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Link 
                    href={href('/checkout')}
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-fire hover:bg-fire/90 text-white py-3 rounded-md text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all group"
                  >
                    {t.checkout}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs text-navy hover:text-fire font-semibold uppercase tracking-wider py-2 transition-colors"
                  >
                    {t.continueShopping}
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

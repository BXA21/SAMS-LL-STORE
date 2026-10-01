'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  ShoppingCart,
  MessageSquare,
  ShieldCheck,
  Clock,
  Weight,
  Calendar,
  AlertCircle,
  PhoneCall
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Product, type ProductAvailability } from '@/types/database';
import { cartItemFromProduct, useCartStore } from '@/store/cartStore';
import { useLocale, useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { localizeProduct } from '@/i18n/content';
import { formatPrice } from '@/i18n/format';
import { catalogMessages } from '@/i18n/messages/catalog';

interface ProductDetailClientProps {
  slug: string;
  /*
   * Resolved on the server so the product name, price, description and
   * images are in the HTML. This page previously rendered a skeleton until
   * the client bundle had loaded and fetched, which meant search engines,
   * link previews and anyone without working JavaScript saw no product.
   */
  initialProduct: Product | null;
  initialRelatedProducts: Product[];
}

type DetailTab = 'overview' | 'features' | 'specs' | 'safety';

export default function ProductDetailClient({
  slug,
  initialProduct,
  initialRelatedProducts,
}: ProductDetailClientProps) {
  const locale = useLocale();
  const href = useLocalePath();
  const { detail: t, breadcrumb: tb } = useMessages(catalogMessages);

  // Raw rows (English columns + translations) so the cart receives both languages.
  const [rawProduct, setRawProduct] = useState<Product | null>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>(initialRelatedProducts);
  const [quantity, setQuantity] = useState(1);
  // Stock availability from the server (no exact counts); null = unknown / not loaded.
  const [availability, setAvailability] = useState<ProductAvailability | null>(null);
  const outOfStock = availability === 'out_of_stock';
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const addItem = useCartStore((state) => state.addItem);
  const [selectedImage, setSelectedImage] = useState<string>(
    initialProduct?.images[0] || '/hero_bg.png'
  );

  /*
   * Refresh after mount to pick up admin edits held in this browser's local
   * storage. Never clears the server-rendered product.
   */
  useEffect(() => {
    let cancelled = false;
    async function refreshProductData() {
      try {
        const prod = await dbService.getProductBySlug(slug);
        if (cancelled || !prod) return;
        setRawProduct(prod);
        setSelectedImage(prod.images[0] || '/hero_bg.png');

        const availabilityMap = await dbService.getProductAvailability();
        if (cancelled) return;
        setAvailability(availabilityMap[prod.slug] ?? null);

        const allProds = await dbService.getProducts();
        if (cancelled) return;
        setRelatedProducts(
          allProds
            .filter((p) => p.id !== prod.id && p.category_id === prod.category_id)
            .slice(0, 3)
        );
      } catch (err) {
        console.error('Error refreshing product:', err);
      }
    }
    refreshProductData();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!rawProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6 text-gray-900">
        <AlertCircle className="w-16 h-16 text-fire mx-auto" aria-hidden="true" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">{t.notFoundTitle}</h1>
        <p className="text-gray-505 font-light max-w-md mx-auto">
          {t.notFoundBody}
        </p>
        <Link
          href={href('/catalog')}
          className="inline-block bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-md transition-colors"
        >
          {t.backToCatalog}
        </Link>
      </div>
    );
  }

  const product = localizeProduct(rawProduct, locale);

  const handleAddToCart = () => {
    addItem(cartItemFromProduct(rawProduct), quantity);
  };

  // Setup dynamic WhatsApp link
  const whatsAppText = encodeURIComponent(
    t.whatsAppMessage(product.name, product.make, formatPrice(Number(product.price), locale, product.currency))
  );
  const whatsAppLink = `https://wa.me/96877554070?text=${whatsAppText}`;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: t.tabOverview },
    { id: 'features', label: t.tabFeatures },
    { id: 'specs', label: t.tabSpecs },
    { id: 'safety', label: t.tabSafety },
  ];

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24 pt-20">
      {/* Breadcrumb banner */}
      <div className="bg-light-grey py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label={tb.label} className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
            <Link href={href('/')} className="hover:text-fire transition-colors">{tb.home}</Link>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <Link href={href('/catalog')} className="hover:text-fire transition-colors">{tb.catalog}</Link>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Main Product Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* START: IMAGE GALLERY */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <Image
                src={selectedImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Gallery Thumbnails (if multiple images exist) */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    aria-label={t.thumbnail(i + 1)}
                    aria-pressed={selectedImage === img}
                    className={`relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border transition-all ${
                      selectedImage === img ? 'border-fire ring-2 ring-fire/10' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Image src={img} alt={t.thumbnail(i + 1)} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* END: DETAILS & ACTIONS */}
          <div className="space-y-8">
            <div className="space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-navy/10 text-navy text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                  {t.makeBadge(product.make)}
                </span>
                <span className="bg-fire/10 text-fire text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.activeSafety}
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy leading-none">
                {product.name}
              </h1>

              <p className="text-gray-500 font-light text-sm">
                {t.productType(product.product_type)}
              </p>
            </div>

            {/* Price Box */}
            <div className="bg-light-grey p-6 rounded-2xl border border-gray-150 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-450 uppercase tracking-widest font-semibold block">{t.sellingPrice}</span>
                <span className="bg-fire/15 text-fire text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded">{t.discount}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-extrabold text-navy">
                  {formatPrice(Number(product.price), locale, product.currency)}
                </div>
                <div className="text-sm text-gray-450 line-through font-semibold">
                  {formatPrice(Number(product.price) / 0.70, locale, product.currency)}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 block font-light">
                {t.priceNote}
              </span>
            </div>

            {/* Highlights Bar */}
            <div className="grid grid-cols-3 gap-4 border-y border-gray-150 py-4 text-center">
              <div className="space-y-1">
                <Weight className="w-5 h-5 text-fire mx-auto" aria-hidden="true" />
                <span className="text-[9px] uppercase text-gray-400 tracking-wider font-semibold block">{t.netWeight}</span>
                <span className="text-xs font-bold text-navy">{product.weight}</span>
              </div>
              <div className="space-y-1 border-x border-gray-150">
                <Clock className="w-5 h-5 text-fire mx-auto" aria-hidden="true" />
                <span className="text-[9px] uppercase text-gray-400 tracking-wider font-semibold block">{t.activationTime}</span>
                <span className="text-xs font-bold text-navy">{t.activationValue}</span>
              </div>
              <div className="space-y-1">
                <Calendar className="w-5 h-5 text-fire mx-auto" aria-hidden="true" />
                <span className="text-[9px] uppercase text-gray-400 tracking-wider font-semibold block">{t.productLife}</span>
                <span className="text-xs font-bold text-navy">{t.years(product.life_years)}</span>
              </div>
            </div>

            {/* Quantity Selector and Cart Action */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-md" role="group" aria-label={t.quantity}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2.5 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors font-bold text-lg"
                    aria-label={t.decrease}
                  >
                    -
                  </button>
                  <span className="px-5 font-semibold text-sm" aria-live="polite">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(1000, quantity + 1))}
                    className="px-3.5 py-2.5 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors font-bold text-lg"
                    aria-label={t.increase}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="flex-grow bg-fire hover:bg-fire/90 disabled:bg-gray-300 disabled:hover:scale-100 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-md shadow-fire/15"
                >
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                  {outOfStock ? t.outOfStock : t.addToCart}
                </button>
              </div>

              {availability && availability !== 'available' && (
                <p
                  role="status"
                  className={`text-xs font-semibold ${
                    availability === 'out_of_stock' ? 'text-fire' : availability === 'low_stock' ? 'text-safety' : 'text-green-700'
                  }`}
                >
                  {availability === 'out_of_stock'
                    ? t.outOfStockNote
                    : availability === 'low_stock'
                      ? t.lowStockNote
                      : t.inStockNote}
                </p>
              )}

              {/* Enquiry & WhatsApp CTA Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Link
                  href={href(`/contact?product=${product.slug}&quantity=${quantity}`)}
                  className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-4 rounded-md flex items-center justify-center gap-2 border border-navy transition-colors"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  {t.requestQuote}
                </Link>

                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" aria-hidden="true" />
                  {t.whatsApp}
                </a>
              </div>
            </div>

            {/* Usage Area list in Details column */}
            {product.best_for && product.best_for.length > 0 && (
              <div className="space-y-3 pt-4">
                <h4 className="text-xs uppercase tracking-widest font-bold text-gray-700">{t.bestFor}</h4>
                <div className="flex flex-wrap gap-2">
                  {product.best_for.map((bf, idx) => (
                    <span
                      key={idx}
                      className="bg-light-grey border border-gray-150 text-gray-700 text-xs px-3 py-1 rounded-full font-medium"
                    >
                      {bf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABS: DETAILED INFORMATION */}
        <div className="mt-20 border-t border-gray-150 pt-10">
          <div
            role="tablist"
            aria-label={t.tabsLabel}
            className="flex border-b border-gray-200 overflow-x-auto text-sm uppercase tracking-wider font-semibold whitespace-nowrap scrollbar-none gap-8"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 border-b-2 transition-all ${
                  activeTab === tab.id ? 'border-fire text-fire font-bold' : 'border-transparent text-gray-400 hover:text-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-8 min-h-[200px]" role="tabpanel">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 max-w-3xl text-sm sm:text-base text-gray-650 font-light leading-relaxed">
                <h3 className="font-display text-xl uppercase font-bold text-navy">{t.overviewHeading}</h3>
                <p>{product.overview}</p>
                <p>
                  {t.overviewExtra}
                </p>
              </div>
            )}

            {/* Features */}
            {activeTab === 'features' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="font-display text-xl uppercase font-bold text-navy mb-4">{t.featuresHeading}</h3>
                <ul className="space-y-2.5">
                  {product.key_features && product.key_features.map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-sm text-gray-600 font-light">
                      <span className="h-2 w-2 rounded-full bg-fire shrink-0 mt-2" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {activeTab === 'specs' && (
              <div className="max-w-2xl">
                <h3 className="font-display text-xl uppercase font-bold text-navy mb-4">{t.specsHeading}</h3>
                <div className="border border-gray-150 rounded-xl overflow-hidden">
                  {Object.entries(product.specifications || {}).map(([key, val], idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-2 p-4 text-sm ${
                        idx % 2 === 0 ? 'bg-light-grey/50' : 'bg-white'
                      } border-b border-gray-150 last:border-0`}
                    >
                      <span className="font-semibold text-navy uppercase tracking-wider text-[10px] sm:text-xs">{key}</span>
                      <span className="text-gray-600 font-light">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Guidelines */}
            {activeTab === 'safety' && (
              <div className="space-y-6 max-w-3xl">
                <h3 className="font-display text-xl uppercase font-bold text-navy">{t.safetyHeading}</h3>
                <ul className="space-y-3">
                  {product.safety_notes && product.safety_notes.map((note, i) => (
                    <li key={i} className="flex gap-3 items-start text-sm text-gray-650 font-light leading-relaxed">
                      <AlertCircle className="w-5 h-5 text-fire shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-gray-150 pt-16">
            <h2 className="font-display text-2xl uppercase tracking-wider font-bold text-navy mb-8">
              {t.relatedHeading}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProducts.map((raw) => {
                const prod = localizeProduct(raw, locale);
                return (
                  <div
                    key={prod.id}
                    className="group bg-light-grey rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden shrink-0 border-b border-gray-100">
                      <Image
                        src={prod.images[0] || '/hero_bg.png'}
                        alt={prod.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold uppercase tracking-wide text-navy group-hover:text-fire transition-colors truncate">
                          <Link href={href(`/catalog/${prod.slug}`)}>
                            {prod.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {prod.short_description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-extrabold text-navy">
                            {formatPrice(Number(prod.price), locale, prod.currency)}
                          </span>
                          <span className="text-[10px] text-gray-400 line-through font-medium">
                            {(Number(prod.price) / 0.70).toFixed(3)}
                          </span>
                        </div>
                        <Link
                          href={href(`/catalog/${prod.slug}`)}
                          className="text-xs uppercase tracking-widest font-bold text-fire hover:text-navy transition-colors"
                        >
                          {t.details}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

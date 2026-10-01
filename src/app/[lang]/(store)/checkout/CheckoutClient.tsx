'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShoppingBag,
  CreditCard,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { cartItemName, cartItemWeight, useCartStore } from '@/store/cartStore';
import { dbService, type CheckoutCustomer } from '@/services/dbService';
import { useLocale, useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { checkoutMessages, localizedApiError } from '@/i18n/messages/checkout';
import { formatPrice } from '@/i18n/format';

type ValidationMessages = (typeof checkoutMessages)['en']['validation'];

// Mirrors the server-side schema in src/lib/validation.ts for inline errors.
function buildCheckoutSchema(v: ValidationMessages) {
  return z.object({
    fullName: z.string().trim().min(3, { message: v.fullName }).max(120, { message: v.tooLong }),
    email: z.string().trim().email({ message: v.email }).max(254, { message: v.tooLong }),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, { message: v.phone }),
    address: z.string().trim().min(10, { message: v.address }).max(500, { message: v.tooLong }),
    companyName: z.string().max(160, { message: v.tooLong }).optional(),
    notes: z.string().max(2000, { message: v.tooLong }).optional(),
    flow: z.enum(['online', 'manual']),
    deliveryAcknowledged: z.boolean().optional(),
  }).refine((values) => values.flow !== 'online' || values.deliveryAcknowledged === true, {
    path: ['deliveryAcknowledged'],
    message: v.deliveryAcknowledged,
  });
}

type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>;

interface QuotationResult {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
}

export default function CheckoutClient({ onlinePaymentEnabled }: { onlinePaymentEnabled: boolean }) {
  const { items, getTotalAmount, clearCart } = useCartStore();
  const locale = useLocale();
  const t = useMessages(checkoutMessages);
  const href = useLocalePath();
  const checkoutSchema = useMemo(() => buildCheckoutSchema(t.validation), [t]);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<QuotationResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // One key per checkout attempt: a double click or resubmit cannot create a second order.
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      flow: onlinePaymentEnabled ? 'online' : 'manual',
    }
  });

  const selectedFlow = watch('flow');

  if (!mounted) return null;

  // Empty Cart Handling
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6 text-gray-900">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">{t.empty.title}</h1>
        <p className="text-gray-550 font-light max-w-sm mx-auto">
          {t.empty.body}
        </p>
        <Link
          href={href('/catalog')} 
          className="inline-block bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-md transition-colors"
        >
          {t.empty.cta}
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    setCheckoutError(null);
    const customer: CheckoutCustomer = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      address: values.address,
      companyName: values.companyName || undefined,
      notes: values.notes || undefined,
    };
    const lines = items.map((item) => ({ slug: item.slug, quantity: item.quantity }));

    try {
      if (values.flow === 'online') {
        // Prices are recalculated on the server; the cart only sends products and quantities.
        const { paymentUrl } = await dbService.startCardPayment(customer, lines, checkoutKey);
        // The cart is kept until Paymob confirms payment, so a declined card loses nothing.
        window.location.assign(paymentUrl);
        return;
      }

      const quote = await dbService.submitQuotation(customer, lines);
      setOrderSuccess({ orderNumber: quote.orderNumber, customerName: values.fullName, totalAmount: quote.totalAmount });
      clearCart();
    } catch (err) {
      setCheckoutError(localizedApiError(t.errors, locale, err));
      // A new attempt gets a new key (the failed one may already be recorded).
      setCheckoutKey(crypto.randomUUID());
    }
    setIsSubmitting(false);
  };

  if (orderSuccess) {
    return (
      <div className="bg-white min-h-screen text-gray-900 py-20 flex items-center">
        <div className="max-w-xl mx-auto px-6 text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
            {t.quoteSuccess.title}
          </h1>
          <div className="bg-light-grey p-6 rounded-xl border border-gray-150 text-start text-sm space-y-3 font-light">
            <p><strong>{t.quoteSuccess.reference}</strong> <span dir="ltr">{orderSuccess.orderNumber}</span></p>
            <p><strong>{t.quoteSuccess.customer}</strong> {orderSuccess.customerName}</p>
            <p><strong>{t.quoteSuccess.total}</strong> {formatPrice(orderSuccess.totalAmount, locale)}</p>
            <p className="text-gray-500 pt-1 leading-relaxed">
              {t.quoteSuccess.body}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
            <Link
              href={href('/catalog')}
              className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-8 py-3 rounded-md transition-colors"
            >
              {t.quoteSuccess.continueShopping}
            </Link>
            <Link
              href={href('/')} 
              className="text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-navy px-8 py-3 border border-gray-200 rounded-md transition-colors"
            >
              {t.quoteSuccess.home}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24 pt-20">
      {/* Breadcrumbs Banner */}
      <div className="bg-light-grey py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
            <Link href={href('/catalog')} className="hover:text-fire transition-colors flex items-center gap-1 font-semibold text-navy">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t.backToCatalog}
            </Link>
          </div>
          <span className="text-xs uppercase font-bold text-gray-400">{t.portal}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy mb-8">
          {t.heading}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT: BILLING DETAILS FORM (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {checkoutError && (
              <div className="bg-red-50 border border-red-200 text-fire p-4 rounded-lg flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Checkout Flow Selection */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.orderType}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Manual Flow */}
                  <label className={`border-2 rounded-xl p-5 flex items-start gap-3 cursor-pointer transition-all ${
                    selectedFlow === 'manual'
                      ? 'border-fire bg-light-grey/30'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}>
                    <input
                      type="radio"
                      value="manual"
                      {...register('flow')}
                      className="accent-fire w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm font-bold text-navy">
                        <FileText className="w-4 h-4 text-fire" />
                        <span>{t.manualTitle}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        {t.manualBody}
                      </p>
                    </div>
                  </label>

                  {/* Online Flow: Paymob card payment when configured, otherwise shown as unavailable */}
                  {onlinePaymentEnabled ? (
                  <label className={`border-2 rounded-xl p-5 flex items-start gap-3 cursor-pointer transition-all ${
                    selectedFlow === 'online'
                      ? 'border-fire bg-light-grey/30'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}>
                    <input
                      type="radio"
                      value="online"
                      {...register('flow')}
                      className="accent-fire w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm font-bold text-navy">
                        <CreditCard className="w-4 h-4 text-fire" />
                        <span>{t.onlineTitle}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        {t.onlineBodyBefore}<strong>Paymob</strong>{t.onlineBodyAfter}
                      </p>
                    </div>
                  </label>
                  ) : (
                  <div className="border-2 border-gray-200/50 rounded-xl p-5 flex items-start gap-3 bg-gray-50/50 opacity-60 filter blur-[1px] relative cursor-not-allowed select-none pointer-events-none">
                    <div className="absolute top-3 end-3 bg-navy text-white text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                      <Lock className="w-2.5 h-2.5" />
                      {t.locked}
                    </div>
                    <input
                      type="radio"
                      disabled
                      value="online"
                      className="w-4 h-4 mt-0.5 shrink-0 accent-gray-400"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-450">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span>{t.offlineTitle}</span>
                      </div>
                      <p className="text-xs text-gray-450 font-light leading-relaxed">
                        {t.offlineBodyBefore}<strong>Paymob</strong>{t.offlineBodyAfter}
                      </p>
                    </div>
                  </div>
                  )}

                </div>
              </div>

              {/* Customer Details Form */}
              <div className="bg-light-grey/50 p-6 rounded-2xl border border-gray-150 space-y-4">
                <h3 className="font-display text-lg uppercase tracking-wider font-bold text-navy border-b border-gray-150 pb-2">
                  {t.detailsHeading}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.fullName}</label>
                    <input
                      type="text"
                      {...register('fullName')}
                      placeholder={t.fields.fullNamePlaceholder}
                      className={`w-full bg-white border ${
                        errors.fullName ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.email}</label>
                    <input
                      type="email"
                      dir="ltr"
                      {...register('email')}
                      placeholder={t.fields.emailPlaceholder}
                      className={`w-full bg-white border ${
                        errors.email ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.phone}</label>
                    <input
                      type="tel"
                      dir="ltr"
                      {...register('phone')}
                      placeholder={t.fields.phonePlaceholder}
                      className={`w-full bg-white border ${
                        errors.phone ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.company}</label>
                    <input
                      type="text"
                      {...register('companyName')}
                      placeholder={t.fields.companyPlaceholder}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-fire text-gray-800"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.address}</label>
                  <textarea
                    rows={3}
                    {...register('address')}
                    placeholder={t.fields.addressPlaceholder}
                    className={`w-full bg-white border ${
                      errors.address ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                    } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                  />
                  {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">{t.fields.notes}</label>
                  <textarea
                    rows={2}
                    {...register('notes')}
                    placeholder={t.fields.notesPlaceholder}
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-fire text-gray-800"
                  />
                </div>
              </div>

              {selectedFlow === 'online' && (
                <div className="space-y-1.5">
                  <label className="flex items-start gap-3 bg-light-grey/60 border border-gray-200 rounded-xl p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('deliveryAcknowledged')}
                      className="accent-fire w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-gray-700 leading-relaxed">
                      {t.ackBefore}<strong>{t.ackStrong}</strong>{t.ackAfter}
                    </span>
                  </label>
                  {errors.deliveryAcknowledged && (
                    <p className="text-xs text-red-500 font-medium">{errors.deliveryAcknowledged.message}</p>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-fire hover:bg-fire/90 disabled:bg-gray-400 text-white text-xs uppercase tracking-widest font-bold py-4 rounded-md flex items-center justify-center gap-2 transition-all shadow-md shadow-fire/15 hover:scale-[1.01] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.submitting}
                  </>
                ) : selectedFlow === 'online' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    {t.submitOnline}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    {t.submitManual}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: ORDER ITEMS SUMMARY (5 cols) */}
          <div className="lg:col-span-5 bg-light-grey p-6 rounded-2xl border border-gray-150 space-y-6">
            <h2 className="font-display text-lg uppercase tracking-wider font-bold text-navy border-b border-gray-150 pb-2">
              {t.summary}
            </h2>

            {/* Cart list items */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pe-1">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="relative w-12 h-12 rounded bg-gray-50 border overflow-hidden shrink-0">
                    <Image src={item.image} alt={cartItemName(item, locale)} fill className="object-cover" />
                  </div>
                  <div className="flex-1 flex justify-between gap-4">
                    <div className="space-y-0.5 text-xs font-semibold">
                      <p className="text-gray-900 line-clamp-1 uppercase tracking-wide">{cartItemName(item, locale)}</p>
                      <p className="text-gray-400 font-light">{t.qtyWeight(item.quantity, cartItemWeight(item, locale))}</p>
                    </div>
                    <span className="text-xs font-extrabold text-navy whitespace-nowrap">
                      {formatPrice(item.price * item.quantity, locale, item.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-150 pt-4 space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.subtotal}</span>
                <span>{formatPrice(getTotalAmount(), locale)}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.shipping}</span>
                  <span className="text-fire font-bold uppercase tracking-wider text-[10px]">{t.calculatedLater}</span>
                </div>
                <p className="text-[10px] text-gray-400 font-light leading-normal">
                  {t.shippingNote}
                </p>
              </div>
              <div className="flex justify-between text-base font-extrabold text-navy pt-1">
                <span>{t.payableNow}</span>
                <span>{formatPrice(getTotalAmount(), locale)}</span>
              </div>
              <p className="text-[9px] text-gray-400 text-end font-light italic">
                {t.excludesDelivery}
              </p>
            </div>

            {/* Safety Callout */}
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-[10px] text-gray-500 leading-normal font-light space-y-1">
              <span className="text-fire font-bold uppercase tracking-wider block">{t.noticeHeading}</span>
              <p>
                {t.noticeBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

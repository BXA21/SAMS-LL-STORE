'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, PhoneCall, Loader2, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLocale, useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { checkoutMessages } from '@/i18n/messages/checkout';
import { formatPrice } from '@/i18n/format';

interface OrderStatus {
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
}

type View = 'loading' | 'paid' | 'pending' | 'failed' | 'unknown';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 12;

function viewFor(order: OrderStatus): View {
  // Only server-confirmed payment states count; nothing here comes from the URL.
  if (order.payment_status === 'successful' || order.payment_status === 'partially_refunded') return 'paid';
  if (order.payment_status === 'failed' || order.status === 'failed' || order.payment_status === 'cancelled') return 'failed';
  if (order.payment_status === 'refunded' || order.payment_status === 'voided') return 'unknown';
  return 'pending';
}

function ResultContent() {
  const clearCart = useCartStore((s) => s.clearCart);
  const locale = useLocale();
  const t = useMessages(checkoutMessages).result;
  const href = useLocalePath();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [view, setView] = useState<View>('loading');

  useEffect(() => {
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      polls += 1;
      try {
        const res = await fetch('/api/orders/status', { method: 'POST', cache: 'no-store', credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.data) {
          setView('unknown');
          return;
        }
        const next = json.data as OrderStatus;
        const nextView = viewFor(next);
        setOrder(next);
        setView(nextView);
        if (nextView === 'paid') clearCart();
        // Paymob's server callback can land a few seconds after the redirect.
        if (nextView === 'pending' && polls < MAX_POLLS) timer = setTimeout(load, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setView('unknown');
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [clearCart]);

  const whatsappText = encodeURIComponent(
    order ? t.whatsappWithOrder(order.order_number) : t.whatsappGeneric
  );

  return (
    <div className="bg-white min-h-[70vh] flex items-center py-20 text-gray-900 pt-28">
      <div className="max-w-xl mx-auto px-6 text-center space-y-6" aria-live="polite">
        {view === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-fire mx-auto animate-spin" />
            <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">{t.loadingTitle}</h1>
            <p className="text-sm font-light text-gray-500">{t.loadingBody}</p>
          </>
        )}

        {view === 'pending' && (
          <>
            <Clock className="w-16 h-16 text-safety mx-auto" />
            <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">{t.pendingTitle}</h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              {t.pendingBefore}<strong className="font-semibold text-navy" dir="ltr">{order?.order_number}</strong>{t.pendingAfter}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md transition-colors"
            >
              {t.checkAgain}
            </button>
          </>
        )}

        {view === 'paid' && order && (
          <>
            <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">{t.paidTitle}</h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              {t.paidBody}
            </p>

            <div className="bg-light-grey p-6 rounded-xl border border-gray-150 text-start text-xs sm:text-sm space-y-2.5 font-light">
              <div className="flex justify-between">
                <span className="text-gray-500">{t.orderNumber}</span>
                <span className="font-mono font-bold text-navy" dir="ltr">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.amountPaid}</span>
                <span className="font-bold text-navy">{formatPrice(order.total_amount, locale, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.paymentStatus}</span>
                <span className="text-green-600 font-bold uppercase tracking-wider text-[10px] mt-0.5">{t.paidVerified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t.gateway}</span>
                <span className="font-semibold text-gray-700">{t.gatewayName}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-450 leading-relaxed font-light">
              {t.keepNumber}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={href('/orders')}
                className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                {t.trackOrder}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <a
                href={`https://wa.me/96877554070?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                {t.contact}
              </a>
            </div>
          </>
        )}

        {(view === 'failed' || view === 'unknown') && (
          <>
            <XCircle className="w-20 h-20 text-fire mx-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
              {view === 'failed' ? t.failedTitle : t.unknownTitle}
            </h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              {view === 'failed' ? t.failedBody : t.unknownBody}
            </p>

            <div className="bg-red-50/50 border border-red-150 p-5 rounded-xl text-start text-xs sm:text-sm space-y-2 font-light text-red-800">
              <p className="font-bold uppercase tracking-wider text-[10px] text-fire">{t.stepsHeading}</p>
              <ul className="list-disc ps-4 space-y-1">
                {t.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={href('/checkout')}
                className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md transition-colors"
              >
                {t.tryAgain}
              </Link>
              <a
                href={`https://wa.me/96877554070?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-light-grey text-gray-700 hover:text-navy text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md border border-gray-200 transition-colors"
              >
                {t.contact}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResultClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 animate-pulse text-fire" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

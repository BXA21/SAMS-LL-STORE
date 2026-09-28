'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, PhoneCall, Loader2, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

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
  if (order.payment_status === 'successful') return 'paid';
  if (order.payment_status === 'failed' || order.status === 'failed' || order.payment_status === 'cancelled') return 'failed';
  return 'pending';
}

function ResultContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const tokenValid = /^[a-f0-9]{48}$/.test(token);
  const clearCart = useCartStore((s) => s.clearCart);
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loadedView, setView] = useState<View>('loading');
  const view: View = tokenValid ? loadedView : 'unknown';

  useEffect(() => {
    if (!tokenValid) return;

    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      polls += 1;
      try {
        const res = await fetch(`/api/orders/status?token=${token}`, { cache: 'no-store' });
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
  }, [token, tokenValid, clearCart]);

  const whatsappText = encodeURIComponent(
    order ? `Hello SAMS LLC, I have a question about my order ${order.order_number}.` : 'Hello SAMS LLC, I have a question about my online order.'
  );

  return (
    <div className="bg-white min-h-[70vh] flex items-center py-20 text-gray-900 pt-28">
      <div className="max-w-xl mx-auto px-6 text-center space-y-6" aria-live="polite">
        {view === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-fire mx-auto animate-spin" />
            <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">Confirming your payment</h1>
            <p className="text-sm font-light text-gray-500">Please keep this page open for a moment.</p>
          </>
        )}

        {view === 'pending' && (
          <>
            <Clock className="w-16 h-16 text-safety mx-auto" />
            <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">Payment being confirmed</h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              We are waiting for the bank to confirm order <strong className="font-semibold text-navy">{order?.order_number}</strong>.
              This usually takes a few seconds. You will not be charged twice; please do not pay again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md transition-colors"
            >
              Check again
            </button>
          </>
        )}

        {view === 'paid' && order && (
          <>
            <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">Payment Successful</h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              Your payment was confirmed by Paymob and your order is registered with SAMS LLC.
            </p>

            <div className="bg-light-grey p-6 rounded-xl border border-gray-150 text-left text-xs sm:text-sm space-y-2.5 font-light">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Number:</span>
                <span className="font-mono font-bold text-navy">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid:</span>
                <span className="font-bold text-navy">{Number(order.total_amount).toFixed(3)} {order.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="text-green-600 font-bold uppercase tracking-wider text-[10px] mt-0.5">Paid / Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Gateway:</span>
                <span className="font-semibold text-gray-700">Paymob Oman</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-450 leading-relaxed font-light">
              Keep your order number to track your delivery. A representative will contact you by phone or WhatsApp to arrange
              delivery; delivery charges depend on your governorate.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/orders"
                className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                Track Order
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`https://wa.me/96877554070?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                Contact SAMS
              </a>
            </div>
          </>
        )}

        {(view === 'failed' || view === 'unknown') && (
          <>
            <XCircle className="w-20 h-20 text-fire mx-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
              {view === 'failed' ? 'Payment Not Completed' : 'We could not find this payment'}
            </h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              {view === 'failed'
                ? 'The payment was declined or cancelled, and you have not been charged. Your cart is still saved so you can try again.'
                : 'If you completed a payment, contact us with the time of payment and we will confirm it for you.'}
            </p>

            <div className="bg-red-50/50 border border-red-150 p-5 rounded-xl text-left text-xs sm:text-sm space-y-2 font-light text-red-800">
              <p className="font-bold uppercase tracking-wider text-[10px] text-fire">Suggested Steps:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Check the card number, expiry date and CVV.</li>
                <li>Make sure online payments are enabled on your card and the balance or limit allows it.</li>
                <li>Submit a quotation request to pay by bank transfer or on delivery instead.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/checkout"
                className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md transition-colors"
              >
                Try Again
              </Link>
              <a
                href={`https://wa.me/96877554070?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-light-grey text-gray-700 hover:text-navy text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md border border-gray-200 transition-colors"
              >
                Contact SAMS
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResultPage() {
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

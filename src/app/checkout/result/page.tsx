'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, PhoneCall } from 'lucide-react';

function ResultContent() {
  const searchParams = useSearchParams();

  const success = searchParams.get('success') === 'true';
  const transactionId = searchParams.get('transactionId') || 'N/A';
  const orderId = searchParams.get('orderId') || 'N/A';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-white min-h-[70vh] flex items-center py-20 text-gray-900 pt-28">
      <div className="max-w-xl mx-auto px-6 text-center space-y-6">
        
        {success ? (
          /* SUCCESS STATE */
          <>
            <div className="animate-bounce">
              <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
              Payment Successful!
            </h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              Your online payment has been confirmed and verified. SAMS LLC has registered your order and reserved your automatic fire safety items.
            </p>

            <div className="bg-light-grey p-6 rounded-xl border border-gray-150 text-left text-xs sm:text-sm space-y-2.5 font-light">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-mono font-bold text-navy">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-mono text-gray-700">{transactionId}</span>
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
              * A representative will contact you via phone or WhatsApp within 24 hours to schedule local courier delivery.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/catalog"
                className="bg-navy hover:bg-navy/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/96890000000?text=Hello%20SAMS%20LLC,%20I%20have%20just%20completed%20an%2520online%2520order%2520with%2520Invoice%2520ID:%2520"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                Contact SAMS
              </a>
            </div>
          </>
        ) : (
          /* FAILURE STATE */
          <>
            <XCircle className="w-20 h-20 text-fire mx-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
              Payment Failed / Cancelled
            </h1>
            <p className="text-sm font-light text-gray-500 max-w-md mx-auto leading-relaxed">
              We were unable to process your transaction. This can happen due to incorrect card details, insufficient funds, or connection timeouts.
            </p>

            <div className="bg-red-50/50 border border-red-150 p-5 rounded-xl text-left text-xs sm:text-sm space-y-2 font-light text-red-800">
              <p className="font-bold uppercase tracking-wider text-[10px] text-fire">Suggested Steps:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Verify your credit/debit card number and CVV.</li>
                <li>Check your available balance or bank limits.</li>
                <li>Submit a manual quotation inquiry if card problems persist.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/checkout"
                className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md transition-colors"
              >
                Retry Payment
              </Link>
              <Link
                href="/contact"
                className="bg-light-grey text-gray-700 hover:text-navy text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded-md border border-gray-200 transition-colors"
              >
                Request Offline Quote
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <ShoppingBag className="w-10 h-10 animate-pulse text-fire" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Shield, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

function SimulateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('orderId') || 'unknown';
  const amount = searchParams.get('amount') || '0.000';

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerWebhook = async (success: boolean) => {
    setIsProcessing(true);
    try {
      // 1. Post to webhook endpoint
      const webRes = await fetch('/api/paymob/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_simulated: true,
          orderId: orderId,
          success: success
        })
      });

      if (!webRes.ok) {
        throw new Error('Simulation webhook trigger failed');
      }

      // 2. Redirect to Return endpoint (which handles frontend redirect)
      const returnUrl = `/api/paymob/return?id=sim_txn_${Math.floor(Math.random()*900000+100000)}&success=${success}&pending=false&merchant_order_id=${orderId}`;
      router.push(returnUrl);

    } catch (error) {
      console.error(error);
      alert('Simulation error. Please check server logs.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-gray-900">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-gray-250 shadow-lg">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center text-fire">
            <CreditCard className="w-12 h-12" />
          </div>
          <h2 className="font-display text-2xl uppercase tracking-wider font-extrabold text-navy">
            Paymob Sandbox Simulator
          </h2>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
            SAMS LLC Payment Gateway Testing
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-light-grey p-4 rounded-xl border border-gray-150 text-sm space-y-1.5 font-light">
          <div className="flex justify-between">
            <span className="text-gray-500">Merchant:</span>
            <span className="font-semibold text-navy">SAMS Fire Safety LLC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Invoice ID:</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-205 pt-2 mt-2">
            <span>Total Price:</span>
            <span className="text-fire">{amount} OMR</span>
          </div>
        </div>

        {/* Dummy Card Input */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Card Number</label>
            <input
              type="text"
              placeholder="4000 1234 5678 9010"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,''))}
              maxLength={16}
              disabled={isProcessing}
              className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-navy text-gray-800 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                maxLength={5}
                disabled={isProcessing}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-navy text-gray-800 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">CVV</label>
              <input
                type="password"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g,''))}
                maxLength={3}
                disabled={isProcessing}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-navy text-gray-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => triggerWebhook(true)}
            disabled={isProcessing}
            className="w-full bg-navy hover:bg-navy/95 disabled:bg-gray-400 text-white text-xs uppercase tracking-widest font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Pay Successfully (Simulate Success)
              </>
            )}
          </button>

          <button
            onClick={() => triggerWebhook(false)}
            disabled={isProcessing}
            className="w-full bg-white hover:bg-red-50 disabled:bg-gray-400 text-fire text-xs uppercase tracking-widest font-bold py-3 border border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Decline Payment (Simulate Failure)
              </>
            )}
          </button>
        </div>

        {/* Security Info */}
        <div className="flex gap-2 items-center justify-center text-[10px] text-gray-400 pt-2 border-t border-gray-150">
          <Shield className="w-3.5 h-3.5 text-green-600" />
          <span>SSL Secure 128-bit Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}

export default function SimulatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fire" />
      </div>
    }>
      <SimulateContent />
    </Suspense>
  );
}

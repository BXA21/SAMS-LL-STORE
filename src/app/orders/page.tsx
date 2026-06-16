'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Calendar, Clock, Package, Truck, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Order } from '@/types/database';

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Masks customer name for privacy (e.g. Mohsin Abbas -> M**** A****)
  const maskText = (text: string, type: 'name' | 'email' | 'address') => {
    if (!text) return 'N/A';
    if (type === 'name') {
      return text.split(' ').map(p => p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : p[0]).join(' ');
    }
    if (type === 'email') {
      const parts = text.split('@');
      if (parts.length < 2) return '***';
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] : name[0] + '*';
      return `${maskedName}@${domain}`;
    }
    if (type === 'address') {
      return text.length > 12 ? text.substring(0, 6) + '...' + text.substring(text.length - 4) : '***';
    }
    return '***';
  };

  // Oman Logistics estimated delivery calculation
  // Delivery takes 1 to 3 business days
  // SAMS operates Sunday to Thursday, 10:00 AM to 5:00 PM
  const calculateOmanDelivery = (createdAtStr: string) => {
    const createdDate = new Date(createdAtStr);
    
    // Oman is UTC+4. In JS we calculate dates in UTC/local. Let's work with days.
    // Sunday is 0, Monday is 1, Tuesday is 2, Wednesday is 3, Thursday is 4, Friday is 5, Saturday is 6.
    let day = createdDate.getDay();
    let hour = createdDate.getHours();

    let processingStartDay = new Date(createdDate);

    // Determine processing start day
    const isWorkday = day >= 0 && day <= 4; // Sun-Thu
    const isWorkHour = hour >= 10 && hour < 17;

    if (isWorkday && isWorkHour) {
      // Starts today
    } else {
      // Find next working day
      do {
        processingStartDay.setDate(processingStartDay.getDate() + 1);
        day = processingStartDay.getDay();
      } while (day === 5 || day === 6); // Skip Friday/Saturday
      
      processingStartDay.setHours(10, 0, 0, 0);
    }

    // Add business days (Sunday to Thursday)
    const addBusinessDays = (startDate: Date, daysToAdd: number) => {
      const result = new Date(startDate);
      let added = 0;
      while (added < daysToAdd) {
        result.setDate(result.getDate() + 1);
        const currentDay = result.getDay();
        if (currentDay !== 5 && currentDay !== 6) {
          added++;
        }
      }
      return result;
    };

    const minDeliveryDate = addBusinessDays(processingStartDay, 1);
    const maxDeliveryDate = addBusinessDays(processingStartDay, 3);

    const formatDate = (d: Date) => {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return {
      range: `${formatDate(minDeliveryDate)} - ${formatDate(maxDeliveryDate)}`,
      workHoursNotice: "SAMS deliveries occur Sunday to Thursday, between 10:00 AM and 5:00 PM (Oman Standard Time)."
    };
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !emailInput.trim()) {
      setErrorMsg('Please enter both Order ID and Email Address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSearched(true);
    setOrder(null);

    try {
      const allOrders = await dbService.getOrders();
      const matched = allOrders.find(
        o => o.id.toLowerCase().trim() === orderId.toLowerCase().trim() && 
             o.email.toLowerCase().trim() === emailInput.toLowerCase().trim()
      );

      if (matched) {
        setOrder(matched);
      } else {
        setErrorMsg('No order found with the provided ID and email. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg('Error searching order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Map database status string to active tracking index
  // placement (Placed) -> processing (Processing) -> shipping (Shipped) -> delivered (Completed)
  const getStatusIndex = (status: string) => {
    switch (status) {
      case 'placement':
      case 'pending_payment':
      case 'pending':
        return 0;
      case 'processing':
      case 'paid':
      case 'manual_inquiry':
        return 1;
      case 'shipping':
        return 2;
      case 'delivered':
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const statusIndex = order ? getStatusIndex(order.status) : 0;
  const deliveryEstimate = order ? calculateOmanDelivery(order.created_at) : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 pt-20">
      
      {/* Decorative Title Banner */}
      <div className="bg-navy text-white py-16 text-center space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(228,33,38,0.15),transparent_40%)]" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-wider relative z-10">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 font-light max-w-md mx-auto relative z-10 px-4 leading-relaxed">
          Monitor your SAMS automatic fire suppression delivery status and estimated arrival timeline in Oman.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        
        {/* Lookup Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-150 shadow-xl space-y-6">
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5 space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Order ID / Reference</label>
              <input
                type="text"
                required
                placeholder="e.g. 5x8a2b..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-800"
              />
            </div>

            <div className="sm:col-span-5 space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. customer@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer h-[42px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <p className="text-xs text-fire font-semibold bg-red-50 p-3.5 rounded-xl border border-red-150 text-left">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Search Results Display */}
        {searched && order && (
          <div className="mt-8 space-y-6">
            
            {/* Timeline Progress Tracker */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-150 shadow-sm space-y-8 text-center">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div className="text-left space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block">Invoice ref</span>
                  <span className="font-mono font-bold text-navy text-xs">{order.id}</span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block">Status</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                    order.status === 'delivered' || order.status === 'completed'
                      ? 'bg-green-50 text-green-700'
                      : order.status === 'shipping'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {order.status === 'pending_payment' ? 'Placement' : order.status}
                  </span>
                </div>
              </div>

              {/* Progress Line */}
              <div className="relative pt-6 pb-2">
                <div className="absolute left-1/12 right-1/12 top-1/2 -translate-y-1/2 bg-gray-100 h-1 rounded-full z-0" />
                <div 
                  className="absolute left-1/12 top-1/2 -translate-y-1/2 bg-fire h-1 rounded-full z-0 transition-all duration-500" 
                  style={{ width: `${(statusIndex / 3) * 83.3}%` }}
                />

                <div className="grid grid-cols-4 relative z-10 text-xs">
                  {/* Step 1: Placement */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      statusIndex >= 0 ? 'bg-fire border-fire text-white' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-navy">Placement</span>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      statusIndex >= 1 ? 'bg-fire border-fire text-white' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-navy">Processing</span>
                  </div>

                  {/* Step 3: Shipping */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      statusIndex >= 2 ? 'bg-fire border-fire text-white' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-navy">Shipping</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      statusIndex >= 3 ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-navy">Delivered</span>
                  </div>
                </div>
              </div>

              {/* Delivery Estimation Card */}
              {deliveryEstimate && statusIndex < 3 && (
                <div className="bg-gradient-to-br from-navy/5 to-[#063247]/5 p-5 rounded-2xl border border-navy/5 text-left space-y-3">
                  <div className="flex items-center gap-2 text-navy">
                    <Calendar className="w-5 h-5 text-fire" />
                    <span className="text-xs uppercase tracking-wider font-bold">Estimated Delivery Range</span>
                  </div>
                  <p className="text-xl font-display font-extrabold text-navy tracking-wide">
                    {deliveryEstimate.range}
                  </p>
                  <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                    {deliveryEstimate.workHoursNotice}
                  </p>
                </div>
              )}
            </div>

            {/* Order details & customer summary */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Product items (7 cols) */}
              <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4">
                <h3 className="font-display text-sm uppercase tracking-wider font-bold text-navy border-b border-gray-100 pb-2 text-left">
                  Items Purchased
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 text-left">
                      <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border shrink-0">
                        <Image 
                          src={item.product_slug === 'gfo-baby-fire-ball-400-gms' 
                            ? '/products/image_1_gfo_main_image.png' 
                            : item.product_slug === 'gfo-fire-ball-extinguisher-1-3-kg'
                              ? '/products/gfc_ball_image_1.png'
                              : item.product_slug === 'afo-fire-ball-extinguisher-1-5-kg'
                                ? '/products/afo_image_1.png'
                                : item.product_slug === 'gfo-green-fire-ball-1-3-kg'
                                  ? '/products/gfo_green_fire_ball_1.jpg'
                                  : item.product_slug === 'gfo-flowerpot-extinguisher-1-3-kg'
                                    ? '/products/flower_image_1.png'
                                    : '/products/gfo_fire_drum_1.jpg'
                          } 
                          alt={item.product_name} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                      <div className="flex-grow flex justify-between gap-4 text-xs">
                        <div className="space-y-0.5 font-semibold">
                          <p className="text-navy uppercase tracking-wide line-clamp-1">{item.product_name}</p>
                          <p className="text-gray-400 font-light">Qty: {item.quantity} | Weight: {item.weight}</p>
                        </div>
                        <span className="font-extrabold text-navy whitespace-nowrap">
                          {Number(item.total_price).toFixed(3)} OMR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="border-t border-gray-150 pt-3 flex justify-between items-center text-sm font-bold text-navy">
                  <span>Grand Total</span>
                  <span className="text-base text-fire">{Number(order.total_amount).toFixed(3)} OMR</span>
                </div>
              </div>

              {/* Masked Customer Privacy Info (5 cols) */}
              <div className="md:col-span-5 bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4 text-left">
                <h3 className="font-display text-sm uppercase tracking-wider font-bold text-navy border-b border-gray-100 pb-2">
                  Delivery Details
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-0.5">Customer Name</span>
                    <span className="font-bold text-navy">{maskText(order.customer_name, 'name')}</span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-0.5">Email</span>
                    <span className="font-medium text-gray-700">{maskText(order.email, 'email')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-0.5">Delivery Address</span>
                    <span className="text-gray-600 font-light flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-fire shrink-0 mt-0.5" />
                      <span>{maskText(order.address, 'address')}, Oman</span>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-start gap-2 bg-green-50/50 p-3 rounded-xl border border-green-100 text-[10px] text-green-700 font-light">
                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                    <span>Your private customer details are securely masked for confidentiality.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

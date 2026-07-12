'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { useCartStore } from '@/store/cartStore';
import { dbService } from '@/services/dbService';

// Zod schema for billing details
const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Valid email is required' }),
  phone: z.string().min(8, { message: 'Phone number is required' }),
  address: z.string().min(10, { message: 'Complete delivery address is required' }),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  flow: z.enum(['online', 'manual']),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalAmount, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      flow: 'manual',
    }
  });

  const selectedFlow = watch('flow');

  if (!mounted) return null;

  // Empty Cart Handling
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6 text-gray-900">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">Your Cart is Empty</h1>
        <p className="text-gray-550 font-light max-w-sm mx-auto">
          Please add automatic fire safety products to your cart before proceeding to checkout.
        </p>
        <Link 
          href="/catalog" 
          className="inline-block bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-md transition-colors"
        >
          Explore Products
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      // Flow A: Online Payment via Paymob
      if (values.flow === 'online') {
        const res = await fetch('/api/checkout/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerDetails: {
              fullName: values.fullName,
              email: values.email,
              phone: values.phone,
              address: values.address,
              companyName: values.companyName,
              notes: values.notes,
            },
            cartItems: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          })
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to initialize payment gateway.');
        }

        // Redirect customer to Paymob hosted checkout URL
        if (data.paymentUrl) {
          clearCart();
          router.push(data.paymentUrl);
        } else {
          throw new Error('No payment redirect URL returned by gateway.');
        }
      } 
      // Flow B: Manual Quotation Inquiry
      else {
        // Map cart items for database snapshot saving
        const itemSnapshots = items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_slug: item.slug,
          make: item.make,
          weight: item.weight,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          currency: item.currency,
        }));

        const order = await dbService.saveOrder({
          customer_name: values.fullName,
          email: values.email,
          phone: values.phone,
          address: values.address,
          company_name: values.companyName || undefined,
          notes: values.notes || undefined,
          total_amount: getTotalAmount(),
          currency: 'OMR',
          status: 'manual_inquiry',
          payment_status: 'pending',
          payment_provider: 'manual',
          items: itemSnapshots,
        });

        // Set local success state, clear cart
        setOrderSuccess(order);
        clearCart();
      }
    } catch (err: any) {
      console.error(err);
      setCheckoutError(err.message || 'An error occurred during checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="bg-white min-h-screen text-gray-900 py-20 flex items-center">
        <div className="max-w-xl mx-auto px-6 text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy">
            Quotation Enquiry Received
          </h1>
          <div className="bg-light-grey p-6 rounded-xl border border-gray-150 text-left text-sm space-y-3 font-light">
            <p><strong>Enquiry ID:</strong> {orderSuccess.id}</p>
            <p><strong>Customer Name:</strong> {orderSuccess.customer_name}</p>
            <p><strong>Total Quotation Amount:</strong> {Number(orderSuccess.total_amount).toFixed(3)} OMR</p>
            <p className="text-gray-500 pt-1 leading-relaxed">
              We have generated your custom pricing quotation and registered it in our sales portal. Our team will email or WhatsApp you shortly to discuss delivery options.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
            <Link 
              href="/catalog" 
              className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-8 py-3 rounded-md transition-colors"
            >
              Continue Shopping
            </Link>
            <Link 
              href="/" 
              className="text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-navy px-8 py-3 border border-gray-200 rounded-md transition-colors"
            >
              Go to Home
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
            <Link href="/catalog" className="hover:text-fire transition-colors flex items-center gap-1 font-semibold text-navy">
              <ArrowLeft className="w-4 h-4" />
              Back to Catalog
            </Link>
          </div>
          <span className="text-xs uppercase font-bold text-gray-400">Checkout Portal</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-navy mb-8">
          Complete Your Order / Enquiry
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
                <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Select Order Type</label>
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
                        <span>Quotation / Invoice Enquiry</span>
                      </div>
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        Request a custom quote. Our sales specialists will contact you directly to process payment offline.
                      </p>
                    </div>
                  </label>

                  {/* Online Flow - Blurred & Locked */}
                  <div className="border-2 border-gray-200/50 rounded-xl p-5 flex items-start gap-3 bg-gray-50/50 opacity-60 filter blur-[1px] relative cursor-not-allowed select-none pointer-events-none">
                    <div className="absolute top-3 right-3 bg-navy text-white text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                      <Lock className="w-2.5 h-2.5" />
                      Locked
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
                        <span>Online Credit Card</span>
                      </div>
                      <p className="text-xs text-gray-450 font-light leading-relaxed">
                        Pay securely online via <strong>Paymob</strong> using international or local cards. (Offline)
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Customer Details Form */}
              <div className="bg-light-grey/50 p-6 rounded-2xl border border-gray-150 space-y-4">
                <h3 className="font-display text-lg uppercase tracking-wider font-bold text-navy border-b border-gray-150 pb-2">
                  Customer Billing & Delivery Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Full Name *</label>
                    <input
                      type="text"
                      {...register('fullName')}
                      placeholder="e.g., Mohsin Abbas"
                      className={`w-full bg-white border ${
                        errors.fullName ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Email Address *</label>
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="e.g., mohsin@example.com"
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
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Phone Number *</label>
                    <input
                      type="tel"
                      {...register('phone')}
                      placeholder="e.g., +968 90000000"
                      className={`w-full bg-white border ${
                        errors.phone ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Company Name (Optional)</label>
                    <input
                      type="text"
                      {...register('companyName')}
                      placeholder="e.g., SAMS Logistics LLC"
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-fire text-gray-800"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Complete Delivery Address *</label>
                  <textarea
                    rows={3}
                    {...register('address')}
                    placeholder="Provide Governorate, City, Street, Building No, or landmark for SAMS local courier delivery..."
                    className={`w-full bg-white border ${
                      errors.address ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                    } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                  />
                  {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Delivery / Special Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    {...register('notes')}
                    placeholder="Provide additional details regarding preferred delivery hours or specific contacts..."
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-fire text-gray-800"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-fire hover:bg-fire/90 disabled:bg-gray-400 text-white text-xs uppercase tracking-widest font-bold py-4 rounded-md flex items-center justify-center gap-2 transition-all shadow-md shadow-fire/15 hover:scale-[1.01] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Secure Gateway...
                  </>
                ) : selectedFlow === 'online' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Confirm Order & Pay Now
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Quotation Enquiry
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: ORDER ITEMS SUMMARY (5 cols) */}
          <div className="lg:col-span-5 bg-light-grey p-6 rounded-2xl border border-gray-150 space-y-6">
            <h2 className="font-display text-lg uppercase tracking-wider font-bold text-navy border-b border-gray-150 pb-2">
              Order Summary
            </h2>

            {/* Cart list items */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="relative w-12 h-12 rounded bg-gray-50 border overflow-hidden shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 flex justify-between gap-4">
                    <div className="space-y-0.5 text-xs font-semibold">
                      <p className="text-gray-900 line-clamp-1 uppercase tracking-wide">{item.name}</p>
                      <p className="text-gray-400 font-light">Qty: {item.quantity} | Weight: {item.weight}</p>
                    </div>
                    <span className="text-xs font-extrabold text-navy whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(3)} OMR
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-150 pt-4 space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{getTotalAmount().toFixed(3)} OMR</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Local Shipping (Oman Courier)</span>
                  <span className="text-fire font-bold uppercase tracking-wider text-[10px]">Calculated Later</span>
                </div>
                <p className="text-[10px] text-gray-400 font-light leading-normal">
                  * Note: Shipment fees apply. SAMS does not provide free shipping. The delivery cost will be determined based on your governorate/location and shared with you directly via WhatsApp or email.
                </p>
              </div>
              <div className="flex justify-between text-base font-extrabold text-navy pt-1">
                <span>Grand Total</span>
                <span>{getTotalAmount().toFixed(3)} OMR</span>
              </div>
              <p className="text-[9px] text-gray-400 text-right font-light italic">
                * Grand total excludes local delivery charges
              </p>
            </div>

            {/* Safety Callout */}
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-[10px] text-gray-500 leading-normal font-light space-y-1">
              <span className="text-fire font-bold uppercase tracking-wider block">Security & Legal Notice:</span>
              <p>
                Product placement, local building configurations, and environmental factors can alter fire extinguishing ball activation rates. SAMS LLC accepts card payments and custom quote requests under Omani retail compliance parameters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

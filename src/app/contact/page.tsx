'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';

// Schema for inquiry validation using Zod
const inquirySchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters' }),
  email: z.string().email({ message: 'Please provide a valid email address' }),
  phone: z.string().min(8, { message: 'Phone number must be at least 8 digits' }),
  companyName: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.coerce.number().min(1, { message: 'Quantity must be at least 1' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters' }),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

function ContactPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      productId: 'general',
      quantity: 1,
      message: '',
    }
  });

  // Load products list for dropdown select
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await dbService.getProducts();
        setProducts(data);
        
        // Auto-select product if passed in URL query
        const urlProd = searchParams.get('product');
        if (urlProd) {
          const match = data.find(p => p.slug === urlProd || p.id === urlProd);
          if (match) {
            setValue('productId', match.id);
          }
        }

        // Auto-fill quantity if passed in URL query
        const urlQty = searchParams.get('quantity');
        if (urlQty) {
          const parsedQty = parseInt(urlQty, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            setValue('quantity', parsedQty);
          }
        }
      } catch (err) {
        console.error('Error loading products for contact form:', err);
      }
    }
    loadProducts();
  }, [searchParams, setValue]);

  const onSubmit = async (values: InquiryFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const selectedProd = products.find(p => p.id === values.productId);
      
      await dbService.saveInquiry({
        full_name: values.fullName,
        email: values.email,
        phone: values.phone,
        company_name: values.companyName || undefined,
        product_id: values.productId === 'general' ? undefined : values.productId,
        product_name: values.productId === 'general' ? 'General Enquiry' : selectedProd?.name,
        quantity: values.quantity,
        message: values.message,
        status: 'new'
      });
      
      setSubmitSuccess(true);
      reset();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24">
      {/* Banner Hero */}
      <div className="bg-navy text-white py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-fire/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
              Get in Touch
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight">
            Contact SAMS LLC
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-light max-w-xl mx-auto leading-relaxed">
            Need help choosing the right product? Our team can guide you based on your property type, fire risk level, and installation location.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-8">
        {/* Bento Grid Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: Enquiry Form (Col span 7) */}
          <div className="lg:col-span-7 bg-light-grey/50 p-6 sm:p-8 rounded-2xl border border-gray-150 shadow-sm flex flex-col h-full justify-between space-y-8">
            <div className="space-y-2">
              <h2 className="font-display text-2xl uppercase tracking-wide font-bold text-navy">
                Send SAMS an Enquiry
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-light">
                Fill out the form below and a representative will follow up with you.
              </p>
            </div>

            {submitSuccess ? (
              /* SUCCESS MESSAGE */
              <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-xl text-center space-y-4 flex-grow flex flex-col justify-center items-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-green-900">
                  Enquiry Submitted Successfully
                </h3>
                <p className="text-sm font-light text-green-700 leading-relaxed max-w-md mx-auto">
                  Thank you for contacting SAMS. We have received your enquiry and our safety specialists will get in touch with you shortly.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-widest font-bold px-6 py-2.5 rounded-md transition-colors cursor-pointer"
                >
                  Send Another Enquiry
                </button>
              </div>
            ) : (
              /* FORM FIELDS */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex-grow flex flex-col">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-fire p-4 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Product Interested In */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Product of Interest</label>
                    <select
                      {...register('productId')}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-fire text-gray-850"
                    >
                      <option value="general">General Corporate Enquiry</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Est. Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      {...register('quantity')}
                      className={`w-full bg-white border ${
                        errors.quantity ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                      } rounded-lg p-3 text-sm focus:outline-none text-gray-800`}
                    />
                    {errors.quantity && <p className="text-xs text-red-500 font-medium">{errors.quantity.message}</p>}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5 flex-grow flex flex-col">
                  <label className="text-xs uppercase tracking-wider text-gray-700 font-bold">Your Message *</label>
                  <textarea
                    rows={5}
                    {...register('message')}
                    placeholder="Provide details about your space, fire protection risks, or custom bulk needs..."
                    className={`w-full bg-white border ${
                      errors.message ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-fire'
                    } rounded-lg p-3 text-sm focus:outline-none text-gray-800 flex-grow resize-none`}
                  />
                  {errors.message && <p className="text-xs text-red-500 font-medium">{errors.message.message}</p>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-fire hover:bg-fire/90 disabled:bg-gray-400 text-white text-xs uppercase tracking-widest font-bold py-4 rounded-md flex items-center justify-center gap-2 transition-all shadow-md shadow-fire/10 cursor-pointer shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Enquiry...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Safety Enquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Corporate Contact Details (Col span 5) */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Corporate Contact Details */}
            <div className="bg-light-grey/50 p-6 sm:p-8 rounded-2xl border border-gray-150 shadow-sm flex-grow flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-2xl uppercase tracking-wide font-bold text-navy">
                  Corporate Contact Details
                </h2>
                <div className="h-0.5 w-10 bg-fire rounded-full" />
              </div>
              
              <div className="space-y-4 flex-grow flex flex-col justify-between">
                {/* Location Card */}
                <div className="flex gap-4 items-start bg-white p-5 rounded-xl border border-gray-150 hover:border-fire/30 hover:shadow-sm transition-all duration-300 group flex-1">
                  <div className="bg-light-grey p-2.5 rounded-lg group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <MapPin className="w-5 h-5 text-fire" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Office Location</span>
                    <p className="text-sm font-bold text-navy leading-snug">Ruwi, Muscat</p>
                    <p className="text-xs text-gray-550 font-light leading-relaxed">
                      Sultanate of Oman <br />
                      روي، مسقط، سلطنة عمان
                    </p>
                    <p className="text-[10px] text-navy/70 font-semibold pt-0.5">Swift Advanced Management Solutions LLC</p>
                  </div>
                </div>

                {/* Phone Card */}
                <a href="tel:+96877554070" className="flex gap-4 items-start bg-white p-5 rounded-xl border border-gray-150 hover:border-fire/30 hover:shadow-sm transition-all duration-300 group text-left cursor-pointer flex-1">
                  <div className="bg-light-grey p-2.5 rounded-lg group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <Phone className="w-5 h-5 text-fire" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Phone Line</span>
                    <p className="text-sm font-bold text-navy leading-snug group-hover:text-fire transition-colors">+968 77554070</p>
                    <p className="text-xs text-gray-555 font-light leading-relaxed">
                      Sunday to Thursday: 8:00 AM - 5:00 PM
                    </p>
                    <span className="text-[9px] text-fire font-bold uppercase tracking-wider block pt-0.5 group-hover:underline">Click to call</span>
                  </div>
                </a>

                {/* Email Card */}
                <a href="mailto:info@samsoman.com" className="flex gap-4 items-start bg-white p-5 rounded-xl border border-gray-150 hover:border-fire/30 hover:shadow-sm transition-all duration-300 group text-left cursor-pointer flex-1">
                  <div className="bg-light-grey p-2.5 rounded-lg group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <Mail className="w-5 h-5 text-fire" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Support Email</span>
                    <p className="text-sm font-bold text-navy leading-snug group-hover:text-fire transition-colors">info@samsoman.com</p>
                    <p className="text-xs text-gray-555 font-light leading-relaxed">
                      For quotations: sales@samsoman.com
                    </p>
                    <span className="text-[9px] text-fire font-bold uppercase tracking-wider block pt-0.5 group-hover:underline">Click to email</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid Bottom Row: Full-width Google Map */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-150 shadow-sm space-y-4 w-full">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-fire animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Our Location Map
            </span>
          </div>
          <div className="relative w-full h-[450px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            <iframe
              src="https://maps.google.com/maps?q=Al%20Shumoor%20Building%20Ruwi%20Muscat%20Oman&t=&z=14&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0"
            />
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
            <span className="font-semibold text-navy">SAMS Muscat Office (Ruwi, Oman)</span>
            <a
              href="https://maps.google.com/?q=Al+Shumoor+Building+Ruwi+Muscat+Oman"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fire font-bold hover:underline"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fire" />
      </div>
    }>
      <ContactPageContent />
    </Suspense>
  );
}

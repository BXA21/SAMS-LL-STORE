import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, Phone, ShieldCheck, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Track Your Order | SAMS LLC',
  description: 'Get delivery updates for your SAMS order from our team on WhatsApp or by phone.',
};

const WHATSAPP_URL = `https://wa.me/96877554070?text=${encodeURIComponent('Hello SAMS LLC, I would like a delivery update for my order number: ')}`;

/*
 * Order lookup by order number + email/phone was removed: those details are
 * not proof of being the customer. Delivery updates now come from the SAMS
 * team, who can verify the buyer. This page collects and shows no order data.
 */
export default function OrderTrackingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 pt-20">
      {/* Decorative Title Banner */}
      <div className="bg-navy text-white py-16 text-center space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(228,33,38,0.15),transparent_40%)]" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-wider relative z-10">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 font-light max-w-md mx-auto relative z-10 px-4 leading-relaxed">
          Our team gives delivery updates directly, so your order details stay private.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-150 shadow-xl space-y-8 text-left">
          <div className="flex items-start gap-4">
            <div className="bg-fire/10 text-fire p-3 rounded-2xl shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl uppercase tracking-wider font-bold text-navy">Get a delivery update</h2>
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                Send us your order number (it looks like <strong className="font-semibold text-navy">SAMS-10001</strong> and is
                shown on your payment confirmation). A SAMS representative will confirm it is you and share your delivery status.
                Deliveries run Sunday to Thursday, 10:00 AM to 5:00 PM (Oman time).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp SAMS
            </a>
            <a
              href="tel:+96877554070"
              className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call +968 7755 4070
            </a>
          </div>

          <div className="flex items-start gap-2 bg-green-50/50 p-4 rounded-xl border border-green-100 text-[11px] text-green-700 font-light leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <span>
              For your privacy we never show order details to anyone who only knows an order number, email or phone number.
            </span>
          </div>

          <p className="text-xs text-gray-400 font-light">
            Just paid online? Your payment confirmation is shown right after checkout.{' '}
            <Link href="/catalog" className="text-fire font-semibold hover:underline">Continue shopping</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

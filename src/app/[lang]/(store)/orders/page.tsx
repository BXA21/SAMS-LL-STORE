import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, Phone, ShieldCheck, Truck } from 'lucide-react';
import { localePath } from '@/i18n/config';
import { localeAlternates, resolveLocale, type LangParams } from '@/i18n/server';
import { checkoutMessages } from '@/i18n/messages/checkout';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { meta } = checkoutMessages[locale];
  return {
    title: meta.ordersTitle,
    description: meta.ordersDescription,
    alternates: localeAlternates(locale, '/orders'),
  };
}

/*
 * Order lookup by order number + email/phone was removed: those details are
 * not proof of being the customer. Delivery updates now come from the SAMS
 * team, who can verify the buyer. This page collects and shows no order data.
 */
export default async function OrderTrackingPage({ params }: { params: LangParams }) {
  const locale = await resolveLocale(params);
  const t = checkoutMessages[locale].orders;
  const whatsappUrl = `https://wa.me/96877554070?text=${encodeURIComponent(t.whatsappText)}`;
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 pt-20">
      {/* Decorative Title Banner */}
      <div className="bg-navy text-white py-16 text-center space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(228,33,38,0.15),transparent_40%)]" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-wider relative z-10">
          {t.title}
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 font-light max-w-md mx-auto relative z-10 px-4 leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-150 shadow-xl space-y-8 text-start">
          <div className="flex items-start gap-4">
            <div className="bg-fire/10 text-fire p-3 rounded-2xl shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl uppercase tracking-wider font-bold text-navy">{t.heading}</h2>
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                {t.bodyBefore}<strong className="font-semibold text-navy" dir="ltr">SAMS-10001</strong>{t.bodyAfter}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {t.whatsapp}
            </a>
            <a
              href="tel:+96877554070"
              className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t.call} <span dir="ltr">+968 7755 4070</span>
            </a>
          </div>

          <div className="flex items-start gap-2 bg-green-50/50 p-4 rounded-xl border border-green-100 text-[11px] text-green-700 font-light leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <span>
              {t.privacy}
            </span>
          </div>

          <p className="text-xs text-gray-400 font-light">
            {t.justPaid}{' '}
            <Link href={localePath(locale, '/catalog')} className="text-fire font-semibold hover:underline">{t.continueShopping}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

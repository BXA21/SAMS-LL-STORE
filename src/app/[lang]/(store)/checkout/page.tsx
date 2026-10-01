import type { Metadata } from 'next';
import { isOnlinePaymentEnabled } from '@/lib/serverEnv';
import { resolveLocale, type LangParams } from '@/i18n/server';
import { checkoutMessages } from '@/i18n/messages/checkout';
import CheckoutClient from './CheckoutClient';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: checkoutMessages[locale].meta.checkoutTitle,
    robots: { index: false, follow: false },
  };
}

// Read per request so turning Paymob on or off needs no rebuild.
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutClient onlinePaymentEnabled={isOnlinePaymentEnabled()} />;
}

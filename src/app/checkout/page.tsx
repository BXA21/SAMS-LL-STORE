import type { Metadata } from 'next';
import { isOnlinePaymentEnabled } from '@/lib/serverEnv';
import CheckoutClient from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout | SAMS LLC',
  robots: { index: false, follow: false },
};

// Read per request so turning Paymob on or off needs no rebuild.
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutClient onlinePaymentEnabled={isOnlinePaymentEnabled()} />;
}

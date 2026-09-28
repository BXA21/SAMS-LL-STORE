import { notFound } from 'next/navigation';

// The payment simulator was removed: order payment state is set only by
// HMAC-verified Paymob callbacks. This route intentionally 404s.
export default function RemovedPaymobSimulatorPage() {
  notFound();
}

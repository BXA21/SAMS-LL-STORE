import type { Metadata } from 'next';
import { resolveLocale, type LangParams } from '@/i18n/server';
import { checkoutMessages } from '@/i18n/messages/checkout';
import ResultClient from './ResultClient';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: checkoutMessages[locale].meta.resultTitle,
    robots: { index: false, follow: false },
  };
}

// Per-buyer page: the status comes from the order-access cookie, never from a cached render.
export const dynamic = 'force-dynamic';

export default function ResultPage() {
  return <ResultClient />;
}

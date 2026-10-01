import type { Metadata } from 'next';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';
import { contactMessages } from '@/i18n/messages/contact';
import { localeAlternates, resolveLocale, type LangParams } from '@/i18n/server';
import ContactClient from './ContactClient';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { meta } = contactMessages[locale];
  return {
    title: meta.title,
    description: meta.description,
    alternates: localeAlternates(locale, '/contact'),
  };
}

interface ContactPageProps {
  params: LangParams;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/*
 * Renders the contact details and enquiry form on the server. Previously the
 * whole page sat behind a client-side Suspense boundary, so the delivered
 * HTML was nothing but a spinner — the company's address and phone number
 * were invisible to anyone whose JavaScript did not run.
 */
export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  await resolveLocale(params);
  const resolved = await searchParams;

  let products: Product[] = [];
  try {
    products = await dbService.getProducts();
  } catch (error) {
    console.error('Contact: failed to load products on the server', error);
  }

  return (
    <ContactClient
      initialProducts={products}
      initialProductParam={firstValue(resolved.product)}
      initialQuantityParam={firstValue(resolved.quantity)}
    />
  );
}

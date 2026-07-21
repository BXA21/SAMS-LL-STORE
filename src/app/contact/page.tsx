import type { Metadata } from 'next';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact SAMS Oman | Fire Safety Enquiries',
  description:
    'Contact SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC in Muscat for automatic fire extinguisher balls, fire safety devices and quotations across the Sultanate of Oman.',
  alternates: { canonical: '/contact' },
};

interface ContactPageProps {
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
export default async function ContactPage({ searchParams }: ContactPageProps) {
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

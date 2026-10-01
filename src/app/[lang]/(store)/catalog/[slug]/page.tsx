import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';
import { localePath, type Locale } from '@/i18n/config';
import { localizeProduct } from '@/i18n/content';
import { catalogMessages } from '@/i18n/messages/catalog';
import { localeAlternates, resolveLocale } from '@/i18n/server';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/*
 * Pre-renders every product page at build time so each one is a real,
 * crawlable HTML document rather than a skeleton waiting on JavaScript.
 * Products added in the dashboard after a deploy render on first request and
 * are then cached like the rest.
 */

export async function generateStaticParams() {
  try {
    const products = await dbService.getProducts();
    return products.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
  } catch (error) {
    console.error('Product pages: failed to enumerate slugs', error);
    return [];
  }
}

function productDescription(product: Product, locale: Locale): string {
  return (
    product.short_description ||
    product.overview ||
    catalogMessages[locale].meta.productFallbackDescription(product.name)
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const { meta } = catalogMessages[locale];
  const raw = await dbService.getProductBySlug(slug).catch(() => null);

  if (!raw) {
    return { title: meta.productNotFoundTitle };
  }

  const product = localizeProduct(raw, locale);
  const path = `/catalog/${product.slug}`;
  return {
    title: meta.productTitle(product.name),
    description: productDescription(product, locale),
    alternates: localeAlternates(locale, path),
    openGraph: {
      title: meta.productTitle(product.name),
      description: productDescription(product, locale),
      url: localePath(locale, path),
      type: 'website',
      images: product.images?.length ? [{ url: product.images[0], alt: product.name }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  await resolveLocale(params);
  const { slug } = await params;

  let product: Product | null = null;
  let relatedProducts: Product[] = [];

  try {
    product = await dbService.getProductBySlug(slug);
    if (product) {
      const allProducts = await dbService.getProducts();
      relatedProducts = allProducts
        .filter((p) => p.id !== product!.id && p.category_id === product!.category_id)
        .slice(0, 3);
    }
  } catch (error) {
    console.error('Product page: failed to load on the server', error);
  }

  // A real 404 (not a 200 "not found" view) so missing slugs are never indexed.
  if (!product) notFound();

  return (
    <ProductDetailClient
      slug={slug}
      initialProduct={product}
      initialRelatedProducts={relatedProducts}
    />
  );
}

import type { Metadata } from 'next';
import { dbService } from '@/services/dbService';
import { Product, Category } from '@/types/database';
import { catalogMessages } from '@/i18n/messages/catalog';
import { localeAlternates, resolveLocale, type LangParams } from '@/i18n/server';
import CatalogClient from './CatalogClient';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { meta } = catalogMessages[locale];
  return {
    title: meta.catalogTitle,
    description: meta.catalogDescription,
    alternates: localeAlternates(locale, '/catalog'),
  };
}

interface CatalogPageProps {
  params: LangParams;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/*
 * Loads the catalog on the server so the products are in the HTML that
 * Netlify serves. The interactive filtering still runs on the client, but a
 * visitor whose JavaScript never executes now sees the full product list
 * rather than an empty page.
 */
export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
  await resolveLocale(params);
  const categoryParam = (await searchParams).category;
  const initialCategorySlug = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    [products, categories] = await Promise.all([
      dbService.getProducts(),
      dbService.getCategories(),
    ]);
  } catch (error) {
    // The client refreshes on mount, so an empty first render degrades
    // rather than failing the request.
    console.error('Catalog: failed to load products on the server', error);
  }

  return (
    // Keyed on the category so navigating between filtered views remounts the
    // client component and re-derives its selection from the new parameter,
    // rather than syncing that state back in an effect.
    <CatalogClient
      key={initialCategorySlug ?? 'all'}
      initialProducts={products}
      initialCategories={categories}
      initialCategorySlug={initialCategorySlug}
    />
  );
}

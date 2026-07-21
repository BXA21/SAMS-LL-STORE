import type { Metadata } from 'next';
import { dbService } from '@/services/dbService';
import { Product, Category } from '@/types/database';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
  title: 'Product Catalog | SAMS Oman Fire Safety Solutions',
  description:
    'Browse SAMS automatic fire extinguisher balls, fire extinguisher flower pots and fire safety devices for homes, offices, vehicles, warehouses and industrial spaces in Oman.',
  alternates: { canonical: '/catalog' },
};

interface CatalogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/*
 * Loads the catalog on the server so the products are in the HTML that
 * Netlify serves. The interactive filtering still runs on the client, but a
 * visitor whose JavaScript never executes now sees the full product list
 * rather than an empty page.
 */
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
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

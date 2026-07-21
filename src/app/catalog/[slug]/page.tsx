import type { Metadata } from 'next';
import { dbService } from '@/services/dbService';
import { Product } from '@/types/database';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/*
 * Pre-renders every product page at build time so each one is a real,
 * crawlable HTML document rather than a skeleton waiting on JavaScript.
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

function productDescription(product: Product): string {
  return (
    product.short_description ||
    product.overview ||
    `${product.name} from SAMS Oman — automatic fire safety protection for homes, vehicles and workplaces.`
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await dbService.getProductBySlug(slug).catch(() => null);

  if (!product) {
    return { title: 'Product Not Found | SAMS Oman' };
  }

  return {
    title: `${product.name} | SAMS Oman`,
    description: productDescription(product),
    alternates: { canonical: `/catalog/${product.slug}` },
    openGraph: {
      title: `${product.name} | SAMS Oman`,
      description: productDescription(product),
      url: `/catalog/${product.slug}`,
      type: 'website',
      images: product.images?.length ? [{ url: product.images[0], alt: product.name }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
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

  return (
    <ProductDetailClient
      slug={slug}
      initialProduct={product}
      initialRelatedProducts={relatedProducts}
    />
  );
}

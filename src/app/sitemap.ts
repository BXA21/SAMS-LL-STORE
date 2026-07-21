import type { MetadataRoute } from 'next';
import { dbService } from '@/services/dbService';
import { getSiteUrl } from '@/lib/siteUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/catalog`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // A sitemap must never be the reason a build fails; if the catalog source is
  // unreachable the static pages are still worth publishing.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await dbService.getProducts();
    productEntries = products
      .filter((product) => product.slug)
      .map((product) => ({
        url: `${siteUrl}/catalog/${product.slug}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
  } catch (error) {
    console.error('Sitemap: failed to load products', error);
  }

  return [...staticEntries, ...productEntries];
}

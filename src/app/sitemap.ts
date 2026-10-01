import type { MetadataRoute } from 'next';
import { dbService } from '@/services/dbService';
import { getSiteUrl } from '@/lib/siteUrl';
import { LOCALES, localePath } from '@/i18n/config';

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  // One entry per language, each listing both versions as hreflang alternates.
  const localized = (path: string, changeFrequency: Entry['changeFrequency'], priority: number): MetadataRoute.Sitemap => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl}${localePath(l, path)}`]));
    return LOCALES.map((locale) => ({
      url: `${siteUrl}${localePath(locale, path)}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  };

  const staticEntries: MetadataRoute.Sitemap = [
    ...localized('/', 'weekly', 1),
    ...localized('/catalog', 'weekly', 0.9),
    ...localized('/contact', 'monthly', 0.7),
    ...localized('/terms', 'yearly', 0.3),
    ...localized('/privacy', 'yearly', 0.3),
  ];

  // A sitemap must never be the reason a build fails; if the catalog source is
  // unreachable the static pages are still worth publishing.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await dbService.getProducts();
    productEntries = products
      .filter((product) => product.slug)
      .flatMap((product) => localized(`/catalog/${product.slug}`, 'weekly', 0.8));
  } catch (error) {
    console.error('Sitemap: failed to load products', error);
  }

  return [...staticEntries, ...productEntries];
}

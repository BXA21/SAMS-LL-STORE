import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLocale, localePath, stripLocale } from '../../src/i18n/config.ts';
import { localizeFaq, localizeProduct } from '../../src/i18n/content.ts';
import { formatPrice } from '../../src/i18n/format.ts';
import { PRODUCT_AR } from '../../src/i18n/arabicContent.ts';
import type { FAQ, Product } from '../../src/types/database.ts';

test('Arabic is served at bare paths, English under /en', () => {
  assert.equal(localePath('ar', '/'), '/');
  assert.equal(localePath('ar', '/catalog/x'), '/catalog/x');
  assert.equal(localePath('en', '/'), '/en');
  assert.equal(localePath('en', '/catalog?category=a'), '/en/catalog?category=a');
});

test('stripLocale gives the same internal path for server and browser pathnames', () => {
  assert.equal(stripLocale('/ar/catalog'), '/catalog');
  assert.equal(stripLocale('/catalog'), '/catalog');
  assert.equal(stripLocale('/en/catalog/x'), '/catalog/x');
  assert.equal(stripLocale('/en'), '/');
  assert.equal(stripLocale('/ar'), '/');
  assert.equal(stripLocale('/english-page'), '/english-page');
});

test('isLocale accepts only supported languages', () => {
  assert.ok(isLocale('ar'));
  assert.ok(isLocale('en'));
  for (const bad of ['fr', 'AR', '', null, undefined, 1]) assert.equal(isLocale(bad), false);
});

const baseProduct = {
  id: 'p', name: 'Fire Ball', slug: 'gfo-baby-fire-ball-400-gms', make: 'GFO', product_type: 'Ball',
  short_description: 'Short', overview: 'Overview', price: 12, currency: 'OMR', weight: '400 gms', life_years: 5,
  quantity: 1, stock: 1, images: [], key_features: ['A'], specifications: { Make: 'GFO' }, best_for: ['B'],
  safety_notes: ['C'], usage_areas: ['D'], is_featured: false, is_active: true, created_at: '', updated_at: '',
} satisfies Product;

test('English rendering never uses translations', () => {
  const p = { ...baseProduct, translations: { ar: { name: 'كرة' } } };
  assert.equal(localizeProduct(p, 'en'), p);
});

test('Arabic copy replaces only valid fields; malformed ones fall back to English', () => {
  const p: Product = {
    ...baseProduct,
    translations: { ar: { name: 'كرة', overview: '   ', key_features: ['ميزة', 5, ''], specifications: ['bad'], weight: 42 } },
  };
  const ar = localizeProduct(p, 'ar');
  assert.equal(ar.name, 'كرة');
  assert.equal(ar.overview, 'Overview');
  assert.deepEqual(ar.key_features, ['ميزة']);
  assert.deepEqual(ar.specifications, { Make: 'GFO' });
  assert.equal(ar.weight, '400 gms');
  assert.equal(ar.price, 12);
});

test('rows without translations, or with non-object shapes, render in English', () => {
  for (const translations of [undefined, {}, { ar: null }, { ar: 'x' }, { ar: [] }] as unknown[]) {
    const p = { ...baseProduct, translations } as Product;
    assert.equal(localizeProduct(p, 'ar').name, 'Fire Ball');
  }
  const faq: FAQ = { id: 'f', question: 'Q?', answer: 'A.', order_index: 1, is_active: true, created_at: '', updated_at: '' };
  assert.deepEqual(localizeFaq(faq, 'ar'), faq);
});

test('every seeded product has complete Arabic copy', () => {
  for (const [slug, ar] of Object.entries(PRODUCT_AR)) {
    for (const key of ['name', 'product_type', 'weight', 'short_description', 'overview'] as const) {
      assert.ok(ar[key].trim(), `${slug}.${key}`);
    }
    assert.ok(ar.key_features.length && ar.usage_areas.length && Object.keys(ar.specifications).length, slug);
  }
});

test('prices keep 3 decimals with a localized currency label', () => {
  assert.equal(formatPrice(12, 'en'), '12.000 OMR');
  assert.equal(formatPrice(23.4, 'ar'), '23.400 ر.ع.');
});

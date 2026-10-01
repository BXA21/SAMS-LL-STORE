import type { Locale } from './config';
import type { Category, FAQ, Product, Testimonial } from '@/types/database';

/*
 * Staff-edited rows carry their Arabic copy in a `translations` jsonb column
 * ({ ar: { name: "…", … } }). It is free-form data from the dashboard, so every
 * field is shape-checked here and anything missing or malformed falls back to
 * the English column instead of rendering blank or crashing the page.
 */

type Fields = Record<string, unknown>;

function arabicFields(row: { translations?: unknown }): Fields | null {
  const t = row.translations;
  if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
  const ar = (t as Record<string, unknown>).ar;
  if (!ar || typeof ar !== 'object' || Array.isArray(ar)) return null;
  return ar as Fields;
}

function text(source: Fields, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function list(source: Fields, key: string): string[] | undefined {
  const value = source[key];
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return items.length ? items : undefined;
}

function record(source: Fields, key: string): Record<string, string> | undefined {
  const value = source[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string');
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function localizeProduct(product: Product, locale: Locale): Product {
  if (locale !== 'ar') return product;
  const ar = arabicFields(product);
  if (!ar) return product;
  return {
    ...product,
    name: text(ar, 'name') ?? product.name,
    product_type: text(ar, 'product_type') ?? product.product_type,
    short_description: text(ar, 'short_description') ?? product.short_description,
    overview: text(ar, 'overview') ?? product.overview,
    weight: text(ar, 'weight') ?? product.weight,
    key_features: list(ar, 'key_features') ?? product.key_features,
    specifications: record(ar, 'specifications') ?? product.specifications,
    best_for: list(ar, 'best_for') ?? product.best_for,
    safety_notes: list(ar, 'safety_notes') ?? product.safety_notes,
    usage_areas: list(ar, 'usage_areas') ?? product.usage_areas,
  };
}

export function localizeCategory(category: Category, locale: Locale): Category {
  if (locale !== 'ar') return category;
  const ar = arabicFields(category);
  if (!ar) return category;
  return {
    ...category,
    name: text(ar, 'name') ?? category.name,
    description: text(ar, 'description') ?? category.description,
  };
}

export function localizeFaq(faq: FAQ, locale: Locale): FAQ {
  if (locale !== 'ar') return faq;
  const ar = arabicFields(faq);
  if (!ar) return faq;
  return { ...faq, question: text(ar, 'question') ?? faq.question, answer: text(ar, 'answer') ?? faq.answer };
}

export function localizeTestimonial(testimonial: Testimonial, locale: Locale): Testimonial {
  if (locale !== 'ar') return testimonial;
  const ar = arabicFields(testimonial);
  if (!ar) return testimonial;
  return {
    ...testimonial,
    name: text(ar, 'name') ?? testimonial.name,
    position: text(ar, 'position') ?? testimonial.position,
    company: text(ar, 'company') ?? testimonial.company,
    message: text(ar, 'message') ?? testimonial.message,
  };
}

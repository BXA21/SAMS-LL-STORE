import 'server-only';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from './config';

export type LangParams = Promise<{ lang: string }>;

/** Resolves the `[lang]` segment; any other value is a 404, never a fallback render. */
export async function resolveLocale(params: LangParams): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

export function generateLocaleParams() {
  return LOCALES.map((lang) => ({ lang }));
}

/** canonical + hreflang alternates for an internal path such as `/catalog`. */
export function localeAlternates(locale: Locale, path: string): Metadata['alternates'] {
  return {
    canonical: localePath(locale, path),
    languages: {
      ar: localePath('ar', path),
      en: localePath('en', path),
      'x-default': localePath(DEFAULT_LOCALE, path),
    },
  };
}

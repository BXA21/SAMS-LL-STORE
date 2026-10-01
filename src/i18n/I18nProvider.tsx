'use client';

import { createContext, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LOCALE_COOKIE, localePath, stripLocale, type Locale } from './config';
import type { Messages } from './messages';

const LocaleContext = createContext<Locale>('ar');

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // Remembered so server redirects (e.g. back from Paymob) land in the same language.
  // Pages stay static: the cookie is written here, never read during rendering.
  useEffect(() => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages<T>(messages: Messages<T>): T {
  return messages[useContext(LocaleContext)];
}

/** Returns a function that maps an internal path to the current locale's public URL. */
export function useLocalePath(): (path: string) => string {
  const locale = useContext(LocaleContext);
  return (path: string) => localePath(locale, path);
}

/**
 * The current page as an internal path (`/catalog`, `/catalog/x`), identical on
 * the server (`/ar/catalog`, the prerendered source) and in the browser
 * (`/catalog`, after the rewrite), so it never causes a hydration mismatch.
 */
export function useInternalPath(): string {
  return stripLocale(usePathname() ?? '/');
}
